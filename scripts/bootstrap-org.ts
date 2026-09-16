/**
 * One-time bootstrap of the first organisation and its owner
 * (docs/architecture/authentication-architecture.md#bootstrap-first-organisation).
 *
 *   npx tsx scripts/bootstrap-org.ts --email owner@example.com --name "Alpha N." --org "Malhot Technologies" --slug malhot [--password ...]
 *
 * Refuses to run if any organisation exists. Prints the generated password once
 * when none is supplied; the owner should change it after first sign-in.
 */
import { adminClient, fail, generatePassword, loadEnv, parseArgs, requireArg } from "./lib/cli";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = requireArg(args, "email").toLowerCase();
  const fullName = requireArg(args, "name");
  const orgName = requireArg(args, "org");
  const slug = requireArg(args, "slug");
  const password = typeof args.password === "string" ? args.password : generatePassword();

  if (!/^[a-z0-9-]{2,40}$/.test(slug)) fail("--slug must be 2-40 characters of a-z, 0-9 or '-'.");
  if (password.length < 12) fail("--password must be at least 12 characters.");

  const env = loadEnv();
  const admin = adminClient(env);

  const existing = await admin.from("organizations").select("id", { count: "exact", head: true });
  if (existing.error) fail(`Could not check organisations: ${existing.error.message}`);
  if ((existing.count ?? 0) > 0)
    fail("An organisation already exists. Bootstrap runs only once; use invitations instead.");

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (created.error) fail(`Could not create the owner user: ${created.error.message}`);
  const userId = created.data.user.id;

  const org = await admin.from("organizations").insert({ name: orgName, slug }).select("id").single();
  if (org.error) fail(`Could not create the organisation: ${org.error.message}`);

  const member = await admin
    .from("organization_members")
    .insert({ organization_id: org.data.id, user_id: userId, role: "owner" });
  if (member.error) fail(`Could not create the owner membership: ${member.error.message}`);

  console.log(`\n✔ Organisation "${orgName}" (${slug}) created.`);
  console.log(`✔ Owner ${email} created (user ${userId}).`);
  if (typeof args.password !== "string") {
    console.log(
      `\nTemporary password (shown once):\n\n  ${password}\n\nSign in at ${env.siteUrl}/login and change it under Settings.`,
    );
  }
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));

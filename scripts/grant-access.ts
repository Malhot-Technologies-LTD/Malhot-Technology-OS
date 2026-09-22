/**
 * Add an existing account to the organisation from the command line.
 *
 *   npx tsx scripts/grant-access.ts --email person@example.com [--role admin|member|owner]
 *
 * The in-app path is Settings → Members → Waiting for access. This is the
 * escape hatch for the bootstrap case that path cannot solve: the first admin
 * who would do the approving is themselves waiting for access.
 *
 * The person must already have signed up — this grants membership, it does not
 * create accounts (use scripts/bootstrap-org.ts or the sign-up page for that).
 */
import { adminClient, fail, loadEnv, parseArgs, requireArg } from "./lib/cli";

const ROLES = ["owner", "admin", "member"] as const;
type Role = (typeof ROLES)[number];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = requireArg(args, "email").toLowerCase();
  const role = (typeof args.role === "string" ? args.role : "member") as Role;
  if (!ROLES.includes(role)) fail(`--role must be one of ${ROLES.join(", ")}.`);

  const env = loadEnv();
  const admin = adminClient(env);

  const org = await admin.from("organizations").select("id, name, slug").order("created_at").limit(1).maybeSingle();
  if (org.error) fail(`Could not load the organisation: ${org.error.message}`);
  if (!org.data) fail("No organisation exists yet. Run scripts/bootstrap-org.ts first.");

  const users = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (users.error) fail(`Could not list users: ${users.error.message}`);
  const user = users.data.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) fail(`No account for ${email}. They need to sign up at /signup first.`);

  // The profile is created by the on_auth_user_created trigger; organization_members
  // references it, so a missing profile would fail with a confusing FK error.
  const profile = await admin.from("profiles").select("id, full_name").eq("id", user.id).maybeSingle();
  if (profile.error) fail(`Could not read the profile: ${profile.error.message}`);
  if (!profile.data) fail(`${email} has an account but no profile row. That should not happen — investigate.`);

  const existing = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", org.data.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing.data) {
    if (existing.data.role === role) {
      console.log(`\nℹ ${email} is already ${role} in ${org.data.name}. Nothing to do.\n`);
      return;
    }
    const updated = await admin
      .from("organization_members")
      .update({ role })
      .eq("organization_id", org.data.id)
      .eq("user_id", user.id);
    if (updated.error) fail(`Could not change the role: ${updated.error.message}`);
    console.log(`\n✔ ${email} changed from ${existing.data.role} to ${role} in ${org.data.name}.\n`);
    return;
  }

  const inserted = await admin
    .from("organization_members")
    .insert({ organization_id: org.data.id, user_id: user.id, role });
  if (inserted.error) fail(`Could not grant access: ${inserted.error.message}`);

  const name = profile.data.full_name || email;
  console.log(`\n✔ ${name} (${email}) added to ${org.data.name} as ${role}.`);
  if (!user.email_confirmed_at) {
    console.log("⚠ Their email is not confirmed yet — they must open the confirmation link before signing in.");
  }
  console.log(`\nThey can sign in at ${env.siteUrl}/login.\n`);
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));

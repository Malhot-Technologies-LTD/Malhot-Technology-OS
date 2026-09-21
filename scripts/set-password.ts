/**
 * Set a member's password from the command line, without touching their user row
 * (docs/architecture/authentication-architecture.md#changing-a-password).
 *
 *   npx tsx scripts/set-password.ts --email owner@example.com [--password ...]
 *
 * The in-app path is Settings → Password; this is the escape hatch for when
 * nobody can sign in at all and no reset email can be received. Unlike
 * scripts/reset-owner.ts it keeps the same auth user, profile and memberships —
 * only the password changes. Prints the password once when none is supplied.
 */
import { adminClient, fail, generatePassword, loadEnv, parseArgs, requireArg } from "./lib/cli";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = requireArg(args, "email").toLowerCase();
  const password = typeof args.password === "string" ? args.password : generatePassword();
  if (password.length < 12) fail("--password must be at least 12 characters (Supabase rejects shorter ones).");

  const env = loadEnv();
  const admin = adminClient(env);

  const users = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (users.error) fail(`Could not list users: ${users.error.message}`);
  const user = users.data.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) fail(`No user with email ${email}.`);

  const updated = await admin.auth.admin.updateUserById(user.id, { password });
  if (updated.error) fail(`Could not set the password: ${updated.error.message}`);

  console.log(`\n✔ Password set for ${email} (user ${user.id}).`);
  if (typeof args.password !== "string") {
    console.log(`\nPassword (shown once):\n\n  ${password}\n`);
  }
  console.log(`Sign in at ${env.siteUrl}/login, then change it under Settings → Password.\n`);
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));

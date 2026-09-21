/**
 * Recreate the organisation's owner account from scratch, keeping the same email
 * (docs/architecture/authentication-architecture.md#bootstrap-first-organisation).
 *
 *   npx tsx scripts/reset-owner.ts --password "malhot-admin-2026" [--email owner@example.com] [--name "Alpha N."]
 *
 * Use when the owner password is lost and no reset email can be received.
 * Without --email it targets the organisation's current owner. The old auth user
 * is deleted and a brand-new one created with the same address, so old sessions,
 * identities and refresh tokens are gone.
 *
 * Order of operations keeps the "an organisation always has an owner" invariant
 * true at every step: park the old address, create the replacement, make it an
 * owner, re-point the rows that referenced the old profile, then delete it.
 * Add --dry-run to see what it would do without touching anything.
 */
import { adminClient, fail, generatePassword, loadEnv, parseArgs } from "./lib/cli";

type Admin = ReturnType<typeof adminClient>;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const password = typeof args.password === "string" ? args.password : generatePassword();
  const dryRun = args["dry-run"] === true;
  if (password.length < 12) fail("--password must be at least 12 characters (Supabase rejects shorter ones).");

  const env = loadEnv();
  const admin = adminClient(env);

  const org = await admin.from("organizations").select("id, name, slug").order("created_at").limit(1).maybeSingle();
  if (org.error) fail(`Could not load the organisation: ${org.error.message}`);
  if (!org.data) fail("No organisation exists yet. Run scripts/bootstrap-org.ts instead.");

  const owners = await admin
    .from("organization_members")
    .select("user_id, joined_at")
    .eq("organization_id", org.data.id)
    .eq("role", "owner")
    .order("joined_at");
  if (owners.error) fail(`Could not load owners: ${owners.error.message}`);

  const users = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (users.error) fail(`Could not list users: ${users.error.message}`);

  const requestedEmail = typeof args.email === "string" ? args.email.toLowerCase() : null;
  const ownerIds = new Set((owners.data ?? []).map((o) => o.user_id));
  const old = requestedEmail
    ? users.data.users.find((u) => u.email?.toLowerCase() === requestedEmail)
    : users.data.users.find((u) => ownerIds.has(u.id));

  if (!old && !requestedEmail) fail("The organisation has no owner with an auth user. Pass --email explicitly.");
  const email = (old?.email ?? requestedEmail)!.toLowerCase();
  const fullName =
    typeof args.name === "string"
      ? args.name
      : ((old?.user_metadata?.full_name as string | undefined) ?? (await profileName(admin, old?.id)) ?? "Owner");

  console.log(`\nOrganisation : ${org.data.name} (${org.data.slug})`);
  console.log(`Owner email  : ${email}`);
  console.log(`Old user     : ${old ? old.id : "none (will be created fresh)"}`);
  console.log(`Full name    : ${fullName}`);
  if (dryRun) {
    console.log("\n--dry-run: nothing was changed.\n");
    return;
  }

  // 1. Free the address so the replacement can claim it.
  const parked = `retired-${Date.now().toString(36)}@deleted.malhot.local`;
  if (old) {
    const renamed = await admin.auth.admin.updateUserById(old.id, { email: parked, email_confirm: true });
    if (renamed.error) fail(`Could not park the old address: ${renamed.error.message}`);
  }

  // 2. Create the replacement owner.
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (created.error) {
    if (old) await admin.auth.admin.updateUserById(old.id, { email, email_confirm: true });
    fail(`Could not create the new owner user: ${created.error.message}`);
  }
  const newId = created.data.user.id;

  const profile = await admin.from("profiles").update({ full_name: fullName }).eq("id", newId);
  if (profile.error) fail(`Could not set the new profile name: ${profile.error.message}`);

  const member = await admin
    .from("organization_members")
    .insert({ organization_id: org.data.id, user_id: newId, role: "owner" });
  if (member.error) fail(`Could not grant ownership to the new user: ${member.error.message}`);

  // 3. Re-point rows that reference the old profile, then drop the old user.
  if (old) {
    const repointed = await Promise.all([
      admin.from("invitations").update({ invited_by: newId }).eq("invited_by", old.id),
      admin.from("clients").update({ created_by: newId }).eq("created_by", old.id),
      admin.from("inquiries").update({ handled_by: newId }).eq("handled_by", old.id),
    ]);
    for (const result of repointed) {
      if (result.error) fail(`Could not re-point references to the old owner: ${result.error.message}`);
    }

    const removed = await admin.auth.admin.deleteUser(old.id);
    if (removed.error) fail(`New owner is in place, but the old user could not be deleted: ${removed.error.message}`);
  }

  console.log(`\n✔ Owner ${email} recreated (user ${newId}).`);
  if (old) console.log(`✔ Old user ${old.id} deleted.`);
  console.log(
    `\nPassword:\n\n  ${password}\n\nSign in at ${env.siteUrl}/login, then change it under Settings → Password.\n`,
  );
}

async function profileName(admin: Admin, userId: string | undefined): Promise<string | null> {
  if (!userId) return null;
  const profile = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return profile.data?.full_name || null;
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));

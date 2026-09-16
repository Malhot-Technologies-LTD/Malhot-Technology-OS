/**
 * Invite a person to the organisation from the command line
 * (W1 in docs/product/workflows.md). The Settings → Members UI replaces this in Phase 3;
 * both create the same `invitations` row and Supabase Auth invite.
 *
 *   npx tsx scripts/invite-member.ts --email dev@example.com [--role member|admin] [--invited-by owner@example.com]
 *
 * Prints the invitation link. Supabase also emails it when the address has no
 * account yet; for an existing account, send the printed link yourself.
 */
import { generateInvitationToken, hashInvitationToken } from "@/features/organization/lib/invitation-token";

import { adminClient, fail, loadEnv, parseArgs, requireArg } from "./lib/cli";

const INVITATION_DAYS = 7;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = requireArg(args, "email").toLowerCase();
  const role = typeof args.role === "string" ? args.role : "member";
  if (role !== "member" && role !== "admin") fail("--role must be member or admin.");

  const env = loadEnv();
  const admin = adminClient(env);

  const org = await admin.from("organizations").select("id, name").order("created_at").limit(1).maybeSingle();
  if (org.error) fail(`Could not load the organisation: ${org.error.message}`);
  if (!org.data) fail("No organisation exists yet. Run scripts/bootstrap-org.ts first.");

  const inviter = await resolveInviter(
    admin,
    org.data.id,
    typeof args["invited-by"] === "string" ? args["invited-by"] : null,
  );

  const token = generateInvitationToken();
  const inserted = await admin.from("invitations").insert({
    organization_id: org.data.id,
    email,
    org_role: role,
    token_hash: await hashInvitationToken(token),
    invited_by: inviter,
    expires_at: new Date(Date.now() + INVITATION_DAYS * 86_400_000).toISOString(),
  });
  if (inserted.error) {
    if (inserted.error.code === "23505") fail(`An invitation for ${email} is already pending. Revoke it first.`);
    fail(`Could not create the invitation: ${inserted.error.message}`);
  }

  const link = `${env.siteUrl}/invite/${token}`;
  const authInvite = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: link });

  console.log(
    `\n✔ Invitation created for ${email} as ${role} in ${org.data.name} (expires in ${INVITATION_DAYS} days).`,
  );
  if (authInvite.error) {
    if (authInvite.error.code === "email_exists") {
      console.log("ℹ That email already has an account, so no email was sent. Send them this link:");
    } else {
      console.log(`⚠ Supabase could not send the invite email (${authInvite.error.message}). Send this link manually:`);
    }
  } else {
    console.log("✔ Supabase sent the invitation email. The same link, for reference:");
  }
  console.log(`\n  ${link}\n`);
}

async function resolveInviter(
  admin: ReturnType<typeof adminClient>,
  organizationId: string,
  invitedByEmail: string | null,
): Promise<string> {
  if (invitedByEmail) {
    const users = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (users.error) fail(`Could not list users: ${users.error.message}`);
    const user = users.data.users.find((u) => u.email?.toLowerCase() === invitedByEmail.toLowerCase());
    if (!user) fail(`No user with email ${invitedByEmail}.`);
    return user.id;
  }
  const owner = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .order("joined_at")
    .limit(1)
    .maybeSingle();
  if (owner.error || !owner.data) fail("Could not find an organisation owner to record as the inviter.");
  return owner.data.user_id;
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));

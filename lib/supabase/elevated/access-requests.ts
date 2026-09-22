import "server-only";

import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Elevated access-request operations (docs/architecture/backend-architecture.md,
 * "Elevated operation" table).
 *
 * Someone who signs up has an `auth.users` row and a `profiles` row but no
 * membership, which puts them out of reach of a user-scoped client twice over:
 * the `profiles` select policy only exposes people you share an organisation
 * with, and email addresses live in `auth.users`, which is not exposed at all.
 *
 * Elevation is never unchecked — every function here re-establishes that the
 * requester is an admin of the organisation before returning anything.
 */

export type AccessRequest = {
  userId: string;
  email: string;
  fullName: string;
  requestedAt: string;
  emailConfirmed: boolean;
};

/** True when `userId` is an owner or admin of `organizationId`. */
async function isOrgAdmin(userId: string, organizationId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    logger.error("access_request.admin_check_failed", { error: error.message });
    return false;
  }
  return data?.role === "owner" || data?.role === "admin";
}

/**
 * People with an account but no membership anywhere — they signed up and are
 * waiting to be let in. Returns [] for a requester who is not an admin.
 */
export async function listAccessRequests(requesterUserId: string, organizationId: string): Promise<AccessRequest[]> {
  if (!(await isOrgAdmin(requesterUserId, organizationId))) {
    logger.warn("access_request.list_denied", { requesterUserId });
    return [];
  }

  const admin = createAdminClient();
  const [users, members, profiles] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("organization_members").select("user_id"),
    admin.from("profiles").select("id, full_name"),
  ]);

  if (users.error || members.error || profiles.error) {
    logger.error("access_request.list_failed", {
      error: users.error?.message ?? members.error?.message ?? profiles.error?.message,
    });
    throw new Error("Access requests could not be loaded");
  }

  // Membership in *any* organisation counts as already onboarded; this
  // deployment has one organisation, and a second would get its own list.
  const onboarded = new Set((members.data ?? []).map((m) => m.user_id));
  const names = new Map((profiles.data ?? []).map((p) => [p.id, p.full_name]));

  return users.data.users
    .filter((user) => !onboarded.has(user.id) && user.email)
    .map((user) => ({
      userId: user.id,
      email: user.email as string,
      fullName: names.get(user.id) || (user.user_metadata?.full_name as string | undefined) || "",
      requestedAt: user.created_at,
      emailConfirmed: Boolean(user.email_confirmed_at),
    }))
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
}

/**
 * Removes an account outright. Used to turn away a sign-up that should not be
 * in the system at all, rather than leaving it sitting in the list forever.
 */
export async function rejectAccessRequest(
  requesterUserId: string,
  organizationId: string,
  targetUserId: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isOrgAdmin(requesterUserId, organizationId))) {
    logger.warn("access_request.reject_denied", { requesterUserId });
    return { ok: false, reason: "forbidden" };
  }
  if (requesterUserId === targetUserId) return { ok: false, reason: "self" };

  const admin = createAdminClient();
  // Refuse to delete anyone who is already a member of something.
  const membership = await admin
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", targetUserId);
  if ((membership.count ?? 0) > 0) return { ok: false, reason: "is_member" };

  const removed = await admin.auth.admin.deleteUser(targetUserId);
  if (removed.error) {
    logger.error("access_request.reject_failed", { error: removed.error.message });
    return { ok: false, reason: "failed" };
  }
  logger.info("access_request.rejected", { targetUserId });
  return { ok: true };
}

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { OrgRole } from "@/types/domain";

/**
 * Elevated invitation operations (docs/architecture/backend-architecture.md, "Elevated operation" table).
 * The invitee has no membership yet, so RLS would hide the row; every function
 * here re-checks the token, expiry and email itself — elevation is never unchecked.
 */

export type PendingInvitation = {
  id: string;
  email: string;
  orgRole: OrgRole;
  expiresAt: string;
  organization: { id: string; name: string; slug: string };
};

export type InvitationLookup =
  | { kind: "not_found" }
  | { kind: "expired" }
  | { kind: "revoked" }
  | { kind: "accepted" }
  | { kind: "pending"; invitation: PendingInvitation };

export async function findInvitationByHash(tokenHash: string): Promise<InvitationLookup> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invitations")
    .select("id, email, org_role, status, expires_at, organization:organizations!inner(id, name, slug)")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    logger.error("invitation.lookup_failed", { error: error.message });
    throw new Error("Invitation lookup failed");
  }
  if (!data) return { kind: "not_found" };
  if (data.status === "revoked") return { kind: "revoked" };
  if (data.status === "accepted") return { kind: "accepted" };
  if (data.status === "expired" || new Date(data.expires_at) < new Date()) return { kind: "expired" };

  return {
    kind: "pending",
    invitation: {
      id: data.id,
      email: data.email,
      orgRole: data.org_role,
      expiresAt: data.expires_at,
      organization: data.organization,
    },
  };
}

export type AcceptInvitationResult =
  { ok: true; organizationId: string } | { ok: false; reason: "not_pending" | "email_mismatch" | "failed" };

/**
 * Creates the organisation membership and marks the invitation accepted.
 * Project grants stored on the invitation are applied once `project_members`
 * exists (Phase 3), when this moves into a single SQL function for atomicity.
 */
export async function acceptInvitation(params: {
  tokenHash: string;
  userId: string;
  userEmail: string;
}): Promise<AcceptInvitationResult> {
  const lookup = await findInvitationByHash(params.tokenHash);
  if (lookup.kind !== "pending") return { ok: false, reason: "not_pending" };
  if (lookup.invitation.email.toLowerCase() !== params.userEmail.toLowerCase()) {
    return { ok: false, reason: "email_mismatch" };
  }

  const admin = createAdminClient();
  const organizationId = lookup.invitation.organization.id;

  const membership = await admin
    .from("organization_members")
    .upsert(
      { organization_id: organizationId, user_id: params.userId, role: lookup.invitation.orgRole },
      { onConflict: "organization_id,user_id", ignoreDuplicates: true },
    );
  if (membership.error) {
    logger.error("invitation.membership_failed", {
      invitationId: lookup.invitation.id,
      error: membership.error.message,
    });
    return { ok: false, reason: "failed" };
  }

  const accepted = await admin
    .from("invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", lookup.invitation.id)
    .eq("status", "pending");
  if (accepted.error) {
    logger.error("invitation.mark_accepted_failed", {
      invitationId: lookup.invitation.id,
      error: accepted.error.message,
    });
    return { ok: false, reason: "failed" };
  }

  return { ok: true, organizationId };
}

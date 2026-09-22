"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { mapDbError } from "@/lib/actions/db-errors";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { validationFail } from "@/lib/actions/validation";
import { withAction } from "@/lib/actions/with-action";
import { getAuthState, requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { rejectAccessRequest as rejectAccessRequestElevated } from "@/lib/supabase/elevated/access-requests";
import { acceptInvitation as acceptInvitationElevated } from "@/lib/supabase/elevated/invitations";

import { hashInvitationToken, isWellFormedInvitationToken } from "./lib/invitation-token";

const acceptInvitationSchema = z.object({
  token: z.string().refine(isWellFormedInvitationToken, "Invalid invitation link"),
});

/** W1 step 3: the signed-in invitee joins the organisation. */
export const acceptInvitation = withAction(
  "organization.acceptInvitation",
  async (input: unknown): Promise<ActionResult> => {
    const parsed = acceptInvitationSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);

    const state = await getAuthState();
    if (state.kind === "anonymous") return fail("unauthenticated", "Sign in to accept the invitation.");
    const email = state.kind === "member" ? state.viewer.email : state.email;
    if (!email) return fail("invariant", "Your account has no email address, so the invitation cannot be matched.");
    const userId = state.kind === "member" ? state.viewer.userId : state.userId;

    const result = await acceptInvitationElevated({
      tokenHash: await hashInvitationToken(parsed.data.token),
      userId,
      userEmail: email,
    });

    if (!result.ok) {
      switch (result.reason) {
        case "email_mismatch":
          return fail("forbidden", "This invitation was sent to a different email address.");
        case "not_pending":
          return fail("invalid_transition", "This invitation is no longer valid. Ask an admin for a new one.");
        default:
          return fail("unexpected", "The invitation could not be accepted. Try again.");
      }
    }

    redirect("/os?welcome=1");
  },
);

const ORG_ROLES = ["owner", "admin", "member"] as const;

const approveSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["admin", "member"]),
});

/**
 * Lets a signed-up person into the organisation (docs/product/user-roles.md).
 *
 * The insert runs on the admin's own client, so RLS re-checks that they may do
 * it — the `can()` call below only avoids offering an action that would fail.
 * `owner` is not offered: ownership transfers are a separate, deliberate act.
 */
export const approveAccessRequest = withAction(
  "organization.approveAccess",
  async (input: unknown): Promise<ActionResult> => {
    const parsed = approveSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);

    const viewer = await requireViewer();
    if (!can(viewer, "org.invite")) return fail("forbidden", "Only organisation admins can approve access.");

    const supabase = await createClient();
    const { error } = await supabase.from("organization_members").insert({
      organization_id: viewer.organizationId,
      user_id: parsed.data.userId,
      role: parsed.data.role,
    });
    if (error) {
      const mapped = mapDbError(error);
      logger.warn("access_request.approve_failed", { code: error.code, mapped: mapped.code });
      return fail(mapped.code, mapped.message);
    }

    logger.info("member.joined", { via: "approval", role: parsed.data.role });
    revalidatePath("/os/settings/members");
    return ok(undefined);
  },
);

/** Turns away a sign-up and deletes the account. Refuses anyone already a member. */
export const rejectAccess = withAction("organization.rejectAccess", async (input: unknown): Promise<ActionResult> => {
  const userId = typeof input === "string" && /^[0-9a-f-]{36}$/.test(input) ? input : null;
  if (!userId) return fail("validation", "Unknown person.");

  const viewer = await requireViewer();
  if (!can(viewer, "org.invite")) return fail("forbidden", "Only organisation admins can decline access.");

  const result = await rejectAccessRequestElevated(viewer.userId, viewer.organizationId, userId);
  if (!result.ok) {
    if (result.reason === "is_member")
      return fail("invariant", "That person is already a member. Remove them instead.");
    if (result.reason === "self") return fail("invariant", "You cannot decline your own account.");
    return fail("forbidden", "That account could not be declined.");
  }

  revalidatePath("/os/settings/members");
  return ok(undefined);
});

const roleChangeSchema = z.object({ userId: z.uuid(), role: z.enum(ORG_ROLES) });

/** Changes someone's organisation role. The last-owner rule is enforced by trigger. */
export const changeMemberRole = withAction(
  "organization.changeMemberRole",
  async (input: unknown): Promise<ActionResult> => {
    const parsed = roleChangeSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);

    const viewer = await requireViewer();
    if (!can(viewer, "org.manage")) return fail("forbidden", "Only organisation admins can change roles.");
    if (parsed.data.role === "owner" && viewer.orgRole !== "owner")
      return fail("forbidden", "Only the owner can make someone else an owner.");

    const supabase = await createClient();
    const { error } = await supabase
      .from("organization_members")
      .update({ role: parsed.data.role })
      .eq("organization_id", viewer.organizationId)
      .eq("user_id", parsed.data.userId);
    if (error) {
      const mapped = mapDbError(error);
      return fail(mapped.code, mapped.message);
    }

    revalidatePath("/os/settings/members");
    return ok(undefined);
  },
);

/** Removes someone from the organisation. Their authored work is kept. */
export const removeMember = withAction("organization.removeMember", async (input: unknown): Promise<ActionResult> => {
  const userId = typeof input === "string" && /^[0-9a-f-]{36}$/.test(input) ? input : null;
  if (!userId) return fail("validation", "Unknown member.");

  const viewer = await requireViewer();
  if (!can(viewer, "org.manage")) return fail("forbidden", "Only organisation admins can remove members.");
  if (userId === viewer.userId) return fail("invariant", "You cannot remove yourself.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", viewer.organizationId)
    .eq("user_id", userId);
  if (error) {
    const mapped = mapDbError(error);
    return fail(mapped.code, mapped.message);
  }

  revalidatePath("/os/settings/members");
  return ok(undefined);
});

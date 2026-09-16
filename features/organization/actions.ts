"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { fail, type ActionResult } from "@/lib/actions/result";
import { validationFail } from "@/lib/actions/validation";
import { withAction } from "@/lib/actions/with-action";
import { getAuthState } from "@/lib/auth/context";
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

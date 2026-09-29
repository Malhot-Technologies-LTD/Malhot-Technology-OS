"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { validationFail } from "@/lib/actions/validation";
import { withAction } from "@/lib/actions/with-action";
import { requireViewer } from "@/lib/auth/context";
import { safeNext } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { verifyPassword } from "@/lib/supabase/password-check";
import { createClient } from "@/lib/supabase/server";

import { AVATAR_BUCKET, avatarPathFromUrl, isOwnAvatarPath } from "./avatar";
import { avatarUrl } from "./avatar-media";
import { authErrorMessage } from "./lib/auth-errors";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  magicLinkSchema,
  resetPasswordSchema,
  signInSchema,
  setAvatarSchema,
  signUpSchema,
  updateProfileSchema,
} from "./schemas";

/**
 * Auth actions (docs/architecture/authentication-architecture.md).
 * Successful sign-ins end in redirect(), which propagates through withAction.
 * Email-sending actions always report success so they cannot be used to
 * discover which addresses have accounts.
 */

export const signInWithPassword = withAction(
  "auth.signInWithPassword",
  async (input: unknown): Promise<ActionResult> => {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) {
      logger.info("auth.signin.failed", { method: "password", code: error.code });
      return fail("unauthenticated", authErrorMessage(error));
    }
    redirect(safeNext(parsed.data.next, siteUrl));
  },
);

export const sendMagicLink = withAction("auth.sendMagicLink", async (input: unknown): Promise<ActionResult> => {
  const parsed = magicLinkSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${siteUrl}${safeNext(parsed.data.next, siteUrl)}`,
    },
  });
  if (error && error.code !== "user_not_found" && error.code !== "signup_disabled") {
    logger.warn("auth.magiclink.failed", { code: error.code });
    return fail("external", authErrorMessage(error));
  }
  return ok(undefined);
});

export const signOut = withAction("auth.signOut", async (): Promise<ActionResult> => {
  const supabase = await createClient();
  // Global scope revokes every refresh token for the user (lost-device story).
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) logger.warn("auth.signout.failed", { code: error.code });
  redirect("/");
});

export const requestPasswordReset = withAction(
  "auth.requestPasswordReset",
  async (input: unknown): Promise<ActionResult> => {
    const parsed = forgotPasswordSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${siteUrl}/reset-password`,
    });
    if (error && error.code !== "user_not_found") {
      logger.warn("auth.reset.request_failed", { code: error.code });
      return fail("external", authErrorMessage(error));
    }
    return ok(undefined);
  },
);

export const updatePassword = withAction("auth.updatePassword", async (input: unknown): Promise<ActionResult> => {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return fail("unauthenticated", "That reset link has expired. Request a new one.");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const code = error.code === "weak_password" ? "validation" : "external";
    return fail(code, authErrorMessage(error), { fieldErrors: { password: [authErrorMessage(error)] } });
  }
  redirect("/os");
});

export const updateProfile = withAction("auth.updateProfile", async (input: unknown): Promise<ActionResult> => {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const viewer = await requireViewer();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, title: parsed.data.title, timezone: parsed.data.timezone })
    .eq("id", viewer.userId);
  if (error) return fail("unexpected", "Your profile could not be saved. Try again.");

  revalidatePath("/os", "layout");
  return ok(undefined);
});

/**
 * Settings → Password. Unlike updatePassword (which trusts a one-time recovery
 * link) this proves the caller knows the current password before changing it,
 * so a borrowed, still-signed-in browser cannot lock the owner out.
 */
export const changePassword = withAction("auth.changePassword", async (input: unknown): Promise<ActionResult> => {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const viewer = await requireViewer();
  if (!viewer.email) return fail("forbidden", "This account has no email address, so it has no password to change.");

  const check = await verifyPassword(viewer.email, parsed.data.currentPassword);
  if (!check.ok) {
    logger.info("auth.password.reauth_failed", { code: check.code });
    const message =
      check.code === "invalid_credentials"
        ? "That is not your current password."
        : authErrorMessage({ code: check.code });
    return fail("validation", message, { fieldErrors: { currentPassword: [message] } });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const message = authErrorMessage(error);
    if (error.code === "weak_password" || error.code === "same_password") {
      return fail("validation", message, { fieldErrors: { password: [message] } });
    }
    logger.warn("auth.password.change_failed", { code: error.code });
    return fail("external", message);
  }

  logger.info("auth.password.changed", { userId: viewer.userId });
  return ok(undefined);
});

/**
 * Self-service sign-up.
 *
 * Creating an account does NOT grant access to anything: the new user has no
 * `organization_members` row, so `getAuthState()` returns `no_access` and they
 * see the "no organisation access" screen until an admin adds them. That is
 * deliberate — RLS is keyed on membership, never on merely having an account.
 *
 * Always reports success, even when the address already exists, so the form
 * cannot be used to discover who has an account.
 */
export const signUp = withAction("auth.signUp", async (input: unknown): Promise<ActionResult> => {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl}/auth/callback?next=%2Fos`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      logger.info("auth.signup.existing_email");
      return ok(undefined);
    }
    if (error.code === "signup_disabled") {
      return fail("forbidden", "New accounts are not being accepted right now. Ask an admin for an invitation.");
    }
    const code = error.code === "weak_password" ? "validation" : "external";
    logger.warn("auth.signup.failed", { code: error.code });
    return fail(code, authErrorMessage(error), { fieldErrors: { password: [authErrorMessage(error)] } });
  }

  logger.info("auth.signup.created");
  return ok(undefined);
});

/**
 * Settings → Profile: record a photo the browser has already uploaded.
 *
 * The upload itself goes straight from the browser to Storage, which is what
 * keeps a 2MB file off the Server Action wire. That means this action must not
 * trust the path it is handed: `isOwnAvatarPath` pins it to the caller's own
 * folder and to an extension the bucket accepts, so a forged path cannot point
 * `avatar_url` at somebody else's face or at an arbitrary object.
 *
 * The storage policy would refuse the *write*, but nothing about writing a
 * string into a column consults Storage at all — this is the only check between
 * a forged path and everyone seeing it.
 */
export const setAvatar = withAction("auth.setAvatar", async (input: unknown): Promise<ActionResult> => {
  const parsed = setAvatarSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const viewer = await requireViewer();
  if (!isOwnAvatarPath(parsed.data.path, viewer.userId)) {
    logger.warn("auth.setAvatar.rejected_path", { userId: viewer.userId });
    return fail("forbidden", "That photo could not be saved.");
  }

  const supabase = await createClient();
  const previous = avatarPathFromUrl(viewer.profile.avatarUrl);

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl(parsed.data.path) })
    .eq("id", viewer.userId);
  if (error) {
    logger.warn("auth.setAvatar.failed", { code: error.code });
    return fail("unexpected", "Your photo could not be saved. Try again.");
  }

  /*
   * Ordered after the update, and its failure ignored. A leftover file costs
   * storage; a deleted file with the column still pointing at it costs the
   * person their photo. Only one of those is worth failing the action for.
   */
  if (previous && previous !== parsed.data.path) {
    const removed = await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
    if (removed.error) logger.info("auth.setAvatar.old_file_kept", { message: removed.error.message });
  }

  revalidatePath("/os", "layout");
  return ok(undefined);
});

/** Settings → Profile: go back to initials, and take the file with it. */
export const removeAvatar = withAction("auth.removeAvatar", async (): Promise<ActionResult> => {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const previous = avatarPathFromUrl(viewer.profile.avatarUrl);

  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", viewer.userId);
  if (error) {
    logger.warn("auth.removeAvatar.failed", { code: error.code });
    return fail("unexpected", "Your photo could not be removed. Try again.");
  }

  if (previous) {
    const removed = await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
    if (removed.error) logger.info("auth.removeAvatar.old_file_kept", { message: removed.error.message });
  }

  revalidatePath("/os", "layout");
  return ok(undefined);
});

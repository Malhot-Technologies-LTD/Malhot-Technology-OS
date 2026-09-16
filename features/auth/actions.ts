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
import { createClient } from "@/lib/supabase/server";

import { authErrorMessage } from "./lib/auth-errors";
import {
  forgotPasswordSchema,
  magicLinkSchema,
  resetPasswordSchema,
  signInSchema,
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

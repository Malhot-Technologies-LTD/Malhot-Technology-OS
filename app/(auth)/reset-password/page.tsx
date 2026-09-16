import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form.client";
import { getAuthState } from "@/lib/auth/context";

export const metadata: Metadata = { title: "Choose a new password" };

/** Reached from the recovery email via /auth/callback, which has already created a session. */
export default async function ResetPasswordPage() {
  const state = await getAuthState();
  if (state.kind === "anonymous") redirect("/login?error=otp_expired&error_code=otp_expired");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-fg-muted">You will stay signed in on this device.</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}

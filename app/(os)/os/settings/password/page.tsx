import type { Metadata } from "next";

import { ChangePasswordForm } from "@/features/auth/components/change-password-form.client";
import { requireViewer } from "@/lib/auth/context";

export const metadata: Metadata = { title: "Password" };

export default async function PasswordSettingsPage() {
  const viewer = await requireViewer();
  return (
    <section aria-labelledby="password-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="password-heading" className="text-lg font-semibold tracking-tight">
          Password
        </h2>
        <p className="text-sm text-fg-muted">
          Change the password for {viewer.email ?? "your account"}. You will stay signed in on this device.
        </p>
      </div>
      <ChangePasswordForm />
    </section>
  );
}

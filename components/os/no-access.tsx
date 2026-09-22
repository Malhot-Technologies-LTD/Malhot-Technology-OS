import { ShieldOff } from "lucide-react";

import { SignOutButton } from "@/features/auth/components/sign-out-button.client";

/** Signed in, but not a member of any organisation (docs/architecture/authentication-architecture.md#identity-model). */
export function NoAccess({ email }: { email: string | null }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-subtle px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-lg border border-border bg-surface p-8 text-center shadow-s">
        <ShieldOff className="size-6 text-fg-subtle" aria-hidden="true" />
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold tracking-tight">No organisation access</h1>
          <p className="text-sm text-fg-muted">
            {email ? (
              <>
                <span className="font-medium text-fg">{email}</span> is signed in but is not a member of Malhot.
              </>
            ) : (
              "Your account is not a member of Malhot."
            )}{" "}
            Your account exists and is waiting for an admin to approve it. You will get a role — usually Member — and
            the projects you belong to will appear here. Nothing to do but wait; check back shortly.
          </p>
        </div>
        <SignOutButton variant="outline" className="w-full" />
      </div>
    </main>
  );
}

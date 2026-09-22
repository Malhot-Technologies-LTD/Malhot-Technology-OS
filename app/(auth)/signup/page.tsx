import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "@/features/auth/components/sign-up-form.client";

export const metadata: Metadata = { title: "Create account" };

/**
 * Self-service sign-up. Creating an account does not grant access to the
 * organisation — an admin still adds the person to the team — so the copy says
 * so plainly rather than letting someone expect to land inside the OS.
 */
export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Create your Malhot account</h1>
        <p className="text-sm text-fg-muted">
          An admin adds you to the team once your account exists. You will not see any projects until they do.
        </p>
      </div>
      <SignUpForm />
      <p className="text-sm text-fg-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

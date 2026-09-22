import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/features/auth/components/login-form.client";
import { callbackErrorMessage } from "@/features/auth/lib/auth-errors";
import { safeNext } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(first(params.next), siteUrl);
  const error = first(params.error);
  const initialError = error
    ? callbackErrorMessage({
        error,
        errorCode: first(params.error_code),
        errorDescription: first(params.error_description),
      })
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Sign in to Malhot OS</h1>
        <p className="text-sm text-fg-muted">Sign in to continue.</p>
      </div>
      <LoginForm next={next} initialError={initialError} />
      <p className="text-sm text-fg-muted">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-brand hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

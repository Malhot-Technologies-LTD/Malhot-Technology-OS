"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sendMagicLink, signInWithPassword } from "@/features/auth/actions";
import { magicLinkSchema, signInSchema, type MagicLinkInput, type SignInInput } from "@/features/auth/schemas";
import { applyActionError } from "@/lib/forms/action-errors";

type Props = { next?: string | undefined; initialError?: string | undefined };

export function LoginForm({ next, initialError }: Props) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  return mode === "password" ? (
    <PasswordForm next={next} initialError={initialError} onSwitch={() => setMode("magic")} />
  ) : (
    <MagicLinkForm next={next} onSwitch={() => setMode("password")} />
  );
}

function PasswordForm({ next, initialError, onSwitch }: Props & { onSwitch: () => void }) {
  const [pending, startTransition] = useTransition();
  // Error carried over from /auth/callback (e.g. expired link); cleared on the first submit.
  const [callbackError, setCallbackError] = useState(initialError ?? null);
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", next: next ?? "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors("root");
    setCallbackError(null);
    startTransition(async () => {
      const result = await signInWithPassword(values);
      if (!result.ok) applyActionError(form.setError, result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            aria-invalid={Boolean(errors.email)}
            {...form.register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link href="/forgot-password" className="text-sm text-fg-muted underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...form.register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
      </FieldGroup>

      <FieldError errors={[errors.root ?? (callbackError ? { message: callbackError } : undefined)]} />

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <button type="button" onClick={onSwitch} className="text-sm text-fg-muted underline-offset-4 hover:underline">
        Email me a sign-in link instead
      </button>
    </form>
  );
}

function MagicLinkForm({ next, onSwitch }: { next?: string | undefined; onSwitch: () => void }) {
  const [pending, startTransition] = useTransition();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<MagicLinkInput>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "", next: next ?? "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors("root");
    startTransition(async () => {
      const result = await sendMagicLink(values);
      if (result.ok) setSentTo(values.email);
      else applyActionError(form.setError, result.error);
    });
  });

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <p className="text-sm">
          If <span className="font-medium">{sentTo}</span> has a Malhot account, a sign-in link is on its way. It
          expires in one hour.
        </p>
        <Button type="button" variant="outline" onClick={onSwitch}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="magic-email">Email</FieldLabel>
          <Input
            id="magic-email"
            type="email"
            autoComplete="email"
            autoFocus
            aria-invalid={Boolean(errors.email)}
            {...form.register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>
      </FieldGroup>

      <FieldError errors={[errors.root]} />

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Email me a link"}
      </Button>
      <button type="button" onClick={onSwitch} className="text-sm text-fg-muted underline-offset-4 hover:underline">
        Use a password instead
      </button>
    </form>
  );
}

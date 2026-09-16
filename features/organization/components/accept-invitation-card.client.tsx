"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/features/organization/actions";

type Props = { token: string; organizationName: string; role: string };

export function AcceptInvitationCard({ token, organizationName, role }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInvitation({ token });
      if (!result.ok) setError(result.error.message);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-fg-muted">
        You have been invited to join <span className="font-medium text-fg">{organizationName}</span> as{" "}
        <span className="font-medium text-fg">{role}</span>.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="button" size="lg" className="w-full" onClick={accept} disabled={pending} aria-busy={pending}>
        {pending ? "Joining…" : `Join ${organizationName}`}
      </Button>
    </div>
  );
}

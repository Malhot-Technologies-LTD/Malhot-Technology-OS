"use client";

import { LogOut } from "lucide-react";
import { useTransition, type ComponentProps } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";

type Props = Omit<ComponentProps<typeof Button>, "onClick" | "type"> & { label?: string };

export function SignOutButton({ label = "Sign out", children, ...props }: Props) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await signOut();
      // signOut redirects on success; only failures reach here.
      if (!result.ok) toast.error(result.error.message);
    });
  }

  return (
    <Button type="button" onClick={handleClick} disabled={pending} aria-busy={pending} {...props}>
      {children ?? (
        <>
          <LogOut aria-hidden="true" />
          {pending ? "Signing out…" : label}
        </>
      )}
    </Button>
  );
}

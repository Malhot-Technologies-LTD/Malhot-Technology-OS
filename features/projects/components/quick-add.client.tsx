"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addGoal, addMvpItem } from "@/features/projects/actions";

type Props = { projectKey: string; kind: "goal" | "mvp"; disabled?: boolean };

/**
 * One-field add for goals and MVP items, so a new project can satisfy its
 * readiness checklist without leaving the overview. Full editing (description,
 * success criteria, owner, ordering) lives on the Goals & MVP page.
 */
export function QuickAdd({ projectKey, kind, disabled }: Props) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const label = kind === "goal" ? "goal" : "MVP item";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value) {
      setError(`Enter a ${label}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const action = kind === "goal" ? addGoal : addMvpItem;
      const result = await action({ projectKey, title: value });
      if (result.ok) {
        setTitle("");
        toast.success(kind === "goal" ? "Goal added" : "MVP item added");
        inputRef.current?.focus();
      } else {
        setError(result.error.message);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <label htmlFor={`add-${kind}`} className="sr-only">
          Add a {label}
        </label>
        <Input
          id={`add-${kind}`}
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={kind === "goal" ? "e.g. Launch by end of Q4" : "e.g. Public booking page"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `add-${kind}-error` : undefined}
          disabled={disabled || pending}
        />
        <Button type="submit" variant="outline" disabled={disabled || pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      {error ? (
        <p id={`add-${kind}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

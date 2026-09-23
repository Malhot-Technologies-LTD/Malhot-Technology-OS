"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { changeProjectStatus } from "@/features/projects/actions";
import type { ProjectStatus } from "@/types/domain";

/**
 * The transitions a manager can reach from the current status
 * (docs/product/project-lifecycle.md#status-state-machine). The list is the
 * client-side half of the same allowed-pairs table the trigger enforces, so a
 * button never offers a move the database would reject.
 */
const NEXT: Record<ProjectStatus, { status: ProjectStatus; label: string; primary?: boolean }[]> = {
  planning: [{ status: "active", label: "Activate", primary: true }],
  active: [
    { status: "on_hold", label: "Put on hold" },
    { status: "completed", label: "Complete" },
  ],
  on_hold: [
    { status: "active", label: "Resume", primary: true },
    { status: "completed", label: "Complete" },
  ],
  completed: [{ status: "archived", label: "Archive" }],
  archived: [],
};

type Props = { projectId: string; status: ProjectStatus; canChange: boolean };

export function StatusActions({ projectId, status, canChange }: Props) {
  const [pending, startTransition] = useTransition();
  const options = canChange ? NEXT[status] : [];
  if (options.length === 0) return null;

  function move(next: ProjectStatus, label: string) {
    startTransition(async () => {
      const result = await changeProjectStatus({ projectId, status: next });
      if (result.ok) toast.success(`Project moved to ${label.toLowerCase()}`);
      // A readiness failure names the items still outstanding, so the toast is
      // actionable on its own — you should not have to scroll back up the page
      // and read the checklist to work out what the refusal meant.
      else toast.error(result.error.message);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.status}
          variant={option.primary ? "default" : "outline"}
          disabled={pending}
          onClick={() => move(option.status, option.label)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

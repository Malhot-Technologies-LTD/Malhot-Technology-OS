"use client";

import { Check, Link2 } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateTask } from "@/features/tasks/actions";
import { TASK_STATUSES, TASK_STATUS_META, type TaskStatus } from "@/features/tasks/schemas";
import { cn } from "@/lib/utils";

/**
 * The task's place in the workflow, as a row of steps. Whoever may change the
 * task clicks a step to move it there; everyone else reads where it stands.
 */
export function StatusStepper({
  taskId,
  projectKey,
  status,
  canEdit,
}: {
  taskId: string;
  projectKey: string;
  status: TaskStatus;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(status);
  const current = TASK_STATUSES.indexOf(shown);

  function move(next: TaskStatus) {
    if (next === shown) return;
    startTransition(async () => {
      setShown(next);
      const result = await updateTask({ taskId, projectKey, status: next });
      if (result.ok) toast.success(`Moved to ${TASK_STATUS_META[next].label}`);
      else toast.error(result.error.message);
    });
  }

  return (
    <ol
      className="flex w-full items-stretch overflow-x-auto rounded-lg border border-border bg-surface"
      aria-label="Workflow"
      aria-busy={pending}
    >
      {TASK_STATUSES.map((step, index) => {
        const reached = index <= current;
        const here = index === current;
        const content = (
          <>
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                here
                  ? "border-brand bg-brand text-brand-solid-fg"
                  : reached
                    ? "border-brand/40 bg-brand-subtle text-brand"
                    : "border-border bg-surface text-fg-subtle",
              )}
            >
              {reached && !here ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-[13px] whitespace-nowrap",
                here ? "font-semibold text-fg" : reached ? "text-fg-muted" : "text-fg-subtle",
              )}
            >
              {TASK_STATUS_META[step].label}
            </span>
          </>
        );
        return (
          <li key={step} className={cn("relative flex min-w-32 flex-1", index > 0 && "border-l border-border")}>
            {canEdit ? (
              <button
                type="button"
                onClick={() => move(step)}
                disabled={pending}
                aria-current={here ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                  here && "bg-brand-subtle/60",
                )}
              >
                {content}
                <span className="sr-only">{here ? "(current)" : `Move to ${TASK_STATUS_META[step].label}`}</span>
              </button>
            ) : (
              <span
                aria-current={here ? "step" : undefined}
                className={cn("flex w-full items-center gap-2 px-3 py-2.5", here && "bg-brand-subtle/60")}
              >
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Copies the task's address, which is the reference people already say out loud. */
export function CopyLinkButton({ path }: { path: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
          toast.success("Link copied");
        } catch {
          toast.error("Copying is blocked in this browser. Copy the address bar instead.");
        }
      }}
    >
      <Link2 aria-hidden="true" /> Copy link
    </Button>
  );
}

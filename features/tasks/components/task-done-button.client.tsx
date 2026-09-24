"use client";

import { Check, RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateTask } from "@/features/tasks/actions";

type Props = {
  taskId: string;
  projectKey: string;
  title: string;
  done: boolean;
  /** Where it goes back to. Reopening a task should not silently pick a status. */
  reopenTo?: "todo" | "in_progress";
};

/**
 * Finish a task, or put it back.
 *
 * One button rather than a status dropdown, because marking work done is the
 * single most frequent thing anyone does to a task and it should cost one
 * click. The dropdown stays for the other transitions, where the choice
 * actually matters.
 *
 * Reopening is offered in the same place. A task closed by mistake otherwise
 * needs someone to remember that "done" is reversible at all, and the moment
 * they notice is the moment they are looking at this card.
 *
 * `completed_at` is not set here — the `stamp_task_progress` trigger derives it
 * from the status, so a task cannot end up marked done with no time of
 * completion, or reopened while still carrying one.
 */
export function TaskDoneButton({ taskId, projectKey, title, done, reopenTo = "todo" }: Props) {
  const [pending, startTransition] = useTransition();

  function move(status: "done" | "todo" | "in_progress", message: string) {
    startTransition(async () => {
      const result = await updateTask({ taskId, projectKey, status });
      if (result.ok) toast.success(message);
      else toast.error(result.error.message);
    });
  }

  if (done) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={`Reopen ${title}`}
        onClick={() => move(reopenTo, `${title} is open again`)}
      >
        <RotateCcw aria-hidden="true" />
        {pending ? "Reopening…" : "Reopen"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      aria-label={`Mark ${title} done`}
      onClick={() => move("done", `${title} is done`)}
    >
      <Check aria-hidden="true" />
      {pending ? "Saving…" : "Mark done"}
    </Button>
  );
}

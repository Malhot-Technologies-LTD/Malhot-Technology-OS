"use client";

import { Check, Handshake } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { acceptTask } from "@/features/tasks/actions";

type Props = {
  taskId: string;
  projectKey: string;
  title: string;
  acceptedAt: string | null;
};

/**
 * The assignee acknowledging a task: seen, and mine to do.
 *
 * Assigning is one person's decision; accepting is the other person's. Without
 * the second half a manager cannot tell "they are on it" from "they have not
 * opened the app since Friday", and that is precisely the difference that
 * matters the day before a deadline.
 *
 * Once accepted it stops being a button. There is nothing to un-accept — the
 * acknowledgement has happened — and leaving a pressable control there would
 * invite people to toggle a fact about the past. Handing the task to somebody
 * else clears it, which the database does rather than the interface.
 */
export function TaskAcceptButton({ taskId, projectKey, title, acceptedAt }: Props) {
  const [pending, startTransition] = useTransition();

  if (acceptedAt) {
    return (
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-status-success-fg">
        <Check className="size-3.5" aria-hidden="true" />
        Accepted
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      aria-label={`Accept ${title}`}
      onClick={() =>
        startTransition(async () => {
          const result = await acceptTask({ taskId, projectKey });
          if (result.ok) toast.success(`You have taken on ${title}`);
          else toast.error(result.error.message);
        })
      }
    >
      <Handshake aria-hidden="true" />
      {pending ? "Accepting…" : "Accept"}
    </Button>
  );
}

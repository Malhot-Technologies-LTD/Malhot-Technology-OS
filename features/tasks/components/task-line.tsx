import { CircleCheckBig, CircleDashed, CircleDot, Circle } from "lucide-react";
import Link from "next/link";

import { formatDate } from "@/components/os/data-display";
import { PriorityBadge } from "@/components/os/status-badge";
import { UserAvatar } from "@/components/os/user-menu.client";
import { Countdown } from "@/features/tasks/components/countdown.client";
import { taskHref, taskRef } from "@/features/tasks/links";
import { TASK_STATUS_META, type TaskStatus } from "@/features/tasks/schemas";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types/domain";

export type TaskLineData = {
  id: string;
  seq: number;
  title: string;
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
  assignee: { full_name: string; avatar_url: string | null } | null;
};

/** The status as a glyph, so a dense list reads at a glance without a pill per row. */
export function StatusGlyph({ status, className }: { status: TaskStatus; className?: string }) {
  const label = TASK_STATUS_META[status].label;
  const common = cn("size-4 shrink-0", className);
  if (status === "done")
    return <CircleCheckBig className={cn(common, "text-status-success-fg")} aria-label={label} role="img" />;
  if (status === "in_progress")
    return <CircleDot className={cn(common, "text-status-progress-fg")} aria-label={label} role="img" />;
  if (status === "review" || status === "testing")
    return <CircleDot className={cn(common, "text-status-review-fg")} aria-label={label} role="img" />;
  if (status === "backlog")
    return <CircleDashed className={cn(common, "text-fg-subtle")} aria-label={label} role="img" />;
  return <Circle className={cn(common, "text-fg-subtle")} aria-label={label} role="img" />;
}

/**
 * One task as a single dense line: status, reference, title, owner, deadline.
 * The whole line opens the task's page.
 */
export function TaskLine({ task, projectKey }: { task: TaskLineData; projectKey: string }) {
  const done = task.status === "done";
  return (
    <li className="group relative flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg-subtle">
      <StatusGlyph status={task.status} />
      <span className="w-16 shrink-0 font-mono text-xs text-fg-subtle">{taskRef(projectKey, task.seq)}</span>
      <Link
        href={taskHref(projectKey, task.seq)}
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium group-hover:underline after:absolute after:inset-0",
          done && "text-fg-muted line-through",
        )}
        title={task.title}
      >
        {task.title}
      </Link>
      <span className="hidden shrink-0 sm:block">
        <PriorityBadge priority={task.priority} />
      </span>
      <span className="hidden w-24 shrink-0 text-right text-xs sm:block">
        {task.due_at ? (
          done ? (
            <span className="text-fg-subtle">{formatDate(task.due_at)}</span>
          ) : (
            <Countdown dueAt={task.due_at} className="font-medium" />
          )
        ) : (
          <span className="text-fg-subtle">No deadline</span>
        )}
      </span>
      {task.assignee ? (
        <span title={task.assignee.full_name} className="shrink-0">
          <UserAvatar name={task.assignee.full_name} avatarUrl={task.assignee.avatar_url} className="size-6" />
        </span>
      ) : (
        <span className="size-6 shrink-0 rounded-full border border-dashed border-border-strong" title="Unassigned">
          <span className="sr-only">Unassigned</span>
        </span>
      )}
    </li>
  );
}

export function TaskLines({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("-mx-5 -mb-5 divide-y divide-border border-t border-border", className)}>{children}</ul>;
}

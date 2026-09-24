import { CalendarClock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { UserAvatar } from "@/components/os/user-menu.client";
import { formatDate } from "@/components/os/data-display";
import { PriorityBadge, StatusPill } from "@/components/os/status-badge";
import { Countdown } from "@/features/tasks/components/countdown.client";
import { TASK_STATUS_META, type TaskStatus } from "@/features/tasks/schemas";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types/domain";

export type TaskCardData = {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueAt: string | null;
  assignee: { id: string; fullName: string; avatarUrl: string | null } | null;
};

type Props = {
  task: TaskCardData;
  /** Prefixes the reference and links to the project; null inside a project. */
  projectKey: string | null;
  linkProject?: boolean;
  /** Controls, when the reader is allowed any. Rendered in a footer rule. */
  actions?: ReactNode;
};

/**
 * One task, as a card.
 *
 * A row forces every task through the same narrow horizontal budget, so the
 * title competes with the assignee, the date, the countdown and two dropdowns
 * for one line — and the title loses, which is backwards. A card gives the
 * title the top of its own space and lets the rest sit underneath in reading
 * order: who, when, how long.
 *
 * Urgency is carried by the countdown's own colour rather than by tinting the
 * card's border. Tinting would mean comparing the deadline to a clock during
 * render, and the server's clock is not the reader's — the same reason
 * Countdown exists as a client component. One honest signal beats two where
 * one of them is quietly wrong.
 */
export function TaskCard({ task, projectKey, linkProject = false, actions }: Props) {
  const meta = TASK_STATUS_META[task.status];
  const finished = task.status === "done";

  return (
    <article
      className={cn(
        "flex h-full flex-col gap-4 rounded-lg border border-border p-5 transition-[colors,transform] duration-[160ms] ease-standard hover:-translate-y-0.5 hover:border-border-strong",
        finished ? "border-dashed bg-transparent" : "bg-surface",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {projectKey ? (
          linkProject ? (
            <Link
              href={`/os/projects/${projectKey}`}
              className="shrink-0 font-mono text-[13px] text-fg-subtle hover:text-fg hover:underline"
            >
              {projectKey}-{task.seq}
            </Link>
          ) : (
            <span className="shrink-0 font-mono text-[13px] text-fg-subtle">
              {projectKey}-{task.seq}
            </span>
          )
        ) : (
          <span className="shrink-0 font-mono text-[13px] text-fg-subtle">#{task.seq}</span>
        )}
        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <h3
          className={cn("text-[15px] leading-snug font-medium", finished && "text-fg-muted line-through")}
          title={task.title}
        >
          {task.title}
        </h3>
        {task.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-fg-muted">{task.description}</p>
        ) : null}
      </div>

      <dl className="mt-auto flex flex-col gap-2 text-[13px]">
        <dt className="sr-only">Assigned to</dt>
        <dd className="flex min-w-0 items-center gap-2">
          {task.assignee ? (
            <>
              <UserAvatar name={task.assignee.fullName} avatarUrl={task.assignee.avatarUrl} className="size-6" />
              <span className="truncate text-fg-muted">{task.assignee.fullName}</span>
            </>
          ) : (
            <span className="text-fg-subtle">Unassigned</span>
          )}
        </dd>

        <dt className="sr-only">Due</dt>
        <dd className="flex min-w-0 items-center gap-2">
          {task.dueAt ? (
            <>
              <CalendarClock className="size-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
              <span className="text-fg-muted">{formatDate(task.dueAt)}</span>
              {finished ? null : <Countdown dueAt={task.dueAt} className="font-medium" />}
            </>
          ) : (
            <span className="text-fg-subtle">No deadline</span>
          )}
        </dd>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <PriorityBadge priority={task.priority} />
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </article>
  );
}

/** The grid tasks live in, so every surface lays them out the same way. */
export function TaskGrid({ children }: { children: ReactNode }) {
  return <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{children}</ul>;
}

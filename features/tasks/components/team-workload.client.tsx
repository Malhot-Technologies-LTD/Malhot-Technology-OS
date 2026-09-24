"use client";

import { CalendarClock, UserX } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/os/user-menu.client";
import { formatDate } from "@/components/os/data-display";
import { PriorityBadge, StatusPill } from "@/components/os/status-badge";
import { Countdown } from "@/features/tasks/components/countdown.client";
import { TASK_STATUS_META, type TaskStatus } from "@/features/tasks/schemas";
import type { Priority } from "@/types/domain";

export type WorkloadTask = {
  id: string;
  seq: number;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueAt: string | null;
  projectKey: string | null;
};

export type WorkloadPerson = {
  userId: string | null; // null is the unassigned bucket
  fullName: string;
  avatarUrl: string | null;
  tasks: WorkloadTask[];
};

/**
 * Who is carrying what, and what runs out first.
 *
 * Grouped by person rather than listed by deadline, because a manager's
 * question is about people before it is about dates: one person holding six
 * things is a problem even when none of them is due today, and a flat list
 * sorted by deadline hides that completely.
 *
 * Unassigned work gets its own group at the end rather than being left out.
 * A task nobody owns is not a task with no problem — it is the manager's.
 */
export function TeamWorkload({ people }: { people: readonly WorkloadPerson[] }) {
  if (people.length === 0) {
    return <p className="text-[15px] text-fg-muted">No open work across your projects.</p>;
  }

  return (
    <ul className="flex flex-col gap-5">
      {people.map((person) => (
        <li
          key={person.userId ?? "unassigned"}
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
        >
          <div className="flex items-center gap-3">
            {person.userId ? (
              <UserAvatar name={person.fullName} avatarUrl={person.avatarUrl} />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-status-warning-bg text-status-warning-fg">
                <UserX className="size-4" aria-hidden="true" />
              </span>
            )}
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-medium">{person.fullName}</span>
              <span className="text-sm text-fg-muted tabular-nums">
                {person.tasks.length} open {person.tasks.length === 1 ? "task" : "tasks"}
              </span>
            </div>
          </div>

          <ul className="flex flex-col divide-y divide-border">
            {person.tasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {task.projectKey ? (
                    <Link
                      href={`/os/projects/${task.projectKey}`}
                      className="shrink-0 font-mono text-[13px] text-fg-subtle hover:text-fg hover:underline"
                    >
                      {task.projectKey}-{task.seq}
                    </Link>
                  ) : null}
                  <span className="min-w-0 truncate text-[15px]" title={task.title}>
                    {task.title}
                  </span>
                </span>

                {task.dueAt ? (
                  <span className="flex shrink-0 items-center gap-2 text-[13px] text-fg-muted">
                    <CalendarClock className="size-3.5" aria-hidden="true" />
                    {formatDate(task.dueAt)}
                    <Countdown dueAt={task.dueAt} className="font-medium" />
                  </span>
                ) : (
                  <span className="shrink-0 text-[13px] text-fg-subtle">No deadline</span>
                )}

                <PriorityBadge priority={task.priority} />
                <StatusPill tone={TASK_STATUS_META[task.status].tone}>{TASK_STATUS_META[task.status].label}</StatusPill>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

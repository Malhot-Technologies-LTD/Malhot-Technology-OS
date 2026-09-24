"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { formatDate } from "@/components/os/data-display";
import { PriorityBadge, StatusPill } from "@/components/os/status-badge";
import { UserAvatar } from "@/components/os/user-menu.client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Countdown } from "@/features/tasks/components/countdown.client";
import { TASK_STATUS_META } from "@/features/tasks/schemas";
import type { TaskCardData } from "@/features/tasks/components/task-card";

type Props = {
  task: TaskCardData;
  projectKey: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The same controls the card carries, repeated where the detail is read. */
  actions?: ReactNode;
};

/**
 * Everything about one task, in a side panel
 * (docs/design/design-system.md#os — side panels are 520px).
 *
 * A panel rather than a page because a task is read in the context of the list
 * it came from: you open three in a row to decide what to do first, and a route
 * change each time would lose your place in the grid and your scroll position
 * with it.
 *
 * The card shows what you need to triage — who, when, how long. This shows what
 * you need to actually do the thing: the description in full rather than two
 * clamped lines, and the history of the task as a sequence of moments rather
 * than a status word that hides when each of them happened.
 */
export function TaskDetailSheet({ task, projectKey, open, onOpenChange, actions }: Props) {
  const meta = TASK_STATUS_META[task.status];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[520px]">
        <SheetHeader>
          <div className="flex items-center gap-2">
            {projectKey ? (
              <Link
                href={`/os/projects/${projectKey}`}
                className="font-mono text-[13px] text-fg-subtle hover:text-fg hover:underline"
              >
                {projectKey}-{task.seq}
              </Link>
            ) : (
              <span className="font-mono text-[13px] text-fg-subtle">#{task.seq}</span>
            )}
            <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
            <PriorityBadge priority={task.priority} />
          </div>
          <SheetTitle className="text-xl leading-snug">{task.title}</SheetTitle>
          {task.description ? (
            <SheetDescription className="text-[15px] leading-relaxed whitespace-pre-line">
              {task.description}
            </SheetDescription>
          ) : (
            <SheetDescription>No description was given.</SheetDescription>
          )}
        </SheetHeader>

        <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-4">
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">Who</h3>
            {task.assignee ? (
              <div className="flex items-center gap-3">
                <UserAvatar name={task.assignee.fullName} avatarUrl={task.assignee.avatarUrl} />
                <span className="text-[15px]">{task.assignee.fullName}</span>
              </div>
            ) : (
              <p className="text-[15px] text-fg-muted">
                Nobody yet. Work with no owner tends to stay that way — it is worth handing to someone.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">Deadline</h3>
            {task.dueAt ? (
              <p className="flex flex-wrap items-baseline gap-2 text-[15px]">
                <span>{formatDate(task.dueAt)}</span>
                {task.status === "done" ? null : <Countdown dueAt={task.dueAt} className="font-medium" />}
              </p>
            ) : (
              <p className="text-[15px] text-fg-muted">None set.</p>
            )}
          </section>

          {/*
           * A history rather than a status word. "In progress" does not say
           * when it was picked up or how long it sat unacknowledged first, and
           * those are the two facts a late task turns on.
           */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">What has happened</h3>
            <ol className="flex flex-col gap-2 text-[15px]">
              <Moment label="Created" at={task.createdAt ?? null} />
              <Moment label="Accepted" at={task.acceptedAt} pendingNote="Not accepted yet" />
              <Moment label="Started" at={task.startedAt ?? null} pendingNote="Not started" />
              <Moment label="Finished" at={task.completedAt ?? null} pendingNote="Not finished" />
            </ol>
          </section>

          {actions ? (
            <section className="flex flex-col gap-3 border-t border-border pt-5">
              <h3 className="text-xs font-medium tracking-[0.08em] text-fg-subtle uppercase">Actions</h3>
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Moment({ label, at, pendingNote }: { label: string; at: string | null; pendingNote?: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-fg-muted">{label}</span>
      {at ? (
        <span className="tabular-nums">{formatDate(at)}</span>
      ) : (
        <span className="text-fg-subtle">{pendingNote ?? "—"}</span>
      )}
    </li>
  );
}

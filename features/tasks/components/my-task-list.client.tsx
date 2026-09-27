"use client";

import { Circle, CircleCheck, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/os/empty-state";
import { PriorityBadge, StatusPill } from "@/components/os/status-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateTask } from "@/features/tasks/actions";
import { Countdown } from "@/features/tasks/components/countdown.client";
import { TaskAcceptButton } from "@/features/tasks/components/task-accept-button.client";
import { groupTasks, type MyTask } from "@/features/tasks/due-groups";
import { taskHref, taskRef } from "@/features/tasks/links";
import { TASK_STATUSES, TASK_STATUS_META } from "@/features/tasks/schemas";
import { cn } from "@/lib/utils";

const dateFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

// The clock as an external store: null during server render and hydration,
// the real time once the browser takes over. Re-read every minute.
function subscribe(callback: () => void) {
  const timer = setInterval(callback, 60_000);
  return () => clearInterval(timer);
}
let cachedMinute = 0;
let cachedNow: Date | null = null;
function getNow(): Date {
  const minute = Math.floor(Date.now() / 60_000);
  if (minute !== cachedMinute || !cachedNow) {
    cachedMinute = minute;
    cachedNow = new Date();
  }
  return cachedNow;
}

/**
 * What the reader owes, grouped by when it is due, with search and filters.
 * Rows, not cards: a list you scan and act on, where each row opens the task's
 * own page.
 */
export function MyTaskList({ tasks }: { tasks: readonly MyTask[] }) {
  const now = useSyncExternalStore(subscribe, getNow, () => null);
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("all");
  const [status, setStatus] = useState("all");

  const projects = useMemo(
    () => [...new Map(tasks.map((task) => [task.project.key, task.project.name])).entries()],
    [tasks],
  );

  const filtered = tasks.filter((task) => {
    if (project !== "all" && task.project.key !== project) return false;
    if (status !== "all" && task.status !== status) return false;
    if (query) {
      const needle = query.toLowerCase();
      const haystack = `${task.title} ${taskRef(task.project.key, task.seq)} ${task.project.name}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const groups = now ? groupTasks(filtered, now) : [{ key: "all", label: "", tasks: filtered }];
  const counts = now ? Object.fromEntries(groupTasks(tasks, now).map((group) => [group.key, group.tasks.length])) : {};

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary label="Open" value={tasks.length} />
        <Summary
          label="Overdue"
          value={counts.overdue ?? 0}
          tone={counts.overdue ? "danger" : undefined}
          ready={Boolean(now)}
        />
        <Summary
          label="Due today"
          value={counts.today ?? 0}
          tone={counts.today ? "warning" : undefined}
          ready={Boolean(now)}
        />
        <Summary
          label="Not accepted"
          value={tasks.filter((task) => !task.acceptedAt).length}
          tone={tasks.some((task) => !task.acceptedAt) ? "warning" : undefined}
        />
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 max-sm:basis-full">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <label htmlFor="task-search" className="sr-only">
            Search your tasks
          </label>
          <Input
            id="task-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title or reference"
            className="pl-9"
          />
        </div>
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="w-48 max-sm:flex-1" aria-label="Filter by project">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map(([key, name]) => (
              <SelectItem key={key} value={key}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 max-sm:flex-1" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {TASK_STATUSES.filter((value) => value !== "done").map((value) => (
              <SelectItem key={value} value={value}>
                {TASK_STATUS_META[value].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          variant="well"
          icon={Search}
          title="No tasks match"
          description="Try a different search, or clear the filters."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={group.label ? `group-${group.key}` : undefined}>
              {group.label ? (
                <h2
                  id={`group-${group.key}`}
                  className={cn(
                    "mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.06em] uppercase",
                    group.key === "overdue" ? "text-status-danger-fg" : "text-fg-subtle",
                  )}
                >
                  {group.label}
                  <span className="rounded-full bg-bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-fg-muted tabular-nums">
                    {group.tasks.length}
                  </span>
                </h2>
              ) : null}
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                {group.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: MyTask }) {
  const [pending, startTransition] = useTransition();
  const meta = TASK_STATUS_META[task.status];
  const href = taskHref(task.project.key, task.seq);

  const complete = () =>
    startTransition(async () => {
      const result = await updateTask({ taskId: task.id, projectKey: task.project.key, status: "done" });
      if (result.ok) toast.success(`${task.title} is done`);
      else toast.error(result.error.message);
    });

  return (
    <li
      className={cn(
        "group relative flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-bg-subtle sm:flex-nowrap",
        pending && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={complete}
        disabled={pending}
        aria-label={`Mark ${task.title} as done`}
        className="relative z-10 shrink-0 rounded-full text-fg-subtle transition-colors hover:text-status-success-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Circle className="size-5 group-hover:hidden" aria-hidden="true" />
        <CircleCheck className="hidden size-5 group-hover:block" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 max-sm:basis-[calc(100%-2.5rem)]">
        <Link
          href={href}
          className="truncate text-[15px] font-medium after:absolute after:inset-0 hover:underline"
          title={task.title}
        >
          {task.title}
        </Link>
        <span className="truncate text-[13px] text-fg-subtle">
          <span className="font-mono">{taskRef(task.project.key, task.seq)}</span> · {task.project.name}
        </span>
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-2 max-sm:pl-9">
        {task.acceptedAt ? null : (
          <TaskAcceptButton taskId={task.id} projectKey={task.project.key} title={task.title} acceptedAt={null} />
        )}
        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="shrink-0 text-right text-[13px] leading-tight max-sm:ml-auto sm:w-36">
        {task.dueAt ? (
          <>
            <DueLabel iso={task.dueAt} />
            <Countdown dueAt={task.dueAt} className="block font-medium" />
          </>
        ) : (
          <span className="text-fg-subtle">No deadline</span>
        )}
      </div>
    </li>
  );
}

/** The deadline in the reader's timezone, filled after hydration like the countdown beside it. */
function DueLabel({ iso }: { iso: string }) {
  const now = useSyncExternalStore(subscribe, getNow, () => null);
  if (!now) return null;
  const date = new Date(iso);
  return (
    <span className="block text-fg-muted">
      {dateFormat.format(date)}, {timeFormat.format(date)}
    </span>
  );
}

function Summary({
  label,
  value,
  tone,
  ready = true,
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning";
  ready?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-4 py-3">
      <dt className="text-[13px] text-fg-muted">{label}</dt>
      <dd
        className={cn(
          "text-2xl font-semibold",
          tone === "danger" && "text-status-danger-fg",
          tone === "warning" && "text-status-warning-fg",
        )}
      >
        {ready ? value : "–"}
      </dd>
    </div>
  );
}

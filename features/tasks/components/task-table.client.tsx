"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Circle, CircleCheck, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/os/empty-state";
import { PriorityBadge, StatusPill } from "@/components/os/status-badge";
import { UserAvatar } from "@/components/os/user-menu.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateTask } from "@/features/tasks/actions";
import { Countdown } from "@/features/tasks/components/countdown.client";
import {
  EMPTY_FILTER,
  filterTasks,
  groupTasks,
  sortTasks,
  type DueFilter,
  type GroupBy,
  type ListTask,
  type SortDirection,
  type SortKey,
  type StatusFilter,
  type TaskFilter,
} from "@/features/tasks/filters";
import { taskHref, taskRef } from "@/features/tasks/links";
import { TASK_STATUSES, TASK_STATUS_META } from "@/features/tasks/schemas";
import { useNow } from "@/features/tasks/use-now";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types/domain";

export type TableTask = ListTask & {
  id: string;
  accepted_at: string | null;
  assignee: { id: string; full_name: string; avatar_url?: string | null } | null;
};

type Props = {
  tasks: readonly TableTask[];
  /** Inside a project every task shares it; across projects each task carries its own. */
  projectKey?: string;
  team?: readonly { userId: string; fullName: string }[];
  viewerUserId: string;
  /** May complete anyone's task here (manager); otherwise only your own. */
  canManage: boolean;
  initialFilter?: Partial<TaskFilter>;
  initialGroup?: GroupBy;
  groupOptions?: readonly GroupBy[];
  /** Rendered at the end of the toolbar: usually "New task". */
  actions?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

const GROUP_LABEL: Record<GroupBy, string> = {
  none: "No grouping",
  status: "Group by status",
  assignee: "Group by person",
  priority: "Group by priority",
  project: "Group by project",
};

/**
 * A searchable, sortable, groupable table of tasks. Every row opens the task's
 * own page; the circle at the start of a row completes it in place for whoever
 * is allowed to.
 */
export function TaskTable({
  tasks,
  projectKey,
  team = [],
  viewerUserId,
  canManage,
  initialFilter,
  initialGroup = "none",
  groupOptions = ["none", "status", "assignee", "priority"],
  actions,
  emptyTitle = "No tasks yet",
  emptyDescription = "Tasks added here appear in this table.",
}: Props) {
  const now = useNow();
  const [filter, setFilter] = useState<TaskFilter>({ ...EMPTY_FILTER, ...initialFilter });
  const [group, setGroup] = useState<GroupBy>(initialGroup);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: "due", direction: "asc" });

  const projects = useMemo(
    () =>
      projectKey
        ? []
        : [
            ...new Map(
              tasks.flatMap((task) => (task.project ? [[task.project.key, task.project.name]] : [])),
            ).entries(),
          ],
    [tasks, projectKey],
  );

  const visible = sortTasks(filterTasks(tasks, filter, { now, viewerUserId, projectKey }), sort.key, sort.direction);
  const groups = groupTasks(visible, group);
  const filtered = JSON.stringify(filter) !== JSON.stringify({ ...EMPTY_FILTER, ...initialFilter });
  const set = <K extends keyof TaskFilter>(key: K, value: TaskFilter[K]) =>
    setFilter((prev) => ({ ...prev, [key]: value }));

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {actions ? <div className="flex justify-end">{actions}</div> : null}
        <EmptyState icon={CircleCheck} title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted" aria-live="polite">
          Showing <span className="font-medium text-fg tabular-nums">{visible.length}</span> of {tasks.length} task
          {tasks.length === 1 ? "" : "s"}
        </p>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 max-sm:basis-full">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search tasks"
            value={filter.query}
            onChange={(event) => set("query", event.target.value)}
            placeholder="Search title, reference or person"
            className="pl-9"
          />
        </div>
        {projects.length > 1 ? (
          <FilterSelect
            label="Project"
            value={filter.project ?? "all"}
            onChange={(value) => set("project", value)}
            options={[["all", "All projects"], ...projects.map(([key, name]) => [key, `${key} · ${name}`] as const)]}
          />
        ) : null}
        <FilterSelect
          label="Status"
          value={filter.status}
          onChange={(value) => set("status", value as StatusFilter)}
          options={[
            ["all", "Any status"],
            ["open", "Open"],
            ...TASK_STATUSES.map((status) => [status, TASK_STATUS_META[status].label] as const),
          ]}
        />
        <FilterSelect
          label="Person"
          value={filter.assignee}
          onChange={(value) => set("assignee", value)}
          options={[
            ["all", "Anyone"],
            ["me", "Assigned to me"],
            ["none", "Unassigned"],
            ...team
              .filter((person) => person.userId !== viewerUserId)
              .map((person) => [person.userId, person.fullName] as const),
          ]}
        />
        <FilterSelect
          label="Priority"
          value={filter.priority}
          onChange={(value) => set("priority", value as Priority | "all")}
          options={[
            ["all", "Any priority"],
            ["urgent", "Urgent"],
            ["high", "High"],
            ["medium", "Medium"],
            ["low", "Low"],
          ]}
        />
        <FilterSelect
          label="Deadline"
          value={filter.due}
          onChange={(value) => set("due", value as DueFilter)}
          options={[
            ["all", "Any deadline"],
            ["overdue", "Overdue"],
            ["today", "Due today"],
            ["week", "Due in 7 days"],
            ["none", "No deadline"],
          ]}
        />
        {groupOptions.length > 1 ? (
          <FilterSelect
            label="Grouping"
            value={group}
            onChange={(value) => setGroup(value as GroupBy)}
            options={groupOptions.map((option) => [option, GROUP_LABEL[option]] as const)}
          />
        ) : null}
        {filtered ? (
          <Button variant="ghost" size="sm" onClick={() => setFilter({ ...EMPTY_FILTER })}>
            <X aria-hidden="true" /> Clear
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          variant="well"
          icon={Search}
          title="No tasks match"
          description="Try another search, or clear the filters."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="border-b border-border bg-bg-subtle text-left text-xs text-fg-subtle">
              <tr>
                <th scope="col" className="w-10 px-3 py-2.5">
                  <span className="sr-only">Done</span>
                </th>
                <SortHeader label="Ref" sortKey="ref" sort={sort} onSort={setSort} className="w-24" />
                <SortHeader label="Title" sortKey="title" sort={sort} onSort={setSort} />
                <SortHeader label="Status" sortKey="status" sort={sort} onSort={setSort} className="w-32" />
                <th scope="col" className="w-44 px-3 py-2.5 font-medium">
                  Assignee
                </th>
                <SortHeader label="Priority" sortKey="priority" sort={sort} onSort={setSort} className="w-28" />
                <SortHeader label="Deadline" sortKey="due" sort={sort} onSort={setSort} className="w-44" />
                <SortHeader label="Created" sortKey="created" sort={sort} onSort={setSort} className="w-24" />
              </tr>
            </thead>
            {groups.map((taskGroup) => (
              <tbody key={taskGroup.key} className="divide-y divide-border">
                {taskGroup.label ? (
                  <tr className="bg-bg-subtle/60">
                    <th
                      colSpan={8}
                      scope="colgroup"
                      className="px-3 py-2 text-left text-xs font-semibold text-fg-muted"
                    >
                      {taskGroup.label}
                      <span className="ml-2 rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-medium tabular-nums">
                        {taskGroup.tasks.length}
                      </span>
                    </th>
                  </tr>
                ) : null}
                {taskGroup.tasks.map((task) => (
                  <Row
                    key={task.id}
                    task={task}
                    projectKey={projectKey ?? task.project?.key ?? ""}
                    canEdit={canManage || task.assignee?.id === viewerUserId}
                    showProject={!projectKey}
                  />
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </div>
  );
}

function Row({
  task,
  projectKey,
  canEdit,
  showProject,
}: {
  task: TableTask;
  projectKey: string;
  canEdit: boolean;
  showProject: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const done = task.status === "done";
  const meta = TASK_STATUS_META[task.status];
  const href = taskHref(projectKey, task.seq);

  const toggle = () =>
    startTransition(async () => {
      const result = await updateTask({ taskId: task.id, projectKey, status: done ? "todo" : "done" });
      if (result.ok) toast.success(done ? `${task.title} reopened` : `${task.title} is done`);
      else toast.error(result.error.message);
    });

  return (
    <tr className={cn("group relative transition-colors hover:bg-bg-subtle", pending && "opacity-60")}>
      <td className="px-3 py-2.5">
        {canEdit ? (
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} as done`}
            className="relative z-10 flex rounded-full text-fg-subtle transition-colors hover:text-status-success-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {done ? (
              <CircleCheck className="size-5 text-status-success-fg" aria-hidden="true" />
            ) : (
              <Circle className="size-5" aria-hidden="true" />
            )}
          </button>
        ) : done ? (
          <CircleCheck className="size-5 text-status-success-fg" aria-label="Done" role="img" />
        ) : (
          <Circle className="size-5 text-border-strong" aria-hidden="true" />
        )}
      </td>
      <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap text-fg-subtle">
        {taskRef(projectKey, task.seq)}
      </td>
      <td className="max-w-0 px-3 py-2.5">
        <Link
          href={href}
          title={task.title}
          className={cn(
            "block truncate font-medium group-hover:underline after:absolute after:inset-0",
            done && "text-fg-muted line-through",
          )}
        >
          {task.title}
        </Link>
        {showProject && task.project ? (
          <span className="block truncate text-xs text-fg-subtle">{task.project.name}</span>
        ) : null}
      </td>
      <td className="px-3 py-2.5">
        <span className="flex flex-col items-start gap-1">
          <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
          {!done && task.assignee && !task.accepted_at ? (
            <span className="text-[11px] font-medium text-status-warning-fg">Not accepted</span>
          ) : null}
        </span>
      </td>
      <td className="px-3 py-2.5">
        {task.assignee ? (
          <span className="flex min-w-0 items-center gap-2">
            <UserAvatar
              name={task.assignee.full_name}
              avatarUrl={task.assignee.avatar_url ?? null}
              className="size-6"
            />
            <span className="truncate">{task.assignee.full_name}</span>
          </span>
        ) : (
          <span className="text-fg-subtle">Unassigned</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <PriorityBadge priority={task.priority} />
      </td>
      <td className="px-3 py-2.5 text-[13px] leading-tight">
        {task.due_at ? (
          <>
            <Deadline iso={task.due_at} />
            {done ? null : <Countdown dueAt={task.due_at} className="block font-medium" />}
          </>
        ) : (
          <span className="text-fg-subtle">No deadline</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-[13px] whitespace-nowrap text-fg-subtle">
        <Deadline iso={task.created_at} dateOnly />
      </td>
    </tr>
  );
}

/** Times in the reader's own zone, filled in once the browser has taken over. */
function Deadline({ iso, dateOnly = false }: { iso: string; dateOnly?: boolean }) {
  const now = useNow();
  if (!now) return <span className="block text-fg-subtle">…</span>;
  const date = new Date(iso);
  return (
    <span className="block text-fg-muted">
      {dateFormat.format(date)}
      {dateOnly ? null : `, ${timeFormat.format(date)}`}
    </span>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; direction: SortDirection };
  onSort: (next: { key: SortKey; direction: SortDirection }) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = active ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      scope="col"
      className={cn("px-3 py-2.5 font-medium", className)}
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort({ key: sortKey, direction: active && sort.direction === "asc" ? "desc" : "asc" })}
        className={cn(
          "inline-flex items-center gap-1 rounded hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          active && "text-fg",
        )}
      >
        {label}
        <Icon className="size-3" aria-hidden="true" />
      </button>
    </th>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-auto min-w-36 max-sm:flex-1" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([optionValue, optionLabel]) => (
          <SelectItem key={optionValue} value={optionValue}>
            {optionLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

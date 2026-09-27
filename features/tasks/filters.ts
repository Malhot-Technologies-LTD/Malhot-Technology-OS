import { TASK_STATUSES, TASK_STATUS_META, type TaskStatus } from "@/features/tasks/schemas";
import type { Priority } from "@/types/domain";

/**
 * Filtering, sorting and grouping for task lists, shared by a project's Tasks
 * tab and My Tasks. Pure, with the clock passed in, so "overdue" means the same
 * thing in a test as it does on screen.
 */

export type ListTask = {
  seq: number;
  title: string;
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
  created_at: string;
  completed_at?: string | null;
  assignee: { id: string; full_name: string } | null;
  project?: { key: string; name: string } | null;
};

export type StatusFilter = "all" | "open" | TaskStatus;
export type DueFilter = "all" | "overdue" | "today" | "week" | "none";

export type TaskFilter = {
  query: string;
  status: StatusFilter;
  /** "all", "me", "none" (unassigned) or a user id. */
  assignee: string;
  priority: "all" | Priority;
  due: DueFilter;
  /** A project key, or "all". */
  project?: string;
};

export const EMPTY_FILTER: TaskFilter = {
  query: "",
  status: "all",
  assignee: "all",
  priority: "all",
  due: "all",
  project: "all",
};

const DAY = 86_400_000;

export function filterTasks<T extends ListTask>(
  tasks: readonly T[],
  filter: TaskFilter,
  context: { now: Date | null; viewerUserId: string; projectKey?: string },
): T[] {
  const needle = filter.query.trim().toLowerCase();
  const nowMs = context.now?.getTime() ?? null;
  const startOfToday = context.now
    ? new Date(context.now.getFullYear(), context.now.getMonth(), context.now.getDate()).getTime()
    : null;

  return tasks.filter((task) => {
    if (filter.status === "open" && task.status === "done") return false;
    if (filter.status !== "all" && filter.status !== "open" && task.status !== filter.status) return false;
    if (filter.priority !== "all" && task.priority !== filter.priority) return false;
    if (filter.project && filter.project !== "all" && task.project?.key !== filter.project) return false;

    if (filter.assignee === "me" && task.assignee?.id !== context.viewerUserId) return false;
    if (filter.assignee === "none" && task.assignee) return false;
    if (!["all", "me", "none"].includes(filter.assignee) && task.assignee?.id !== filter.assignee) return false;

    if (filter.due !== "all") {
      if (filter.due === "none") {
        if (task.due_at) return false;
      } else {
        // Date filters need the reader's clock; before it arrives, nothing is hidden.
        if (nowMs === null || startOfToday === null) return true;
        if (!task.due_at || task.status === "done") return false;
        const due = Date.parse(task.due_at);
        if (filter.due === "overdue" && due >= nowMs) return false;
        // "Today" is what is still to come today; what already slipped is overdue, as on My Tasks.
        if (filter.due === "today" && (due < nowMs || due >= startOfToday + DAY)) return false;
        if (filter.due === "week" && (due < nowMs || due >= startOfToday + 7 * DAY)) return false;
      }
    }

    if (needle) {
      const key = task.project?.key ?? context.projectKey ?? "";
      const haystack = `${task.title} ${key}-${task.seq} ${task.project?.name ?? ""} ${task.assignee?.full_name ?? ""}`;
      if (!haystack.toLowerCase().includes(needle)) return false;
    }
    return true;
  });
}

export type SortKey = "due" | "priority" | "created" | "ref" | "title" | "status";
export type SortDirection = "asc" | "desc";

const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_RANK = Object.fromEntries(TASK_STATUSES.map((status, index) => [status, index])) as Record<
  TaskStatus,
  number
>;

/**
 * Sorted copy. Undated tasks always sort after dated ones whichever way the
 * deadline column is turned: "no deadline" is not earlier or later, it is none.
 */
export function sortTasks<T extends ListTask>(
  tasks: readonly T[],
  key: SortKey,
  direction: SortDirection = "asc",
): T[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...tasks].sort((a, b) => {
    let result = 0;
    switch (key) {
      case "due":
        if (!a.due_at || !b.due_at) {
          if (a.due_at === b.due_at) result = 0;
          else return a.due_at ? -1 : 1;
        } else result = sign * a.due_at.localeCompare(b.due_at);
        break;
      case "priority":
        result = sign * (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
        break;
      case "created":
        result = sign * a.created_at.localeCompare(b.created_at);
        break;
      case "ref":
        result = sign * ((a.project?.key ?? "").localeCompare(b.project?.key ?? "") || a.seq - b.seq);
        break;
      case "title":
        result = sign * a.title.localeCompare(b.title);
        break;
      case "status":
        result = sign * (STATUS_RANK[a.status] - STATUS_RANK[b.status]);
        break;
    }
    return result || a.seq - b.seq;
  });
}

export type GroupBy = "none" | "status" | "assignee" | "priority" | "project";
export type TaskGroup<T> = { key: string; label: string; tasks: T[] };

const PRIORITY_LABEL: Record<Priority, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };

/** Groups in a meaningful order (workflow order, urgency first), empty groups dropped. */
export function groupTasks<T extends ListTask>(tasks: readonly T[], by: GroupBy): TaskGroup<T>[] {
  if (by === "none") return [{ key: "all", label: "", tasks: [...tasks] }];

  const groups = new Map<string, TaskGroup<T>>();
  const add = (key: string, label: string, task: T) => {
    const group = groups.get(key) ?? { key, label, tasks: [] };
    group.tasks.push(task);
    groups.set(key, group);
  };
  for (const task of tasks) {
    if (by === "status") add(task.status, TASK_STATUS_META[task.status].label, task);
    else if (by === "priority") add(task.priority, PRIORITY_LABEL[task.priority], task);
    else if (by === "assignee") add(task.assignee?.id ?? "~none", task.assignee?.full_name ?? "Unassigned", task);
    else
      add(
        task.project?.key ?? "~none",
        task.project ? `${task.project.key} · ${task.project.name}` : "No project",
        task,
      );
  }

  const ordered = [...groups.values()];
  if (by === "status")
    return ordered.sort((a, b) => STATUS_RANK[a.key as TaskStatus] - STATUS_RANK[b.key as TaskStatus]);
  if (by === "priority")
    return ordered.sort((a, b) => PRIORITY_RANK[a.key as Priority] - PRIORITY_RANK[b.key as Priority]);
  // "~" sorts after letters, so "Unassigned" and "No project" come last.
  return ordered.sort((a, b) =>
    a.key.startsWith("~") ? 1 : b.key.startsWith("~") ? -1 : a.label.localeCompare(b.label),
  );
}

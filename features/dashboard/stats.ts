import { TASK_STATUSES, type TaskStatus } from "@/features/tasks/schemas";
import type { Priority, ProjectStatus } from "@/types/domain";

/**
 * Dashboard figures, computed from rows the viewer can already see.
 *
 * Pure so it can be tested against a fixed clock. Every count is derived from
 * instants (`due_at`, `completed_at`) compared with `now`, which is the same
 * answer in every timezone: "overdue" means the deadline instant has passed,
 * wherever the reader is.
 */

export type DashboardTask = {
  id: string;
  seq: number;
  title: string;
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  accepted_at: string | null;
  assignee: { id: string; full_name: string; avatar_url: string | null } | null;
  project: { id: string; key: string; name: string } | null;
};

export type DashboardProjectRow = {
  id: string;
  key: string;
  name: string;
  status: ProjectStatus;
  target_end_date: string | null;
};

const DAY = 86_400_000;
const WEEK = 7 * DAY;
export const TREND_WEEKS = 8;

export type WeekBucket = { start: string; completed: number; created: number };
export type ProjectHealth = DashboardProjectRow & { total: number; done: number; open: number; overdue: number };
export type PersonLoad = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  open: number;
  overdue: number;
  dueSoon: number;
};

export type DashboardStats = {
  openTasks: number;
  mine: number;
  overdue: number;
  dueSoon: number;
  completedThisWeek: number;
  completedLastWeek: number;
  activeProjects: number;
  planningProjects: number;
  byStatus: { status: TaskStatus; count: number }[];
  weeks: WeekBucket[];
  myNext: DashboardTask[];
  projects: ProjectHealth[];
  people: PersonLoad[];
};

/** Monday 00:00 UTC of the week containing `instant`. */
export function weekStart(instant: number): number {
  const date = new Date(instant);
  const day = (date.getUTCDay() + 6) % 7; // Monday = 0
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day);
}

export function computeDashboardStats(
  tasks: readonly DashboardTask[],
  projects: readonly DashboardProjectRow[],
  viewerId: string,
  now: number,
): DashboardStats {
  const open = tasks.filter((task) => task.completed_at === null);
  const isOverdue = (task: DashboardTask) => task.due_at !== null && Date.parse(task.due_at) < now;
  const isDueSoon = (task: DashboardTask) => {
    if (task.due_at === null) return false;
    const due = Date.parse(task.due_at);
    return due >= now && due < now + WEEK;
  };
  const completedBetween = (from: number, to: number) =>
    tasks.filter((task) => {
      if (task.completed_at === null) return false;
      const at = Date.parse(task.completed_at);
      return at >= from && at < to;
    }).length;

  const thisWeek = weekStart(now);
  const firstWeek = thisWeek - (TREND_WEEKS - 1) * WEEK;
  const weeks: WeekBucket[] = Array.from({ length: TREND_WEEKS }, (_, index) => ({
    start: new Date(firstWeek + index * WEEK).toISOString(),
    completed: 0,
    created: 0,
  }));
  const bucketOf = (iso: string) => {
    const index = Math.floor((weekStart(Date.parse(iso)) - firstWeek) / WEEK);
    return index >= 0 && index < TREND_WEEKS ? weeks[index] : undefined;
  };
  for (const task of tasks) {
    const created = bucketOf(task.created_at);
    if (created) created.created += 1;
    if (task.completed_at) {
      const completed = bucketOf(task.completed_at);
      if (completed) completed.completed += 1;
    }
  }

  const byStatus = TASK_STATUSES.filter((status) => status !== "done").map((status) => ({
    status,
    count: open.filter((task) => task.status === status).length,
  }));

  const myNext = open
    .filter((task) => task.assignee?.id === viewerId)
    .sort((a, b) => dueValue(a) - dueValue(b))
    .slice(0, 6);

  const health: ProjectHealth[] = projects
    .filter((project) => project.status !== "archived")
    .map((project) => {
      const own = tasks.filter((task) => task.project?.id === project.id);
      // Completed tasks older than the trend window are not loaded, so "done"
      // is a floor, not a lifetime total. Progress still reads correctly for
      // anything worked on in the last two months, which is what a dashboard
      // is for; the project page carries the exact figure.
      return {
        ...project,
        total: own.length,
        done: own.filter((task) => task.completed_at !== null).length,
        open: own.filter((task) => task.completed_at === null).length,
        overdue: own.filter((task) => task.completed_at === null && isOverdue(task)).length,
      };
    })
    .sort((a, b) => b.overdue - a.overdue || b.open - a.open || a.name.localeCompare(b.name));

  const people = new Map<string, PersonLoad>();
  for (const task of open) {
    if (!task.assignee) continue;
    const person = people.get(task.assignee.id) ?? {
      id: task.assignee.id,
      fullName: task.assignee.full_name,
      avatarUrl: task.assignee.avatar_url,
      open: 0,
      overdue: 0,
      dueSoon: 0,
    };
    person.open += 1;
    if (isOverdue(task)) person.overdue += 1;
    if (isDueSoon(task)) person.dueSoon += 1;
    people.set(person.id, person);
  }

  return {
    openTasks: open.length,
    mine: open.filter((task) => task.assignee?.id === viewerId).length,
    overdue: open.filter(isOverdue).length,
    dueSoon: open.filter(isDueSoon).length,
    completedThisWeek: completedBetween(now - WEEK, now + 1),
    completedLastWeek: completedBetween(now - 2 * WEEK, now - WEEK),
    activeProjects: projects.filter((project) => project.status === "active").length,
    planningProjects: projects.filter((project) => project.status === "planning").length,
    byStatus,
    weeks,
    myNext,
    projects: health,
    people: [...people.values()].sort((a, b) => b.overdue - a.overdue || b.open - a.open),
  };
}

/** Undated work sorts after dated work: it is not urgent, only unscheduled. */
function dueValue(task: DashboardTask): number {
  return task.due_at ? Date.parse(task.due_at) : Number.POSITIVE_INFINITY;
}

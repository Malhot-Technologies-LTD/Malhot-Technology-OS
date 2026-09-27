import type { TaskStatus } from "@/features/tasks/schemas";
import type { ProjectStatus } from "@/types/domain";

/**
 * The figures a project's pages are built from: progress, health, the burn-up
 * series and who carries what. Pure and clock-injected, so the overview, the
 * progress page, the project list and the tests all compute the same numbers.
 */

const DAY = 86_400_000;
const WEEK = 7 * DAY;

export type InsightTask = {
  id: string;
  status: TaskStatus;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  accepted_at?: string | null;
  assignee: { id: string; full_name: string; avatar_url: string | null } | null;
};

export type TaskTotals = {
  total: number;
  done: number;
  open: number;
  overdue: number;
  dueSoon: number;
  unassigned: number;
  notAccepted: number;
  /** Whole percent of tasks done; 0 when there are none. */
  percent: number;
};

export function taskTotals(tasks: readonly InsightTask[], now: number): TaskTotals {
  let done = 0;
  let overdue = 0;
  let dueSoon = 0;
  let unassigned = 0;
  let notAccepted = 0;
  for (const task of tasks) {
    if (task.status === "done") {
      done += 1;
      continue;
    }
    if (!task.assignee) unassigned += 1;
    else if (!task.accepted_at) notAccepted += 1;
    if (task.due_at) {
      const due = Date.parse(task.due_at);
      if (due < now) overdue += 1;
      else if (due < now + 7 * DAY) dueSoon += 1;
    }
  }
  const total = tasks.length;
  return {
    total,
    done,
    open: total - done,
    overdue,
    dueSoon,
    unassigned,
    notAccepted,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export type Health = "on_track" | "at_risk" | "off_track";

export const HEALTH_META: Record<Health, { label: string; tone: "success" | "warning" | "danger" }> = {
  on_track: { label: "On track", tone: "success" },
  at_risk: { label: "At risk", tone: "warning" },
  off_track: { label: "Off track", tone: "danger" },
};

/**
 * A plain-rules health reading, with the reason, for projects that are running.
 *
 * Deliberately simple enough to explain in one sentence, because a health badge
 * nobody can account for gets ignored. Planning, finished and archived projects
 * have no health: they are not being delivered right now.
 */
export function projectHealth(input: {
  status: ProjectStatus;
  targetEndDate: string | null;
  totals: TaskTotals;
  now: number;
}): { health: Health; reason: string } | null {
  if (input.status !== "active" && input.status !== "on_hold") return null;
  const { totals } = input;

  if (input.targetEndDate) {
    // End of the target day, local to nobody in particular: a date column.
    const end = Date.parse(`${input.targetEndDate}T23:59:59Z`);
    if (end < input.now && totals.open > 0)
      return { health: "off_track", reason: `Past its target date with ${totals.open} open` };
  }

  const overdueShare = totals.open === 0 ? 0 : totals.overdue / totals.open;
  if (totals.overdue >= 3 && overdueShare >= 0.25)
    return { health: "off_track", reason: `${totals.overdue} of ${totals.open} open tasks are overdue` };
  if (totals.overdue > 0) return { health: "at_risk", reason: plural(totals.overdue, "task", "overdue") };

  if (input.targetEndDate) {
    const left = daysLeft(input.targetEndDate, input.now);
    if (left <= 7 && totals.total > 0 && totals.percent < 75)
      return { health: "at_risk", reason: `${Math.max(0, left)} days left at ${totals.percent}% done` };
  }

  return { health: "on_track", reason: totals.total === 0 ? "No tasks yet" : "No overdue work" };
}

function plural(count: number, noun: string, suffix: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"} ${suffix}`;
}

export type BurnupPoint = { start: number; created: number; done: number };

/**
 * Cumulative created vs completed at the end of each week, oldest first.
 *
 * Burn-up rather than burn-down because scope moves: when the created line
 * climbs faster than the done line, the gap *is* the story, and a burn-down
 * hides it by redrawing its own baseline.
 */
export function burnup(tasks: readonly InsightTask[], now: number, weeks = 10): BurnupPoint[] {
  const thisWeek = startOfWeek(now);
  const points: BurnupPoint[] = [];
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const start = thisWeek - index * WEEK;
    const end = Math.min(start + WEEK, now);
    let created = 0;
    let done = 0;
    for (const task of tasks) {
      if (Date.parse(task.created_at) <= end) created += 1;
      if (task.completed_at && Date.parse(task.completed_at) <= end) done += 1;
    }
    points.push({ start, created, done });
  }
  return points;
}

/** Monday 00:00 UTC of the week containing `at`. */
export function startOfWeek(at: number): number {
  const date = new Date(at);
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const weekday = (date.getUTCDay() + 6) % 7;
  return midnight - weekday * DAY;
}

export type Workload = {
  userId: string | null;
  fullName: string;
  avatarUrl: string | null;
  open: number;
  overdue: number;
  inProgress: number;
  done: number;
};

/** Per person, busiest first; unassigned work is its own row so it is never lost. */
export function workload(tasks: readonly InsightTask[], now: number): Workload[] {
  const rows = new Map<string, Workload>();
  for (const task of tasks) {
    const key = task.assignee?.id ?? "none";
    const row = rows.get(key) ?? {
      userId: task.assignee?.id ?? null,
      fullName: task.assignee?.full_name ?? "Unassigned",
      avatarUrl: task.assignee?.avatar_url ?? null,
      open: 0,
      overdue: 0,
      inProgress: 0,
      done: 0,
    };
    if (task.status === "done") row.done += 1;
    else {
      row.open += 1;
      if (task.status === "in_progress") row.inProgress += 1;
      if (task.due_at && Date.parse(task.due_at) < now) row.overdue += 1;
    }
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => {
    if ((a.userId === null) !== (b.userId === null)) return a.userId === null ? 1 : -1;
    return b.open - a.open || a.fullName.localeCompare(b.fullName);
  });
}

export function statusCounts(tasks: readonly { status: TaskStatus }[]): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    review: 0,
    testing: 0,
    done: 0,
  };
  for (const task of tasks) counts[task.status] += 1;
  return counts;
}

export type FlowStats = {
  /** Median days from creation to completion, over work finished in the last 60 days. */
  medianDaysToDone: number | null;
  /** Tasks finished per week, averaged over the last four weeks. */
  weeklyThroughput: number;
  doneThisWeek: number;
  createdLastTwoWeeks: number;
};

/** How fast work moves through the project. */
export function flowStats(tasks: readonly InsightTask[], now: number): FlowStats {
  const recent: number[] = [];
  let lastFourWeeks = 0;
  let doneThisWeek = 0;
  let createdLastTwoWeeks = 0;
  const weekStart = startOfWeek(now);
  for (const task of tasks) {
    const created = Date.parse(task.created_at);
    if (created >= now - 14 * DAY) createdLastTwoWeeks += 1;
    if (!task.completed_at) continue;
    const completed = Date.parse(task.completed_at);
    if (completed >= now - 60 * DAY) recent.push(Math.max(0, (completed - created) / DAY));
    if (completed >= now - 28 * DAY) lastFourWeeks += 1;
    if (completed >= weekStart) doneThisWeek += 1;
  }
  recent.sort((a, b) => a - b);
  const middle = Math.floor(recent.length / 2);
  const median =
    recent.length === 0 ? null : recent.length % 2 ? recent[middle]! : (recent[middle - 1]! + recent[middle]!) / 2;
  return {
    medianDaysToDone: median === null ? null : Math.round(median * 10) / 10,
    weeklyThroughput: Math.round((lastFourWeeks / 4) * 10) / 10,
    doneThisWeek,
    createdLastTwoWeeks,
  };
}

/** Whole days from `now` to the end of a date column's day; negative once it has passed. */
export function daysLeft(date: string, now: number): number {
  const end = Date.parse(`${date}T23:59:59Z`);
  return Math.floor((end - now) / DAY);
}

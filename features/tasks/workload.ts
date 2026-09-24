import type { WorkloadPerson } from "@/features/tasks/components/team-workload.client";
import type { TeamTaskRow } from "@/features/tasks/queries";

/**
 * Turns a flat list of open tasks into one group per person.
 *
 * Pure and separate from the page so it can be tested without a database. The
 * ordering decisions are the substance here, and they are opinions worth
 * pinning:
 *
 *   - People are ordered by their soonest deadline, so whoever is closest to
 *     running out is read first. Somebody holding four comfortable tasks should
 *     not outrank somebody holding one that is due in an hour.
 *   - A person with no dated work sorts after everyone who has some, by name.
 *     They are not urgent, they are simply undated.
 *   - Unassigned work is last, always. It belongs to the manager reading the
 *     page, and putting it first would bury the people.
 */
export function groupByAssignee(tasks: readonly TeamTaskRow[]): WorkloadPerson[] {
  const groups = new Map<string, WorkloadPerson>();

  for (const task of tasks) {
    const key = task.assignee?.id ?? "__unassigned__";
    const group = groups.get(key) ?? {
      userId: task.assignee?.id ?? null,
      fullName: task.assignee?.full_name ?? "Unassigned",
      avatarUrl: task.assignee?.avatar_url ?? null,
      tasks: [],
    };
    group.tasks.push({
      id: task.id,
      seq: task.seq,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueAt: task.due_at,
      startedAt: task.started_at,
      acceptedAt: task.accepted_at,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      projectKey: task.project?.key ?? null,
    });
    groups.set(key, group);
  }

  const soonest = (person: WorkloadPerson): number => {
    const dates = person.tasks
      .map((task) => (task.dueAt ? Date.parse(task.dueAt) : Number.NaN))
      .filter((value) => !Number.isNaN(value));
    return dates.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...dates);
  };

  return [...groups.values()].sort((a, b) => {
    // Unassigned always last, whatever its deadlines say.
    if (a.userId === null) return 1;
    if (b.userId === null) return -1;

    const byDeadline = soonest(a) - soonest(b);
    if (byDeadline !== 0 && Number.isFinite(byDeadline)) return byDeadline;
    if (soonest(a) !== soonest(b)) return soonest(a) === Number.POSITIVE_INFINITY ? 1 : -1;
    return a.fullName.localeCompare(b.fullName);
  });
}

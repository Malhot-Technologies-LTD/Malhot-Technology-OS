/**
 * Which tasks a milestone is waiting on.
 *
 * Tasks are not linked to milestones in the schema, so the scope is read from
 * the calendar: a milestone covers the tasks due after the milestone before it
 * and on or before its own date. That is how teams already talk about it
 * ("everything due before the beta") and it needs no second place to keep in
 * sync. Undated tasks belong to no milestone.
 */

export type ScopeMilestone = { id: string; due_date: string };
export type ScopeTask = { due_at: string | null };

export function milestoneScopes<M extends ScopeMilestone, T extends ScopeTask>(
  milestones: readonly M[],
  tasks: readonly T[],
): Map<string, T[]> {
  const ordered = [...milestones].sort((a, b) => a.due_date.localeCompare(b.due_date) || a.id.localeCompare(b.id));
  const scopes = new Map<string, T[]>(ordered.map((milestone) => [milestone.id, []]));
  for (const task of tasks) {
    if (!task.due_at) continue;
    const day = task.due_at.slice(0, 10);
    const owner = ordered.find((milestone) => day <= milestone.due_date);
    if (owner) scopes.get(owner.id)!.push(task);
  }
  return scopes;
}

export type MilestoneState = "reached" | "overdue" | "upcoming";

export function milestoneState(
  milestone: { due_date: string; completed_at: string | null },
  today: string,
): MilestoneState {
  if (milestone.completed_at) return "reached";
  return milestone.due_date < today ? "overdue" : "upcoming";
}

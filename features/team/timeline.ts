/**
 * What someone has been doing, from the moments their tasks record: accepted,
 * started, finished. Derived rather than logged, like the project feed
 * (features/projects/activity.ts), so it cannot disagree with the tasks. It
 * shows work moving, not time spent: no hours, no online status, no ranking.
 */

export type TimelineTask = {
  id: string;
  seq: number;
  title: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  project: { key: string; name: string } | null;
};

export type TimelineEntry = {
  id: string;
  verb: "accepted" | "started" | "finished";
  at: string;
  task: TimelineTask;
};

export function memberTimeline(tasks: readonly TimelineTask[], limit = 15): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const seen = new Set<string>();
  for (const task of tasks) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    if (task.accepted_at) entries.push({ id: `${task.id}-a`, verb: "accepted", at: task.accepted_at, task });
    if (task.started_at) entries.push({ id: `${task.id}-s`, verb: "started", at: task.started_at, task });
    if (task.completed_at) entries.push({ id: `${task.id}-c`, verb: "finished", at: task.completed_at, task });
  }
  return entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}

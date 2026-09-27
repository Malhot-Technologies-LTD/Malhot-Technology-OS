/**
 * A project's activity feed, derived from the timestamps the rows already
 * carry rather than written to a log table as things happen.
 *
 * Derived for the same reason the acceptance feed is (features/tasks/queries.ts):
 * it cannot disagree with the data it describes. The cost is that it only knows
 * the moments the schema records — creation, acceptance, starting, finishing —
 * not every edit in between. That is said on the page rather than hidden.
 */

export type ActivityKind =
  | "task_created"
  | "task_accepted"
  | "task_started"
  | "task_completed"
  | "goal_created"
  | "mvp_created"
  | "milestone_created"
  | "milestone_reached"
  | "member_joined"
  | "document_uploaded";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  at: string;
  /** Who did it, when the schema records it. */
  actor: string | null;
  /** What it happened to. */
  subject: string;
  href: string | null;
};

type Person = { full_name: string } | null | undefined;

export type ActivitySources = {
  projectKey: string;
  tasks: readonly {
    seq: number;
    title: string;
    created_at: string;
    accepted_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    assignee: Person;
    creator?: Person;
  }[];
  goals: readonly { id: string; title: string; created_at: string }[];
  mvpItems: readonly { id: string; title: string; created_at: string }[];
  milestones: readonly { id: string; title: string; created_at: string; completed_at: string | null }[];
  members: readonly { user_id: string; created_at: string; profile: Person }[];
  documents?: readonly { id: string; title: string; created_at: string; uploader: Person }[];
};

export const ACTIVITY_VERB: Record<ActivityKind, string> = {
  task_created: "created",
  task_accepted: "accepted",
  task_started: "started",
  task_completed: "completed",
  goal_created: "added the goal",
  mvp_created: "added to the MVP",
  milestone_created: "set the milestone",
  milestone_reached: "reached the milestone",
  member_joined: "joined the project",
  document_uploaded: "uploaded",
};

/** Newest first, capped. Ties keep a stable order so the feed never shuffles between renders. */
export function buildActivity(sources: ActivitySources, limit = 100): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const base = `/os/projects/${sources.projectKey}`;

  for (const task of sources.tasks) {
    const href = `/os/tasks/${sources.projectKey}-${task.seq}`;
    const subject = `${sources.projectKey}-${task.seq} ${task.title}`;
    const id = `${sources.projectKey}-${task.seq}`;
    events.push({
      id: `${id}:created`,
      kind: "task_created",
      at: task.created_at,
      actor: task.creator?.full_name ?? null,
      subject,
      href,
    });
    const owner = task.assignee?.full_name ?? null;
    if (task.accepted_at)
      events.push({ id: `${id}:accepted`, kind: "task_accepted", at: task.accepted_at, actor: owner, subject, href });
    if (task.started_at)
      events.push({ id: `${id}:started`, kind: "task_started", at: task.started_at, actor: owner, subject, href });
    if (task.completed_at)
      events.push({
        id: `${id}:completed`,
        kind: "task_completed",
        at: task.completed_at,
        actor: owner,
        subject,
        href,
      });
  }

  for (const goal of sources.goals)
    events.push({
      id: `goal:${goal.id}`,
      kind: "goal_created",
      at: goal.created_at,
      actor: null,
      subject: goal.title,
      href: `${base}/goals`,
    });

  for (const item of sources.mvpItems)
    events.push({
      id: `mvp:${item.id}`,
      kind: "mvp_created",
      at: item.created_at,
      actor: null,
      subject: item.title,
      href: `${base}/mvp`,
    });

  for (const milestone of sources.milestones) {
    const href = `${base}/milestones/${milestone.id}`;
    events.push({
      id: `milestone:${milestone.id}:created`,
      kind: "milestone_created",
      at: milestone.created_at,
      actor: null,
      subject: milestone.title,
      href,
    });
    if (milestone.completed_at)
      events.push({
        id: `milestone:${milestone.id}:reached`,
        kind: "milestone_reached",
        at: milestone.completed_at,
        actor: null,
        subject: milestone.title,
        href,
      });
  }

  for (const member of sources.members)
    events.push({
      id: `member:${member.user_id}`,
      kind: "member_joined",
      at: member.created_at,
      actor: member.profile?.full_name ?? "Someone",
      subject: "",
      href: `${base}/team`,
    });

  for (const document of sources.documents ?? [])
    events.push({
      id: `document:${document.id}`,
      kind: "document_uploaded",
      at: document.created_at,
      actor: document.uploader?.full_name ?? null,
      subject: document.title,
      href: `${base}/documents`,
    });

  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id)).slice(0, limit);
}

import {
  Activity,
  CheckCircle2,
  FilePlus2,
  Flag,
  ListPlus,
  PlayCircle,
  Target,
  ThumbsUp,
  UserPlus,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { ACTIVITY_VERB, buildActivity, type ActivityKind } from "@/features/projects/activity";
import { projectHref } from "@/features/projects/tabs";
import { listProjectDocuments } from "@/features/documents/queries";
import { loadMembers, loadPlanning, loadTasks, loadWorkspace } from "@/features/projects/workspace";
import { dayKey } from "@/features/timeline/calendar";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity" };

const ICON: Record<ActivityKind, typeof Activity> = {
  task_created: ListPlus,
  task_accepted: ThumbsUp,
  task_started: PlayCircle,
  task_completed: CheckCircle2,
  goal_created: Target,
  mvp_created: Target,
  milestone_created: Flag,
  milestone_reached: Flag,
  member_joined: UserPlus,
  document_uploaded: FilePlus2,
};

const TONE: Partial<Record<ActivityKind, string>> = {
  task_completed: "bg-status-success-bg text-status-success-fg",
  milestone_reached: "bg-status-success-bg text-status-success-fg",
  task_started: "bg-status-progress-bg text-status-progress-fg",
  member_joined: "bg-brand-subtle text-brand",
};

const FILTERS = [
  { key: "all", label: "Everything", kinds: null },
  { key: "tasks", label: "Tasks", kinds: ["task_created", "task_accepted", "task_started", "task_completed"] },
  { key: "plan", label: "Plan", kinds: ["goal_created", "mvp_created", "milestone_created", "milestone_reached"] },
  { key: "people", label: "People & files", kinds: ["member_joined", "document_uploaded"] },
] as const;

const DAY_HEADING = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** What has happened on the project, newest first, grouped by day. */
export default async function ProjectActivityPage({ params, searchParams }: PageProps<"/os/projects/[key]/activity">) {
  const [{ key }, query] = await Promise.all([params, searchParams]);
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, viewer } = workspace;
  const timeZone = viewer.profile.timezone || "UTC";
  const filter = FILTERS.find((candidate) => candidate.key === query.show) ?? FILTERS[0];

  const [tasks, planning, members, documents] = await Promise.all([
    loadTasks(project.id),
    loadPlanning(project.id),
    loadMembers(project.id),
    listProjectDocuments(project.id),
  ]);
  if (tasks.error) return <ErrorState {...describeQueryFailure(tasks.error)} />;

  const events = buildActivity(
    {
      projectKey: project.key,
      tasks: tasks.data ?? [],
      goals: planning.goals,
      mvpItems: planning.mvpItems,
      milestones: planning.milestones,
      members: members.data ?? [],
      documents: documents.data,
    },
    300,
  ).filter((event) => !filter.kinds || (filter.kinds as readonly string[]).includes(event.kind));

  const days = new Map<string, typeof events>();
  for (const event of events) {
    const day = dayKey(event.at, timeZone);
    days.set(day, [...(days.get(day) ?? []), event]);
  }
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone });
  const base = `${projectHref(project.key)}/activity`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Filter activity"
          className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1"
        >
          {FILTERS.map((candidate) => (
            <Link
              key={candidate.key}
              href={candidate.key === "all" ? base : `${base}?show=${candidate.key}`}
              aria-current={candidate.key === filter.key ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                candidate.key === filter.key ? "bg-bg-subtle font-medium text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {candidate.label}
            </Link>
          ))}
        </nav>
        <p className="max-w-md text-[13px] text-fg-subtle">
          Built from what the project records: when work was created, accepted, started and finished. Edits in between
          are not listed.
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nothing here yet"
          description="Activity appears as tasks move, milestones are reached and people join."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {[...days.entries()].map(([day, dayEvents]) => (
            <section key={day} aria-labelledby={`day-${day}`}>
              <h2 id={`day-${day}`} className="mb-3 text-xs font-semibold tracking-[0.06em] text-fg-subtle uppercase">
                {DAY_HEADING.format(new Date(`${day}T00:00:00Z`))}
              </h2>
              <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                {dayEvents.map((event) => {
                  const Icon = ICON[event.kind];
                  return (
                    <li key={event.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-fg-muted",
                          TONE[event.kind],
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <p className="min-w-0 flex-1">
                        <span className="font-medium">{event.actor ?? "Someone"}</span>{" "}
                        <span className="text-fg-muted">{ACTIVITY_VERB[event.kind]}</span>{" "}
                        {event.subject ? (
                          event.href ? (
                            <Link href={event.href} className="font-medium hover:underline">
                              {event.subject}
                            </Link>
                          ) : (
                            <span className="font-medium">{event.subject}</span>
                          )
                        ) : null}
                      </p>
                      <time dateTime={event.at} className="shrink-0 text-xs text-fg-subtle tabular-nums">
                        {time.format(new Date(event.at))}
                      </time>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

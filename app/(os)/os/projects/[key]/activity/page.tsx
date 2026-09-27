import { Activity } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { activityChain, buildActivity, groupActivity, runIsComplete } from "@/features/projects/activity";
import { projectHref } from "@/features/projects/tabs";
import { listProjectDocuments } from "@/features/documents/queries";
import { loadMembers, loadPlanning, loadTasks, loadWorkspace } from "@/features/projects/workspace";
import { dayKey } from "@/features/timeline/calendar";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity" };

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

/**
 * What has happened on the project, newest first, grouped by day.
 *
 * A timeline rather than a stack of rows, because the feed's subject is *when*.
 * The rail is the day; each entry hangs off it at one point. The marker fills in
 * once a run has arrived somewhere final, which is the only thing on the page
 * carrying colour — a scan down the rail answers "what actually landed today"
 * without reading a word.
 *
 * Held to a reading column rather than the full width of the workspace. Set
 * loose, a one-line sentence and its timestamp end up at opposite edges of a
 * 1500px screen with nothing in between to carry the eye across.
 */
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
    <div className="flex flex-col gap-6">
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
        <div className="flex max-w-3xl flex-col gap-8">
          {[...days.entries()].map(([day, dayEvents]) => (
            <section key={day} aria-labelledby={`day-${day}`}>
              <h2
                id={`day-${day}`}
                className="mb-4 text-[11px] font-semibold tracking-[0.08em] text-fg-subtle uppercase"
              >
                {DAY_HEADING.format(new Date(`${day}T00:00:00Z`))}
              </h2>
              {/* Grouped per day, so a run can never span midnight and imply
                  continuity across a night nobody worked through. */}
              <ol className="flex flex-col">
                {groupActivity(dayEvents).map((run) => {
                  const landed = runIsComplete(run);
                  const spans = run.from !== run.at;
                  return (
                    <li key={run.id} className="group relative flex gap-3.5">
                      <div aria-hidden="true" className="relative flex w-2.5 shrink-0 justify-center">
                        {/* Stops at the last entry: a rail running past the end
                            would promise more below than there is. */}
                        <span className="absolute top-4 left-1/2 h-full w-px -translate-x-1/2 bg-border group-last:hidden" />
                        <span
                          className={cn(
                            "relative mt-1.5 size-2.5 rounded-full border",
                            landed ? "border-status-success-fg bg-status-success-fg" : "border-border-strong bg-bg",
                          )}
                        />
                      </div>

                      <div className="min-w-0 flex-1 pb-6 group-last:pb-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="min-w-0 text-[13px] text-fg-muted">
                            <span className="font-medium text-fg">{run.actor ?? "Someone"}</span>{" "}
                            {activityChain(run.steps)}
                          </p>
                          <time
                            dateTime={run.at}
                            /* The range is the honest label for a run; the line
                               shows where it got to, which is what you scan. */
                            title={
                              spans
                                ? `${time.format(new Date(run.from))} – ${time.format(new Date(run.at))}`
                                : undefined
                            }
                            className="shrink-0 text-xs text-fg-subtle tabular-nums"
                          >
                            {time.format(new Date(run.at))}
                          </time>
                        </div>
                        {run.subject ? (
                          run.href ? (
                            <Link
                              href={run.href}
                              className="mt-0.5 block truncate text-sm font-medium hover:underline"
                              title={run.subject}
                            >
                              {run.subject}
                            </Link>
                          ) : (
                            <p className="mt-0.5 truncate text-sm font-medium" title={run.subject}>
                              {run.subject}
                            </p>
                          )
                        ) : null}
                      </div>
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

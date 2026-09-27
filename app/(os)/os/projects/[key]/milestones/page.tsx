import { AlertTriangle, CheckCircle2, Flag, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EMPTY, formatDate } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { MiniProgress } from "@/components/os/panel";
import { StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { daysLeft } from "@/features/projects/insights";
import { milestoneScopes, milestoneState, type MilestoneState } from "@/features/projects/milestones";
import {
  DeletePlanningButton,
  MilestoneDialog,
  MilestoneReachedButton,
} from "@/features/projects/components/planning-forms.client";
import { projectHref } from "@/features/projects/tabs";
import { loadPlanning, loadTasks, loadWorkspace } from "@/features/projects/workspace";
import { dayKey } from "@/features/timeline/calendar";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Milestones" };

const STATE: Record<MilestoneState, { label: string; tone: "success" | "danger" | "neutral" }> = {
  reached: { label: "Reached", tone: "success" },
  overdue: { label: "Overdue", tone: "danger" },
  upcoming: { label: "Upcoming", tone: "neutral" },
};

/**
 * The dates the project has committed to, in order, each with the work due by
 * it. A milestone's tasks are the ones due between it and the milestone before.
 */
export default async function ProjectMilestonesPage({ params }: PageProps<"/os/projects/[key]/milestones">) {
  const { key } = await params;
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, perms, viewer, now } = workspace;

  const [tasks, planning] = await Promise.all([loadTasks(project.id), loadPlanning(project.id)]);
  const today = dayKey(now, viewer.profile.timezone || "UTC");
  const scopes = milestoneScopes(planning.milestones, tasks.data ?? []);
  const milestones = planning.milestones;
  const reached = milestones.filter((milestone) => milestone.completed_at).length;
  const overdue = milestones.filter((milestone) => milestoneState(milestone, today) === "overdue").length;
  const next = milestones.find((milestone) => !milestone.completed_at);
  const base = projectHref(project.key);

  const addButton = perms.manageMilestones ? (
    <MilestoneDialog
      projectKey={project.key}
      trigger={
        <Button>
          <Plus aria-hidden="true" /> New milestone
        </Button>
      }
    />
  ) : null;

  if (milestones.length === 0) {
    return (
      <EmptyState
        icon={Flag}
        title="No milestones yet"
        description="Milestones are the dates the project commits to — design sign-off, a beta, the launch. Tasks due before each one count towards it."
        action={addButton ?? undefined}
      />
    );
  }

  return (
    <>
      <StatRow>
        <StatTile label="Milestones" value={milestones.length} hint={`${reached} reached`} icon={Flag} />
        <StatTile
          label="Reached"
          value={`${Math.round((reached / milestones.length) * 100)}%`}
          hint={`${reached} of ${milestones.length}`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatTile
          label="Overdue"
          value={overdue}
          hint={overdue === 0 ? "None slipped" : "Past their date, not reached"}
          icon={AlertTriangle}
          tone={overdue > 0 ? "danger" : "neutral"}
        />
        <StatTile
          label="Next"
          value={next ? formatDate(next.due_date) : EMPTY}
          hint={next ? next.title : "Everything reached"}
          icon={Flag}
          tone="brand"
          href={next ? `${base}/milestones/${next.id}` : undefined}
        />
        <StatTile
          label="Days to next"
          value={next ? Math.max(0, daysLeft(next.due_date, now)) : EMPTY}
          hint={next ? (daysLeft(next.due_date, now) < 0 ? "Already past" : "Calendar days") : "—"}
          icon={Flag}
        />
      </StatRow>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">All milestones</h2>
        {addButton}
      </div>

      <ol className="relative flex flex-col gap-3 border-l-2 border-border pl-6">
        {milestones.map((milestone) => {
          const state = milestoneState(milestone, today);
          const scope = scopes.get(milestone.id) ?? [];
          const done = scope.filter((task) => task.status === "done").length;
          const left = daysLeft(milestone.due_date, now);
          return (
            <li key={milestone.id} className="relative">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-6 -left-[33px] size-3.5 rotate-45 rounded-[2px] border-2 bg-surface",
                  state === "reached" && "border-status-success-fg bg-status-success-fg",
                  state === "overdue" && "border-status-danger-fg",
                  state === "upcoming" && "border-brand",
                )}
              />
              <article className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`${base}/milestones/${milestone.id}`}
                      className="text-base font-semibold hover:underline"
                    >
                      {milestone.title}
                    </Link>
                    <StatusPill tone={STATE[state].tone}>{STATE[state].label}</StatusPill>
                  </div>
                  <p className="text-sm text-fg-muted">
                    Due <span className="font-medium text-fg">{formatDate(milestone.due_date)}</span>
                    {state === "reached" && milestone.completed_at
                      ? ` · reached ${formatDate(milestone.completed_at)}`
                      : left >= 0
                        ? ` · ${left === 0 ? "today" : `${left} day${left === 1 ? "" : "s"} left`}`
                        : ` · ${Math.abs(left)} day${left === -1 ? "" : "s"} late`}
                  </p>
                  {milestone.description ? (
                    <p className="line-clamp-2 text-sm text-fg-subtle">{milestone.description}</p>
                  ) : null}
                </div>
                <div className="w-full shrink-0 lg:w-56">
                  {scope.length === 0 ? (
                    <span className="text-xs text-fg-subtle">No tasks due by this date</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-fg-subtle">
                        {done} of {scope.length} tasks done
                      </span>
                      <MiniProgress done={done} total={scope.length} label={`${milestone.title} tasks`} />
                    </div>
                  )}
                </div>
                {perms.manageMilestones ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <MilestoneReachedButton
                      projectKey={project.key}
                      milestoneId={milestone.id}
                      reached={Boolean(milestone.completed_at)}
                    />
                    <MilestoneDialog
                      projectKey={project.key}
                      milestone={milestone}
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${milestone.title}`}>
                          <Pencil aria-hidden="true" />
                        </Button>
                      }
                    />
                    <DeletePlanningButton
                      projectKey={project.key}
                      id={milestone.id}
                      kind="milestone"
                      name={milestone.title}
                    />
                  </div>
                ) : null}
              </article>
            </li>
          );
        })}
      </ol>
    </>
  );
}

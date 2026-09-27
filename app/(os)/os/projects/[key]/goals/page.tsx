import { CheckCircle2, CircleDashed, Pencil, Plus, Target, XCircle } from "lucide-react";
import type { Metadata } from "next";

import { ProgressBar } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { GoalStatusBadge, MvpStatusBadge } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import {
  DeletePlanningButton,
  GoalDialog,
  GoalStatusSelect,
  MvpDialog,
} from "@/features/projects/components/planning-forms.client";
import { loadPlanning, loadWorkspace } from "@/features/projects/workspace";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Goals" };

/**
 * What success means for this project. Each goal carries its success criteria
 * and the MVP items that serve it, so "are we there yet" has an answer per goal.
 */
export default async function ProjectGoalsPage({ params }: PageProps<"/os/projects/[key]/goals">) {
  const { key } = await params;
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, perms, viewer, ctx } = workspace;
  const canAchieve = can(viewer, "goal.achieve", ctx) && perms.writable;

  const planning = await loadPlanning(project.id);
  if (planning.error) return <ErrorState {...describeQueryFailure(planning.error)} />;
  const { goals, mvpItems } = planning;

  const addButton = perms.contribute ? (
    <GoalDialog
      projectKey={project.key}
      trigger={
        <Button>
          <Plus aria-hidden="true" /> New goal
        </Button>
      }
    />
  ) : null;

  if (goals.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="No goals yet"
        description="Goals say what success means for this project. Start with two or three, each with a way to tell it has been met."
        action={addButton ?? undefined}
      />
    );
  }

  const count = (status: string) => goals.filter((goal) => goal.status === status).length;
  const unlinked = mvpItems.filter((item) => !item.goal_id).length;

  return (
    <>
      <StatRow>
        <StatTile label="Goals" value={goals.length} hint={`${count("dropped")} dropped`} icon={Target} tone="brand" />
        <StatTile
          label="Achieved"
          value={count("achieved")}
          hint="Signed off by the manager"
          icon={CheckCircle2}
          tone="success"
        />
        <StatTile label="In progress" value={count("in_progress")} hint="Being worked towards" icon={Target} />
        <StatTile label="Not started" value={count("not_started")} hint="Nothing moving yet" icon={CircleDashed} />
        <StatTile
          label="Unlinked MVP items"
          value={unlinked}
          hint={unlinked === 0 ? "Everything traces to a goal" : "Link them on the MVP tab"}
          icon={XCircle}
          tone={unlinked > 0 ? "warning" : "neutral"}
        />
      </StatRow>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">All goals</h2>
        {addButton}
      </div>

      <ol className="grid gap-4 xl:grid-cols-2">
        {goals.map((goal, index) => {
          const items = mvpItems.filter((item) => item.goal_id === goal.id);
          const live = items.filter((item) => item.status !== "dropped");
          const done = live.filter((item) => item.status === "done").length;
          return (
            <li key={goal.id}>
              <article className="flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-sm font-semibold text-brand tabular-nums">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h3 className="text-base leading-snug font-semibold">{goal.title}</h3>
                    {goal.owner ? <p className="text-xs text-fg-subtle">Owner: {goal.owner.full_name}</p> : null}
                  </div>
                  {perms.contribute ? (
                    <GoalStatusSelect
                      projectKey={project.key}
                      goalId={goal.id}
                      status={goal.status}
                      canAchieve={canAchieve}
                    />
                  ) : (
                    <GoalStatusBadge status={goal.status} />
                  )}
                </div>

                {goal.description ? (
                  <p className="text-sm leading-relaxed whitespace-pre-line text-fg-muted">{goal.description}</p>
                ) : null}

                <div className="rounded-md border border-border bg-bg-subtle px-4 py-3">
                  <p className="text-xs font-medium tracking-[0.04em] text-fg-subtle uppercase">Success criteria</p>
                  <p className="mt-1 text-sm whitespace-pre-line">
                    {goal.success_criteria ?? <span className="text-fg-subtle">Not written yet.</span>}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {live.length > 0 ? <ProgressBar done={done} total={live.length} label="MVP items done" /> : null}
                  {items.length === 0 ? (
                    <p className="text-sm text-fg-subtle">No MVP items serve this goal yet.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="min-w-0 truncate" title={item.title}>
                            {item.title}
                          </span>
                          <MvpStatusBadge status={item.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {perms.contribute ? (
                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-4">
                    <MvpDialog
                      projectKey={project.key}
                      goals={goals}
                      defaultGoalId={goal.id}
                      trigger={
                        <Button variant="outline" size="sm">
                          <Plus aria-hidden="true" /> MVP item
                        </Button>
                      }
                    />
                    <GoalDialog
                      projectKey={project.key}
                      goal={goal}
                      trigger={
                        <Button variant="ghost" size="sm">
                          <Pencil aria-hidden="true" /> Edit
                        </Button>
                      }
                    />
                    {perms.deletePlanning ? (
                      <span className="ml-auto">
                        <DeletePlanningButton projectKey={project.key} id={goal.id} kind="goal" name={goal.title} />
                      </span>
                    ) : null}
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

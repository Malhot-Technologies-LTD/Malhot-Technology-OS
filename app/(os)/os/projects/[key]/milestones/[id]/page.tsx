import { ChevronLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { KeyValueList, formatDate } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { ProgressRing } from "@/components/os/metrics";
import { Panel } from "@/components/os/panel";
import { StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { daysLeft } from "@/features/projects/insights";
import { milestoneScopes, milestoneState } from "@/features/projects/milestones";
import {
  DeletePlanningButton,
  MilestoneDialog,
  MilestoneReachedButton,
} from "@/features/projects/components/planning-forms.client";
import { projectHref } from "@/features/projects/tabs";
import { loadPlanning, loadTasks, loadWorkspace } from "@/features/projects/workspace";
import { TaskLine, TaskLines } from "@/features/tasks/components/task-line";
import { dayKey } from "@/features/timeline/calendar";

export const metadata: Metadata = { title: "Milestone" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One milestone: what it promises, when, and the work it is waiting on. */
export default async function MilestonePage({ params }: PageProps<"/os/projects/[key]/milestones/[id]">) {
  const { key, id } = await params;
  if (!UUID.test(id)) notFound();
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, perms, viewer, now } = workspace;

  const [tasks, planning] = await Promise.all([loadTasks(project.id), loadPlanning(project.id)]);
  const index = planning.milestones.findIndex((milestone) => milestone.id === id);
  const milestone = planning.milestones[index];
  if (!milestone) notFound();

  const base = projectHref(project.key);
  const today = dayKey(now, viewer.profile.timezone || "UTC");
  const state = milestoneState(milestone, today);
  const scope = milestoneScopes(planning.milestones, tasks.data ?? []).get(milestone.id) ?? [];
  const open = scope.filter((task) => task.status !== "done");
  const finished = scope.filter((task) => task.status === "done");
  const previous = index > 0 ? planning.milestones[index - 1] : null;
  const following = planning.milestones[index + 1] ?? null;
  const left = daysLeft(milestone.due_date, now);

  return (
    <>
      <nav
        aria-label="Milestone navigation"
        className="-mb-2 flex flex-wrap items-center justify-between gap-2 text-sm"
      >
        <Link
          href={`${base}/milestones`}
          className="inline-flex items-center gap-1 text-fg-muted hover:text-fg hover:underline"
        >
          <ChevronLeft className="size-4" aria-hidden="true" /> All milestones
        </Link>
        <span className="flex gap-3 text-fg-muted">
          {previous ? (
            <Link href={`${base}/milestones/${previous.id}`} className="hover:text-fg hover:underline">
              ← {previous.title}
            </Link>
          ) : null}
          {following ? (
            <Link href={`${base}/milestones/${following.id}`} className="hover:text-fg hover:underline">
              {following.title} →
            </Link>
          ) : null}
        </span>
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={state === "reached" ? "success" : state === "overdue" ? "danger" : "neutral"}>
                    {state === "reached" ? "Reached" : state === "overdue" ? "Overdue" : "Upcoming"}
                  </StatusPill>
                  <span className="text-sm text-fg-muted">
                    Milestone {index + 1} of {planning.milestones.length}
                  </span>
                </div>
                <h2 className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">{milestone.title}</h2>
              </div>
              {perms.manageMilestones ? (
                <div className="flex items-center gap-2">
                  <MilestoneReachedButton
                    projectKey={project.key}
                    milestoneId={milestone.id}
                    reached={Boolean(milestone.completed_at)}
                    size="default"
                  />
                  <MilestoneDialog
                    projectKey={project.key}
                    milestone={milestone}
                    trigger={
                      <Button variant="outline">
                        <Pencil aria-hidden="true" /> Edit
                      </Button>
                    }
                  />
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold">What has to be true</h3>
              {milestone.description ? (
                <p className="text-[15px] leading-relaxed whitespace-pre-line text-fg-muted">{milestone.description}</p>
              ) : (
                <p className="text-[15px] text-fg-subtle">No description yet.</p>
              )}
            </div>
          </section>

          <Panel
            title={`Open work (${open.length})`}
            description={
              previous
                ? `Tasks due after ${previous.title} (${formatDate(previous.due_date)}) and by ${formatDate(milestone.due_date)}`
                : `Tasks due on or before ${formatDate(milestone.due_date)}`
            }
          >
            {open.length === 0 ? (
              <EmptyState
                variant="well"
                title={scope.length === 0 ? "No tasks due by this date" : "Everything due by this date is done"}
                description={
                  scope.length === 0
                    ? "Give tasks deadlines on or before this date and they count towards it."
                    : undefined
                }
              />
            ) : (
              <TaskLines>
                {open.map((task) => (
                  <TaskLine key={task.id} task={task} projectKey={project.key} />
                ))}
              </TaskLines>
            )}
          </Panel>

          {finished.length > 0 ? (
            <Panel title={`Done (${finished.length})`}>
              <TaskLines>
                {finished.map((task) => (
                  <TaskLine key={task.id} task={task} projectKey={project.key} />
                ))}
              </TaskLines>
            </Panel>
          ) : null}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          <Panel title="Progress">
            <ProgressRing
              done={finished.length}
              total={scope.length}
              label="Tasks done for this milestone"
              size={132}
            />
          </Panel>
          <Panel title="Details">
            <KeyValueList
              items={[
                { label: "Due", value: formatDate(milestone.due_date) },
                {
                  label: state === "reached" ? "Reached" : "Time left",
                  value:
                    state === "reached"
                      ? formatDate(milestone.completed_at)
                      : left >= 0
                        ? `${left} day${left === 1 ? "" : "s"}`
                        : `${Math.abs(left)} day${left === -1 ? "" : "s"} late`,
                },
                { label: "Tasks", value: `${scope.length}` },
                { label: "Added", value: formatDate(milestone.created_at) },
              ]}
            />
            {perms.manageMilestones ? (
              <div className="border-t border-border pt-4">
                <DeletePlanningButton
                  projectKey={project.key}
                  id={milestone.id}
                  kind="milestone"
                  name={milestone.title}
                  redirectTo={`${base}/milestones`}
                  label
                />
              </div>
            ) : null}
          </Panel>
        </aside>
      </div>
    </>
  );
}

import { CalendarClock, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { oversees } from "@/components/os/nav-audience";
import { DueDate } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { PriorityBadge, StatusPill } from "@/components/os/status-badge";
import { listProjectOptions, listTeamsByProject } from "@/features/projects/queries";
import { AssignTaskDialog } from "@/features/tasks/components/assign-task-dialog.client";
import { Countdown } from "@/features/tasks/components/countdown.client";
import { TeamWorkload } from "@/features/tasks/components/team-workload.client";
import { listMyTasks, listTeamTasks } from "@/features/tasks/queries";
import { groupByAssignee } from "@/features/tasks/workload";
import { TASK_STATUS_META } from "@/features/tasks/schemas";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";

export const metadata: Metadata = { title: "My Tasks" };

/**
 * My Tasks (docs/features/tasks.md).
 *
 * What this person owes, across every project they are on, soonest deadline
 * first. Completed work is not here: the question is what is left.
 *
 * Managers and org admins also get "Assign a task", because the other half of
 * the same thought — "this needs doing, and by them" — otherwise means finding
 * the right project first and working inwards.
 */
export default async function MyTasksPage() {
  const viewer = await requireViewer();
  const canAssign = oversees({ orgRole: viewer.orgRole, projectRoles: viewer.projectRoles });

  // The picker data is only fetched for someone who will see the picker.
  const [tasks, projects, teams, teamTasks] = await Promise.all([
    listMyTasks(viewer.userId),
    canAssign ? listProjectOptions(viewer.organizationId) : Promise.resolve({ data: [], error: null }),
    canAssign ? listTeamsByProject(viewer.organizationId) : Promise.resolve(new Map()),
    // Only a manager sees the workload, so only a manager pays for the query.
    canAssign ? listTeamTasks(viewer.organizationId) : Promise.resolve({ data: [], error: null }),
  ]);

  if (tasks.error) {
    logger.error("my_tasks.failed", { code: tasks.error.code, message: tasks.error.message });
    return (
      <PageBody>
        <PageHeader title="My Tasks" />
        <ErrorState {...describeQueryFailure(tasks.error)} />
      </PageBody>
    );
  }

  /*
   * No overdue count here, deliberately. It would have to be computed from the
   * server's clock, and the whole reason Countdown is a client component is
   * that the server's instant is not the reader's. A number that is stale on
   * arrival next to a countdown that is not would contradict itself.
   */
  const rows = tasks.data;

  const assignDialog = canAssign ? (
    <AssignTaskDialog
      projects={(projects.data ?? []).map((project) => ({
        id: project.id,
        key: project.key,
        name: project.name,
      }))}
      teams={Object.fromEntries(
        [...(teams as Map<string, { userId: string; fullName: string }[]>).entries()].map(([projectId, people]) => [
          projectId,
          people.map((person) => ({ userId: person.userId, fullName: person.fullName })),
        ]),
      )}
    />
  ) : undefined;

  return (
    <PageBody>
      <PageHeader
        title="My Tasks"
        description={rows.length === 0 ? "Nothing is assigned to you." : `${rows.length} open, soonest deadline first.`}
        actions={assignDialog}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing on your plate"
          description="Work assigned to you appears here, soonest deadline first."
          action={assignDialog}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {rows.map((task) => {
            const meta = TASK_STATUS_META[task.status];
            return (
              <li key={task.id} className="flex flex-wrap items-center gap-4 p-5">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex min-w-0 items-center gap-2">
                    {task.project ? (
                      <Link
                        href={`/os/projects/${task.project.key}`}
                        className="shrink-0 font-mono text-[13px] text-fg-subtle hover:text-fg hover:underline"
                      >
                        {task.project.key}-{task.seq}
                      </Link>
                    ) : null}
                    <span className="min-w-0 truncate text-[15px] font-medium" title={task.title}>
                      {task.title}
                    </span>
                  </span>
                  {task.due_at ? (
                    <span className="flex items-center gap-2 text-[13px] text-fg-muted">
                      <CalendarClock className="size-3.5" aria-hidden="true" />
                      <DueDate value={task.due_at} />
                      <Countdown dueAt={task.due_at} className="font-medium" />
                    </span>
                  ) : (
                    <span className="text-[13px] text-fg-subtle">No deadline</span>
                  )}
                </div>

                <PriorityBadge priority={task.priority} />
                <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
              </li>
            );
          })}
        </ul>
      )}

      {canAssign ? (
        <section aria-labelledby="workload-heading" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="workload-heading" className="text-xl font-medium">
              The team{String.fromCharCode(8217)}s work
            </h2>
            <p className="text-[15px] text-fg-muted">
              Everyone with open work on your projects, whoever is closest to running out first.
            </p>
          </div>

          {teamTasks.error ? (
            <ErrorState {...describeQueryFailure(teamTasks.error)} />
          ) : (
            <TeamWorkload people={groupByAssignee(teamTasks.data ?? [])} />
          )}
        </section>
      ) : null}
    </PageBody>
  );
}

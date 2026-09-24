import { CheckCircle2, Circle, Flag, ListChecks, ListTodo, Target, Users } from "lucide-react";
import type { Metadata } from "next";

import { DueDate, KeyValueList, ProgressBar, ProjectKey } from "@/components/os/data-display";
import { ErrorState } from "@/components/os/error-state";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { GoalStatusBadge, MvpStatusBadge, PriorityBadge, ProjectStatusBadge } from "@/components/os/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickAdd } from "@/features/projects/components/quick-add.client";
import { StatusActions } from "@/features/projects/components/status-actions.client";
import { ProjectTeam } from "@/features/projects/components/project-team.client";
import { TaskBoard } from "@/features/tasks/components/task-board.client";
import { listProjectTasks } from "@/features/tasks/queries";
import {
  getProjectByKey,
  getProjectContext,
  getProjectPlanning,
  listAssignableMembers,
  listProjectMembers,
} from "@/features/projects/queries";
import { readinessItems } from "@/features/projects/readiness";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";
import type { GoalStatus, MvpItemStatus } from "@/types/domain";

export async function generateMetadata({ params }: PageProps<"/os/projects/[key]">): Promise<Metadata> {
  const { key } = await params;
  return { title: key.toUpperCase() };
}

/**
 * Project overview (docs/features/projects.md#project-overview).
 *
 * While the project is planning, readiness is the whole story — it is what
 * activation is gated on — so it leads and everything else recedes. Once the
 * project is active the checklist has nothing left to say and disappears.
 *
 * Progress comes from MVP items and milestones only; task counts arrive with
 * migration 0007, along with project_progress() and project_health().
 */
export default async function ProjectOverviewPage({ params }: PageProps<"/os/projects/[key]">) {
  const [{ key }, viewer] = await Promise.all([params, requireViewer()]);

  const { data: project, error } = await getProjectByKey(viewer.organizationId, key);

  if (error) {
    return (
      <PageBody>
        <PageHeader title={key.toUpperCase()} />
        {/* Not always a timeout: a missing column reads as a refused query,
            and "try again in a moment" would be advice that cannot work. */}
        <ErrorState {...describeQueryFailure(error)} />
      </PageBody>
    );
  }

  // W11: the key is already in the URL, so echoing it discloses nothing. The
  // name and the manager are withheld — existence itself is not confirmed.
  if (!project) {
    return (
      <PageBody>
        <PageHeader title={key.toUpperCase()} />
        <ErrorState
          title="You do not have access to this project"
          description="It may not exist, or you may not be a member of it. An organisation admin can add you."
        />
      </PageBody>
    );
  }

  const [ctx, planning, team, tasks] = await Promise.all([
    getProjectContext(project, viewer),
    getProjectPlanning(project.id),
    listProjectMembers(project.id),
    listProjectTasks(project.id),
  ]);
  const canManageTeam = can(viewer, "project.manage_members", ctx);
  // Only a manager sees the picker, so only a manager pays for the query.
  const assignable = canManageTeam ? await listAssignableMembers(viewer.organizationId, project.id) : [];

  const canContribute = can(viewer, "goal.create", ctx);
  const writable = project.status !== "archived" || viewer.orgRole !== "member";

  // Same rule the Activate action enforces, from one definition, so the
  // checklist on screen and the server can never disagree.
  const readiness = readinessItems({
    goalCount: planning.goals.length,
    mvpCount: planning.mvpItems.length,
    managerId: project.manager?.id ?? null,
    milestoneCount: planning.milestones.length,
    startDate: project.start_date,
  });
  const blocking = readiness.filter((item) => !item.optional && !item.done).length;

  const mvpDone = planning.mvpItems.filter((item) => item.status === "done").length;
  const milestonesDone = planning.milestones.filter((m) => m.completed_at).length;
  const open = project.status !== "completed" && project.status !== "archived";

  return (
    <PageBody>
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <StatusActions
            projectId={project.id}
            status={project.status}
            canChange={can(viewer, "project.change_status", ctx)}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ProjectKey value={project.key} />
        <ProjectStatusBadge status={project.status} />
        <PriorityBadge priority={project.priority} />
        <span className="text-fg-muted">
          {project.kind === "job" ? (project.client?.name ?? "Job, client not set") : "Internal project"} ·{" "}
          {project.manager ? project.manager.full_name : "No manager"}
        </span>
      </div>

      {project.status === "archived" ? (
        <div role="status" className="rounded-md border border-border bg-bg-subtle px-4 py-3 text-sm text-fg-muted">
          This project is archived and read-only. An organisation admin can unarchive it.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListTodo className="size-4 text-fg-muted" aria-hidden="true" />
                Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.error ? (
                <ErrorState {...describeQueryFailure(tasks.error)} />
              ) : (
                <TaskBoard
                  projectKey={project.key}
                  tasks={tasks.data ?? []}
                  team={(team.data ?? []).map((member) => ({
                    userId: member.user_id,
                    fullName: member.profile?.full_name ?? "Unnamed",
                    avatarUrl: member.profile?.avatar_url ?? null,
                  }))}
                  canWrite={can(viewer, "task.create", ctx) && writable}
                  canManage={canManageTeam && writable}
                  canDelete={can(viewer, "task.delete", ctx)}
                  viewerUserId={viewer.userId}
                />
              )}
            </CardContent>
          </Card>

          {project.status === "planning" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {blocking === 0 ? "Ready to start" : `${blocking} thing${blocking === 1 ? "" : "s"} left`}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-fg-muted">
                  {blocking === 0
                    ? "Everything needed to activate this project is in place."
                    : "A project needs these before it can move from planning to active."}
                </p>
                <ul className="flex flex-col gap-2">
                  {readiness.map((item) => (
                    <li key={item.label} className="flex items-center gap-2 text-sm">
                      {item.done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-status-success-fg" aria-hidden="true" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                      )}
                      <span className={item.done ? "text-fg-muted" : undefined}>{item.label}</span>
                      {item.optional ? <span className="text-xs text-fg-subtle">recommended</span> : null}
                      <span className="sr-only">{item.done ? "done" : "not done"}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4 text-fg-muted" aria-hidden="true" />
                Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {planning.goals.length === 0 ? (
                <p className="text-sm text-fg-muted">
                  Goals say what success means. Every task should trace back to one.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {planning.goals.map((goal) => (
                    <li key={goal.id} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0">
                      <span className="min-w-0 truncate" title={goal.title}>
                        {goal.title}
                      </span>
                      <GoalStatusBadge status={goal.status as GoalStatus} />
                    </li>
                  ))}
                </ul>
              )}
              {canContribute && writable ? <QuickAdd projectKey={project.key} kind="goal" /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="size-4 text-fg-muted" aria-hidden="true" />
                MVP
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {planning.mvpItems.length === 0 ? (
                <p className="text-sm text-fg-muted">The MVP is the smallest set of items that satisfies the goals.</p>
              ) : (
                <>
                  <ProgressBar done={mvpDone} total={planning.mvpItems.length} label="Items done" />
                  <ul className="flex flex-col divide-y divide-border">
                    {planning.mvpItems.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0">
                        <span className="min-w-0 truncate" title={item.title}>
                          {item.title}
                        </span>
                        <MvpStatusBadge status={item.status as MvpItemStatus} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {canContribute && writable ? <QuickAdd projectKey={project.key} kind="mvp" /> : null}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-fg-muted" aria-hidden="true" />
                Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/*
               * A failed read is shown as one. "Nobody is on this project" is a
               * confident claim about the team, and making it on the strength
               * of an error is how a broken embed looked like an empty project.
               */}
              {team.error ? (
                <ErrorState {...describeQueryFailure(team.error)} />
              ) : (
                <ProjectTeam
                  projectId={project.id}
                  members={team.data ?? []}
                  assignable={assignable}
                  canManage={canManageTeam}
                  viewerUserId={viewer.userId}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <KeyValueList
                items={[
                  { label: "Start", value: <DueDate value={project.start_date} open={false} /> },
                  { label: "Target end", value: <DueDate value={project.target_end_date} open={open} relative /> },
                  { label: "QA sign-off", value: project.qa_required ? "Required" : "Not required" },
                  { label: "Your role", value: ctx.role ?? (ctx.group === "admin" ? "Org admin" : "—") },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flag className="size-4 text-fg-muted" aria-hidden="true" />
                Milestones
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {planning.milestones.length === 0 ? (
                <p className="text-sm text-fg-muted">No milestones yet. The timeline arrives in a later phase.</p>
              ) : (
                <>
                  <ProgressBar done={milestonesDone} total={planning.milestones.length} label="Reached" />
                  <ul className="flex flex-col divide-y divide-border">
                    {planning.milestones.map((milestone) => (
                      <li
                        key={milestone.id}
                        className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0"
                      >
                        <span className="min-w-0 truncate" title={milestone.title}>
                          {milestone.title}
                        </span>
                        <DueDate value={milestone.due_date} open={!milestone.completed_at} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageBody>
  );
}

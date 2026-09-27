import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

import { oversees } from "@/components/os/nav-audience";
import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { listProjectOptions, listTeamsByProject } from "@/features/projects/queries";
import { AssignTaskDialog } from "@/features/tasks/components/assign-task-dialog.client";
import { MyTaskList } from "@/features/tasks/components/my-task-list.client";
import { listMyTasks } from "@/features/tasks/queries";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";

export const metadata: Metadata = { title: "My Tasks" };

/**
 * My Tasks (docs/features/tasks.md): what this person owes, across every
 * project, grouped by when it is due. Each row opens the task's own page.
 *
 * Managers and org admins also get "Assign a task". The team's workload lives
 * on the dashboard (Team load), not here: this page is about your own list.
 */
export default async function MyTasksPage() {
  const viewer = await requireViewer();
  const canAssign = oversees({ orgRole: viewer.orgRole, projectRoles: viewer.projectRoles });

  const [tasks, projects, teams] = await Promise.all([
    listMyTasks(viewer.userId),
    canAssign ? listProjectOptions(viewer.organizationId) : Promise.resolve({ data: [], error: null }),
    canAssign ? listTeamsByProject(viewer.organizationId) : Promise.resolve(new Map()),
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

  const assignDialog = canAssign ? (
    <AssignTaskDialog
      projects={(projects.data ?? []).map((project) => ({ id: project.id, key: project.key, name: project.name }))}
      teams={Object.fromEntries(
        [...(teams as Map<string, { userId: string; fullName: string }[]>).entries()].map(([projectId, people]) => [
          projectId,
          people.map((person) => ({ userId: person.userId, fullName: person.fullName })),
        ]),
      )}
    />
  ) : undefined;

  const rows = tasks.data.flatMap((task) =>
    task.project
      ? [
          {
            id: task.id,
            seq: task.seq,
            title: task.title,
            status: task.status,
            priority: task.priority,
            dueAt: task.due_at,
            acceptedAt: task.accepted_at,
            project: task.project,
          },
        ]
      : [],
  );

  return (
    <PageBody>
      <PageHeader title="My Tasks" description="Your open work across every project." actions={assignDialog} />
      {rows.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing on your plate"
          description="Work assigned to you appears here, grouped by when it is due."
          action={assignDialog}
        />
      ) : (
        <MyTaskList tasks={rows} />
      )}
    </PageBody>
  );
}

import type { Metadata } from "next";

import { ErrorState } from "@/components/os/error-state";
import { loadMembers, loadTasks, loadWorkspace, toAssignable } from "@/features/projects/workspace";
import type { DueFilter } from "@/features/tasks/filters";
import { NewTaskDialog } from "@/features/tasks/components/new-task-dialog.client";
import { TaskTable } from "@/features/tasks/components/task-table.client";
import { describeQueryFailure } from "@/lib/actions/db-errors";

export const metadata: Metadata = { title: "Tasks" };

const DUE_FILTERS: readonly DueFilter[] = ["overdue", "today", "week", "none"];

/** Every task in the project as a table: search, filter, sort, group, complete in place. */
export default async function ProjectTasksPage({ params, searchParams }: PageProps<"/os/projects/[key]/tasks">) {
  const [{ key }, query] = await Promise.all([params, searchParams]);
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, perms, viewer } = workspace;

  const [tasks, members] = await Promise.all([loadTasks(project.id), loadMembers(project.id)]);
  if (tasks.error) return <ErrorState {...describeQueryFailure(tasks.error)} />;

  const team = toAssignable(members.data);
  const due =
    typeof query.due === "string" && DUE_FILTERS.includes(query.due as DueFilter) ? (query.due as DueFilter) : "all";

  return (
    <TaskTable
      tasks={tasks.data ?? []}
      projectKey={project.key}
      team={team}
      viewerUserId={viewer.userId}
      canManage={perms.manageTeam}
      initialFilter={{ due }}
      emptyTitle="No tasks yet"
      emptyDescription={
        perms.createTask ? "Add the first one and give it an owner and a deadline." : "Nothing has been added here yet."
      }
      actions={
        perms.createTask ? (
          <NewTaskDialog
            projectKey={project.key}
            team={team}
            viewerUserId={viewer.userId}
            canAssignOthers={perms.manageTeam}
          />
        ) : undefined
      }
    />
  );
}

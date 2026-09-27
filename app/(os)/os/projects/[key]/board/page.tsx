import type { Metadata } from "next";

import { ErrorState } from "@/components/os/error-state";
import { loadMembers, loadTasks, loadWorkspace, toAssignable } from "@/features/projects/workspace";
import { KanbanBoard } from "@/features/tasks/components/kanban-board.client";
import { describeQueryFailure } from "@/lib/actions/db-errors";

export const metadata: Metadata = { title: "Board" };

export default async function ProjectBoardPage({ params }: PageProps<"/os/projects/[key]/board">) {
  const { key } = await params;
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, perms, viewer } = workspace;

  const [tasks, members] = await Promise.all([loadTasks(project.id), loadMembers(project.id)]);
  if (tasks.error) return <ErrorState {...describeQueryFailure(tasks.error)} />;

  return (
    <KanbanBoard
      projectKey={project.key}
      tasks={tasks.data ?? []}
      team={toAssignable(members.data)}
      viewerUserId={viewer.userId}
      canManage={perms.manageTeam}
      canCreate={perms.createTask}
    />
  );
}

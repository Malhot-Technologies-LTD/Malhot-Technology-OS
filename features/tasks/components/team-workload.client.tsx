"use client";

import { UserX } from "lucide-react";

import { UserAvatar } from "@/components/os/user-menu.client";
import { TaskCard, TaskGrid } from "@/features/tasks/components/task-card";
import { TaskDoneButton } from "@/features/tasks/components/task-done-button.client";
import type { TaskStatus } from "@/features/tasks/schemas";
import type { Priority } from "@/types/domain";

export type WorkloadTask = {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueAt: string | null;
  startedAt: string | null;
  acceptedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  projectKey: string | null;
};

export type WorkloadPerson = {
  userId: string | null; // null is the unassigned bucket
  fullName: string;
  avatarUrl: string | null;
  tasks: WorkloadTask[];
};

/**
 * Who is carrying what, and what runs out first.
 *
 * Grouped by person rather than listed by deadline, because the question is
 * about people before it is about dates: one person holding six things is a
 * problem even when none of them is due today, and a flat list sorted by
 * deadline hides that completely.
 *
 * Each person's work uses the same card and grid as everywhere else, minus the
 * assignee — their name is already the heading above it, and repeating it would
 * cost the row that shows the deadline.
 *
 * Unassigned work gets its own group at the end rather than being left out. A
 * task nobody owns is not a task with no problem; it is the reader's.
 */
export function TeamWorkload({
  people,
  viewerUserId,
}: {
  people: readonly WorkloadPerson[];
  /** Marks your own group, and decides which cards you may act on. */
  viewerUserId: string;
}) {
  if (people.length === 0) {
    return <p className="text-[15px] text-fg-muted">No open work across your projects.</p>;
  }

  return (
    <div className="flex flex-col gap-7">
      {people.map((person) => {
        const isViewer = person.userId === viewerUserId;
        return (
          <section key={person.userId ?? "unassigned"} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {person.userId ? (
                <UserAvatar name={person.fullName} avatarUrl={person.avatarUrl} />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-status-warning-bg text-status-warning-fg">
                  <UserX className="size-4" aria-hidden="true" />
                </span>
              )}
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-medium">
                  {person.fullName}
                  {isViewer ? <span className="ml-2 text-sm font-normal text-fg-subtle">you</span> : null}
                </span>
                <span className="text-sm text-fg-muted tabular-nums">
                  {person.tasks.length} open {person.tasks.length === 1 ? "task" : "tasks"}
                </span>
              </div>
            </div>

            <TaskGrid>
              {person.tasks.map((task) => (
                <li key={task.id}>
                  <TaskCard
                    projectKey={task.projectKey}
                    linkProject
                    showAssignee={false}
                    task={{
                      id: task.id,
                      seq: task.seq,
                      title: task.title,
                      description: task.description,
                      status: task.status,
                      priority: task.priority,
                      dueAt: task.dueAt,
                      acceptedAt: task.acceptedAt,
                      startedAt: task.startedAt,
                      completedAt: task.completedAt,
                      createdAt: task.createdAt,
                      assignee: null,
                    }}
                    actions={
                      /*
                       * Only on your own work. The ownership rule says a task
                       * is yours or a manager's to move, and a manager already
                       * has the full controls on the project board — putting
                       * them here too would make this page a second place to
                       * change other people's work.
                       */
                      isViewer && task.projectKey ? (
                        <TaskDoneButton
                          taskId={task.id}
                          projectKey={task.projectKey}
                          title={task.title}
                          done={task.status === "done"}
                          reopenTo={task.startedAt ? "in_progress" : "todo"}
                        />
                      ) : null
                    }
                  />
                </li>
              ))}
            </TaskGrid>
          </section>
        );
      })}
    </div>
  );
}

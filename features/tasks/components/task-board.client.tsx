"use client";

import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/os/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTask, deleteTask, updateTask } from "@/features/tasks/actions";
import { TaskCard, TaskGrid } from "@/features/tasks/components/task-card";
import { TaskAcceptButton } from "@/features/tasks/components/task-accept-button.client";
import { TaskDoneButton } from "@/features/tasks/components/task-done-button.client";
import { TASK_STATUSES, TASK_STATUS_META, type TaskStatus } from "@/features/tasks/schemas";
import type { TaskRow } from "@/features/tasks/queries";
import type { Priority } from "@/types/domain";

export type Assignable = { userId: string; fullName: string; avatarUrl: string | null };

type Props = {
  projectKey: string;
  tasks: readonly TaskRow[];
  team: readonly Assignable[];
  /** May add tasks at all. */
  canWrite: boolean;
  /** Manages the project: may change and reassign anyone else's task. */
  canManage: boolean;
  canDelete: boolean;
  viewerUserId: string;
};

type Runner = (work: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) => void;

/**
 * The work inside a project, as a grid of cards.
 *
 * Open work first, finished work after it, in the same grid. Completed tasks
 * are kept rather than hidden — a board that forgets what was done gives no
 * sense of progress — but drawn back so they never compete with what is still
 * outstanding.
 */
export function TaskBoard({ projectKey, tasks, team, canWrite, canManage, canDelete, viewerUserId }: Props) {
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);

  const open = tasks.filter((task) => task.status !== "done");
  const done = tasks.filter((task) => task.status === "done");

  const run: Runner = (work, success) => {
    startTransition(async () => {
      const result = await work();
      if (result.ok) toast.success(success);
      else toast.error(result.error?.message ?? "That did not work.");
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {tasks.length === 0 ? (
        <EmptyState
          variant="well"
          icon={CalendarClock}
          title="No tasks yet"
          description={
            canWrite ? "Add the first one and give it an owner and a deadline." : "Nothing has been assigned here yet."
          }
        />
      ) : (
        <TaskGrid>
          {[...open, ...done].map((task) => {
            /*
             * Per task, not per person. Everyone on the project reads the
             * board; only whoever holds a task, or someone managing the
             * project, can move it. Matches the tasks_update policy, so a
             * control is absent rather than present and then refused.
             */
            const canEdit = canManage || task.assignee?.id === viewerUserId;
            return (
              <li key={task.id}>
                <TaskCard
                  projectKey={projectKey}
                  task={{
                    id: task.id,
                    seq: task.seq,
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    priority: task.priority,
                    dueAt: task.due_at,
                    acceptedAt: task.accepted_at,
                    assignee: task.assignee
                      ? {
                          id: task.assignee.id,
                          fullName: task.assignee.full_name,
                          avatarUrl: task.assignee.avatar_url,
                        }
                      : null,
                  }}
                  actions={
                    <TaskActions
                      task={task}
                      projectKey={projectKey}
                      team={team}
                      canEdit={canEdit}
                      canReassign={canManage}
                      canDelete={canDelete}
                      viewerUserId={viewerUserId}
                      pending={pending}
                      run={run}
                    />
                  }
                />
              </li>
            );
          })}
        </TaskGrid>
      )}

      {canWrite ? (
        adding ? (
          <NewTaskForm
            projectKey={projectKey}
            team={team}
            pending={pending}
            onDone={() => setAdding(false)}
            run={run}
          />
        ) : (
          <Button variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Add a task
          </Button>
        )
      ) : null}
    </div>
  );
}

function TaskActions({
  task,
  projectKey,
  team,
  canEdit,
  canReassign,
  canDelete,
  viewerUserId,
  pending,
  run,
}: {
  task: TaskRow;
  projectKey: string;
  team: readonly Assignable[];
  viewerUserId: string;
  canEdit: boolean;
  canReassign: boolean;
  canDelete: boolean;
  pending: boolean;
  run: Runner;
}) {
  if (!canEdit && !canDelete) return null;
  const isMine = task.assignee?.id === viewerUserId;

  return (
    <>
      {/* Only the assignee accepts, even a manager. A manager accepting for
          someone would empty the "not picked up" list without anybody having
          picked anything up. */}
      {isMine && task.status !== "done" ? (
        <TaskAcceptButton taskId={task.id} projectKey={projectKey} title={task.title} acceptedAt={task.accepted_at} />
      ) : null}

      {canEdit ? (
        <TaskDoneButton
          taskId={task.id}
          projectKey={projectKey}
          title={task.title}
          done={task.status === "done"}
          // Back to where it was, not to the top of the list.
          reopenTo={task.started_at ? "in_progress" : "todo"}
        />
      ) : null}

      {canEdit ? (
        <Select
          value={task.status}
          disabled={pending}
          onValueChange={(status) =>
            run(
              () => updateTask({ taskId: task.id, projectKey, status }),
              `${task.title} is now ${TASK_STATUS_META[status as TaskStatus].label.toLowerCase()}`,
            )
          }
        >
          <SelectTrigger size="sm" className="w-32" aria-label={`Status of ${task.title}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {TASK_STATUS_META[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {canReassign ? (
        <Select
          value={task.assignee?.id ?? "none"}
          disabled={pending}
          onValueChange={(value) =>
            run(
              () => updateTask({ taskId: task.id, projectKey, assigneeId: value === "none" ? "" : value }),
              value === "none" ? "Task unassigned" : "Task reassigned",
            )
          }
        >
          <SelectTrigger size="sm" className="w-32" aria-label={`Assignee of ${task.title}`}>
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {team.map((person) => (
              <SelectItem key={person.userId} value={person.userId}>
                {person.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {canDelete ? (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-label={`Delete ${task.title}`}
          onClick={() => run(() => deleteTask({ taskId: task.id, projectKey }), "Task deleted")}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      ) : null}
    </>
  );
}

function NewTaskForm({
  projectKey,
  team,
  pending,
  onDone,
  run,
}: {
  projectKey: string;
  team: readonly Assignable[];
  pending: boolean;
  onDone: () => void;
  run: Runner;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("none");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueAt, setDueAt] = useState("");

  function submit() {
    if (title.trim() === "") return;
    run(
      () =>
        createTask({
          projectKey,
          title,
          description,
          assigneeId: assigneeId === "none" ? "" : assigneeId,
          priority,
          dueAt,
        }),
      "Task added",
    );
    setTitle("");
    setDescription("");
    setDueAt("");
    onDone();
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-bg-subtle p-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">What needs doing</span>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus disabled={pending} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Details</span>
        <Textarea
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={pending}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Who</span>
          <Select value={assigneeId} onValueChange={setAssigneeId} disabled={pending}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {team.map((person) => (
                <SelectItem key={person.userId} value={person.userId}>
                  {person.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Priority</span>
          <Select value={priority} onValueChange={(value) => setPriority(value as Priority)} disabled={pending}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Due by</span>
          {/* datetime-local, not date: the countdown is only as precise as this. */}
          <Input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={pending}
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={pending || title.trim() === ""}>
          {pending ? "Adding…" : "Add task"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

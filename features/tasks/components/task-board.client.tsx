"use client";

import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { AvatarGroup } from "@/components/os/avatar-group";
import { formatDate } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { StatusPill } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTask, deleteTask, updateTask } from "@/features/tasks/actions";
import { Countdown } from "@/features/tasks/components/countdown.client";
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
  /** Manages the project: may change and reassign anyone else’s task. */
  canManage: boolean;
  canDelete: boolean;
  viewerUserId: string;
};

/**
 * The work inside a project: who owns each task and how long they have.
 *
 * Assigning and dating happen in the same gesture as creating, because a task
 * with no owner and no deadline is a note, and notes do not get done. The
 * pickers stay on every row afterwards so reassigning is one click rather than
 * a trip through an edit screen.
 */
export function TaskBoard({ projectKey, tasks, team, canWrite, canManage, canDelete, viewerUserId }: Props) {
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);

  const open = tasks.filter((task) => task.status !== "done");
  const done = tasks.filter((task) => task.status === "done");

  function run(work: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) {
    startTransition(async () => {
      const result = await work();
      if (result.ok) toast.success(success);
      else toast.error(result.error?.message ?? "That did not work.");
    });
  }

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
        <ul className="flex flex-col divide-y divide-border">
          {[...open, ...done].map((task) => (
            <TaskRowItem
              key={task.id}
              task={task}
              projectKey={projectKey}
              team={team}
              /*
               * Per task, not per person. Everyone on the project reads the
               * board; only the person holding a task, or someone managing the
               * project, can move it. Matches the tasks_update policy, so the
               * control is absent rather than present and refused.
               */
              canEdit={canManage || task.assignee?.id === viewerUserId}
              canReassign={canManage}
              canDelete={canDelete}
              pending={pending}
              run={run}
            />
          ))}
        </ul>
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

function TaskRowItem({
  task,
  projectKey,
  team,
  canEdit,
  canReassign,
  canDelete,
  pending,
  run,
}: {
  task: TaskRow;
  projectKey: string;
  team: readonly Assignable[];
  canEdit: boolean;
  canReassign: boolean;
  canDelete: boolean;
  pending: boolean;
  run: (work: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) => void;
}) {
  const meta = TASK_STATUS_META[task.status];
  const finished = task.status === "done";

  return (
    <li className="flex flex-wrap items-center gap-3 py-3.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-mono text-[13px] text-fg-subtle">
            {projectKey}-{task.seq}
          </span>
          <span className={cnTitle(finished)} title={task.title}>
            {task.title}
          </span>
        </span>

        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
          {task.assignee ? (
            <span className="flex items-center gap-1.5">
              <AvatarGroup
                people={[
                  {
                    userId: task.assignee.id,
                    fullName: task.assignee.full_name,
                    avatarUrl: task.assignee.avatar_url,
                  },
                ]}
              />
              {task.assignee.full_name}
            </span>
          ) : (
            <span className="text-fg-subtle">Unassigned</span>
          )}

          {task.due_at ? (
            <span className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              {formatDate(task.due_at)}
              {finished ? null : <Countdown dueAt={task.due_at} className="font-medium" />}
            </span>
          ) : null}
        </span>
      </div>

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
          <SelectTrigger size="sm" className="w-36" aria-label={`Status of ${task.title}`}>
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
      ) : (
        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
      )}

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
          <SelectTrigger size="sm" className="w-40" aria-label={`Assignee of ${task.title}`}>
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
    </li>
  );
}

function cnTitle(finished: boolean): string {
  return finished
    ? "min-w-0 truncate text-[15px] text-fg-muted line-through"
    : "min-w-0 truncate text-[15px] font-medium";
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
  run: (work: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) => void;
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

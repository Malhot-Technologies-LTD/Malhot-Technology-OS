"use client";

import { Check, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { acceptTask, deleteTask, updateTask } from "@/features/tasks/actions";
import { TASK_STATUSES, TASK_STATUS_META, type TaskStatus } from "@/features/tasks/schemas";
import type { Priority } from "@/types/domain";

type Result = { ok: true } | { ok: false; error: { message: string } };

export type TaskEditorProps = {
  taskId: string;
  projectKey: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueAt: string | null;
  assigneeId: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  team: { userId: string; fullName: string }[];
  /** Manager or assignee: may change the task. */
  canEdit: boolean;
  /** Manager: may hand the task to someone else. */
  canManage: boolean;
  canDelete: boolean;
  viewerUserId: string;
};

const PRIORITY_LABEL: Record<Priority, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };

const noSubscription = () => () => {};

/** ISO instant → the browser-local "YYYY-MM-DDTHH:mm" a datetime-local input wants. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function useRun() {
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<Result>, success?: string, after?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      if (success) toast.success(success);
      after?.();
    });
  return { pending, run };
}

/** Title and description, editable in place by whoever may change the task. */
export function TaskContent({
  taskId,
  projectKey,
  title,
  description,
  canEdit,
}: Pick<TaskEditorProps, "taskId" | "projectKey" | "title" | "description" | "canEdit">) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftDescription, setDraftDescription] = useState(description ?? "");
  const { pending, run } = useRun();

  if (editing) {
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () => updateTask({ taskId, projectKey, title: draftTitle, description: draftDescription }),
            "Task updated",
            () => setEditing(false),
          );
        }}
      >
        <label htmlFor="task-title" className="sr-only">
          Title
        </label>
        <Input
          id="task-title"
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          maxLength={200}
          className="h-11 text-lg font-semibold"
          autoFocus
        />
        <label htmlFor="task-description" className="text-sm font-medium">
          Description
        </label>
        <Textarea
          id="task-description"
          value={draftDescription}
          onChange={(event) => setDraftDescription(event.target.value)}
          rows={8}
          maxLength={5000}
          placeholder="What needs doing, and how you will know it is done."
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setDraftTitle(title);
              setDraftDescription(description ?? "");
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">{title}</h1>
        {canEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" /> Edit
          </Button>
        ) : null}
      </div>
      <section aria-labelledby="task-description-heading" className="flex flex-col gap-2">
        <h2 id="task-description-heading" className="text-sm font-semibold">
          Description
        </h2>
        {description ? (
          <p className="text-[15px] leading-relaxed whitespace-pre-line text-fg-muted">{description}</p>
        ) : (
          <p className="text-[15px] text-fg-subtle">No description.</p>
        )}
      </section>
    </div>
  );
}

/** The properties column: status, priority, owner, deadline, and the actions that go with them. */
export function TaskProperties(props: TaskEditorProps) {
  const { taskId, projectKey, canEdit, canManage, viewerUserId } = props;
  const router = useRouter();
  const { pending, run } = useRun();
  // The saved deadline is shown in the reader's timezone, which the server
  // cannot know, so it appears once the browser has taken over. `draft` holds
  // an unsaved edit; null means "showing what is saved".
  const mounted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const [draft, setDraft] = useState<string | null>(null);
  const saved = mounted ? toLocalInput(props.dueAt) : "";
  const due = draft ?? saved;

  const isAssignee = props.assigneeId === viewerUserId;
  const done = props.status === "done";

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      <Property label="Status" htmlFor="task-status">
        <Select
          value={props.status}
          disabled={!canEdit || pending}
          onValueChange={(status) => run(() => updateTask({ taskId, projectKey, status }), "Status updated")}
        >
          <SelectTrigger id="task-status" className="w-full">
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
      </Property>

      <Property label="Priority" htmlFor="task-priority">
        <Select
          value={props.priority}
          disabled={!canEdit || pending}
          onValueChange={(priority) => run(() => updateTask({ taskId, projectKey, priority }), "Priority updated")}
        >
          <SelectTrigger id="task-priority" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((priority) => (
              <SelectItem key={priority} value={priority}>
                {PRIORITY_LABEL[priority]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Property>

      <Property label="Assignee" htmlFor="task-assignee">
        <Select
          value={props.assigneeId ?? "none"}
          disabled={!canManage || pending}
          onValueChange={(value) =>
            run(() => updateTask({ taskId, projectKey, assigneeId: value === "none" ? "" : value }), "Assignee updated")
          }
        >
          <SelectTrigger id="task-assignee" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {props.team.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {member.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Property>

      <Property label="Deadline" htmlFor="task-due">
        <div className="flex gap-2">
          <Input
            id="task-due"
            type="datetime-local"
            value={due}
            disabled={!canEdit || pending}
            onChange={(event) => setDraft(event.target.value)}
          />
          {canEdit && draft !== null && draft !== saved ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  () => updateTask({ taskId, projectKey, dueAt: due === "" ? "" : new Date(due).toISOString() }),
                  "Deadline updated",
                )
              }
            >
              Save
            </Button>
          ) : null}
        </div>
      </Property>

      <div className="flex flex-col gap-2 border-t border-border pt-5">
        {isAssignee && !props.acceptedAt && !done ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() => run(() => acceptTask({ taskId, projectKey }), "Accepted. The manager can see it.")}
          >
            <Check aria-hidden="true" /> Accept this task
          </Button>
        ) : null}
        {canEdit ? (
          done ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  () => updateTask({ taskId, projectKey, status: props.startedAt ? "in_progress" : "todo" }),
                  "Task reopened",
                )
              }
            >
              <RotateCcw aria-hidden="true" /> Reopen
            </Button>
          ) : (
            <Button
              type="button"
              variant={isAssignee && !props.acceptedAt ? "outline" : "default"}
              disabled={pending}
              onClick={() => run(() => updateTask({ taskId, projectKey, status: "done" }), "Marked as done")}
            >
              <Check aria-hidden="true" /> Mark as done
            </Button>
          )
        ) : null}
        {props.canDelete ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" disabled={pending} className="text-fg-muted">
                <Trash2 aria-hidden="true" /> Delete task
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                <AlertDialogDescription>
                  {props.title} is removed for everyone on the project. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    run(
                      () => deleteTask({ taskId, projectKey }),
                      "Task deleted",
                      () => router.push(`/os/projects/${projectKey}`),
                    )
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    </div>
  );
}

function Property({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium tracking-[0.04em] text-fg-subtle uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

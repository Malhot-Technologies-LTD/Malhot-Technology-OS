"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTask } from "@/features/tasks/actions";
import { taskHref, taskRef } from "@/features/tasks/links";
import { TASK_STATUSES, TASK_STATUS_META, type TaskStatus } from "@/features/tasks/schemas";
import type { Priority } from "@/types/domain";

export type TeamMember = { userId: string; fullName: string };

type Props = {
  projectKey: string;
  team: readonly TeamMember[];
  viewerUserId: string;
  /** Managers hand work to anyone; everyone else to themselves or nobody. */
  canAssignOthers: boolean;
  defaultStatus?: TaskStatus;
  /** Date-only "YYYY-MM-DD" to prefill the deadline with, at 17:00 local. */
  defaultDue?: string;
  trigger?: ReactNode;
};

/**
 * Add a task to this project without leaving the page you are on. After
 * saving, the toast offers the new task's page, so "add then open" is one
 * extra click rather than a hunt.
 */
export function NewTaskDialog({
  projectKey,
  team,
  viewerUserId,
  canAssignOthers,
  defaultStatus = "todo",
  defaultDue,
  trigger,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(canAssignOthers ? "none" : viewerUserId);
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [dueAt, setDueAt] = useState(defaultDue ? `${defaultDue}T17:00` : "");
  const [error, setError] = useState<string | null>(null);

  const people = canAssignOthers ? team : team.filter((person) => person.userId === viewerUserId);

  function reset() {
    setTitle("");
    setDescription("");
    setAssigneeId(canAssignOthers ? "none" : viewerUserId);
    setPriority("medium");
    setStatus(defaultStatus);
    setDueAt(defaultDue ? `${defaultDue}T17:00` : "");
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim() === "") {
      setError("Say what needs doing.");
      return;
    }
    startTransition(async () => {
      const result = await createTask({
        projectKey,
        title,
        description,
        assigneeId: assigneeId === "none" ? "" : assigneeId,
        priority,
        status,
        dueAt,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      const ref = taskRef(projectKey, result.data.seq);
      toast.success(`${ref} added`, {
        action: { label: "Open", onClick: () => router.push(taskHref(projectKey, result.data.seq)) },
      });
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus aria-hidden="true" />
            New task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>New task in {projectKey}</DialogTitle>
            <DialogDescription>
              Give it an owner and a deadline so it shows on their list with a countdown.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">What needs doing</span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                autoFocus
                disabled={pending}
                aria-invalid={Boolean(error)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Details</span>
              <Textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={5000}
                disabled={pending}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Who">
                <Select value={assigneeId} onValueChange={setAssigneeId} disabled={pending}>
                  <SelectTrigger className="w-full" aria-label="Who">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {people.map((person) => (
                      <SelectItem key={person.userId} value={person.userId}>
                        {person.userId === viewerUserId ? `${person.fullName} (you)` : person.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Due by">
                <Input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  disabled={pending}
                  aria-label="Due by"
                />
              </Field>
              <Field label="Priority">
                <Select value={priority} onValueChange={(value) => setPriority(value as Priority)} disabled={pending}>
                  <SelectTrigger className="w-full" aria-label="Priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)} disabled={pending}>
                  <SelectTrigger className="w-full" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.filter((value) => value !== "done").map((value) => (
                      <SelectItem key={value} value={value}>
                        {TASK_STATUS_META[value].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || title.trim() === ""}>
              {pending ? "Adding…" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium" aria-hidden="true">
        {label}
      </span>
      {children}
    </div>
  );
}

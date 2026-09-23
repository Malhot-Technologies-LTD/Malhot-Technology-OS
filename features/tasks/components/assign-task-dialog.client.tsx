"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
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
import type { Priority } from "@/types/domain";

export type AssignableProject = { id: string; key: string; name: string };
export type AssignablePerson = { userId: string; fullName: string };

type Props = {
  projects: readonly AssignableProject[];
  /** Who is on each project, keyed by project id. */
  teams: Readonly<Record<string, readonly AssignablePerson[]>>;
};

/**
 * Assign work to someone, from anywhere.
 *
 * The task board inside a project is where you manage that project's work; this
 * is for the other direction — you have decided what somebody should be doing
 * and you do not want to go and find the project first.
 *
 * Choosing a project narrows the people, because only members of a project can
 * hold its tasks: the `task_assignee_must_be_member` trigger refuses anyone
 * else, and offering a name that will be rejected is worse than not offering it.
 */
export function AssignTaskDialog({ projects, teams }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("none");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueAt, setDueAt] = useState("");

  const project = projects.find((candidate) => candidate.id === projectId);
  const people = projectId ? (teams[projectId] ?? []) : [];

  function reset() {
    setProjectId("");
    setAssigneeId("none");
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueAt("");
  }

  function submit() {
    if (!project || title.trim() === "") return;
    startTransition(async () => {
      const result = await createTask({
        projectKey: project.key,
        title,
        description,
        assigneeId: assigneeId === "none" ? "" : assigneeId,
        priority,
        dueAt,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const who = people.find((person) => person.userId === assigneeId)?.fullName;
      toast.success(who ? `${who} has a new task in ${project.key}` : `Task added to ${project.key}`);
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
        <Button>
          <Plus aria-hidden="true" />
          Assign a task
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Assign a task</DialogTitle>
          <DialogDescription>
            Say what needs doing, who is doing it and by when. The person sees a countdown against the deadline.
          </DialogDescription>
        </DialogHeader>

        {projects.length === 0 ? (
          <p className="text-[15px] text-fg-muted">
            You are not managing any projects yet, so there is nothing to assign work in.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Project</span>
                <Select
                  value={projectId}
                  disabled={pending}
                  onValueChange={(value) => {
                    setProjectId(value);
                    // The previous person may not be on this project.
                    setAssigneeId("none");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.key} · {candidate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Who</span>
                <Select value={assigneeId} onValueChange={setAssigneeId} disabled={pending || !projectId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={projectId ? "Unassigned" : "Pick a project first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {people.map((person) => (
                      <SelectItem key={person.userId} value={person.userId}>
                        {person.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {projectId && people.length === 0 ? (
                  <span className="text-sm text-fg-muted">Nobody is on this project yet.</span>
                ) : null}
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">What needs doing</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} disabled={pending} />
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

            <div className="grid gap-4 sm:grid-cols-2">
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
                <Input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  disabled={pending}
                />
              </label>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          {projects.length > 0 ? (
            <Button onClick={submit} disabled={pending || !projectId || title.trim() === ""}>
              {pending ? "Assigning…" : "Assign"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

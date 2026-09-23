"use client";

import { UserPlus } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignProjectMember } from "@/features/projects/actions";
import { ASSIGNABLE_PROJECT_ROLES, PROJECT_ROLE_META } from "@/features/projects/roles";
import type { ProjectRole } from "@/types/domain";

export type ApprovedPerson = { userId: string; name: string };
export type AssignableProject = { id: string; key: string; name: string; status: string };

type Props = {
  person: ApprovedPerson | null;
  projects: readonly AssignableProject[];
  onClose: () => void;
};

/**
 * The step straight after approval: put the new person on something.
 *
 * Approving grants an account, not work. `projects_select` shows a plain member
 * only the projects they belong to, so someone approved and left unassigned
 * signs in to an empty OS and reasonably concludes they were not let in at all.
 * Asking here closes that gap at the one moment the admin is already thinking
 * about this person.
 *
 * A dialog rather than an inline step, because approving revalidates the
 * members page: the request row is gone from the list by the time this opens,
 * and anything rendered inside it would unmount mid-flow.
 *
 * Skipping is a first-class outcome. Not everyone is approved for project work
 * straight away, and a prompt that cannot be dismissed teaches people to
 * dismiss it carelessly.
 */
export function AssignFirstProject({ person, projects, onClose }: Props) {
  const [projectId, setProjectId] = useState("");
  const [role, setRole] = useState<ProjectRole>("developer");
  const [pending, startTransition] = useTransition();

  function close() {
    setProjectId("");
    setRole("developer");
    onClose();
  }

  function assign() {
    if (!person || !projectId) return;
    const project = projects.find((candidate) => candidate.id === projectId);
    startTransition(async () => {
      const result = await assignProjectMember({ projectId, userId: person.userId, role });
      if (result.ok) {
        toast.success(
          `${person.name} is on ${project?.key ?? "the project"} as a ${PROJECT_ROLE_META[role].label.toLowerCase()}`,
        );
        close();
      } else {
        toast.error(result.error.message);
      }
    });
  }

  return (
    <Dialog open={person !== null} onOpenChange={(open) => (open ? undefined : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Put {person?.name ?? "them"} on a project</DialogTitle>
          <DialogDescription>
            They can sign in now, but they will see an empty workspace until they are on a project. You can also do this
            later from any project&rsquo;s Team panel.
          </DialogDescription>
        </DialogHeader>

        {projects.length === 0 ? (
          <p className="text-[15px] text-fg-muted">
            There are no projects to add them to yet. Create one and add them from its Team panel.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Project</span>
              <Select value={projectId} onValueChange={setProjectId} disabled={pending}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.key} · {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Role</span>
              <Select value={role} onValueChange={(next) => setRole(next as ProjectRole)} disabled={pending}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_PROJECT_ROLES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {PROJECT_ROLE_META[option].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-fg-muted">{PROJECT_ROLE_META[role].summary}.</span>
            </label>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              Skip for now
            </Button>
          </DialogClose>
          {projects.length > 0 ? (
            <Button onClick={assign} disabled={pending || !projectId}>
              <UserPlus aria-hidden="true" />
              {pending ? "Adding…" : "Add to project"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

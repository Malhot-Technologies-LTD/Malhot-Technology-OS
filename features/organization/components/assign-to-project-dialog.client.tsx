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

export type AssignTarget = { userId: string; name: string };
export type AssignableProject = { id: string; key: string; name: string; status: string };

type Props = {
  /** null closes the dialog; a person opens it. */
  person: AssignTarget | null;
  projects: readonly AssignableProject[];
  /** True when the projects query failed, which is not the same as having none. */
  projectsFailed?: boolean;
  /** Extra line shown under the title — used right after approval. */
  description?: string;
  onClose: () => void;
};

/**
 * Put a person on a project.
 *
 * Used in two places and deliberately not tied to either: straight after
 * approving someone, and from any row in the members list. Access to work is
 * what project membership grants — `projects_select` shows a plain member only
 * the projects they belong to — so this needs to be reachable at any time, not
 * only in the seconds after approval.
 *
 * No action of its own: `assignProjectMember` already re-reads the project and
 * checks `can(project.manage_members)` against the caller. An org admin has a
 * manager's reach, which is exactly who is doing this.
 */
export function AssignToProjectDialog({ person, projects, projectsFailed, description, onClose }: Props) {
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

  const canPick = projects.length > 0;

  return (
    <Dialog open={person !== null} onOpenChange={(open) => (open ? undefined : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Put {person?.name ?? "them"} on a project</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {/*
         * A failed query and an empty organisation are different problems with
         * different fixes, and telling someone "there are no projects" when the
         * request errored sends them off to create one they already have.
         */}
        {projectsFailed ? (
          <p className="rounded-lg border border-status-danger-border bg-status-danger-bg px-4 py-3 text-[15px] text-status-danger-fg">
            The project list could not be loaded, so there is nothing to choose from. Reload the page; if it keeps
            happening the database may be mid-migration.
          </p>
        ) : !canPick ? (
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
              {canPick ? "Cancel" : "Close"}
            </Button>
          </DialogClose>
          {canPick ? (
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

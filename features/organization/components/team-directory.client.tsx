"use client";

import { FolderPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { UserAvatar } from "@/components/os/user-menu.client";
import { Button } from "@/components/ui/button";
import {
  AssignToProjectDialog,
  type AssignableProject,
  type AssignTarget,
} from "@/features/organization/components/assign-to-project-dialog.client";
import { PROJECT_ROLE_META } from "@/features/projects/roles";
import type { ProjectRole } from "@/types/domain";

export type TeamPerson = {
  userId: string;
  fullName: string;
  title: string | null;
  avatarUrl: string | null;
  orgRole: string;
  projects: { key: string; name: string; role: ProjectRole }[];
};

type Props = {
  people: readonly TeamPerson[];
  projects: readonly AssignableProject[];
  projectsFailed?: boolean;
  canAssign: boolean;
  viewerUserId: string;
};

/**
 * Everyone in the organisation and the projects they can actually reach.
 *
 * The point of the page is the gap it makes visible. Organisation membership
 * grants an account; `projects_select` shows a plain member only the projects
 * they belong to, so anyone here with no project chips is signed in and seeing
 * nothing. That used to be invisible — you would only discover it when the
 * person said so — and the fix was buried inside whichever project they should
 * have been on. Here it is the first thing you notice, next to the button that
 * resolves it.
 */
export function TeamDirectory({ people, projects, projectsFailed, canAssign, viewerUserId }: Props) {
  const [assigning, setAssigning] = useState<AssignTarget | null>(null);
  const unassigned = people.filter((person) => person.projects.length === 0).length;

  return (
    <>
      {unassigned > 0 && canAssign ? (
        <p
          role="status"
          className="rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-[15px] text-status-warning-fg"
        >
          {unassigned === 1 ? "1 person is" : `${unassigned} people are`} not on any project yet. They can sign in, but
          their workspace is empty until you add them to one.
        </p>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {people.map((person) => (
          <li
            key={person.userId}
            className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 transition-colors duration-[160ms] hover:border-border-strong"
          >
            <div className="flex items-start gap-3">
              <UserAvatar name={person.fullName} avatarUrl={person.avatarUrl} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-medium">
                  {person.fullName}
                  {person.userId === viewerUserId ? (
                    <span className="ml-2 text-sm font-normal text-fg-subtle">you</span>
                  ) : null}
                </span>
                <span className="truncate text-sm text-fg-muted">{person.title || person.orgRole}</span>
              </div>
            </div>

            {person.projects.length === 0 ? (
              <p className="text-sm text-fg-subtle">On no projects — their workspace is empty.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {person.projects.map((project) => (
                  <li key={project.key}>
                    <Link
                      href={`/os/projects/${project.key}`}
                      title={`${project.name} · ${PROJECT_ROLE_META[project.role].label}`}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-bg-subtle px-2.5 py-1 text-[13px] text-fg-muted transition-colors duration-[120ms] hover:border-border-strong hover:text-fg"
                    >
                      <span className="font-mono">{project.key}</span>
                      <span className="text-fg-subtle">{PROJECT_ROLE_META[project.role].label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {canAssign ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-auto w-fit"
                onClick={() => setAssigning({ userId: person.userId, name: person.fullName })}
              >
                <FolderPlus aria-hidden="true" />
                Add to project
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <AssignToProjectDialog
        person={assigning}
        projects={projects}
        projectsFailed={projectsFailed}
        onClose={() => setAssigning(null)}
      />
    </>
  );
}

import { FolderKanban } from "lucide-react";
import Link from "next/link";

import { DueDate, EMPTY, ProjectKey } from "@/components/os/data-display";
import { EmptyState } from "@/components/os/empty-state";
import { PriorityBadge, ProjectStatusBadge } from "@/components/os/status-badge";
import { Button } from "@/components/ui/button";
import type { ProjectListRow } from "@/features/projects/queries";

/**
 * Project list (docs/features/projects.md#project-list).
 *
 * Cards rather than table rows: an agency runs a handful of projects at a time,
 * so the list is short and each entry can afford to show its own facts. The
 * whole card is the link, with the name as the accessible label — one target,
 * no hunting for a small hit area.
 */
export function ProjectList({ projects, canCreate }: { projects: readonly ProjectListRow[]; canCreate: boolean }) {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="A project holds the goals, MVP, tasks and documents for one piece of client work."
        action={
          canCreate ? (
            <Button asChild>
              <Link href="/os/projects/new">Create your first project</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => {
        const open = project.status !== "completed" && project.status !== "archived";
        return (
          <li key={project.id}>
            <Link
              href={`/os/projects/${project.key}`}
              className="group focus-visible:outline-focus flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-5 transition-colors duration-[120ms] hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <div className="flex items-start justify-between gap-3">
                <ProjectKey value={project.key} />
                <ProjectStatusBadge status={project.status} />
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="truncate text-[15px] font-medium group-hover:underline" title={project.name}>
                  {project.name}
                </h3>
                <p className="truncate text-sm text-fg-muted">{project.client?.name ?? "Internal"}</p>
              </div>

              <dl className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4 text-sm">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-xs text-fg-subtle">Manager</dt>
                  <dd className="truncate text-fg-muted">{project.manager?.full_name ?? EMPTY}</dd>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <dt className="text-xs text-fg-subtle">Target end</dt>
                  <dd>
                    <DueDate value={project.target_end_date} open={open} />
                  </dd>
                </div>
              </dl>

              <PriorityBadge priority={project.priority} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

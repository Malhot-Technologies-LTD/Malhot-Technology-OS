import type { Metadata } from "next";
import Link from "next/link";

import { ErrorState } from "@/components/os/error-state";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { Button } from "@/components/ui/button";
import { ProjectList } from "@/features/projects/components/project-list";
import { listProjects, listTeamsByProject } from "@/features/projects/queries";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Projects" };

/** Project list (docs/features/projects.md#project-list). */
export default async function ProjectsPage() {
  const viewer = await requireViewer();
  const canCreate = can(viewer, "project.create");

  const { data, error } = await listProjects(viewer.organizationId);
  if (error) {
    // Rendering the reason beats throwing: the boundary only has a digest, and
    // in production Next strips the message, so the one useful fact is lost.
    logger.error("projects.list_failed", { code: error.code, message: error.message });
    return (
      <PageBody>
        <PageHeader title="Projects" />
        <ErrorState {...describeQueryFailure(error)} />
      </PageBody>
    );
  }

  // One query for every card, after the list is known.
  const teams = await listTeamsByProject(data.map((project) => project.id));

  return (
    <PageBody>
      <PageHeader
        title="Projects"
        description={data.length === 1 ? "1 project" : `${data.length} projects`}
        actions={
          canCreate && data.length > 0 ? (
            <Button asChild>
              <Link href="/os/projects/new">New project</Link>
            </Button>
          ) : undefined
        }
      />
      <ProjectList projects={data} canCreate={canCreate} teams={teams} />
    </PageBody>
  );
}

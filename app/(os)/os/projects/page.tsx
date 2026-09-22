import type { Metadata } from "next";
import Link from "next/link";

import { PageBody, PageHeader } from "@/components/os/page-header";
import { Button } from "@/components/ui/button";
import { ProjectList } from "@/features/projects/components/project-list";
import { listProjects } from "@/features/projects/queries";
import { requireViewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Projects" };

/** Project list (docs/features/projects.md#project-list). */
export default async function ProjectsPage() {
  const viewer = await requireViewer();
  const canCreate = can(viewer, "project.create");

  const { data, error } = await listProjects(viewer.organizationId);
  if (error) throw new Error(`Could not load projects: ${error.message}`);

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
      <ProjectList projects={data} canCreate={canCreate} />
    </PageBody>
  );
}

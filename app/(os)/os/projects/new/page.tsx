import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageBody, PageHeader } from "@/components/os/page-header";
import { CreateProjectForm } from "@/features/projects/components/create-project-form.client";
import { listClients } from "@/features/projects/queries";
import { requireViewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "New project" };

/** W2 step 1: any organisation member may start a project; the creator becomes its manager. */
export default async function NewProjectPage() {
  const viewer = await requireViewer();
  if (!can(viewer, "project.create")) notFound();

  const { data: clients } = await listClients(viewer.organizationId);

  return (
    <PageBody>
      <PageHeader
        title="New project"
        description="Start with the basics. Goals, MVP items and dates can be filled in from the overview."
      />
      <CreateProjectForm clients={clients ?? []} />
    </PageBody>
  );
}

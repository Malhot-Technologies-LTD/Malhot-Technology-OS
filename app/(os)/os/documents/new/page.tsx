import type { Metadata } from "next";

import { PageBody, PageHeader } from "@/components/os/page-header";
import { DocumentGenerator } from "@/features/documents/components/generator.client";
import { DEFAULT_LETTERHEAD } from "@/features/documents/files";
import { listOrganizationDocuments } from "@/features/documents/queries";
import { listProjects } from "@/features/projects/queries";
import { dayKey } from "@/features/timeline/calendar";
import { requireViewer } from "@/lib/auth/context";
import { requestTime } from "@/lib/request-time";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Generate a document" };

/**
 * The generator outside any one project: HR letters and contracts often belong
 * to the company rather than to a delivery project. Printing needs no project;
 * saving files the document under the project chosen on the form.
 */
export default async function NewDocumentPage({ searchParams }: PageProps<"/os/documents/new">) {
  const [viewer, query] = await Promise.all([requireViewer(), searchParams]);
  const [projects, probe] = await Promise.all([
    listProjects(viewer.organizationId, 200),
    listOrganizationDocuments(viewer.organizationId),
  ]);
  const writable = (projects.data ?? []).filter((project) => project.status !== "archived");

  return (
    <PageBody>
      <PageHeader
        title="Generate a document"
        description="Choose a template, fill in the facts, and it is laid out on the company letterhead as you type."
      />
      <DocumentGenerator
        projects={writable.map((project) => ({
          key: project.key,
          name: project.name,
          clientName: project.client?.name ?? null,
        }))}
        templateKey={typeof query.template === "string" ? query.template : null}
        today={dayKey(requestTime(), viewer.profile.timezone || "UTC")}
        defaultLetterhead={DEFAULT_LETTERHEAD}
        // Saving is checked per project by the action; hide it only when it cannot work anywhere.
        canSave={!probe.missing && (writable.length > 0 || can(viewer, "project.create"))}
      />
    </PageBody>
  );
}

import type { Metadata } from "next";

import { PageBody, PageHeader } from "@/components/os/page-header";
import { DocumentGenerator } from "@/features/documents/components/generator.client";
import { DEFAULT_LETTERHEAD, sanitiseLetterhead } from "@/features/documents/files";
import { basicTemplateProject } from "@/features/documents/project-context";
import { listOrganizationDocuments } from "@/features/documents/queries";
import { findTemplate, sanitiseValues } from "@/features/documents/templates";
import { getCompanyFile, listFolders } from "@/features/files/queries";
import { folderPaths } from "@/features/files/tree";
import { listProjects } from "@/features/projects/queries";
import { dayKey } from "@/features/timeline/calendar";
import { requireViewer } from "@/lib/auth/context";
import { requestTime } from "@/lib/request-time";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Generate a document" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The generator outside any one project. Printing needs nowhere to save;
 * saving files the document in a company folder (by default the one "New
 * document" was pressed in, `?folder=`) or on a project chosen on the form.
 * `?from=` starts from a document saved in a folder ("Edit a copy").
 */
export default async function NewDocumentPage({ searchParams }: PageProps<"/os/documents/new">) {
  const [viewer, query] = await Promise.all([requireViewer(), searchParams]);
  const from = typeof query.from === "string" && UUID.test(query.from) ? query.from : null;
  const [projects, probe, folders, source] = await Promise.all([
    listProjects(viewer.organizationId, 200),
    listOrganizationDocuments(viewer.organizationId),
    listFolders(viewer.organizationId),
    from ? getCompanyFile(viewer.organizationId, from) : Promise.resolve(null),
  ]);
  const writable = (projects.data ?? []).filter((project) => project.status !== "archived");

  const copy = source?.data && source.data.source === "generated" ? source.data : null;
  const sourceTemplate = copy ? findTemplate(copy.template_key) : null;
  const stored = (copy?.fields ?? {}) as { values?: unknown; letterhead?: unknown };
  const templateKey = sourceTemplate?.key ?? (typeof query.template === "string" ? query.template : null);
  const folderId =
    typeof query.folder === "string" && UUID.test(query.folder) ? query.folder : (copy?.folder_id ?? null);

  return (
    <PageBody>
      <PageHeader
        title="Generate a document"
        description="Choose a template, fill in the facts, and it is laid out on the company letterhead as you type."
      />
      <DocumentGenerator
        projects={writable.map(basicTemplateProject)}
        folders={folders.missing ? null : folderPaths(folders.data)}
        folderId={folderId}
        templateKey={templateKey}
        seed={
          sourceTemplate && copy
            ? {
                values: sanitiseValues(sourceTemplate, stored.values),
                letterhead: sanitiseLetterhead(stored.letterhead),
                title: `${copy.title} (copy)`,
              }
            : null
        }
        today={dayKey(requestTime(), viewer.profile.timezone || "UTC")}
        defaultLetterhead={DEFAULT_LETTERHEAD}
        // Saving to a project is checked per project by the action; offer it only when it can work somewhere.
        canSave={!probe.missing && (writable.length > 0 || can(viewer, "project.create"))}
      />
    </PageBody>
  );
}

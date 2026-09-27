import type { Metadata } from "next";

import { DocumentGenerator } from "@/features/documents/components/generator.client";
import { DEFAULT_LETTERHEAD, sanitiseLetterhead } from "@/features/documents/files";
import { getProjectDocument, listProjectDocuments } from "@/features/documents/queries";
import { findTemplate, sanitiseValues } from "@/features/documents/templates";
import { loadWorkspace } from "@/features/projects/workspace";
import { dayKey } from "@/features/timeline/calendar";

export const metadata: Metadata = { title: "Generate a document" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The generator, inside a project: saving files the document under this project. */
export default async function NewProjectDocumentPage({
  params,
  searchParams,
}: PageProps<"/os/projects/[key]/documents/new">) {
  const [{ key }, query] = await Promise.all([params, searchParams]);
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, perms, viewer, now } = workspace;

  // "Edit a copy": start from a saved document's facts and letterhead.
  const from = typeof query.from === "string" && UUID.test(query.from) ? query.from : null;
  const source = from ? (await getProjectDocument(project.id, from)).data : null;
  const sourceTemplate = source?.template_key ? findTemplate(source.template_key) : null;
  const stored = (source?.fields ?? {}) as { values?: unknown; letterhead?: unknown };

  const templateKey = sourceTemplate?.key ?? (typeof query.template === "string" ? query.template : null);
  // Whether saving can work at all: the table exists.
  const probe = await listProjectDocuments(project.id);

  return (
    <DocumentGenerator
      projects={[{ key: project.key, name: project.name, clientName: project.client?.name ?? null }]}
      projectKey={project.key}
      templateKey={templateKey}
      seed={
        sourceTemplate && source
          ? {
              values: sanitiseValues(sourceTemplate, stored.values),
              letterhead: sanitiseLetterhead(stored.letterhead),
              title: `${source.title} (copy)`,
            }
          : null
      }
      today={dayKey(now, viewer.profile.timezone || "UTC")}
      defaultLetterhead={DEFAULT_LETTERHEAD}
      canSave={perms.uploadDocument && !probe.missing}
    />
  );
}

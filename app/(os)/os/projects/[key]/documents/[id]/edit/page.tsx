import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocumentGenerator } from "@/features/documents/components/generator.client";
import { DEFAULT_LETTERHEAD, sanitiseLetterhead } from "@/features/documents/files";
import { toTemplateProject } from "@/features/documents/project-context";
import { getProjectDocument } from "@/features/documents/queries";
import { findTemplate, sanitiseValues } from "@/features/documents/templates";
import { projectHref } from "@/features/projects/tabs";
import { loadMembers, loadPlanning, loadWorkspace } from "@/features/projects/workspace";
import { dayKey } from "@/features/timeline/calendar";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Edit document" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Edit a generated project document in place. The manager, or whoever added it. */
export default async function EditProjectDocumentPage({ params }: PageProps<"/os/projects/[key]/documents/[id]/edit">) {
  const { key, id } = await params;
  if (!UUID.test(id)) notFound();
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, viewer, ctx, perms, now } = workspace;

  const [{ data: document }, members, planning] = await Promise.all([
    getProjectDocument(project.id, id),
    loadMembers(project.id),
    loadPlanning(project.id),
  ]);
  if (!document || document.source !== "generated") notFound();
  const template = findTemplate(document.template_key);
  // Mirrors project_documents_update: the manager, or whoever added it, on a project that is not archived.
  const mayEdit =
    perms.writable &&
    (can(viewer, "document.delete", ctx) ||
      (document.uploaded_by === viewer.userId && can(viewer, "document.create", ctx)));
  if (!template || !mayEdit) notFound();
  const stored = (document.fields ?? {}) as { values?: unknown; letterhead?: unknown };

  return (
    <DocumentGenerator
      projects={[toTemplateProject(project, members.data ?? [], planning.milestones)]}
      projectKey={project.key}
      templateKey={template.key}
      seed={{
        values: sanitiseValues(template, stored.values),
        letterhead: sanitiseLetterhead(stored.letterhead),
        title: document.title,
      }}
      today={dayKey(now, viewer.profile.timezone || "UTC")}
      defaultLetterhead={DEFAULT_LETTERHEAD}
      canSave
      editing={{
        id,
        updatedAt: document.updated_at,
        backHref: `${projectHref(project.key)}/documents/${id}`,
        target: { kind: "project", projectKey: project.key },
      }}
    />
  );
}

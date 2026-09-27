import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageBody, PageHeader } from "@/components/os/page-header";
import { DocumentGenerator } from "@/features/documents/components/generator.client";
import { DEFAULT_LETTERHEAD, sanitiseLetterhead } from "@/features/documents/files";
import { findTemplate, sanitiseValues } from "@/features/documents/templates";
import { getCompanyFile } from "@/features/files/queries";
import { canManageItem } from "@/features/files/tree";
import { dayKey } from "@/features/timeline/calendar";
import { requireViewer } from "@/lib/auth/context";
import { requestTime } from "@/lib/request-time";

export const metadata: Metadata = { title: "Edit document" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Edit a generated document in a folder, in place. Its creator or an admin. */
export default async function EditCompanyFilePage({ params }: PageProps<"/os/files/documents/[id]/edit">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const viewer = await requireViewer();
  const file = await getCompanyFile(viewer.organizationId, id);
  if (!file.data || file.data.source !== "generated") notFound();
  const template = findTemplate(file.data.template_key);
  if (!template || !canManageItem({ userId: viewer.userId, isAdmin: viewer.orgRole !== "member" }, file.data))
    notFound();
  const stored = (file.data.fields ?? {}) as { values?: unknown; letterhead?: unknown };

  return (
    <PageBody>
      <PageHeader title={`Edit ${file.data.title}`} description="Saving replaces this document for everyone." />
      <DocumentGenerator
        projects={[]}
        templateKey={template.key}
        seed={{
          values: sanitiseValues(template, stored.values),
          letterhead: sanitiseLetterhead(stored.letterhead),
          title: file.data.title,
        }}
        today={dayKey(requestTime(), viewer.profile.timezone || "UTC")}
        defaultLetterhead={DEFAULT_LETTERHEAD}
        canSave
        editing={{
          id,
          updatedAt: file.data.updated_at,
          backHref: `/os/files/documents/${id}`,
          target: { kind: "file" },
        }}
      />
    </PageBody>
  );
}

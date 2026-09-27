import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageBody, PageHeader } from "@/components/os/page-header";
import { DocumentGenerator } from "@/features/documents/components/generator.client";
import { DEFAULT_LETTERHEAD, sanitiseLetterhead } from "@/features/documents/files";
import { findTemplate, sanitiseValues } from "@/features/documents/templates";
import { getMember, getMemberDocument } from "@/features/team/queries";
import { dayKey } from "@/features/timeline/calendar";
import { requireViewer } from "@/lib/auth/context";
import { can } from "@/lib/permissions";
import { requestTime } from "@/lib/request-time";

export const metadata: Metadata = { title: "Edit document" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Edit a generated document on a person, in place. Admins only, as for creating one. */
export default async function EditMemberDocumentPage({
  params,
}: PageProps<"/os/team/[userId]/documents/[docId]/edit">) {
  const { userId, docId } = await params;
  if (!UUID.test(userId) || !UUID.test(docId)) notFound();
  const viewer = await requireViewer();
  if (!can(viewer, "member.records")) notFound();
  const [member, document] = await Promise.all([
    getMember(viewer.organizationId, userId),
    getMemberDocument(viewer.organizationId, userId, docId),
  ]);
  if (!member.data || !document.data || document.data.source !== "generated") notFound();
  const template = findTemplate(document.data.template_key);
  if (!template) notFound();
  const stored = (document.data.fields ?? {}) as { values?: unknown; letterhead?: unknown };
  const fullName = member.data.profile?.full_name || "Unnamed";

  return (
    <PageBody>
      <PageHeader
        title={`Edit ${document.data.title}`}
        description={`Saving replaces this document on the record of ${fullName}.`}
      />
      <DocumentGenerator
        projects={[]}
        templateKey={template.key}
        seed={{
          values: sanitiseValues(template, stored.values),
          letterhead: sanitiseLetterhead(stored.letterhead),
          title: document.data.title,
        }}
        today={dayKey(requestTime(), viewer.profile.timezone || "UTC")}
        defaultLetterhead={DEFAULT_LETTERHEAD}
        canSave
        editing={{
          id: docId,
          updatedAt: document.data.updated_at,
          backHref: `/os/team/${userId}/documents/${docId}`,
          target: { kind: "member", userId },
        }}
      />
    </PageBody>
  );
}

import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatDate } from "@/components/os/data-display";
import { PageBody } from "@/components/os/page-header";
import { DocumentPaper } from "@/features/documents/components/document-paper";
import { A4Frame, DownloadWordButton, PrintButton, PrintCopy } from "@/features/documents/components/print.client";
import { sanitiseLetterhead } from "@/features/documents/files";
import { findTemplate, sanitiseValues } from "@/features/documents/templates";
import { canSeeRecords } from "@/features/team/access";
import { getMember, getMemberDocument } from "@/features/team/queries";
import { MEMBER_DOC_KIND_LABEL } from "@/features/team/schemas";
import { dayKey } from "@/features/timeline/calendar";
import { requireViewer } from "@/lib/auth/context";
import { requestTime } from "@/lib/request-time";

export const metadata: Metadata = { title: "Document" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A generated document on a person, re-rendered from the facts it was saved with. Uploads open directly. */
export default async function MemberDocumentPage({ params }: PageProps<"/os/team/[userId]/documents/[docId]">) {
  const { userId, docId } = await params;
  if (!UUID.test(userId) || !UUID.test(docId)) notFound();
  const viewer = await requireViewer();
  if (!canSeeRecords(viewer, userId)) notFound();

  const [member, document] = await Promise.all([
    getMember(viewer.organizationId, userId),
    getMemberDocument(viewer.organizationId, userId, docId),
  ]);
  if (!member.data || !document.data) notFound();
  if (document.data.source === "upload") redirect(`/os/team/${userId}/documents/${docId}/download`);

  const template = findTemplate(document.data.template_key);
  if (!template) notFound();
  const stored = (document.data.fields ?? {}) as { values?: unknown; letterhead?: unknown };
  const letterhead = sanitiseLetterhead(stored.letterhead);
  const content = template.build(sanitiseValues(template, stored.values), {
    letterhead,
    today: dayKey(requestTime(), viewer.profile.timezone || "UTC"),
    project: null,
  });
  const name = member.data.profile?.full_name || "Unnamed";

  return (
    <PageBody>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            href={`/os/team/${userId}`}
            className="inline-flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden="true" /> {name}
          </Link>
          <h1 className="truncate text-2xl font-semibold tracking-tight">{document.data.title}</h1>
          <p className="text-[13px] text-fg-subtle">
            {MEMBER_DOC_KIND_LABEL[document.data.kind]} · {template.name} · saved
            {document.data.creator ? ` by ${document.data.creator.full_name}` : ""} on{" "}
            {formatDate(document.data.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DownloadWordButton content={content} letterhead={letterhead} fileTitle={document.data.title} />
          <PrintButton />
        </div>
      </div>

      <div className="rounded-lg bg-bg-subtle p-3 sm:p-8">
        <A4Frame>
          <DocumentPaper content={content} letterhead={letterhead} id="saved" />
        </A4Frame>
      </div>

      <PrintCopy>
        <DocumentPaper content={content} letterhead={letterhead} id="print" />
      </PrintCopy>
    </PageBody>
  );
}

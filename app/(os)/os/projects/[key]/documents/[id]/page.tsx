import { ChevronLeft, Copy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatDate } from "@/components/os/data-display";
import { Button } from "@/components/ui/button";
import { DocumentPaper } from "@/features/documents/components/document-paper";
import { PrintButton, PrintCopy } from "@/features/documents/components/print.client";
import { DOCUMENT_TYPE_LABEL, sanitiseLetterhead } from "@/features/documents/files";
import { getProjectDocument } from "@/features/documents/queries";
import { findTemplate, sanitiseValues } from "@/features/documents/templates";
import { projectHref } from "@/features/projects/tabs";
import { loadWorkspace } from "@/features/projects/workspace";
import { dayKey } from "@/features/timeline/calendar";

export const metadata: Metadata = { title: "Document" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A saved generated document, re-rendered on the letterhead from the facts it
 * was saved with. Uploaded files have no page of their own: they open directly.
 */
export default async function ProjectDocumentPage({ params }: PageProps<"/os/projects/[key]/documents/[id]">) {
  const { key, id } = await params;
  if (!UUID.test(id)) notFound();
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, viewer, now } = workspace;
  const base = `${projectHref(project.key)}/documents`;

  const { data: document } = await getProjectDocument(project.id, id);
  if (!document) notFound();
  if (document.source === "upload") redirect(`${base}/${id}/download`);

  const template = findTemplate(document.template_key);
  if (!template) notFound();
  const stored = (document.fields ?? {}) as { values?: unknown; letterhead?: unknown };
  const letterhead = sanitiseLetterhead(stored.letterhead);
  const content = template.build(sanitiseValues(template, stored.values), {
    letterhead,
    today: dayKey(now, viewer.profile.timezone || "UTC"),
    project: { key: project.key, name: project.name, clientName: project.client?.name ?? null },
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            href={base}
            className="inline-flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden="true" /> All documents
          </Link>
          <h2 className="truncate text-xl font-semibold">{document.title}</h2>
          <p className="text-[13px] text-fg-subtle">
            {template.name} · {DOCUMENT_TYPE_LABEL[document.type]} · saved by{" "}
            {document.uploader?.full_name ?? "someone"} on {formatDate(document.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`${base}/new?from=${document.id}`}>
              <Copy aria-hidden="true" /> Edit a copy
            </Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-bg-subtle p-3 sm:p-8">
        <DocumentPaper content={content} letterhead={letterhead} id="saved" />
      </div>

      <PrintCopy>
        <DocumentPaper content={content} letterhead={letterhead} id="print" />
      </PrintCopy>
    </>
  );
}

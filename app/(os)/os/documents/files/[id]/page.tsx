import { ChevronLeft, Copy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatDate } from "@/components/os/data-display";
import { PageBody } from "@/components/os/page-header";
import { Button } from "@/components/ui/button";
import { DocumentPaper } from "@/features/documents/components/document-paper";
import { PagedDocument } from "@/features/documents/components/paged-document.client";
import { DownloadWordButton, PrintButton, PrintCopy } from "@/features/documents/components/print.client";
import { sanitiseLetterhead } from "@/features/documents/files";
import { findTemplate, sanitiseValues } from "@/features/documents/templates";
import { getCompanyFile, listFolders } from "@/features/files/queries";
import { ancestry, folderHref } from "@/features/files/tree";
import { dayKey } from "@/features/timeline/calendar";
import { requireViewer } from "@/lib/auth/context";
import { requestTime } from "@/lib/request-time";

export const metadata: Metadata = { title: "Document" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A generated document in a company folder, re-rendered from the facts it was saved with. Uploads open directly. */
export default async function CompanyFilePage({ params }: PageProps<"/os/documents/files/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const viewer = await requireViewer();
  const [file, folders] = await Promise.all([
    getCompanyFile(viewer.organizationId, id),
    listFolders(viewer.organizationId),
  ]);
  if (!file.data) notFound();
  if (file.data.source === "upload") redirect(`/os/documents/files/${id}/download`);

  const template = findTemplate(file.data.template_key);
  if (!template) notFound();
  const stored = (file.data.fields ?? {}) as { values?: unknown; letterhead?: unknown };
  const letterhead = sanitiseLetterhead(stored.letterhead);
  const content = template.build(sanitiseValues(template, stored.values), {
    letterhead,
    today: dayKey(requestTime(), viewer.profile.timezone || "UTC"),
    project: null,
  });
  const path = ancestry(folders.data, file.data.folder_id);
  const back = path.at(-1);

  return (
    <PageBody>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            href={folderHref(back?.id ?? null)}
            className="inline-flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg hover:underline"
          >
            <ChevronLeft className="size-4" aria-hidden="true" /> {back?.name ?? "Documents"}
          </Link>
          <h1 className="truncate text-2xl font-semibold tracking-tight">{file.data.title}</h1>
          <p className="text-[13px] text-fg-subtle">
            {template.name} · in {["Documents", ...path.map((folder) => folder.name)].join(" / ")} · saved
            {file.data.creator ? ` by ${file.data.creator.full_name}` : ""} on {formatDate(file.data.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/os/documents/new?from=${file.data.id}`}>
              <Copy aria-hidden="true" /> Edit a copy
            </Link>
          </Button>
          <DownloadWordButton content={content} letterhead={letterhead} fileTitle={file.data.title} />
          <PrintButton />
        </div>
      </div>

      <div className="rounded-lg bg-bg-subtle p-3 sm:p-8">
        <PagedDocument content={content} letterhead={letterhead} id="saved" />
      </div>

      <PrintCopy>
        <DocumentPaper content={content} letterhead={letterhead} id="print" />
      </PrintCopy>
    </PageBody>
  );
}

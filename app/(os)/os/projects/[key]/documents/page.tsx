import { Database, FileSignature, FileText, HardDrive, Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/features/documents/components/document-list.client";
import { UploadDocumentDialog } from "@/features/documents/components/upload-dialog.client";
import { formatBytes } from "@/features/documents/files";
import { listProjectDocuments } from "@/features/documents/queries";
import { TEMPLATES } from "@/features/documents/templates";
import { projectHref } from "@/features/projects/tabs";
import { loadWorkspace } from "@/features/projects/workspace";
import { describeQueryFailure } from "@/lib/actions/db-errors";

export const metadata: Metadata = { title: "Documents" };

const FEATURED = ["statement_of_work", "meeting_minutes", "project_status_report", "change_request", "invoice"];

/**
 * Everything written down for this project in one place: files people upload
 * and documents generated on company letterhead.
 */
export default async function ProjectDocumentsPage({ params }: PageProps<"/os/projects/[key]/documents">) {
  const { key } = await params;
  const workspace = await loadWorkspace(key);
  if (workspace.kind !== "ok") return null;
  const { project, perms, viewer } = workspace;
  const base = `${projectHref(project.key)}/documents`;

  const documents = await listProjectDocuments(project.id);
  if (documents.error) return <ErrorState {...describeQueryFailure(documents.error)} />;

  const generateButton = (
    <Button asChild>
      <Link href={`${base}/new`}>
        <FileSignature aria-hidden="true" /> Generate document
      </Link>
    </Button>
  );
  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {perms.uploadDocument && !documents.missing ? (
        <UploadDocumentDialog projectKey={project.key} projectId={project.id} />
      ) : null}
      {generateButton}
    </div>
  );

  const uploads = documents.data.filter((document) => document.source === "upload");
  const generated = documents.data.filter((document) => document.source === "generated");
  const storage = uploads.reduce((sum, document) => sum + (document.size_bytes ?? 0), 0);

  return (
    <>
      {documents.missing ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-fg"
        >
          <Database className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Saving and uploading documents needs a one-time database update (migration{" "}
            <code className="font-mono">20260927120000_project_documents</code>). Until an admin applies it, you can
            still generate documents on the letterhead and print them or save them as PDFs.
          </p>
        </div>
      ) : null}

      <StatRow>
        <StatTile
          label="Documents"
          value={documents.data.length}
          hint="Uploaded and generated"
          icon={FileText}
          tone="brand"
        />
        <StatTile label="Uploaded files" value={uploads.length} hint="PDFs, sheets, images" icon={Upload} />
        <StatTile label="Generated" value={generated.length} hint="On company letterhead" icon={FileSignature} />
        <StatTile label="Storage" value={formatBytes(storage)} hint="Of uploaded files" icon={HardDrive} />
      </StatRow>

      <section
        aria-labelledby="quick-generate"
        className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="quick-generate" className="text-base font-semibold">
              Generate on letterhead
            </h2>
            <p className="text-[13px] text-fg-subtle">
              Contracts, offer letters, NDAs, invoices and more, with the company logo. {TEMPLATES.length} templates.
            </p>
          </div>
          <Link href={`${base}/new`} className="text-[13px] text-fg-muted hover:text-fg hover:underline">
            All templates →
          </Link>
        </div>
        <ul className="flex flex-wrap gap-2">
          {FEATURED.map((templateKey) => {
            const template = TEMPLATES.find((candidate) => candidate.key === templateKey)!;
            return (
              <li key={templateKey}>
                <Link
                  href={`${base}/new?template=${templateKey}`}
                  className="flex items-center gap-2 rounded-full border border-border bg-bg-subtle px-3.5 py-1.5 text-sm transition-colors hover:border-border-strong hover:bg-surface"
                >
                  <FileSignature className="size-3.5 text-brand" aria-hidden="true" />
                  {template.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">All documents</h2>
        {actions}
      </div>

      {documents.data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload the brief, contracts and designs, or generate a document on the letterhead. Everyone on the project can open them."
        />
      ) : (
        <DocumentList
          viewerUserId={viewer.userId}
          canManage={perms.manageTeam}
          documents={documents.data.map((document) => ({ ...document, projectKey: project.key }))}
        />
      )}
    </>
  );
}

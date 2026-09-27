import { Database, FileSignature, FileText, FolderKanban, Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/features/documents/components/document-list.client";
import { listOrganizationDocuments } from "@/features/documents/queries";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "@/features/documents/templates";
import { requireViewer } from "@/lib/auth/context";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Documents" };

/**
 * Every document across the projects the viewer can see, and the way into the
 * letterhead generator. Uploading happens inside a project, because a file
 * always belongs to one.
 */
export default async function DocumentsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [documents, managed] = await Promise.all([
    listOrganizationDocuments(viewer.organizationId),
    // Projects this person manages, so the list offers delete where they may.
    supabase
      .from("project_members")
      .select("role, project:projects!inner(key, organization_id)")
      .eq("user_id", viewer.userId)
      .eq("role", "manager")
      .eq("project.organization_id", viewer.organizationId)
      .returns<{ project: { key: string } }[]>(),
  ]);

  const header = (
    <PageHeader
      title="Documents"
      description="Contracts, letters, invoices and every file uploaded to a project"
      actions={
        <Button asChild>
          <Link href="/os/documents/new">
            <FileSignature aria-hidden="true" /> Generate document
          </Link>
        </Button>
      }
    />
  );
  if (documents.error) {
    return (
      <PageBody>
        {header}
        <ErrorState {...describeQueryFailure(documents.error)} />
      </PageBody>
    );
  }

  const isAdmin = viewer.orgRole !== "member";
  const managedKeys = new Set((managed.data ?? []).map((row) => row.project.key));
  const rows = documents.data.map((document) => ({
    ...document,
    projectKey: document.project?.key ?? "",
    projectName: document.project?.name,
  }));
  const projectCount = new Set(rows.map((row) => row.projectKey)).size;

  return (
    <PageBody>
      {header}
      {documents.missing ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-fg"
        >
          <Database className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Saving and uploading documents needs a one-time database update (migration{" "}
            <code className="font-mono">20260927120000_project_documents</code>). The generator already works: you can
            create documents on the letterhead and print them or save them as PDFs.
          </p>
        </div>
      ) : null}

      <StatRow>
        <StatTile
          label="Documents"
          value={rows.length}
          hint={`Across ${projectCount} project${projectCount === 1 ? "" : "s"}`}
          icon={FileText}
          tone="brand"
        />
        <StatTile
          label="Uploaded"
          value={rows.filter((row) => row.source === "upload").length}
          hint="Files"
          icon={Upload}
        />
        <StatTile
          label="Generated"
          value={rows.filter((row) => row.source === "generated").length}
          hint="On letterhead"
          icon={FileSignature}
        />
        <StatTile
          label="Templates"
          value={TEMPLATES.length}
          hint={`${TEMPLATE_CATEGORIES.length} categories`}
          icon={FolderKanban}
          href="/os/documents/new"
        />
      </StatRow>

      <section aria-labelledby="templates-heading" className="flex flex-col gap-3">
        <h2 id="templates-heading" className="text-base font-semibold">
          Start from a template
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATE_CATEGORIES.map((category) => (
            <li key={category} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
              <p className="text-xs font-semibold tracking-[0.06em] text-fg-subtle uppercase">{category}</p>
              <ul className="flex flex-col gap-1">
                {TEMPLATES.filter((template) => template.category === category).map((template) => (
                  <li key={template.key}>
                    <Link
                      href={`/os/documents/new?template=${template.key}`}
                      className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-bg-subtle hover:underline"
                    >
                      <FileSignature className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
                      {template.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <h2 className="text-base font-semibold">All documents</h2>
      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload files from a project's Documents tab, or generate one on the letterhead and save it to a project."
        />
      ) : (
        <DocumentList
          documents={rows}
          viewerUserId={viewer.userId}
          canManage={isAdmin ? true : managedKeys}
          showProject
        />
      )}
    </PageBody>
  );
}

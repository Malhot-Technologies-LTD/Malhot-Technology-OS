import { ChevronLeft, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/os/empty-state";
import { ErrorState } from "@/components/os/error-state";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { DocumentList } from "@/features/documents/components/document-list.client";
import { listOrganizationDocuments } from "@/features/documents/queries";
import { requireViewer } from "@/lib/auth/context";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Project documents" };

/**
 * Every document filed on a project the viewer is on, in one list. Uploading
 * happens inside a project, because these files belong to one; company-wide
 * paperwork lives in the folders under Documents.
 */
export default async function ProjectDocumentsPage() {
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
    <div className="flex flex-col gap-2">
      <Link
        href="/os/documents"
        className="inline-flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg hover:underline"
      >
        <ChevronLeft className="size-4" aria-hidden="true" /> Documents
      </Link>
      <PageHeader title="Projects" description="Paperwork filed on each project you are on" />
    </div>
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

  return (
    <PageBody>
      {header}
      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No project documents yet"
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

import { FileSignature, FileText, Folder, FolderKanban } from "lucide-react";
import type { Metadata } from "next";

import { ErrorState } from "@/components/os/error-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { listOrganizationDocuments } from "@/features/documents/queries";
import { TEMPLATES } from "@/features/documents/templates";
import { FileExplorer } from "@/features/files/components/explorer.client";
import { FilesNotReady } from "@/features/files/components/not-ready";
import { loadExplorer } from "@/features/files/explorer";
import { describeQueryFailure } from "@/lib/actions/db-errors";
import { requireViewer } from "@/lib/auth/context";

export const metadata: Metadata = { title: "Documents" };

/**
 * The company's files, as a file explorer: folders anyone can make, documents
 * uploaded or generated into them, and each project's paperwork under Projects.
 */
export default async function DocumentsPage() {
  const viewer = await requireViewer();
  const [explorer, projectDocuments] = await Promise.all([
    loadExplorer(null),
    listOrganizationDocuments(viewer.organizationId),
  ]);

  const header = (
    <PageHeader
      title="Documents"
      description="Company folders and files. Each project's paperwork is under Projects."
    />
  );
  if (explorer.error) {
    return (
      <PageBody>
        {header}
        <ErrorState {...describeQueryFailure(explorer.error)} />
      </PageBody>
    );
  }

  const totalFiles = Object.values(explorer.fileCounts).reduce((sum, count) => sum + count, 0);

  return (
    <PageBody>
      {header}
      {explorer.missing ? <FilesNotReady /> : null}
      <StatRow>
        <StatTile label="Folders" value={explorer.folders.length} hint="You can see" icon={Folder} tone="brand" />
        <StatTile label="Company files" value={totalFiles} hint="Uploaded or generated" icon={FileText} />
        <StatTile
          label="Project documents"
          value={projectDocuments.data.length}
          hint="Under Projects"
          icon={FolderKanban}
          href="/os/documents/projects"
        />
        <StatTile
          label="Templates"
          value={TEMPLATES.length}
          hint="On the letterhead"
          icon={FileSignature}
          href="/os/documents/new"
        />
      </StatRow>
      <FileExplorer
        organizationId={explorer.viewer.organizationId}
        viewer={explorer.who}
        folder={null}
        trail={[]}
        folders={explorer.folders}
        fileCounts={explorer.fileCounts}
        files={explorer.files}
        projectDocuments={projectDocuments.missing ? null : projectDocuments.data.length}
      />
    </PageBody>
  );
}

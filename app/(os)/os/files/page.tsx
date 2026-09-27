import { FileSignature, FileText, Folder } from "lucide-react";
import type { Metadata } from "next";

import { ErrorState } from "@/components/os/error-state";
import { StatRow, StatTile } from "@/components/os/metrics";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { TEMPLATES } from "@/features/documents/templates";
import { FileExplorer } from "@/features/files/components/explorer.client";
import { FilesNotReady } from "@/features/files/components/not-ready";
import { loadExplorer } from "@/features/files/explorer";
import { describeQueryFailure } from "@/lib/actions/db-errors";

export const metadata: Metadata = { title: "Files" };

/**
 * The company's own file system: folders anyone can make, and documents
 * uploaded or generated into them. Separate from Documents, which is the
 * template library and each project's paperwork.
 */
export default async function FilesPage() {
  const explorer = await loadExplorer(null);
  const header = <PageHeader title="Files" description="Company folders and the documents stored in them" />;
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
        <StatTile label="Files" value={totalFiles} hint="Uploaded or generated" icon={FileText} />
        <StatTile
          label="Templates"
          value={TEMPLATES.length}
          hint="Generate into a folder"
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
      />
    </PageBody>
  );
}

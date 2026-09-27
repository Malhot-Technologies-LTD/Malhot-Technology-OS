import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/os/error-state";
import { PageBody, PageHeader } from "@/components/os/page-header";
import { FileExplorer } from "@/features/files/components/explorer.client";
import { FilesNotReady } from "@/features/files/components/not-ready";
import { loadExplorer } from "@/features/files/explorer";
import { describeQueryFailure } from "@/lib/actions/db-errors";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/os/files/folders/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Folder" };
  const explorer = await loadExplorer(id);
  return { title: explorer.folder?.name ?? "Folder" };
}

/** One company folder. A restricted folder a member opens by link is a 404, as if it did not exist. */
export default async function FolderPage({ params }: PageProps<"/os/files/folders/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const explorer = await loadExplorer(id);
  if (explorer.error) {
    return (
      <PageBody>
        <PageHeader title="Folder" />
        <ErrorState {...describeQueryFailure(explorer.error)} />
      </PageBody>
    );
  }
  if (explorer.missing) {
    return (
      <PageBody>
        <PageHeader title="Folder" />
        <FilesNotReady />
      </PageBody>
    );
  }
  if (!explorer.found || !explorer.folder) notFound();

  return (
    <PageBody>
      <PageHeader title={explorer.folder.name} />
      <FileExplorer
        organizationId={explorer.viewer.organizationId}
        viewer={explorer.who}
        folder={explorer.folder}
        trail={explorer.trail}
        folders={explorer.folders}
        fileCounts={explorer.fileCounts}
        files={explorer.files}
      />
    </PageBody>
  );
}

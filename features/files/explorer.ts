import "server-only";

import { requireViewer } from "@/lib/auth/context";

import { countFilesByFolder, listFilesIn, listFolders } from "./queries";
import { ancestry } from "./tree";

/**
 * Everything the explorer shows for one folder (null = the top level). A
 * folder id the viewer cannot see comes back as `folder: null` with
 * `found: false`, which the page turns into a 404: a restricted folder is
 * indistinguishable from one that does not exist.
 */
export async function loadExplorer(folderId: string | null) {
  const viewer = await requireViewer();
  const [folders, files, counts] = await Promise.all([
    listFolders(viewer.organizationId),
    listFilesIn(viewer.organizationId, folderId),
    countFilesByFolder(viewer.organizationId),
  ]);
  const folder = folderId ? (folders.data.find((row) => row.id === folderId) ?? null) : null;
  const chain = ancestry(folders.data, folderId);
  return {
    viewer,
    who: { userId: viewer.userId, isAdmin: viewer.orgRole !== "member" },
    found: folderId === null || folder !== null,
    folder,
    trail: chain.slice(0, -1).map((row) => ({ id: row.id, name: row.name })),
    folders: folders.data,
    files: files.data,
    fileCounts: Object.fromEntries([...counts].map(([key, count]) => [key ?? "", count])),
    missing: folders.missing || files.missing,
    error: folders.error ?? files.error,
  };
}

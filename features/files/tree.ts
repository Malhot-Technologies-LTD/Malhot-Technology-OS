import type { DocumentType } from "@/types/domain";

/**
 * The company file explorer's shapes and the tree maths behind it. Pure, so the
 * pages, the actions and the tests all agree on what "inside" means.
 */

export const COMPANY_FILES_BUCKET = "company-files";

export type FolderRow = {
  id: string;
  parent_id: string | null;
  name: string;
  restricted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FileRow = {
  id: string;
  folder_id: string | null;
  title: string;
  type: DocumentType;
  description: string | null;
  source: "upload" | "generated";
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  template_key: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator: { full_name: string } | null;
};

/** One folder as the pickers show it: "Clients / Umoja / Contracts". */
export type FolderPath = { id: string; path: string; depth: number; restricted: boolean };

export const MAX_FOLDER_NAME = 120;

/** A folder name as stored, or why it cannot be one. Slashes would make the paths ambiguous. */
export function checkFolderName(raw: string): { ok: true; name: string } | { ok: false; message: string } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name === "") return { ok: false, message: "Give the folder a name." };
  if (name.length > MAX_FOLDER_NAME)
    return { ok: false, message: `Folder names can be up to ${MAX_FOLDER_NAME} characters.` };
  if (/[/\\]/.test(name)) return { ok: false, message: "Folder names cannot contain / or \\." };
  return { ok: true, name };
}

/** Top level first, down to the folder itself. Stops rather than loops if the data is ever cyclic. */
export function ancestry(folders: readonly FolderRow[], id: string | null): FolderRow[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const chain: FolderRow[] = [];
  const seen = new Set<string>();
  let current = id ? byId.get(id) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return chain;
}

/** Every folder below this one, not including it. */
export function descendantIds(folders: readonly FolderRow[], id: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const folder of folders) {
    if (!folder.parent_id) continue;
    children.set(folder.parent_id, [...(children.get(folder.parent_id) ?? []), folder.id]);
  }
  const found = new Set<string>();
  const queue = [...(children.get(id) ?? [])];
  while (queue.length > 0) {
    const next = queue.shift()!;
    if (found.has(next) || next === id) continue;
    found.add(next);
    queue.push(...(children.get(next) ?? []));
  }
  return found;
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });

export function sortFolders<T extends { name: string }>(folders: readonly T[]): T[] {
  return [...folders].sort(byName);
}

/** Every folder as a full path, depth-first in name order, for "Save to" and "Move to" pickers. */
export function folderPaths(folders: readonly FolderRow[]): FolderPath[] {
  const children = new Map<string | null, FolderRow[]>();
  const ids = new Set(folders.map((folder) => folder.id));
  for (const folder of folders) {
    // A parent the viewer cannot see (never expected, RLS hides whole subtrees) files the child at the top.
    const parent = folder.parent_id && ids.has(folder.parent_id) ? folder.parent_id : null;
    children.set(parent, [...(children.get(parent) ?? []), folder]);
  }
  const out: FolderPath[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, prefix: string, depth: number) => {
    for (const folder of sortFolders(children.get(parent) ?? [])) {
      if (seen.has(folder.id)) continue;
      seen.add(folder.id);
      const path = prefix ? `${prefix} / ${folder.name}` : folder.name;
      out.push({ id: folder.id, path, depth, restricted: folder.restricted });
      walk(folder.id, path, depth + 1);
    }
  };
  walk(null, "", 0);
  return out;
}

/** Where a folder may move: anywhere but itself, inside itself, or where it already is. */
export function moveTargets(
  folders: readonly FolderRow[],
  moving: { kind: "folder"; id: string } | { kind: "file"; folderId: string | null },
): { top: boolean; folders: FolderPath[] } {
  const paths = folderPaths(folders);
  if (moving.kind === "file") {
    return { top: moving.folderId !== null, folders: paths.filter((path) => path.id !== moving.folderId) };
  }
  const self = folders.find((folder) => folder.id === moving.id);
  const blocked = descendantIds(folders, moving.id);
  blocked.add(moving.id);
  if (self?.parent_id) blocked.add(self.parent_id);
  return { top: Boolean(self?.parent_id), folders: paths.filter((path) => !blocked.has(path.id)) };
}

/** Mirrors the migration's policies: admins manage everything, anyone else what they created. */
export function canManageItem(
  viewer: { userId: string; isAdmin: boolean },
  item: { created_by: string | null },
): boolean {
  return viewer.isAdmin || (item.created_by !== null && item.created_by === viewer.userId);
}

/** `<organization id>/<uuid>-<safe name>`: the bucket's policies read the organisation from the first segment. */
export function companyFilePath(organizationId: string, fileName: string, uuid: string): string {
  const safe = fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-120);
  return `${organizationId}/${uuid}-${safe || "file"}`;
}

export function isCompanyFilePath(path: string, organizationId: string): boolean {
  return path.startsWith(`${organizationId}/`) && !path.includes("..") && path.split("/").length === 2;
}

export function folderHref(id: string | null): string {
  return id ? `/os/files/folders/${id}` : "/os/files";
}

export function fileHref(file: Pick<FileRow, "id" | "source">): string {
  return file.source === "generated" ? `/os/files/documents/${file.id}` : `/os/files/documents/${file.id}/download`;
}

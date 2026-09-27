import { descendantIds, type FolderRow } from "./tree";

/**
 * How a folder is laid out inside its ZIP: the folder itself at the top, its
 * subfolders under it, every file named after its title. Pure, so the server
 * (which plans it) and the tests agree.
 */

/** Past these the browser, which builds the ZIP in memory, would struggle. */
export const ARCHIVE_MAX_FILES = 2000;
export const ARCHIVE_MAX_BYTES = 500 * 1024 * 1024;

export type ArchiveFile = {
  id: string;
  folder_id: string | null;
  title: string;
  source: "upload" | "generated";
  file_name: string | null;
  size_bytes: number | null;
};

export type ArchivePlan = {
  /** The ZIP's own name, without ".zip". */
  name: string;
  /** Every directory, including empty ones, so the structure survives. */
  directories: string[];
  entries: { fileId: string; path: string }[];
};

/** A name every operating system accepts: no path or reserved characters, no trailing dots or spaces. */
export function safeName(raw: string, fallback = "Untitled"): string {
  const cleaned = raw
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\p{Cc}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 120)
    .trim();
  return cleaned || fallback;
}

/** ".pdf" from "Signed NDA.pdf"; empty when there is none. */
function extensionOf(fileName: string | null): string {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(fileName ?? "");
  return match ? `.${match[1]!.toLowerCase()}` : "";
}

/** The file's name in the ZIP: its title plus the right extension, never doubled. */
export function archiveFileName(file: Pick<ArchiveFile, "title" | "source" | "file_name">): string {
  const extension = file.source === "generated" ? ".docx" : extensionOf(file.file_name);
  const base = safeName(file.title);
  return extension && base.toLowerCase().endsWith(extension) ? base : `${base}${extension}`;
}

/** "Contract.pdf" → "Contract (2).pdf" when the name is taken in that directory, ignoring case. */
function unique(name: string, taken: Set<string>): string {
  let candidate = name;
  const dot = name.lastIndexOf(".");
  const [stem, extension] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  for (let n = 2; taken.has(candidate.toLowerCase()); n += 1) candidate = `${stem} (${n})${extension}`;
  taken.add(candidate.toLowerCase());
  return candidate;
}

/**
 * The plan for one folder (null = everything in Files). `folders` and `files`
 * are what the viewer can see; anything outside the folder is ignored.
 */
export function planArchive(
  folders: readonly FolderRow[],
  rootId: string | null,
  files: readonly ArchiveFile[],
): ArchivePlan {
  const root = rootId ? folders.find((folder) => folder.id === rootId) : null;
  const name = safeName(root?.name ?? "Files", "Folder");
  const inside = rootId ? new Set([rootId, ...descendantIds(folders, rootId)]) : null;
  const byId = new Map(folders.map((folder) => [folder.id, folder]));

  // Each folder's path, built from the top so parents are named before children.
  const paths = new Map<string | null, string>([[rootId, name]]);
  const namesIn = new Map<string, Set<string>>();
  const takenIn = (directory: string) => {
    if (!namesIn.has(directory)) namesIn.set(directory, new Set());
    return namesIn.get(directory)!;
  };
  const pathOf = (id: string | null): string | null => {
    if (paths.has(id)) return paths.get(id)!;
    const folder = id ? byId.get(id) : undefined;
    if (!folder) return null;
    // At the top level of Files every folder hangs off the root; otherwise stop at the chosen folder.
    const parent = folder.parent_id && (inside === null || inside.has(folder.parent_id)) ? folder.parent_id : rootId;
    if (parent === folder.id) return null;
    const parentPath = pathOf(parent);
    if (parentPath === null) return null;
    const path = `${parentPath}/${unique(safeName(folder.name, "Folder"), takenIn(parentPath))}`;
    paths.set(id, path);
    return path;
  };

  const wanted = inside ? folders.filter((folder) => inside.has(folder.id) && folder.id !== rootId) : folders;
  const ordered = [...wanted].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const directories = [
    name,
    ...ordered
      .map((folder) => pathOf(folder.id))
      .filter((path): path is string => !!path)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
  ];

  const entries: ArchivePlan["entries"] = [];
  for (const file of files) {
    if (inside ? !(file.folder_id && inside.has(file.folder_id)) : false) continue;
    const directory = pathOf(file.folder_id);
    if (directory === null) continue;
    entries.push({ fileId: file.id, path: `${directory}/${unique(archiveFileName(file), takenIn(directory))}` });
  }
  return { name, directories: [...new Set(directories)], entries };
}

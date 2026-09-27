"use client";

import { sanitiseLetterhead } from "@/features/documents/files";
import { findTemplate, sanitiseValues } from "@/features/documents/templates";

import { folderArchive, type ArchiveManifest } from "./actions";

export type ZipProgress = { done: number; total: number };

export type ZipResult = { ok: true; name: string; files: number; failed: string[] } | { ok: false; message: string };

/** Uploads fetched at once: enough to keep the connection busy without flooding it. */
const PARALLEL = 4;

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Renders a generated document to the same Word file its own page downloads. */
async function renderGenerated(entry: Extract<ArchiveManifest["entries"][number], { kind: "generated" }>) {
  const template = findTemplate(entry.templateKey);
  if (!template) throw new Error("unknown template");
  const stored = (entry.fields ?? {}) as { values?: unknown; letterhead?: unknown };
  const letterhead = sanitiseLetterhead(stored.letterhead);
  const content = template.build(sanitiseValues(template, stored.values), {
    letterhead,
    today: localToday(),
    project: null,
  });
  const { documentToDocx } = await import("@/features/documents/docx");
  return documentToDocx(content, letterhead);
}

/**
 * Builds a folder's ZIP in the browser and hands it over as a download: the
 * folder, its subfolders (empty ones too), uploads as they were uploaded and
 * generated documents as Word files. A file that cannot be fetched is left
 * out and named in the result rather than failing the whole download.
 */
export async function downloadFolderZip(
  folderId: string | null,
  onProgress: (progress: ZipProgress) => void,
): Promise<ZipResult> {
  const manifest = await folderArchive({ folderId });
  if (!manifest.ok) return { ok: false, message: manifest.error.message };
  return zipManifest(manifest.data, onProgress);
}

/** Fetches, renders and zips what a manifest lists, then saves the ZIP. Separate so it can be exercised alone. */
export async function zipManifest(
  manifest: ArchiveManifest,
  onProgress: (progress: ZipProgress) => void,
): Promise<ZipResult> {
  const { name, directories, entries } = manifest;
  if (entries.length === 0 && directories.length <= 1)
    return { ok: false, message: "This folder is empty, so there is nothing to download." };

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const directory of directories) zip.folder(directory);

  const failed: string[] = [];
  let done = 0;
  onProgress({ done, total: entries.length });
  const queue = [...entries];
  const worker = async () => {
    for (let entry = queue.shift(); entry; entry = queue.shift()) {
      try {
        if (entry.kind === "upload") {
          const response = await fetch(entry.url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          zip.file(entry.path, await response.blob());
        } else {
          zip.file(entry.path, await renderGenerated(entry));
        }
      } catch {
        failed.push(entry.path.slice(entry.path.indexOf("/") + 1));
      }
      onProgress({ done: ++done, total: entries.length });
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, entries.length) }, worker));

  // Files are stored, not recompressed: PDFs, images and Word files are compressed already.
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked later: some browsers start reading the file only after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { ok: true, name, files: entries.length - failed.length, failed };
}

import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { isSchemaDrift } from "@/lib/actions/db-errors";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

import type { FileRow, FolderRow } from "./tree";

/**
 * Company file reads. RLS decides visibility: restricted folders, and the
 * files in them, only come back for admins. `missing` is true until the
 * company_files migration is applied, so pages can say so instead of failing.
 */

export type FilesResult<T> = { data: T[]; error: PostgrestError | null; missing: boolean };

const FOLDER_COLUMNS = "id, parent_id, name, restricted, created_by, created_at, updated_at";
const FILE_COLUMNS =
  "id, folder_id, title, type, description, source, storage_path, file_name, mime_type, size_bytes, template_key, created_by, created_at, updated_at, creator:profiles!company_files_created_by_fkey(full_name)";

/** Enough for any real company's tree; the explorer needs all of it for paths and pickers. */
const FOLDER_LIMIT = 2000;

function settle<T>(scope: string, result: { data: T[] | null; error: PostgrestError | null }): FilesResult<T> {
  if (result.error) {
    const missing = isSchemaDrift(result.error);
    if (!missing) logger.error(`files.${scope}_failed`, { code: result.error.code, message: result.error.message });
    return { data: [], error: missing ? null : result.error, missing };
  }
  return { data: result.data ?? [], error: null, missing: false };
}

export async function listFolders(organizationId: string): Promise<FilesResult<FolderRow>> {
  const supabase = await createClient();
  const result = await supabase
    .from("file_folders")
    .select(FOLDER_COLUMNS)
    .eq("organization_id", organizationId)
    .order("name")
    .limit(FOLDER_LIMIT)
    .returns<FolderRow[]>();
  return settle("folders", result);
}

/** The files directly in one folder (null = the top level), newest first. */
export async function listFilesIn(organizationId: string, folderId: string | null): Promise<FilesResult<FileRow>> {
  const supabase = await createClient();
  const query = supabase.from("company_files").select(FILE_COLUMNS).eq("organization_id", organizationId);
  const result = await (folderId ? query.eq("folder_id", folderId) : query.is("folder_id", null))
    .order("created_at", { ascending: false })
    .limit(1000)
    .returns<FileRow[]>();
  return settle("files", result);
}

/** How many files each visible folder holds directly, for the counts beside folder names. */
export async function countFilesByFolder(organizationId: string): Promise<Map<string | null, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_files")
    .select("folder_id")
    .eq("organization_id", organizationId)
    .limit(10000)
    .returns<{ folder_id: string | null }[]>();
  if (error && !isSchemaDrift(error)) logger.warn("files.count_failed", { code: error.code, message: error.message });
  const counts = new Map<string | null, number>();
  for (const row of data ?? []) counts.set(row.folder_id, (counts.get(row.folder_id) ?? 0) + 1);
  return counts;
}

export type CompanyFile = FileRow & { fields: unknown };

export async function getCompanyFile(organizationId: string, id: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("company_files")
    .select(`${FILE_COLUMNS}, fields`)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle<CompanyFile>();
  return { data: result.data, error: result.error && !isSchemaDrift(result.error) ? result.error : null };
}

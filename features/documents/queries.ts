import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { isSchemaDrift } from "@/lib/actions/db-errors";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { DocumentType } from "@/types/domain";

/**
 * Document reads. RLS on project_documents shows a row only to people on its
 * project. `missing` is true when the table does not exist yet — the migration
 * has not been applied — so pages can say exactly that instead of failing.
 */

export type DocumentRow = {
  id: string;
  project_id: string;
  title: string;
  type: DocumentType;
  description: string | null;
  source: "upload" | "generated";
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  template_key: string | null;
  created_at: string;
  uploaded_by: string;
  uploader: { id: string; full_name: string } | null;
};

export type DocumentListRow = DocumentRow & { project: { key: string; name: string } | null };

export type DocumentsResult<T> = { data: T[]; error: PostgrestError | null; missing: boolean };

const COLUMNS =
  "id, project_id, title, type, description, source, storage_path, file_name, mime_type, size_bytes, template_key, created_at, uploaded_by, uploader:profiles!project_documents_uploaded_by_fkey(id, full_name)";

function settle<T>(result: { data: T[] | null; error: PostgrestError | null }): DocumentsResult<T> {
  if (result.error) {
    const missing = isSchemaDrift(result.error);
    if (!missing) logger.error("documents.read_failed", { code: result.error.code, message: result.error.message });
    return { data: [], error: missing ? null : result.error, missing };
  }
  return { data: result.data ?? [], error: null, missing: false };
}

export async function listProjectDocuments(projectId: string): Promise<DocumentsResult<DocumentRow>> {
  const supabase = await createClient();
  const result = await supabase
    .from("project_documents")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<DocumentRow[]>();
  return settle(result);
}

/** Every document the viewer can see across the organisation's projects. */
export async function listOrganizationDocuments(organizationId: string): Promise<DocumentsResult<DocumentListRow>> {
  const supabase = await createClient();
  const result = await supabase
    .from("project_documents")
    .select(`${COLUMNS}, project:projects!project_documents_project_id_fkey!inner(key, name, organization_id)`)
    .eq("project.organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<DocumentListRow[]>();
  return settle(result);
}

export type GeneratedDocument = DocumentRow & { fields: unknown };

export async function getProjectDocument(projectId: string, id: string) {
  const supabase = await createClient();
  const result = await supabase
    .from("project_documents")
    .select(`${COLUMNS}, fields`)
    .eq("project_id", projectId)
    .eq("id", id)
    .maybeSingle<GeneratedDocument>();
  return { data: result.data, error: result.error && !isSchemaDrift(result.error) ? result.error : null };
}

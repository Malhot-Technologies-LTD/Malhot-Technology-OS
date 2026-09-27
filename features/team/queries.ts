import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { isSchemaDrift } from "@/lib/actions/db-errors";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { OrgRole, ProjectRole, ProjectStatus } from "@/types/domain";

import type { EmploymentType, MemberDocKind } from "./schemas";

/**
 * Reads for a person's page. The member and their projects/tasks follow the
 * usual RLS (colleagues see what they share); the employment record and
 * documents are readable only by org admins and the person, which RLS enforces
 * whatever the page asks for.
 */

export type Member = {
  user_id: string;
  role: OrgRole;
  joined_at: string;
  profile: { full_name: string; title: string | null; avatar_url: string | null; timezone: string } | null;
};

export async function getMember(organizationId: string, userId: string) {
  const supabase = await createClient();
  return supabase
    .from("organization_members")
    .select(
      "user_id, role, joined_at, profile:profiles!organization_members_user_id_fkey(full_name, title, avatar_url, timezone)",
    )
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .returns<Member[]>()
    .maybeSingle();
}

export type MemberProject = {
  role: ProjectRole;
  project: { id: string; key: string; name: string; status: ProjectStatus } | null;
};

/** Projects this person is on, among those the viewer can see. */
export async function listMemberProjects(organizationId: string, userId: string) {
  const supabase = await createClient();
  return supabase
    .from("project_members")
    .select("role, project:projects!inner(id, key, name, status, organization_id, deleted_at)")
    .eq("user_id", userId)
    .eq("project.organization_id", organizationId)
    .is("project.deleted_at", null)
    .returns<MemberProject[]>();
}

type Settled<T> = { data: T; error: PostgrestError | null; missing: boolean };

function settle<T>(result: { data: T | null; error: PostgrestError | null }, empty: T): Settled<T> {
  if (result.error) {
    const missing = isSchemaDrift(result.error);
    if (!missing) logger.error("team.read_failed", { code: result.error.code, message: result.error.message });
    return { data: empty, error: missing ? null : result.error, missing };
  }
  return { data: result.data ?? empty, error: null, missing: false };
}

export type MemberRecord = {
  position: string | null;
  department: string | null;
  employment_type: EmploymentType | null;
  start_date: string | null;
  end_date: string | null;
  reports_to: string | null;
  work_phone: string | null;
  work_location: string | null;
  emergency_contact: string | null;
  notes: string | null;
  updated_at: string;
};

export async function getMemberRecord(organizationId: string, userId: string): Promise<Settled<MemberRecord | null>> {
  const supabase = await createClient();
  const result = await supabase
    .from("member_records")
    .select(
      "position, department, employment_type, start_date, end_date, reports_to, work_phone, work_location, emergency_contact, notes, updated_at",
    )
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .returns<MemberRecord[]>()
    .maybeSingle();
  return settle(result, null);
}

export type MemberDocument = {
  id: string;
  title: string;
  kind: MemberDocKind;
  source: "upload" | "generated";
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  template_key: string | null;
  fields: unknown;
  created_at: string;
  creator: { full_name: string } | null;
};

const DOC_COLUMNS =
  "id, title, kind, source, storage_path, file_name, mime_type, size_bytes, template_key, fields, created_at, creator:profiles!member_documents_created_by_fkey(full_name)";

export async function listMemberDocuments(organizationId: string, userId: string): Promise<Settled<MemberDocument[]>> {
  const supabase = await createClient();
  const result = await supabase
    .from("member_documents")
    .select(DOC_COLUMNS)
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<MemberDocument[]>();
  return settle(result, []);
}

export async function getMemberDocument(
  organizationId: string,
  userId: string,
  id: string,
): Promise<Settled<MemberDocument | null>> {
  const supabase = await createClient();
  const result = await supabase
    .from("member_documents")
    .select(DOC_COLUMNS)
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("id", id)
    .returns<MemberDocument[]>()
    .maybeSingle();
  return settle(result, null);
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sanitiseLetterhead } from "@/features/documents/files";
import { findTemplate, sanitiseValues } from "@/features/documents/templates";
import { isSchemaDrift, mapDbError } from "@/lib/actions/db-errors";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { validationFail } from "@/lib/actions/validation";
import { withAction } from "@/lib/actions/with-action";
import { requireViewer, type Viewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

import {
  MEMBER_DOC_KINDS,
  MEMBER_FILES_BUCKET,
  MEMBER_MIME_TYPES,
  isMemberDocumentPath,
  kindForTemplate,
  memberRecordSchema,
} from "./schemas";

/**
 * Writes for a person's employment details and paperwork. Organisation admins
 * only (`member.records`); RLS on member_records / member_documents and the
 * member-files bucket enforces the same.
 */

const NOT_READY =
  "People records need a one-time database update. Ask an admin to run supabase/migrations/20260927190000_member_records.sql.";
const ADMINS_ONLY = "Only organisation admins can change someone's employment details and documents.";

/** The admin, when the person really is in their organisation. */
async function authorise(userId: string): Promise<{ viewer: Viewer } | { result: ActionResult<never> }> {
  const viewer = await requireViewer();
  if (!can(viewer, "member.records")) return { result: fail("forbidden", ADMINS_ONLY) };
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", viewer.organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { result: fail("not_found", "That person is not in this organisation.") };
  return { viewer };
}

function dbFail<T>(error: Parameters<typeof mapDbError>[0]): ActionResult<T> {
  if (isSchemaDrift(error)) return fail("invariant", NOT_READY);
  const mapped = mapDbError(error);
  return fail(mapped.code, mapped.message);
}

const refresh = (userId: string) => revalidatePath(`/os/team/${userId}`, "layout");

export const saveMemberRecord = withAction("team.saveRecord", async (input: unknown): Promise<ActionResult> => {
  const parsed = memberRecordSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const auth = await authorise(parsed.data.userId);
  if ("result" in auth) return auth.result;
  const record = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("member_records").upsert(
    {
      organization_id: auth.viewer.organizationId,
      user_id: record.userId,
      position: record.position,
      department: record.department,
      employment_type: record.employmentType,
      start_date: record.startDate,
      end_date: record.endDate,
      reports_to: record.reportsTo,
      work_phone: record.workPhone,
      work_location: record.workLocation,
      emergency_contact: record.emergencyContact,
      notes: record.notes,
      updated_by: auth.viewer.userId,
    },
    { onConflict: "organization_id,user_id" },
  );
  if (error) return dbFail(error);
  refresh(record.userId);
  return ok(undefined);
});

const generatedSchema = z.object({
  userId: z.uuid(),
  templateKey: z.string().min(1).max(60),
  title: z.string().trim().min(1, "Give the document a title").max(200),
  values: z.unknown(),
  letterhead: z.unknown(),
});

/** A generated offer, contract or certificate, filed on the person rather than a project. */
export const saveMemberDocument = withAction(
  "team.saveGenerated",
  async (input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = generatedSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const template = findTemplate(parsed.data.templateKey);
    if (!template) return fail("validation", "Unknown template.");
    const auth = await authorise(parsed.data.userId);
    if ("result" in auth) return auth.result;

    const fields = {
      values: sanitiseValues(template, parsed.data.values),
      letterhead: sanitiseLetterhead(parsed.data.letterhead),
    } as unknown as Json;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("member_documents")
      .insert({
        organization_id: auth.viewer.organizationId,
        user_id: parsed.data.userId,
        title: parsed.data.title,
        kind: kindForTemplate(template.key),
        source: "generated",
        template_key: template.key,
        fields,
        created_by: auth.viewer.userId,
      })
      .select("id")
      .single();
    if (error) return dbFail(error);
    logger.info("team.document_generated", { template: template.key });
    refresh(parsed.data.userId);
    return ok({ id: data.id });
  },
);

const uploadSchema = z.object({
  userId: z.uuid(),
  path: z.string().min(1).max(400),
  title: z.string().trim().min(1, "Give the document a title").max(200),
  kind: z.enum(MEMBER_DOC_KINDS),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().refine((value) => MEMBER_MIME_TYPES.includes(value), "That file type is not accepted."),
  size: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024, "Files can be up to 25 MB."),
});

/** Records a file the browser already put in the person's folder; a failed record removes the file. */
export const recordMemberUpload = withAction("team.recordUpload", async (input: unknown): Promise<ActionResult> => {
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const auth = await authorise(parsed.data.userId);
  if ("result" in auth) return auth.result;
  const supabase = await createClient();
  const discard = async () => {
    const { error } = await supabase.storage.from(MEMBER_FILES_BUCKET).remove([parsed.data.path]);
    if (error) logger.warn("team.orphan_upload", { message: error.message });
  };

  if (!isMemberDocumentPath(parsed.data.path, auth.viewer.organizationId, parsed.data.userId)) {
    await discard();
    return fail("validation", "That upload does not belong to this person.");
  }
  const { error } = await supabase.from("member_documents").insert({
    organization_id: auth.viewer.organizationId,
    user_id: parsed.data.userId,
    title: parsed.data.title,
    kind: parsed.data.kind,
    source: "upload",
    storage_path: parsed.data.path,
    file_name: parsed.data.fileName,
    mime_type: parsed.data.mimeType,
    size_bytes: parsed.data.size,
    created_by: auth.viewer.userId,
  });
  if (error) {
    await discard();
    return dbFail(error);
  }
  refresh(parsed.data.userId);
  return ok(undefined);
});

const deleteSchema = z.object({ userId: z.uuid(), id: z.uuid() });

export const deleteMemberDocument = withAction("team.deleteDocument", async (input: unknown): Promise<ActionResult> => {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const auth = await authorise(parsed.data.userId);
  if ("result" in auth) return auth.result;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_documents")
    .delete()
    .eq("organization_id", auth.viewer.organizationId)
    .eq("user_id", parsed.data.userId)
    .eq("id", parsed.data.id)
    .select("storage_path");
  if (error) return dbFail(error);
  if (!data || data.length === 0) return fail("not_found", "That document no longer exists.");
  const path = data[0]?.storage_path;
  if (path) {
    const removed = await supabase.storage.from(MEMBER_FILES_BUCKET).remove([path]);
    if (removed.error) logger.warn("team.orphan_after_delete", { message: removed.error.message });
  }
  refresh(parsed.data.userId);
  return ok(undefined);
});

const editSchema = z.object({
  userId: z.uuid(),
  id: z.uuid(),
  title: z.string().trim().min(1, "Give the document a title").max(200),
  values: z.unknown(),
  letterhead: z.unknown(),
  /** When the editor was opened: a save over someone else's newer save is refused, not silently lost. */
  updatedAt: z.string().min(1),
});

/** Saves changes to a generated document on a person, in place. Admins only, as for creating one. */
export const updateMemberDocument = withAction(
  "team.updateGenerated",
  async (input: unknown): Promise<ActionResult> => {
    const parsed = editSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const auth = await authorise(parsed.data.userId);
    if ("result" in auth) return auth.result;

    const supabase = await createClient();
    const existing = await supabase
      .from("member_documents")
      .select("source, template_key")
      .eq("organization_id", auth.viewer.organizationId)
      .eq("user_id", parsed.data.userId)
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (existing.error) return dbFail(existing.error);
    if (!existing.data) return fail("not_found", "That document does not exist.");
    const template = findTemplate(existing.data.template_key);
    if (existing.data.source !== "generated" || !template)
      return fail("validation", "Only documents made from a template can be edited here.");

    const fields = {
      values: sanitiseValues(template, parsed.data.values),
      letterhead: sanitiseLetterhead(parsed.data.letterhead),
    } as unknown as Json;
    const { error, count } = await supabase
      .from("member_documents")
      .update({ title: parsed.data.title, fields }, { count: "exact" })
      .eq("id", parsed.data.id)
      .eq("updated_at", parsed.data.updatedAt);
    if (error) return dbFail(error);
    if (count === 0)
      return fail("conflict", "Someone saved this document after you opened it. Reload to see their version.");
    logger.info("team.document_edited", { template: template.key });
    refresh(parsed.data.userId);
    return ok(undefined);
  },
);

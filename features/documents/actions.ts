"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getProjectByKey, getProjectContext } from "@/features/projects/queries";
import { isSchemaDrift, mapDbError } from "@/lib/actions/db-errors";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { validationFail } from "@/lib/actions/validation";
import { withAction } from "@/lib/actions/with-action";
import { requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

import {
  ACCEPTED_MIME_TYPES,
  DOCUMENT_TYPES,
  MAX_FILE_BYTES,
  PROJECT_FILES_BUCKET,
  isProjectDocumentPath,
  sanitiseLetterhead,
} from "./files";
import { findTemplate, sanitiseValues } from "./templates";

/**
 * Document actions. Uploads go browser → Storage directly (no Server Action
 * body limit), then `recordUpload` checks the path and writes the row; a
 * failed record removes the upload so no orphan is left behind.
 */

const NOT_READY =
  "Documents need a one-time database update before they can be saved. Ask an admin to apply the latest migration.";

async function authorise(projectKey: string) {
  const viewer = await requireViewer();
  const project = await getProjectByKey(viewer.organizationId, projectKey);
  if (project.error || !project.data)
    return { ok: false as const, result: fail("not_found", "That project does not exist.") };
  const ctx = await getProjectContext(project.data, viewer);
  const writable = project.data.status !== "archived" || viewer.orgRole !== "member";
  if (!can(viewer, "document.create", ctx) || !writable)
    return { ok: false as const, result: fail("forbidden", "You cannot add documents to this project.") };
  return { ok: true as const, viewer, ctx, project: project.data, supabase: await createClient() };
}

function done(projectKey: string) {
  revalidatePath(`/os/projects/${projectKey}`, "layout");
  revalidatePath("/os/documents");
}

const uploadSchema = z.object({
  projectKey: z.string().min(1),
  path: z.string().min(1).max(400),
  title: z.string().trim().min(1, "Give the document a title").max(200),
  type: z.enum(DOCUMENT_TYPES as [string, ...string[]]),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value === "" ? null : value)),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().refine((value) => ACCEPTED_MIME_TYPES.includes(value), "That file type is not accepted."),
  size: z.number().int().positive().max(MAX_FILE_BYTES, "Files can be up to 25 MB."),
});

export const recordUpload = withAction("documents.recordUpload", async (input: unknown): Promise<ActionResult> => {
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const auth = await authorise(parsed.data.projectKey);
  if (!auth.ok) return auth.result;
  const { supabase, project, viewer } = auth;

  const discard = async () => {
    const { error } = await supabase.storage.from(PROJECT_FILES_BUCKET).remove([parsed.data.path]);
    if (error) logger.warn("documents.orphan_upload", { message: error.message });
  };

  if (!isProjectDocumentPath(parsed.data.path, project.id)) {
    await discard();
    return fail("validation", "That upload does not belong to this project.");
  }

  const { error } = await supabase.from("project_documents").insert({
    project_id: project.id,
    title: parsed.data.title,
    type: parsed.data.type as never,
    description: parsed.data.description,
    source: "upload",
    storage_path: parsed.data.path,
    file_name: parsed.data.fileName,
    mime_type: parsed.data.mimeType,
    size_bytes: parsed.data.size,
    uploaded_by: viewer.userId,
  });
  if (error) {
    await discard();
    if (isSchemaDrift(error)) return fail("invariant", NOT_READY);
    const mapped = mapDbError(error);
    return fail(mapped.code, mapped.message);
  }

  logger.info("documents.uploaded", { key: project.key });
  done(project.key);
  return ok(undefined);
});

const generatedSchema = z.object({
  projectKey: z.string().min(1),
  templateKey: z.string().min(1).max(60),
  title: z.string().trim().min(1, "Give the document a title").max(200),
  values: z.unknown(),
  letterhead: z.unknown(),
});

export const saveGeneratedDocument = withAction(
  "documents.saveGenerated",
  async (input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = generatedSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const template = findTemplate(parsed.data.templateKey);
    if (!template) return fail("validation", "Unknown template.");
    const auth = await authorise(parsed.data.projectKey);
    if (!auth.ok) return auth.result;

    // Stored exactly as the form could have produced it, never as sent.
    const fields = {
      values: sanitiseValues(template, parsed.data.values),
      letterhead: sanitiseLetterhead(parsed.data.letterhead),
    } as unknown as Json;

    const { data, error } = await auth.supabase
      .from("project_documents")
      .insert({
        project_id: auth.project.id,
        title: parsed.data.title,
        type: template.documentType,
        source: "generated",
        template_key: template.key,
        fields,
        uploaded_by: auth.viewer.userId,
      })
      .select("id")
      .single();
    if (error) {
      if (isSchemaDrift(error)) return fail("invariant", NOT_READY);
      const mapped = mapDbError(error);
      return fail(mapped.code, mapped.message);
    }

    logger.info("documents.generated", { key: auth.project.key, template: template.key });
    done(auth.project.key);
    return ok({ id: data.id });
  },
);

const deleteSchema = z.object({ projectKey: z.string().min(1), id: z.uuid() });

export const deleteDocument = withAction("documents.delete", async (input: unknown): Promise<ActionResult> => {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const viewer = await requireViewer();
  const project = await getProjectByKey(viewer.organizationId, parsed.data.projectKey);
  if (project.error || !project.data) return fail("not_found", "That project does not exist.");
  const ctx = await getProjectContext(project.data, viewer);

  const supabase = await createClient();
  const existing = await supabase
    .from("project_documents")
    .select("id, storage_path, uploaded_by")
    .eq("id", parsed.data.id)
    .eq("project_id", project.data.id)
    .maybeSingle();
  if (existing.error || !existing.data) return fail("not_found", "That document does not exist.");

  // Mirrors project_documents_delete: the manager, or whoever added it.
  const mayDelete =
    can(viewer, "document.delete", ctx) ||
    (existing.data.uploaded_by === viewer.userId && can(viewer, "document.create", ctx));
  if (!mayDelete) return fail("forbidden", "Only the project manager or the person who added it can delete this.");

  const { error } = await supabase.from("project_documents").delete().eq("id", parsed.data.id);
  if (error) {
    const mapped = mapDbError(error);
    return fail(mapped.code, mapped.message);
  }
  if (existing.data.storage_path) {
    const removed = await supabase.storage.from(PROJECT_FILES_BUCKET).remove([existing.data.storage_path]);
    if (removed.error) logger.warn("documents.orphan_after_delete", { message: removed.error.message });
  }

  done(project.data.key);
  return ok(undefined);
});

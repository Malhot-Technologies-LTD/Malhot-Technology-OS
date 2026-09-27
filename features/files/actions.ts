"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ACCEPTED_MIME_TYPES,
  DOCUMENT_TYPES,
  MAX_FILE_BYTES,
  formatBytes,
  sanitiseLetterhead,
} from "@/features/documents/files";
import { findTemplate, sanitiseValues } from "@/features/documents/templates";
import { isSchemaDrift, mapDbError } from "@/lib/actions/db-errors";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { validationFail } from "@/lib/actions/validation";
import { withAction } from "@/lib/actions/with-action";
import { requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

import { ARCHIVE_MAX_BYTES, ARCHIVE_MAX_FILES, planArchive, type ArchiveFile } from "./archive";
import { COMPANY_FILES_BUCKET, canManageItem, checkFolderName, descendantIds, isCompanyFilePath } from "./tree";

/**
 * Company file explorer actions. Every rule here is also enforced by the
 * migration's RLS and triggers; checking first only turns a refusal into a
 * message that says why. Uploads go browser → Storage directly, then
 * `recordCompanyUpload` writes the row, removing the upload if that fails.
 */

const NOT_READY =
  "Company folders need a one-time database update before they can be used. Ask an admin to apply the latest migration.";

async function context() {
  const viewer = await requireViewer();
  return {
    viewer,
    who: { userId: viewer.userId, isAdmin: viewer.orgRole !== "member" },
    supabase: await createClient(),
  };
}

function refused(error: PostgrestError) {
  if (isSchemaDrift(error)) return fail("invariant", NOT_READY);
  const mapped = mapDbError(error);
  return fail(mapped.code, mapped.message);
}

function done() {
  revalidatePath("/os/files", "layout");
}

const folderId = z.uuid().nullable();

// Folders ----------------------------------------------------------------------

const createFolderSchema = z.object({ parentId: folderId, name: z.string(), restricted: z.boolean().default(false) });

export const createFolder = withAction(
  "files.createFolder",
  async (input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = createFolderSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const name = checkFolderName(parsed.data.name);
    if (!name.ok) return fail("validation", name.message);
    const { viewer, who, supabase } = await context();
    if (parsed.data.restricted && !who.isAdmin) return fail("forbidden", "Only admins can make a folder admins-only.");

    const { data, error } = await supabase
      .from("file_folders")
      .insert({
        organization_id: viewer.organizationId,
        parent_id: parsed.data.parentId,
        name: name.name,
        restricted: parsed.data.restricted,
        created_by: viewer.userId,
      })
      .select("id")
      .single();
    if (error) return refused(error);
    done();
    return ok({ id: data.id });
  },
);

/** A folder the viewer can see and may change, or the reason they cannot. */
async function manageableFolder(id: string) {
  const ctx = await context();
  const { data, error } = await ctx.supabase
    .from("file_folders")
    .select("id, parent_id, restricted, created_by")
    .eq("organization_id", ctx.viewer.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false as const, result: refused(error) };
  if (!data) return { ok: false as const, result: fail("not_found", "That folder does not exist.") };
  if (!canManageItem(ctx.who, data))
    return {
      ok: false as const,
      result: fail("forbidden", "Only an admin or whoever created this folder can change it."),
    };
  return { ok: true as const, folder: data, ...ctx };
}

const renameFolderSchema = z.object({ id: z.uuid(), name: z.string() });

export const renameFolder = withAction("files.renameFolder", async (input: unknown): Promise<ActionResult> => {
  const parsed = renameFolderSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const name = checkFolderName(parsed.data.name);
  if (!name.ok) return fail("validation", name.message);
  const found = await manageableFolder(parsed.data.id);
  if (!found.ok) return found.result;
  const { error } = await found.supabase.from("file_folders").update({ name: name.name }).eq("id", parsed.data.id);
  if (error) return refused(error);
  done();
  return ok(undefined);
});

const moveFolderSchema = z.object({ id: z.uuid(), parentId: folderId });

export const moveFolder = withAction("files.moveFolder", async (input: unknown): Promise<ActionResult> => {
  const parsed = moveFolderSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  if (parsed.data.parentId === parsed.data.id) return fail("validation", "A folder cannot move inside itself.");
  const found = await manageableFolder(parsed.data.id);
  if (!found.ok) return found.result;
  const { error } = await found.supabase
    .from("file_folders")
    .update({ parent_id: parsed.data.parentId })
    .eq("id", parsed.data.id);
  if (error) return refused(error);
  done();
  return ok(undefined);
});

const restrictSchema = z.object({ id: z.uuid(), restricted: z.boolean() });

export const setFolderRestricted = withAction("files.restrictFolder", async (input: unknown): Promise<ActionResult> => {
  const parsed = restrictSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const found = await manageableFolder(parsed.data.id);
  if (!found.ok) return found.result;
  if (!found.who.isAdmin) return fail("forbidden", "Only admins can change who sees a folder.");

  if (!parsed.data.restricted && found.folder.parent_id) {
    const parent = await found.supabase
      .from("file_folders")
      .select("restricted")
      .eq("id", found.folder.parent_id)
      .maybeSingle();
    if (parent.data?.restricted)
      return fail("validation", "This folder is inside an admins-only folder, so it stays admins-only.");
  }
  const { error } = await found.supabase
    .from("file_folders")
    .update({ restricted: parsed.data.restricted })
    .eq("id", parsed.data.id);
  if (error) return refused(error);
  done();
  return ok(undefined);
});

export const deleteFolder = withAction("files.deleteFolder", async (input: unknown): Promise<ActionResult> => {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const found = await manageableFolder(parsed.data.id);
  if (!found.ok) return found.result;
  const { supabase, viewer, who } = found;

  // The rows cascade with the folder; the uploaded bytes do not, so collect their paths first.
  const all = await supabase
    .from("file_folders")
    .select("id, parent_id, name, restricted, created_by, created_at, updated_at")
    .eq("organization_id", viewer.organizationId)
    .limit(5000);
  if (all.error) return refused(all.error);
  const inside = [parsed.data.id, ...descendantIds(all.data, parsed.data.id)];
  const files = await supabase.from("company_files").select("storage_path").in("folder_id", inside).limit(10000);
  if (files.error) return refused(files.error);

  if (!who.isAdmin && (inside.length > 1 || files.data.length > 0)) {
    return fail("forbidden", "Empty the folder first. Only an admin can delete a folder with things in it.");
  }

  const { error, count } = await supabase.from("file_folders").delete({ count: "exact" }).eq("id", parsed.data.id);
  if (error) return refused(error);
  // RLS can refuse silently: a folder that is empty to this viewer may hold something they cannot see.
  if (count === 0) return fail("forbidden", "This folder is not empty. Ask an admin to delete it.");

  const paths = files.data.map((file) => file.storage_path).filter((path): path is string => Boolean(path));
  if (paths.length > 0) {
    const removed = await supabase.storage.from(COMPANY_FILES_BUCKET).remove(paths);
    if (removed.error) logger.warn("files.orphans_after_folder_delete", { message: removed.error.message });
  }
  logger.info("files.folder_deleted", { folders: inside.length, files: files.data.length });
  done();
  return ok(undefined);
});

// Files ------------------------------------------------------------------------

const uploadSchema = z.object({
  folderId,
  path: z.string().min(1).max(400),
  title: z.string().trim().min(1, "Give the file a title").max(200),
  type: z.enum(DOCUMENT_TYPES as [string, ...string[]]).default("other"),
  description: z
    .string()
    .trim()
    .max(2000)
    .default("")
    .transform((value) => (value === "" ? null : value)),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().refine((value) => ACCEPTED_MIME_TYPES.includes(value), "That file type is not accepted."),
  size: z.number().int().positive().max(MAX_FILE_BYTES, "Files can be up to 25 MB."),
});

export const recordCompanyUpload = withAction(
  "files.recordUpload",
  async (input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = uploadSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const { viewer, supabase } = await context();

    const discard = async () => {
      const { error } = await supabase.storage.from(COMPANY_FILES_BUCKET).remove([parsed.data.path]);
      if (error) logger.warn("files.orphan_upload", { message: error.message });
    };
    if (!isCompanyFilePath(parsed.data.path, viewer.organizationId)) {
      await discard();
      return fail("validation", "That upload does not belong to this company.");
    }

    const { data, error } = await supabase
      .from("company_files")
      .insert({
        organization_id: viewer.organizationId,
        folder_id: parsed.data.folderId,
        title: parsed.data.title,
        type: parsed.data.type as never,
        description: parsed.data.description,
        source: "upload",
        storage_path: parsed.data.path,
        file_name: parsed.data.fileName,
        mime_type: parsed.data.mimeType,
        size_bytes: parsed.data.size,
        created_by: viewer.userId,
      })
      .select("id")
      .single();
    if (error) {
      await discard();
      return refused(error);
    }
    done();
    return ok({ id: data.id });
  },
);

const generatedSchema = z.object({
  folderId,
  templateKey: z.string().min(1).max(60),
  title: z.string().trim().min(1, "Give the document a title").max(200),
  values: z.unknown(),
  letterhead: z.unknown(),
});

export const saveGeneratedToFolder = withAction(
  "files.saveGenerated",
  async (input: unknown): Promise<ActionResult<{ id: string }>> => {
    const parsed = generatedSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const template = findTemplate(parsed.data.templateKey);
    if (!template) return fail("validation", "Unknown template.");
    const { viewer, supabase } = await context();

    // Stored exactly as the form could have produced it, never as sent.
    const fields = {
      values: sanitiseValues(template, parsed.data.values),
      letterhead: sanitiseLetterhead(parsed.data.letterhead),
    } as unknown as Json;

    const { data, error } = await supabase
      .from("company_files")
      .insert({
        organization_id: viewer.organizationId,
        folder_id: parsed.data.folderId,
        title: parsed.data.title,
        type: template.documentType,
        source: "generated",
        template_key: template.key,
        fields,
        created_by: viewer.userId,
      })
      .select("id")
      .single();
    if (error) return refused(error);
    logger.info("files.generated", { template: template.key });
    done();
    return ok({ id: data.id });
  },
);

async function manageableFile(id: string) {
  const ctx = await context();
  const { data, error } = await ctx.supabase
    .from("company_files")
    .select("id, folder_id, storage_path, created_by")
    .eq("organization_id", ctx.viewer.organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false as const, result: refused(error) };
  if (!data) return { ok: false as const, result: fail("not_found", "That file does not exist.") };
  if (!canManageItem(ctx.who, data))
    return { ok: false as const, result: fail("forbidden", "Only an admin or whoever added this file can change it.") };
  return { ok: true as const, file: data, ...ctx };
}

const renameFileSchema = z.object({ id: z.uuid(), title: z.string().trim().min(1, "Give the file a title").max(200) });

export const renameFile = withAction("files.renameFile", async (input: unknown): Promise<ActionResult> => {
  const parsed = renameFileSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const found = await manageableFile(parsed.data.id);
  if (!found.ok) return found.result;
  const { error } = await found.supabase
    .from("company_files")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.id);
  if (error) return refused(error);
  done();
  return ok(undefined);
});

const moveFileSchema = z.object({ id: z.uuid(), folderId });

export const moveFile = withAction("files.moveFile", async (input: unknown): Promise<ActionResult> => {
  const parsed = moveFileSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const found = await manageableFile(parsed.data.id);
  if (!found.ok) return found.result;
  const { error } = await found.supabase
    .from("company_files")
    .update({ folder_id: parsed.data.folderId })
    .eq("id", parsed.data.id);
  if (error) return refused(error);
  done();
  return ok(undefined);
});

export const deleteFile = withAction("files.deleteFile", async (input: unknown): Promise<ActionResult> => {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const found = await manageableFile(parsed.data.id);
  if (!found.ok) return found.result;
  const { error } = await found.supabase.from("company_files").delete().eq("id", parsed.data.id);
  if (error) return refused(error);
  if (found.file.storage_path) {
    const removed = await found.supabase.storage.from(COMPANY_FILES_BUCKET).remove([found.file.storage_path]);
    if (removed.error) logger.warn("files.orphan_after_delete", { message: removed.error.message });
  }
  done();
  return ok(undefined);
});

// Download a folder as a ZIP -------------------------------------------------------

export type ArchiveManifest = {
  name: string;
  directories: string[];
  entries: (
    | { path: string; kind: "upload"; url: string }
    | { path: string; kind: "generated"; templateKey: string; fields: unknown }
  )[];
};

/**
 * Everything the browser needs to build a folder's ZIP: its layout, a signed
 * link (10 minutes) for each upload, and each generated document's facts so it
 * can be rendered to Word there. Built on the viewer's own session, so an
 * admins-only subfolder is simply absent for a member. The ZIP is assembled in
 * the browser because a server response cannot carry hundreds of megabytes.
 */
export const folderArchive = withAction(
  "files.archive",
  async (input: unknown): Promise<ActionResult<ArchiveManifest>> => {
    const parsed = z.object({ folderId }).safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const { viewer, supabase } = await context();

    const [folders, files] = await Promise.all([
      supabase
        .from("file_folders")
        .select("id, parent_id, name, restricted, created_by, created_at, updated_at")
        .eq("organization_id", viewer.organizationId)
        .limit(5000),
      supabase
        .from("company_files")
        .select("id, folder_id, title, source, file_name, size_bytes, storage_path, template_key, fields")
        .eq("organization_id", viewer.organizationId)
        .limit(10000),
    ]);
    if (folders.error) return refused(folders.error);
    if (files.error) return refused(files.error);
    if (parsed.data.folderId && !folders.data.some((folder) => folder.id === parsed.data.folderId))
      return fail("not_found", "That folder does not exist.");

    const rows = files.data as (ArchiveFile & {
      storage_path: string | null;
      template_key: string | null;
      fields: unknown;
    })[];
    const plan = planArchive(folders.data, parsed.data.folderId, rows);
    const byId = new Map(rows.map((row) => [row.id, row]));
    const chosen = plan.entries.map((entry) => ({ ...entry, row: byId.get(entry.fileId)! }));

    const bytes = chosen.reduce((sum, entry) => sum + (entry.row.size_bytes ?? 0), 0);
    if (chosen.length > ARCHIVE_MAX_FILES || bytes > ARCHIVE_MAX_BYTES)
      return fail(
        "validation",
        `This folder holds ${chosen.length} files (${formatBytes(bytes)}), more than a browser can zip at once (${ARCHIVE_MAX_FILES} files or ${formatBytes(ARCHIVE_MAX_BYTES)}). Download its subfolders one at a time.`,
      );

    const uploads = chosen.filter((entry) => entry.row.source === "upload" && entry.row.storage_path);
    const signed = uploads.length
      ? await supabase.storage.from(COMPANY_FILES_BUCKET).createSignedUrls(
          uploads.map((entry) => entry.row.storage_path!),
          600,
        )
      : { data: [], error: null };
    if (signed.error) {
      logger.warn("files.archive_sign_failed", { message: signed.error.message });
      return fail("unexpected", "The files could not be prepared for download. Try again.");
    }
    const urls = new Map(
      (signed.data ?? []).flatMap((item) => (item.signedUrl && item.path ? [[item.path, item.signedUrl]] : [])),
    );

    const entries: ArchiveManifest["entries"] = [];
    for (const entry of chosen) {
      if (entry.row.source === "generated" && entry.row.template_key)
        entries.push({
          path: entry.path,
          kind: "generated",
          templateKey: entry.row.template_key,
          fields: entry.row.fields,
        });
      else if (entry.row.storage_path && urls.has(entry.row.storage_path))
        entries.push({ path: entry.path, kind: "upload", url: urls.get(entry.row.storage_path)! });
    }
    logger.info("files.archived", { files: entries.length, bytes });
    return ok({ name: plan.name, directories: plan.directories, entries });
  },
);

const editSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, "Give the document a title").max(200),
  values: z.unknown(),
  letterhead: z.unknown(),
  /** When the editor was opened: a save over someone else's newer save is refused, not silently lost. */
  updatedAt: z.string().min(1),
});

/** Saves changes to a generated document in a folder, in place. */
export const updateGeneratedFile = withAction(
  "files.updateGenerated",
  async (input: unknown): Promise<ActionResult> => {
    const parsed = editSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const found = await manageableFile(parsed.data.id);
    if (!found.ok) return found.result;
    const row = await found.supabase
      .from("company_files")
      .select("source, template_key")
      .eq("id", parsed.data.id)
      .single();
    if (row.error) return refused(row.error);
    const template = findTemplate(row.data.template_key);
    if (row.data.source !== "generated" || !template)
      return fail("validation", "Only documents made from a template can be edited here.");

    const fields = {
      values: sanitiseValues(template, parsed.data.values),
      letterhead: sanitiseLetterhead(parsed.data.letterhead),
    } as unknown as Json;
    const { error, count } = await found.supabase
      .from("company_files")
      .update({ title: parsed.data.title, fields }, { count: "exact" })
      .eq("id", parsed.data.id)
      .eq("updated_at", parsed.data.updatedAt);
    if (error) return refused(error);
    if (count === 0)
      return fail("conflict", "Someone saved this document after you opened it. Reload to see their version.");
    logger.info("files.edited", { template: template.key });
    done();
    return ok(undefined);
  },
);

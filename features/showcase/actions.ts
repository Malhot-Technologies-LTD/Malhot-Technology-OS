"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { mapDbError } from "@/lib/actions/db-errors";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { validationFail } from "@/lib/actions/validation";
import { withAction } from "@/lib/actions/with-action";
import { requireViewer, type Viewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

import { SITE_MEDIA_BUCKET } from "./media";
import { SHOWCASE_TAG } from "./public";
import { imageAltSchema, isShowcaseImagePath, MAX_IMAGES, showcaseSchema } from "./schemas";

/**
 * Settings → Website. Org admins decide which projects the public site shows,
 * write the copy it shows them with, and attach photos.
 *
 * Every write ends in `refreshWebsite()`: `updateTag` expires the cached
 * showcase reads, so the next visitor to any website page sees the change
 * rather than a stale copy. RLS (org admins only) is the backstop behind the
 * `can()` check in each action.
 */

type AdminCheck = { ok: true; viewer: Viewer } | { ok: false; result: ActionResult<never> };

async function requireWebsiteAdmin(): Promise<AdminCheck> {
  const viewer = await requireViewer();
  if (!can(viewer, "org.website"))
    return { ok: false, result: fail("forbidden", "Only organisation admins can change the website.") };
  return { ok: true, viewer };
}

function refreshWebsite(projectKey?: string) {
  updateTag(SHOWCASE_TAG);
  revalidatePath("/os/settings/website");
  if (projectKey) revalidatePath(`/os/settings/website/${projectKey}`);
}

const uuid = z.uuid();
const direction = z.enum(["first", "up", "down"]);

/** The new order after moving `id` one step (or to the front). Unchanged when it cannot move. */
function reorder(ids: string[], id: string, move: z.infer<typeof direction>): string[] {
  const from = ids.indexOf(id);
  if (from === -1) return ids;
  const to = move === "first" ? 0 : move === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length || to === from) return ids;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

export const saveShowcase = withAction(
  "showcase.save",
  async (input: unknown): Promise<ActionResult<{ created: boolean }>> => {
    const parsed = showcaseSchema.safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const check = await requireWebsiteAdmin();
    if (!check.ok) return check.result;
    const { viewer } = check;
    const values = parsed.data;

    const supabase = await createClient();
    const project = await supabase
      .from("projects")
      .select("id, key")
      .eq("id", values.projectId)
      .eq("organization_id", viewer.organizationId)
      .is("deleted_at", null)
      .maybeSingle();
    if (project.error || !project.data) return fail("not_found", "That project does not exist.");

    const existing = await supabase
      .from("project_showcases")
      .select("project_id")
      .eq("project_id", values.projectId)
      .maybeSingle();
    if (existing.error) return fail("unexpected", "The website entry could not be read. Try again.");

    const fields = {
      title: values.title,
      slug: values.slug,
      category: values.category,
      scope: values.scope,
      year: values.year,
      client_label: values.clientLabel,
      summary: values.summary,
      overview: values.overview,
      features: values.features,
      stack: values.stack,
      live_url: values.liveUrl,
      published: values.published,
    };

    let error;
    if (existing.data) {
      ({ error } = await supabase.from("project_showcases").update(fields).eq("project_id", values.projectId));
    } else {
      // New entries go to the end of the website order.
      const last = await supabase
        .from("project_showcases")
        .select("position")
        .eq("organization_id", viewer.organizationId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      ({ error } = await supabase.from("project_showcases").insert({
        ...fields,
        project_id: values.projectId,
        organization_id: viewer.organizationId,
        position: (last.data?.position ?? 0) + 1,
        created_by: viewer.userId,
      }));
    }

    if (error) {
      const mapped = mapDbError(error);
      logger.warn("showcase.save_failed", { code: error.code, mapped: mapped.code });
      if (mapped.code === "conflict")
        return fail("conflict", mapped.message, { fieldErrors: { slug: [mapped.message] } });
      return fail(mapped.code, mapped.message);
    }

    logger.info("showcase.saved", { projectKey: project.data.key, published: values.published });
    refreshWebsite(project.data.key);
    return ok({ created: !existing.data });
  },
);

export const setShowcasePublished = withAction(
  "showcase.setPublished",
  async (input: unknown): Promise<ActionResult> => {
    const parsed = z.object({ projectId: uuid, published: z.boolean() }).safeParse(input);
    if (!parsed.success) return fail("validation", "Unknown project.");
    const check = await requireWebsiteAdmin();
    if (!check.ok) return check.result;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("project_showcases")
      .update({ published: parsed.data.published })
      .eq("project_id", parsed.data.projectId)
      .eq("organization_id", check.viewer.organizationId)
      .select("project_id");
    if (error) return fail("unexpected", "The website could not be updated. Try again.");
    if (!data || data.length === 0) return fail("not_found", "Set up this project's website entry first.");

    refreshWebsite();
    return ok(undefined);
  },
);

/** Moves a project one place up or down in the website order. */
export const moveShowcase = withAction("showcase.move", async (input: unknown): Promise<ActionResult> => {
  const parsed = z.object({ projectId: uuid, direction }).safeParse(input);
  if (!parsed.success) return fail("validation", "Unknown project.");
  const check = await requireWebsiteAdmin();
  if (!check.ok) return check.result;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_showcases")
    .select("project_id")
    .eq("organization_id", check.viewer.organizationId)
    .order("position");
  if (error) return fail("unexpected", "The website order could not be read. Try again.");

  const ids = data.map((row) => row.project_id);
  const next = reorder(ids, parsed.data.projectId, parsed.data.direction);
  if (next === ids) return ok(undefined);

  // Renumbering every row keeps positions dense and ties impossible. There are
  // a handful of rows, so a few small updates beat a clever fractional scheme.
  const results = await Promise.all(
    next.map((projectId, index) =>
      supabase
        .from("project_showcases")
        .update({ position: index + 1 })
        .eq("project_id", projectId),
    ),
  );
  if (results.some((result) => result.error)) return fail("unexpected", "The new order could not be saved. Try again.");

  refreshWebsite();
  return ok(undefined);
});

/**
 * Records a photo the browser has already uploaded to the site-media bucket.
 * The upload goes straight to Storage (the bucket policy lets org admins write
 * under their organisation's folder), because a Server Action would have to
 * stream every byte through the app.
 */
export const addShowcaseImage = withAction("showcase.addImage", async (input: unknown): Promise<ActionResult> => {
  const parsed = z.object({ projectId: uuid, path: z.string().max(300), alt: imageAltSchema }).safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const check = await requireWebsiteAdmin();
  if (!check.ok) return check.result;
  const { viewer } = check;
  const { projectId, path, alt } = parsed.data;

  if (!isShowcaseImagePath(path, viewer.organizationId, projectId))
    return fail("validation", "That upload does not belong to this project.");

  const supabase = await createClient();
  const discardUpload = async () => {
    const { error } = await supabase.storage.from(SITE_MEDIA_BUCKET).remove([path]);
    if (error) logger.warn("showcase.orphan_upload", { path, message: error.message });
  };

  const showcase = await supabase
    .from("project_showcases")
    .select("project_id, project:projects!project_showcases_project_id_fkey(key)")
    .eq("project_id", projectId)
    .eq("organization_id", viewer.organizationId)
    .maybeSingle();
  if (showcase.error || !showcase.data) {
    await discardUpload();
    return fail("not_found", "Save the project's website details before adding photos.");
  }

  const images = await supabase
    .from("project_showcase_images")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false });
  if (images.error) {
    await discardUpload();
    return fail("unexpected", "The photos could not be read. Try again.");
  }
  if (images.data.length >= MAX_IMAGES) {
    await discardUpload();
    return fail("invariant", `A project can have at most ${MAX_IMAGES} photos. Remove one first.`);
  }

  const { error } = await supabase.from("project_showcase_images").insert({
    project_id: projectId,
    storage_path: path,
    alt,
    position: (images.data[0]?.position ?? 0) + 1,
    created_by: viewer.userId,
  });
  if (error) {
    await discardUpload();
    const mapped = mapDbError(error);
    return fail(mapped.code, mapped.message);
  }

  refreshWebsite(showcase.data.project?.key);
  return ok(undefined);
});

async function loadImage(imageId: string, organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_showcase_images")
    .select(
      "id, project_id, storage_path, showcase:project_showcases!inner(organization_id, project:projects!project_showcases_project_id_fkey(key))",
    )
    .eq("id", imageId)
    .eq("showcase.organization_id", organizationId)
    .maybeSingle();
  return { supabase, image: data };
}

export const updateShowcaseImageAlt = withAction(
  "showcase.updateImageAlt",
  async (input: unknown): Promise<ActionResult> => {
    const parsed = z.object({ imageId: uuid, alt: imageAltSchema }).safeParse(input);
    if (!parsed.success) return validationFail(parsed.error);
    const check = await requireWebsiteAdmin();
    if (!check.ok) return check.result;

    const { supabase, image } = await loadImage(parsed.data.imageId, check.viewer.organizationId);
    if (!image) return fail("not_found", "That photo was already removed.");

    const { error } = await supabase
      .from("project_showcase_images")
      .update({ alt: parsed.data.alt })
      .eq("id", image.id);
    if (error) return fail("unexpected", "The description could not be saved. Try again.");

    refreshWebsite(image.showcase.project?.key);
    return ok(undefined);
  },
);

/** Moves a photo within its project. The first photo is the cover on the project card. */
export const moveShowcaseImage = withAction("showcase.moveImage", async (input: unknown): Promise<ActionResult> => {
  const parsed = z.object({ imageId: uuid, direction }).safeParse(input);
  if (!parsed.success) return fail("validation", "Unknown photo.");
  const check = await requireWebsiteAdmin();
  if (!check.ok) return check.result;

  const { supabase, image } = await loadImage(parsed.data.imageId, check.viewer.organizationId);
  if (!image) return fail("not_found", "That photo was already removed.");

  const siblings = await supabase
    .from("project_showcase_images")
    .select("id")
    .eq("project_id", image.project_id)
    .order("position");
  if (siblings.error) return fail("unexpected", "The photos could not be read. Try again.");

  const ids = siblings.data.map((row) => row.id);
  const next = reorder(ids, image.id, parsed.data.direction);
  if (next === ids) return ok(undefined);

  const results = await Promise.all(
    next.map((id, index) =>
      supabase
        .from("project_showcase_images")
        .update({ position: index + 1 })
        .eq("id", id),
    ),
  );
  if (results.some((result) => result.error)) return fail("unexpected", "The new order could not be saved. Try again.");

  refreshWebsite(image.showcase.project?.key);
  return ok(undefined);
});

export const deleteShowcaseImage = withAction("showcase.deleteImage", async (input: unknown): Promise<ActionResult> => {
  const parsed = uuid.safeParse(input);
  if (!parsed.success) return fail("validation", "Unknown photo.");
  const check = await requireWebsiteAdmin();
  if (!check.ok) return check.result;

  const { supabase, image } = await loadImage(parsed.data, check.viewer.organizationId);
  if (!image) return fail("not_found", "That photo was already removed.");

  const { error } = await supabase.from("project_showcase_images").delete().eq("id", image.id);
  if (error) return fail("unexpected", "The photo could not be removed. Try again.");

  // The row is what the website reads, so the photo is already gone from the
  // site. A file left behind costs storage, not correctness: log it and move on.
  const removed = await supabase.storage.from(SITE_MEDIA_BUCKET).remove([image.storage_path]);
  if (removed.error) logger.warn("showcase.orphan_file", { path: image.storage_path, message: removed.error.message });

  refreshWebsite(image.showcase.project?.key);
  return ok(undefined);
});

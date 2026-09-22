"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { mapDbError } from "@/lib/actions/db-errors";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { validationFail } from "@/lib/actions/validation";
import { withAction } from "@/lib/actions/with-action";
import { requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/types/domain";

import { getProjectByKey, getProjectContext } from "./queries";
import { createProjectSchema, updateProjectSchema } from "./schemas";

/**
 * Project actions (docs/features/projects.md, W2 in docs/product/workflows.md).
 * Each one checks `can()` before touching the database and relies on RLS and the
 * status trigger as the backstop; trigger errors arrive as MALHOT:<code>:<detail>
 * and are translated by mapDbError.
 */

export const createProject = withAction("projects.create", async (input: unknown): Promise<ActionResult> => {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const viewer = await requireViewer();
  if (!can(viewer, "project.create")) return fail("forbidden", "You cannot create projects.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      organization_id: viewer.organizationId,
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description,
      client_id: parsed.data.clientId,
      priority: parsed.data.priority,
      start_date: parsed.data.startDate,
      target_end_date: parsed.data.targetEndDate,
      // W2: the creator manages the project unless they hand it over later.
      created_by: viewer.userId,
      manager_id: viewer.userId,
    })
    .select("key")
    .single();

  if (error) {
    const mapped = mapDbError(error);
    logger.warn("project.create.failed", { code: error.code, mapped: mapped.code });
    const fieldErrors = mapped.code === "conflict" ? { key: [mapped.message] } : undefined;
    return fail(mapped.code, mapped.message, fieldErrors ? { fieldErrors } : undefined);
  }

  logger.info("project.created", { key: data.key });
  revalidatePath("/os/projects");
  redirect(`/os/projects/${data.key}`);
});

export const updateProject = withAction("projects.update", async (input: unknown): Promise<ActionResult> => {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const viewer = await requireViewer();

  const supabase = await createClient();
  const existing = await supabase
    .from("projects")
    .select("id, key, status, qa_required")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (existing.error || !existing.data) return fail("not_found", "That project does not exist.");

  const ctx = await getProjectContext(existing.data, viewer);
  if (!can(viewer, "project.edit", ctx)) return fail("forbidden", "Only the project manager can edit this project.");

  const { error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      key: parsed.data.key,
      description: parsed.data.description,
      client_id: parsed.data.clientId,
      priority: parsed.data.priority,
      start_date: parsed.data.startDate,
      target_end_date: parsed.data.targetEndDate,
    })
    .eq("id", parsed.data.projectId);

  if (error) {
    const mapped = mapDbError(error);
    return fail(mapped.code, mapped.message);
  }

  revalidatePath("/os/projects");
  revalidatePath(`/os/projects/${parsed.data.key}`);
  return ok(undefined);
});

const READINESS = "A project needs at least one goal, one MVP item, a manager and a start date before it can start.";

/**
 * Status transitions (docs/product/project-lifecycle.md#status-state-machine).
 * `planning → active` additionally requires the readiness checklist to pass —
 * that rule lives here rather than in the trigger because it is a product
 * judgement about completeness, not a data invariant.
 */
export const changeProjectStatus = withAction(
  "projects.changeStatus",
  async (input: unknown): Promise<ActionResult> => {
    const payload = input as { projectId?: unknown; status?: unknown };
    const projectId = typeof payload?.projectId === "string" ? payload.projectId : null;
    const status = typeof payload?.status === "string" ? payload.status : null;
    if (!projectId || !status) return fail("validation", "Unknown project or status.");

    const viewer = await requireViewer();
    const supabase = await createClient();
    const existing = await supabase
      .from("projects")
      .select("id, key, status, qa_required, manager_id, start_date")
      .eq("id", projectId)
      .maybeSingle();
    if (existing.error || !existing.data) return fail("not_found", "That project does not exist.");

    const ctx = await getProjectContext(existing.data, viewer);
    if (!can(viewer, "project.change_status", ctx))
      return fail("forbidden", "Only the project manager can change the status.");

    if (status === "active" && existing.data.status === "planning") {
      const [goals, mvpItems] = await Promise.all([
        supabase.from("goals").select("id", { count: "exact", head: true }).eq("project_id", projectId),
        supabase.from("mvp_items").select("id", { count: "exact", head: true }).eq("project_id", projectId),
      ]);
      const ready =
        (goals.count ?? 0) > 0 && (mvpItems.count ?? 0) > 0 && existing.data.manager_id && existing.data.start_date;
      if (!ready) return fail("invariant", READINESS);
    }

    const { error } = await supabase
      .from("projects")
      .update({ status: status as never })
      .eq("id", projectId);
    if (error) {
      const mapped = mapDbError(error);
      return fail(mapped.code, mapped.message);
    }

    logger.info("project.status_changed", { key: existing.data.key, from: existing.data.status, to: status });
    revalidatePath("/os/projects");
    revalidatePath(`/os/projects/${existing.data.key}`);
    return ok(undefined);
  },
);

/** Goals and MVP items keep the overview's readiness checklist satisfiable without the full planning page. */
export const addGoal = withAction("projects.addGoal", async (input: unknown): Promise<ActionResult> => {
  return addPlanningItem("goals", "goal.create", input);
});

export const addMvpItem = withAction("projects.addMvpItem", async (input: unknown): Promise<ActionResult> => {
  return addPlanningItem("mvp_items", "mvp.create", input);
});

async function addPlanningItem(
  table: "goals" | "mvp_items",
  action: "goal.create" | "mvp.create",
  input: unknown,
): Promise<ActionResult> {
  const payload = input as { projectKey?: unknown; title?: unknown };
  const projectKey = typeof payload?.projectKey === "string" ? payload.projectKey : null;
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  if (!projectKey) return fail("validation", "Unknown project.");
  if (title.length === 0 || title.length > 200)
    return fail("validation", "Enter a title of 200 characters or fewer.", {
      fieldErrors: { title: ["Enter a title"] },
    });

  const viewer = await requireViewer();
  const project = await getProjectByKey(viewer.organizationId, projectKey);
  if (project.error || !project.data) return fail("not_found", "That project does not exist.");

  const ctx = await getProjectContext(
    { id: project.data.id, key: project.data.key, status: project.data.status, qa_required: project.data.qa_required },
    viewer,
  );
  if (!can(viewer, action, ctx)) return fail("forbidden", "You cannot add to this project.");

  const supabase = await createClient();
  const last = await supabase
    .from(table)
    .select("position")
    .eq("project_id", project.data.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from(table).insert({
    project_id: project.data.id,
    title,
    position: (last.data?.position ?? 0) + 1,
    created_by: viewer.userId,
  });
  if (error) {
    const mapped = mapDbError(error);
    return fail(mapped.code, mapped.message);
  }

  revalidatePath(`/os/projects/${project.data.key}`);
  return ok(undefined);
}

export type PaletteProject = { key: string; name: string; status: ProjectStatus };

/**
 * Projects for the command palette. Loaded once when the palette first opens
 * and filtered in the browser afterwards: an agency has tens of projects, not
 * thousands, so one round trip beats a query per keystroke — especially at the
 * ~400ms round trip this deployment has.
 */
export const searchableProjects = withAction(
  "projects.forPalette",
  async (): Promise<ActionResult<PaletteProject[]>> => {
    const viewer = await requireViewer();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("key, name, status")
      .eq("organization_id", viewer.organizationId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) return fail("unexpected", "Projects could not be loaded.");
    return ok(data as PaletteProject[]);
  },
);

"use server";

import { revalidatePath } from "next/cache";

import { mapDbError } from "@/lib/actions/db-errors";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { validationFail } from "@/lib/actions/validation";
import { withAction } from "@/lib/actions/with-action";
import { requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import { can, type Action } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

import { getProjectByKey, getProjectContext } from "./queries";
import {
  goalInputSchema,
  goalUpdateSchema,
  milestoneInputSchema,
  milestoneUpdateSchema,
  mvpInputSchema,
  mvpUpdateSchema,
  planningDeleteSchema,
} from "./planning-schemas";

/**
 * Goals, MVP items and milestones (docs/features/goals-and-mvp.md,
 * docs/features/timelines.md). Each action checks `can()` first; RLS, the
 * goal-achieve trigger and the same-project trigger on MVP items are the
 * backstop and their refusals arrive translated by mapDbError.
 */

async function authorise(projectKey: string, action: Action) {
  const viewer = await requireViewer();
  const project = await getProjectByKey(viewer.organizationId, projectKey);
  if (project.error || !project.data)
    return { ok: false as const, result: fail("not_found", "That project does not exist.") };
  const ctx = await getProjectContext(project.data, viewer);
  if (!can(viewer, action, ctx))
    return { ok: false as const, result: fail("forbidden", "You do not have permission to change this.") };
  const supabase = await createClient();
  return { ok: true as const, viewer, ctx, project: project.data, supabase };
}

function done(projectKey: string): ActionResult {
  revalidatePath(`/os/projects/${projectKey.toUpperCase()}`, "layout");
  return ok(undefined);
}

function dbFail(error: Parameters<typeof mapDbError>[0], event: string): ActionResult<never> {
  const mapped = mapDbError(error);
  logger.warn(event, { code: error.code, mapped: mapped.code });
  return fail(mapped.code, mapped.message);
}

async function nextPosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "goals" | "mvp_items" | "milestones",
  projectId: string,
) {
  const last = await supabase
    .from(table)
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (last.data?.position ?? 0) + 1;
}

// Goals ----------------------------------------------------------------------

export const createGoal = withAction("planning.createGoal", async (input: unknown): Promise<ActionResult> => {
  const parsed = goalInputSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const auth = await authorise(parsed.data.projectKey, "goal.create");
  if (!auth.ok) return auth.result;

  const { error } = await auth.supabase.from("goals").insert({
    project_id: auth.project.id,
    title: parsed.data.title,
    description: parsed.data.description,
    success_criteria: parsed.data.successCriteria,
    position: await nextPosition(auth.supabase, "goals", auth.project.id),
    created_by: auth.viewer.userId,
  });
  if (error) return dbFail(error, "goal.create_failed");
  return done(auth.project.key);
});

export const updateGoal = withAction("planning.updateGoal", async (input: unknown): Promise<ActionResult> => {
  const parsed = goalUpdateSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  // Marking a goal achieved is a manager's call; the enforce_goal_achieve trigger agrees.
  const action: Action = parsed.data.status === "achieved" ? "goal.achieve" : "goal.edit";
  const auth = await authorise(parsed.data.projectKey, action);
  if (!auth.ok) return auth.result;

  const patch: TablesUpdate<"goals"> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.successCriteria !== undefined) patch.success_criteria = parsed.data.successCriteria;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (Object.keys(patch).length === 0) return ok(undefined);

  const { error } = await auth.supabase
    .from("goals")
    .update(patch)
    .eq("id", parsed.data.goalId)
    .eq("project_id", auth.project.id);
  if (error) return dbFail(error, "goal.update_failed");
  return done(auth.project.key);
});

export const deleteGoal = withAction("planning.deleteGoal", async (input: unknown): Promise<ActionResult> => {
  const parsed = planningDeleteSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const auth = await authorise(parsed.data.projectKey, "goal.delete");
  if (!auth.ok) return auth.result;
  // MVP items keep existing; the foreign key sets their goal to null.
  const { error } = await auth.supabase
    .from("goals")
    .delete()
    .eq("id", parsed.data.id)
    .eq("project_id", auth.project.id);
  if (error) return dbFail(error, "goal.delete_failed");
  return done(auth.project.key);
});

// MVP items ------------------------------------------------------------------

export const createMvpItem = withAction("planning.createMvpItem", async (input: unknown): Promise<ActionResult> => {
  const parsed = mvpInputSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const auth = await authorise(parsed.data.projectKey, "mvp.create");
  if (!auth.ok) return auth.result;

  const { error } = await auth.supabase.from("mvp_items").insert({
    project_id: auth.project.id,
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority,
    goal_id: parsed.data.goalId,
    position: await nextPosition(auth.supabase, "mvp_items", auth.project.id),
    created_by: auth.viewer.userId,
  });
  if (error) return dbFail(error, "mvp.create_failed");
  return done(auth.project.key);
});

export const updateMvpItem = withAction("planning.updateMvpItem", async (input: unknown): Promise<ActionResult> => {
  const parsed = mvpUpdateSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const auth = await authorise(parsed.data.projectKey, "mvp.edit");
  if (!auth.ok) return auth.result;

  const patch: TablesUpdate<"mvp_items"> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.goalId !== undefined) patch.goal_id = parsed.data.goalId;
  if (Object.keys(patch).length === 0) return ok(undefined);

  const { error } = await auth.supabase
    .from("mvp_items")
    .update(patch)
    .eq("id", parsed.data.itemId)
    .eq("project_id", auth.project.id);
  if (error) return dbFail(error, "mvp.update_failed");
  return done(auth.project.key);
});

export const deleteMvpItem = withAction("planning.deleteMvpItem", async (input: unknown): Promise<ActionResult> => {
  const parsed = planningDeleteSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const auth = await authorise(parsed.data.projectKey, "mvp.delete");
  if (!auth.ok) return auth.result;
  const { error } = await auth.supabase
    .from("mvp_items")
    .delete()
    .eq("id", parsed.data.id)
    .eq("project_id", auth.project.id);
  if (error) return dbFail(error, "mvp.delete_failed");
  return done(auth.project.key);
});

// Milestones -----------------------------------------------------------------

export const createMilestone = withAction("planning.createMilestone", async (input: unknown): Promise<ActionResult> => {
  const parsed = milestoneInputSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const auth = await authorise(parsed.data.projectKey, "milestone.manage");
  if (!auth.ok) return auth.result;

  const { error } = await auth.supabase.from("milestones").insert({
    project_id: auth.project.id,
    title: parsed.data.title,
    due_date: parsed.data.dueDate,
    description: parsed.data.description,
    position: await nextPosition(auth.supabase, "milestones", auth.project.id),
    created_by: auth.viewer.userId,
  });
  if (error) return dbFail(error, "milestone.create_failed");
  logger.info("milestone.created", { key: auth.project.key });
  return done(auth.project.key);
});

export const updateMilestone = withAction("planning.updateMilestone", async (input: unknown): Promise<ActionResult> => {
  const parsed = milestoneUpdateSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const auth = await authorise(parsed.data.projectKey, "milestone.manage");
  if (!auth.ok) return auth.result;

  const patch: TablesUpdate<"milestones"> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.dueDate !== undefined) patch.due_date = parsed.data.dueDate;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.reached !== undefined) patch.completed_at = parsed.data.reached ? new Date().toISOString() : null;
  if (Object.keys(patch).length === 0) return ok(undefined);

  const { error } = await auth.supabase
    .from("milestones")
    .update(patch)
    .eq("id", parsed.data.milestoneId)
    .eq("project_id", auth.project.id);
  if (error) return dbFail(error, "milestone.update_failed");
  return done(auth.project.key);
});

export const deleteMilestone = withAction("planning.deleteMilestone", async (input: unknown): Promise<ActionResult> => {
  const parsed = planningDeleteSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const auth = await authorise(parsed.data.projectKey, "milestone.manage");
  if (!auth.ok) return auth.result;
  const { error } = await auth.supabase
    .from("milestones")
    .delete()
    .eq("id", parsed.data.id)
    .eq("project_id", auth.project.id);
  if (error) return dbFail(error, "milestone.delete_failed");
  return done(auth.project.key);
});

"use server";

import { revalidatePath } from "next/cache";

import { mapDbError } from "@/lib/actions/db-errors";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { validationFail } from "@/lib/actions/validation";
import { withAction } from "@/lib/actions/with-action";
import { requireViewer } from "@/lib/auth/context";
import { logger } from "@/lib/logger";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getProjectByKey, getProjectContext } from "@/features/projects/queries";

import type { TablesUpdate } from "@/types/database";

import { TASK_STATUSES, createTaskSchema, type TaskStatus } from "./schemas";

/**
 * Task actions (docs/features/tasks.md). Each checks `can()` before touching
 * the database; RLS and the assignee trigger are the backstop.
 */

/** Resolves the project and the caller's standing in it, or the failure to return. */
async function loadProject(projectKey: string) {
  const viewer = await requireViewer();
  const project = await getProjectByKey(viewer.organizationId, projectKey);
  if (project.error || !project.data)
    return { ok: false as const, result: fail("not_found", "That project does not exist.") };

  const ctx = await getProjectContext(
    { id: project.data.id, key: project.data.key, status: project.data.status, qa_required: project.data.qa_required },
    viewer,
  );
  return { ok: true as const, viewer, ctx, project: project.data };
}

/**
 * You may change a task if you manage the project, or if it is yours.
 *
 * Mirrors the tasks_update policy in 20260924090000_task_ownership.sql. The
 * policy is the enforcement; this exists so the refusal arrives as a sentence
 * rather than as an empty result from a row RLS quietly withheld.
 */
async function loadOwnTask(taskId: string, projectId: string, viewerUserId: string, canManage: boolean) {
  const supabase = await createClient();
  const existing = await supabase
    .from("tasks")
    .select("id, assignee_id, title")
    .eq("id", taskId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing.error || !existing.data)
    return { ok: false as const, result: fail("not_found", "That task does not exist.") };
  if (!canManage && existing.data.assignee_id !== viewerUserId)
    return {
      ok: false as const,
      result: fail("forbidden", "That task belongs to someone else. Only they or the project manager can change it."),
    };

  return { ok: true as const, supabase, task: existing.data };
}

export const createTask = withAction("tasks.create", async (input: unknown): Promise<ActionResult> => {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);

  const loaded = await loadProject(parsed.data.projectKey);
  if (!loaded.ok) return loaded.result;
  if (!can(loaded.viewer, "task.create", loaded.ctx)) return fail("forbidden", "You cannot add tasks to this project.");

  /*
   * Handing work to somebody else commits their time, so it needs authority
   * over the project. Adding work for yourself, or leaving it unassigned for a
   * manager to hand out, does not.
   */
  const assigningToSomeoneElse = parsed.data.assigneeId !== null && parsed.data.assigneeId !== loaded.viewer.userId;
  if (assigningToSomeoneElse && !can(loaded.viewer, "project.manage_members", loaded.ctx))
    return fail("forbidden", "Only the project manager can assign work to someone else.");

  const supabase = await createClient();

  /*
   * The per-project number behind MAL-42, from the counter the projects
   * migration already installed. It locks the row, so two people adding a task
   * at the same moment get different numbers rather than colliding on the
   * (project_id, seq) unique index.
   */
  const seq = await supabase.rpc("next_project_sequence", { project: loaded.project.id, kind: "task" });
  if (seq.error) {
    const mapped = mapDbError(seq.error);
    return fail(mapped.code, mapped.message);
  }

  const { error } = await supabase.from("tasks").insert({
    project_id: loaded.project.id,
    seq: seq.data as number,
    title: parsed.data.title,
    description: parsed.data.description,
    assignee_id: parsed.data.assigneeId,
    priority: parsed.data.priority,
    due_at: parsed.data.dueAt,
    created_by: loaded.viewer.userId,
  });

  if (error) {
    const mapped = mapDbError(error);
    logger.warn("task.create_failed", { code: error.code, mapped: mapped.code });
    return fail(mapped.code, mapped.message);
  }

  logger.info("task.created", { key: loaded.project.key, seq: seq.data });
  revalidatePath(`/os/projects/${loaded.project.key}`);
  revalidatePath("/os/my-tasks");
  return ok(undefined);
});

/** Reassigning and re-dating are the same edit; both are contributor-level. */
export const updateTask = withAction("tasks.update", async (input: unknown): Promise<ActionResult> => {
  const payload = input as {
    taskId?: unknown;
    projectKey?: unknown;
    assigneeId?: unknown;
    status?: unknown;
    dueAt?: unknown;
  };
  const taskId = typeof payload?.taskId === "string" ? payload.taskId : null;
  const projectKey = typeof payload?.projectKey === "string" ? payload.projectKey : null;
  if (!taskId || !projectKey) return fail("validation", "Unknown task.");

  const loaded = await loadProject(projectKey);
  if (!loaded.ok) return loaded.result;
  if (!can(loaded.viewer, "task.edit", loaded.ctx)) return fail("forbidden", "You cannot change tasks here.");

  const canManage = can(loaded.viewer, "project.manage_members", loaded.ctx);
  const owned = await loadOwnTask(taskId, loaded.project.id, loaded.viewer.userId, canManage);
  if (!owned.ok) return owned.result;

  // Reassigning is a manager act for the same reason assigning is: it moves
  // work onto someone who did not choose it.
  if (
    typeof payload.assigneeId === "string" &&
    payload.assigneeId !== "" &&
    payload.assigneeId !== loaded.viewer.userId &&
    !canManage
  )
    return fail("forbidden", "Only the project manager can hand this to someone else.");

  // Typed rather than Record<string, unknown>: the update builder rejects an
  // open index signature, and a typo in a column name should fail here.
  const patch: TablesUpdate<"tasks"> = {};
  if (typeof payload.assigneeId === "string") patch.assignee_id = payload.assigneeId === "" ? null : payload.assigneeId;
  if (typeof payload.status === "string") {
    const status = payload.status as TaskStatus;
    if (!TASK_STATUSES.includes(status)) return fail("validation", "Unknown status.");
    patch.status = status;
  }
  if (typeof payload.dueAt === "string") {
    patch.due_at = payload.dueAt === "" ? null : new Date(payload.dueAt).toISOString();
  }
  if (Object.keys(patch).length === 0) return ok(undefined);

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId).eq("project_id", loaded.project.id);
  if (error) {
    const mapped = mapDbError(error);
    return fail(mapped.code, mapped.message);
  }

  revalidatePath(`/os/projects/${loaded.project.key}`);
  revalidatePath("/os/my-tasks");
  return ok(undefined);
});

export const deleteTask = withAction("tasks.delete", async (input: unknown): Promise<ActionResult> => {
  const payload = input as { taskId?: unknown; projectKey?: unknown };
  const taskId = typeof payload?.taskId === "string" ? payload.taskId : null;
  const projectKey = typeof payload?.projectKey === "string" ? payload.projectKey : null;
  if (!taskId || !projectKey) return fail("validation", "Unknown task.");

  const loaded = await loadProject(projectKey);
  if (!loaded.ok) return loaded.result;
  if (!can(loaded.viewer, "task.delete", loaded.ctx))
    return fail("forbidden", "Only the project manager can delete a task.");

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("project_id", loaded.project.id);
  if (error) {
    const mapped = mapDbError(error);
    return fail(mapped.code, mapped.message);
  }

  revalidatePath(`/os/projects/${loaded.project.key}`);
  revalidatePath("/os/my-tasks");
  return ok(undefined);
});

/**
 * The assignee acknowledging a task: yes, I have seen this and I will do it.
 *
 * Only ever the assignee, even for a manager. A manager accepting on somebody
 * else's behalf would produce exactly the false reassurance the feature exists
 * to prevent — the "waiting to be picked up" list would empty without anybody
 * having picked anything up.
 *
 * Idempotent. Pressing Accept twice is a double-click, not a second decision,
 * and it must not move the timestamp.
 */
export const acceptTask = withAction("tasks.accept", async (input: unknown): Promise<ActionResult> => {
  const payload = input as { taskId?: unknown; projectKey?: unknown };
  const taskId = typeof payload?.taskId === "string" ? payload.taskId : null;
  const projectKey = typeof payload?.projectKey === "string" ? payload.projectKey : null;
  if (!taskId || !projectKey) return fail("validation", "Unknown task.");

  const loaded = await loadProject(projectKey);
  if (!loaded.ok) return loaded.result;

  const supabase = await createClient();
  const existing = await supabase
    .from("tasks")
    .select("id, assignee_id, accepted_at, title")
    .eq("id", taskId)
    .eq("project_id", loaded.project.id)
    .maybeSingle();
  if (existing.error || !existing.data) return fail("not_found", "That task does not exist.");

  if (existing.data.assignee_id !== loaded.viewer.userId)
    return fail("forbidden", "Only the person a task is assigned to can accept it.");

  if (existing.data.accepted_at) return ok(undefined);

  const { error } = await supabase
    .from("tasks")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("project_id", loaded.project.id);
  if (error) {
    const mapped = mapDbError(error);
    return fail(mapped.code, mapped.message);
  }

  logger.info("task.accepted", { key: loaded.project.key, seq: existing.data.id });
  revalidatePath(`/os/projects/${loaded.project.key}`);
  revalidatePath("/os/my-tasks");
  // The manager's notification is derived from accepted_at, so this is what
  // makes it appear rather than a second write that could disagree with it.
  revalidatePath("/os/notifications");
  return ok(undefined);
});

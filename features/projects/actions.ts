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
import type { ProjectRole, ProjectStatus } from "@/types/domain";

import { getProjectByKey, getProjectContext } from "./queries";
import { resolveClientByName } from "./clients";
import { readinessBlockers, readinessMessage } from "./readiness";
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
  /*
   * No `.select()` on the insert, deliberately.
   *
   * Reading the row back adds a RETURNING clause, and Postgres applies the
   * SELECT policy to returned rows. `projects_select` requires
   * `is_project_member(id) or is_org_admin(organization_id)`, and the creator's
   * membership row is written by the AFTER INSERT trigger `setup_new_project`,
   * which fires at the end of the statement — after RETURNING is projected. An
   * org admin passes on the second branch, but a plain member passes on
   * neither, so the read-back fails for exactly the people the feature is for.
   *
   * There is nothing to read back anyway: the key is the one we just sent, and
   * the schema has already upper-cased it.
   */
  // A job may name a client that does not exist yet; a project never has one.
  const client =
    parsed.data.kind === "job"
      ? await resolveClientByName(supabase, viewer.organizationId, viewer.userId, parsed.data.clientName)
      : ({ ok: true, clientId: null } as const);
  if (!client.ok) return fail("unexpected", client.message, { fieldErrors: { clientName: [client.message] } });

  const { error } = await supabase.from("projects").insert({
    organization_id: viewer.organizationId,
    key: parsed.data.key,
    name: parsed.data.name,
    kind: parsed.data.kind,
    description: parsed.data.description,
    client_id: client.clientId,
    priority: parsed.data.priority,
    start_date: parsed.data.startDate,
    target_end_date: parsed.data.targetEndDate,
    // W2: the creator manages the project unless they hand it over later.
    created_by: viewer.userId,
    manager_id: viewer.userId,
  });

  if (error) {
    const mapped = mapDbError(error);
    logger.warn("project.create.failed", { code: error.code, mapped: mapped.code });
    const fieldErrors = mapped.code === "conflict" ? { key: [mapped.message] } : undefined;
    return fail(mapped.code, mapped.message, fieldErrors ? { fieldErrors } : undefined);
  }

  logger.info("project.created", { key: parsed.data.key });
  revalidatePath("/os/projects");
  redirect(`/os/projects/${parsed.data.key}`);
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

  const client =
    parsed.data.kind === "job"
      ? await resolveClientByName(supabase, viewer.organizationId, viewer.userId, parsed.data.clientName)
      : ({ ok: true, clientId: null } as const);
  if (!client.ok) return fail("unexpected", client.message, { fieldErrors: { clientName: [client.message] } });

  const { error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      key: parsed.data.key,
      kind: parsed.data.kind,
      description: parsed.data.description,
      // Switching a job back to a project drops the client, which is what the
      // projects_client_only_on_jobs constraint requires.
      client_id: client.clientId,
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
      /*
       * One row each, not a count.
       *
       * `{ count: "exact", head: true }` sends a HEAD request and reads the
       * total out of the Content-Range header. When that header does not
       * survive the hop, supabase-js reports `count: null`, `?? 0` turns it
       * into zero, and the project is refused for missing the very goals it
       * has — the failure is silent and looks exactly like a rule violation.
       * Asking for one id is header-independent and no more expensive.
       */
      const [goals, mvpItems] = await Promise.all([
        supabase.from("goals").select("id").eq("project_id", projectId).limit(1),
        supabase.from("mvp_items").select("id").eq("project_id", projectId).limit(1),
      ]);
      if (goals.error || mvpItems.error) return fail("unexpected", "Could not check whether the project is ready.");

      const blockers = readinessBlockers({
        goalCount: goals.data.length,
        mvpCount: mvpItems.data.length,
        managerId: existing.data.manager_id,
        startDate: existing.data.start_date,
      });
      if (blockers.length > 0) return fail("invariant", readinessMessage(blockers));
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

/**
 * Project team (docs/product/user-roles.md#project-roles).
 *
 * Being an organisation member gets you an account; being a *project* member
 * gets you the project. `projects_select` shows a plain member only the
 * projects they are on, so until someone is assigned here they sign in to an
 * empty OS. Assignment is the moment access actually begins.
 *
 * Every one of these re-reads the project and checks `can()` against the
 * viewer's standing in it. RLS and the `member_must_be_in_org` trigger are the
 * backstop, not the gate.
 */
async function loadManageableProject(projectId: string) {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const existing = await supabase
    .from("projects")
    .select("id, key, status, qa_required, organization_id")
    .eq("id", projectId)
    .maybeSingle();
  if (existing.error || !existing.data)
    return { ok: false as const, result: fail("not_found", "That project does not exist.") };

  const ctx = await getProjectContext(existing.data, viewer);
  if (!can(viewer, "project.manage_members", ctx))
    return { ok: false as const, result: fail("forbidden", "Only the project manager can change the team.") };

  return { ok: true as const, viewer, supabase, project: existing.data };
}

const PROJECT_ROLES: readonly ProjectRole[] = ["manager", "developer", "designer", "qa", "marketer", "viewer"];

function readMemberInput(input: unknown): { projectId: string; userId: string; role: ProjectRole } | null {
  const payload = input as { projectId?: unknown; userId?: unknown; role?: unknown };
  const projectId = typeof payload?.projectId === "string" ? payload.projectId : null;
  const userId = typeof payload?.userId === "string" ? payload.userId : null;
  const role = typeof payload?.role === "string" ? payload.role : null;
  if (!projectId || !userId || !role) return null;
  if (!PROJECT_ROLES.includes(role as ProjectRole)) return null;
  return { projectId, userId, role: role as ProjectRole };
}

export const assignProjectMember = withAction(
  "projects.assignMember",
  async (input: unknown): Promise<ActionResult> => {
    const parsed = readMemberInput(input);
    if (!parsed) return fail("validation", "Choose a person and a role.");

    const loaded = await loadManageableProject(parsed.projectId);
    if (!loaded.ok) return loaded.result;

    const { error } = await loaded.supabase.from("project_members").insert({
      project_id: parsed.projectId,
      user_id: parsed.userId,
      role: parsed.role,
      added_by: loaded.viewer.userId,
    });
    if (error) {
      const mapped = mapDbError(error);
      logger.warn("project.assign_member_failed", { code: error.code, mapped: mapped.code });
      return fail(mapped.code, mapped.message);
    }

    logger.info("project.member_assigned", { key: loaded.project.key, role: parsed.role });
    revalidatePath(`/os/projects/${loaded.project.key}`);
    return ok(undefined);
  },
);

export const changeProjectMemberRole = withAction(
  "projects.changeMemberRole",
  async (input: unknown): Promise<ActionResult> => {
    const parsed = readMemberInput(input);
    if (!parsed) return fail("validation", "Choose a person and a role.");

    const loaded = await loadManageableProject(parsed.projectId);
    if (!loaded.ok) return loaded.result;

    const { error } = await loaded.supabase
      .from("project_members")
      .update({ role: parsed.role })
      .eq("project_id", parsed.projectId)
      .eq("user_id", parsed.userId);
    if (error) {
      const mapped = mapDbError(error);
      return fail(mapped.code, mapped.message);
    }

    revalidatePath(`/os/projects/${loaded.project.key}`);
    return ok(undefined);
  },
);

export const removeProjectMember = withAction(
  "projects.removeMember",
  async (input: unknown): Promise<ActionResult> => {
    const payload = input as { projectId?: unknown; userId?: unknown };
    const projectId = typeof payload?.projectId === "string" ? payload.projectId : null;
    const userId = typeof payload?.userId === "string" ? payload.userId : null;
    if (!projectId || !userId) return fail("validation", "Unknown person.");

    const loaded = await loadManageableProject(projectId);
    if (!loaded.ok) return loaded.result;

    /*
     * Removing the last manager would leave a project nobody can administer —
     * and the person doing it could be removing themselves. Refuse here rather
     * than let it happen and require a database fix.
     */
    const managers = await loaded.supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("role", "manager");
    const managerIds = (managers.data ?? []).map((row) => row.user_id);
    if (managerIds.length === 1 && managerIds[0] === userId)
      return fail("invariant", "This is the project's only manager. Make someone else a manager first.");

    const { error } = await loaded.supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);
    if (error) {
      const mapped = mapDbError(error);
      return fail(mapped.code, mapped.message);
    }

    logger.info("project.member_removed", { key: loaded.project.key });
    revalidatePath(`/os/projects/${loaded.project.key}`);
    return ok(undefined);
  },
);

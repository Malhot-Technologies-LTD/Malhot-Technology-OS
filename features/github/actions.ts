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
import type { ProjectStatus } from "@/types/domain";

import { getProjectContext } from "@/features/projects/queries";
import { connectRepositorySchema, disconnectRepositorySchema, repoHtmlUrl } from "./schemas";

/**
 * Repository actions. Each checks `can()` before touching the database and
 * relies on RLS as the backstop — `github_repositories_insert` and `_delete`
 * both require can_manage_project, so a forged project id fails twice.
 */

/** Just enough of a project to build a ProjectContext for `can()`. */
type ProjectRef = { id: string; key: string; status: ProjectStatus; qa_required: boolean };

export const connectRepository = withAction("github.connect", async (input: unknown): Promise<ActionResult> => {
  const parsed = connectRepositorySchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const viewer = await requireViewer();

  const supabase = await createClient();
  const project = await supabase
    .from("projects")
    .select("id, key, status, qa_required")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (project.error || !project.data) return fail("not_found", "That project does not exist.");

  const ctx = await getProjectContext(project.data, viewer);
  if (!can(viewer, "github.connect", ctx))
    return fail("forbidden", "Only the project manager can connect a repository.");

  const { error } = await supabase.from("github_repositories").insert({
    project_id: project.data.id,
    full_name: parsed.data.repository,
    html_url: repoHtmlUrl(parsed.data.repository),
    created_by: viewer.userId,
  });

  if (error) {
    const mapped = mapDbError(error);
    logger.warn("github.connect.failed", { code: error.code, mapped: mapped.code });
    // The only field on the form, so a conflict belongs against it rather than
    // in a banner that leaves the input looking accepted.
    return fail(mapped.code, mapped.message, { fieldErrors: { repository: [mapped.message] } });
  }

  logger.info("github.connected", { key: project.data.key, repository: parsed.data.repository });
  revalidatePath(`/os/projects/${project.data.key}`);
  return ok(undefined);
});

/**
 * Disconnect, not delete.
 *
 * This removes the OS's record that a project points at a repository. It does
 * not touch anything on github.com, and it cannot: nothing here holds a GitHub
 * credential, and the App designed in integrations.md is read-only by intent.
 * Worth being exact about, because "delete" next to a repository name reads to
 * most people like the repository is what gets deleted.
 */
export const disconnectRepository = withAction("github.disconnect", async (input: unknown): Promise<ActionResult> => {
  const parsed = disconnectRepositorySchema.safeParse(input);
  if (!parsed.success) return validationFail(parsed.error);
  const viewer = await requireViewer();

  const supabase = await createClient();
  /*
   * The project is read through the row rather than trusted from the caller:
   * the id in the request says which connection to remove, and the project it
   * belongs to is the database's answer, not the browser's.
   */
  const existing = await supabase
    .from("github_repositories")
    .select("id, full_name, project:projects!github_repositories_project_id_fkey(id, key, status, qa_required)")
    .eq("id", parsed.data.repositoryId)
    .maybeSingle<{ id: string; full_name: string; project: ProjectRef | null }>();
  if (existing.error || !existing.data?.project)
    return fail("not_found", "That repository is not connected to anything.");

  const ctx = await getProjectContext(existing.data.project, viewer);
  if (!can(viewer, "github.disconnect", ctx))
    return fail("forbidden", "Only the project manager can disconnect a repository.");

  const { error } = await supabase.from("github_repositories").delete().eq("id", parsed.data.repositoryId);
  if (error) {
    const mapped = mapDbError(error);
    logger.warn("github.disconnect.failed", { code: error.code, mapped: mapped.code });
    return fail(mapped.code, mapped.message);
  }

  logger.info("github.disconnected", {
    key: existing.data.project.key,
    repository: existing.data.full_name,
  });
  revalidatePath(`/os/projects/${existing.data.project.key}`);
  return ok(undefined);
});

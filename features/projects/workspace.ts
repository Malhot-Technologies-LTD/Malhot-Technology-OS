import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import { cache } from "react";

import { listProjectTasks } from "@/features/tasks/queries";
import { requireViewer, type Viewer } from "@/lib/auth/context";
import { requestTime } from "@/lib/request-time";
import { can, type ProjectContext } from "@/lib/permissions";

import {
  getProjectByKey,
  getProjectContext,
  getProjectPlanning,
  listProjectMembers,
  type ProjectDetail,
} from "./queries";

/**
 * What every page inside a project needs first: the viewer, the project, their
 * standing in it, and what that standing lets them do.
 *
 * Wrapped in `cache` so the layout and the page share one read per request.
 * The layout renders the error or no-access state; a page that gets a non-`ok`
 * result simply renders nothing, because its output is never shown.
 */
export type Workspace = {
  kind: "ok";
  viewer: Viewer;
  project: ProjectDetail;
  ctx: ProjectContext;
  perms: WorkspacePermissions;
  /** The instant every figure on the page is computed against, read once per request. */
  now: number;
};

export type WorkspacePermissions = {
  /** Archived projects are read-only to everyone but org admins. */
  writable: boolean;
  editProject: boolean;
  changeStatus: boolean;
  manageTeam: boolean;
  createTask: boolean;
  deleteTask: boolean;
  contribute: boolean;
  manageMilestones: boolean;
  deletePlanning: boolean;
  uploadDocument: boolean;
  /** Connect or disconnect the repository this project's code lives in. */
  connectRepo: boolean;
};

export type WorkspaceResult =
  Workspace | { kind: "error"; viewer: Viewer; error: PostgrestError } | { kind: "missing"; viewer: Viewer };

export const loadWorkspace = cache(async (key: string): Promise<WorkspaceResult> => {
  const viewer = await requireViewer();
  const { data: project, error } = await getProjectByKey(viewer.organizationId, key);
  if (error) return { kind: "error", viewer, error };
  if (!project) return { kind: "missing", viewer };

  const ctx = await getProjectContext(project, viewer);
  const writable = project.status !== "archived" || viewer.orgRole !== "member";
  const perms: WorkspacePermissions = {
    writable,
    editProject: can(viewer, "project.edit", ctx) && writable,
    changeStatus: can(viewer, "project.change_status", ctx),
    manageTeam: can(viewer, "project.manage_members", ctx) && writable,
    createTask: can(viewer, "task.create", ctx) && writable,
    deleteTask: can(viewer, "task.delete", ctx) && writable,
    contribute: can(viewer, "goal.create", ctx) && writable,
    manageMilestones: can(viewer, "milestone.manage", ctx) && writable,
    deletePlanning: can(viewer, "goal.delete", ctx) && writable,
    uploadDocument: can(viewer, "document.create", ctx) && writable,
    connectRepo: can(viewer, "github.connect", ctx) && writable,
  };
  return { kind: "ok", viewer, project, ctx, perms, now: requestTime() };
});

/** Per-request memoised reads, so a layout and its page never ask twice. */
export const loadTasks = cache((projectId: string) => listProjectTasks(projectId));
export const loadPlanning = cache((projectId: string) => getProjectPlanning(projectId));
export const loadMembers = cache((projectId: string) => listProjectMembers(projectId));

/** The team as the pickers want it. */
export function toAssignable(members: Awaited<ReturnType<typeof listProjectMembers>>["data"]) {
  return (members ?? []).map((member) => ({
    userId: member.user_id,
    fullName: member.profile?.full_name ?? "Unnamed",
    avatarUrl: member.profile?.avatar_url ?? null,
  }));
}

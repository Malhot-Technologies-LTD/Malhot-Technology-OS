/**
 * The permission matrix, in code (docs/product/user-roles.md#permission-matrix).
 *
 * Pure and dependency-free on purpose: the UI calls it to avoid offering actions
 * that would fail, and Server Actions call the same function to reject them.
 * Neither is security — Postgres RLS and triggers are the backstop
 * (docs/architecture/authorization.md#principle-three-layers-that-must-agree).
 *
 * `permissions.test.ts` enumerates the matrix row by row. If the matrix in the
 * docs changes, the tests fail until both are updated.
 */
import type { OrgRole, ProjectRole, ProjectStatus } from "@/types/domain";

export type PermissionGroup = "admin" | "manager" | "contributor" | "qa" | "viewer" | "none";

/** The slice of the viewer this module needs; `Viewer` from lib/auth/context satisfies it. */
export type PermissionViewer = {
  userId: string;
  organizationId: string;
  orgRole: OrgRole;
};

export type ProjectContext = {
  projectId: string;
  key: string;
  status: ProjectStatus;
  qaRequired: boolean;
  /** null when the viewer has no membership row (org admins still get a group). */
  role: ProjectRole | null;
  group: PermissionGroup;
};

/** Per-row facts the few contextual rules need. Absent facts fail closed. */
export type ResourceFacts = {
  /** Comment author, attachment uploader, task creator, document author. */
  ownerId?: string;
  documentStatus?: "draft" | "in_review" | "approved" | "archived";
  documentType?: string;
  taskHasChildrenOrDependents?: boolean;
  bugReporterId?: string;
  bugAssigneeId?: string;
};

export type Action =
  | "project.create"
  | "project.edit"
  | "project.change_status"
  | "project.override_health"
  | "project.manage_members"
  | "project.archive"
  | "project.delete"
  | "goal.create"
  | "goal.edit"
  | "goal.delete"
  | "goal.achieve"
  | "mvp.create"
  | "mvp.edit"
  | "mvp.delete"
  | "milestone.manage"
  | "task.create"
  | "task.edit"
  | "task.assign"
  | "task.change_status"
  | "task.complete"
  | "task.delete"
  | "comment.create"
  | "comment.edit"
  | "comment.delete"
  | "attachment.create"
  | "attachment.delete"
  | "test_case.create"
  | "test_case.edit"
  | "test_case.delete"
  | "test_run.create"
  | "test_run.record"
  | "bug.create"
  | "bug.edit"
  | "bug.transition"
  | "bug.verify"
  | "bug.delete"
  | "document.view"
  | "document.create"
  | "document.edit"
  | "document.submit"
  | "document.approve"
  | "document.return"
  | "document.archive"
  | "document.delete"
  | "github.connect"
  | "github.sync"
  | "github.link"
  | "deployment.record"
  | "org.manage"
  | "org.invite"
  | "org.integrations"
  | "org.reports"
  | "org.inquiries";

const ORG_ACTIONS = new Set<Action>([
  "project.create",
  "org.manage",
  "org.invite",
  "org.integrations",
  "org.reports",
  "org.inquiries",
]);

/** Everything that writes. Archived projects are read-only unless you are an org admin. */
const READ_ONLY_ACTIONS = new Set<Action>(["document.view"]);

/**
 * Effective group for a viewer in a project. Org owner/admin outrank any project
 * role and need no membership row; mirrors SQL `project_group_of()`.
 */
export function groupFor(orgRole: OrgRole, projectRole: ProjectRole | null): PermissionGroup {
  if (orgRole === "owner" || orgRole === "admin") return "admin";
  switch (projectRole) {
    case "manager":
      return "manager";
    case "developer":
    case "designer":
    case "marketer":
      return "contributor";
    case "qa":
      return "qa";
    case "viewer":
      return "viewer";
    default:
      return "none";
  }
}

const isOrgAdmin = (viewer: PermissionViewer) => viewer.orgRole === "owner" || viewer.orgRole === "admin";
const isManager = (group: PermissionGroup) => group === "admin" || group === "manager";
const isContributor = (group: PermissionGroup) =>
  group === "admin" || group === "manager" || group === "contributor" || group === "qa";
const hasTestingAuthority = (group: PermissionGroup) => group === "admin" || group === "manager" || group === "qa";

/**
 * May `viewer` perform `action`? `ctx` is the project the action happens in, or
 * null for organisation-level actions. `resource` carries per-row facts; when a
 * rule needs one that is missing, the answer is no.
 */
export function can(
  viewer: PermissionViewer,
  action: Action,
  ctx: ProjectContext | null = null,
  resource: ResourceFacts = {},
): boolean {
  if (ORG_ACTIONS.has(action)) return canOrgAction(viewer, action);
  if (!ctx) return false;

  const { group } = ctx;
  if (group === "none") return false;

  // Archived projects are read-only; org admins may still correct them.
  if (!READ_ONLY_ACTIONS.has(action) && ctx.status === "archived" && !isOrgAdmin(viewer)) return false;

  const owns = (id: string | undefined) => id !== undefined && id === viewer.userId;

  switch (action) {
    // Projects
    case "project.edit":
    case "project.change_status":
    case "project.override_health":
    case "project.manage_members":
    case "project.archive":
      return isManager(group);
    case "project.delete":
      return isOrgAdmin(viewer);

    // Goals, MVP, milestones
    case "goal.create":
    case "goal.edit":
    case "mvp.create":
    case "mvp.edit":
      return isContributor(group);
    case "goal.delete":
    case "goal.achieve":
    case "mvp.delete":
    case "milestone.manage":
      return isManager(group);

    // Tasks
    case "task.create":
    case "task.edit":
    case "task.assign":
    case "task.change_status":
      return isContributor(group);
    case "task.complete":
      // Into `done` from `testing`: QA signs off when the project requires QA.
      return ctx.qaRequired ? hasTestingAuthority(group) : isContributor(group);
    case "task.delete":
      if (isManager(group)) return true;
      return isContributor(group) && owns(resource.ownerId) && resource.taskHasChildrenOrDependents === false;

    // Comments and attachments
    case "comment.create":
    case "attachment.create":
      return isContributor(group);
    case "comment.edit":
      // Even a manager does not rewrite someone else's words.
      return isContributor(group) && owns(resource.ownerId);
    case "comment.delete":
      return isManager(group) || (isContributor(group) && owns(resource.ownerId));
    case "attachment.delete":
      return isManager(group) || (isContributor(group) && owns(resource.ownerId));

    // Testing
    case "test_case.create":
    case "test_case.edit":
      return isContributor(group);
    case "test_case.delete":
      return hasTestingAuthority(group);
    case "test_run.create":
    case "test_run.record":
      return hasTestingAuthority(group);
    case "bug.create":
      return isContributor(group);
    case "bug.edit":
      return (
        hasTestingAuthority(group) ||
        (isContributor(group) && (owns(resource.bugReporterId) || owns(resource.bugAssigneeId)))
      );
    case "bug.transition":
      return hasTestingAuthority(group) || (isContributor(group) && owns(resource.bugAssigneeId));
    case "bug.verify":
      return hasTestingAuthority(group);
    case "bug.delete":
      return isManager(group);

    // Documents
    case "document.view":
      return group !== "viewer" || resource.documentStatus === "approved";
    case "document.create":
      return isContributor(group);
    case "document.edit":
      if (resource.documentStatus === "approved" || resource.documentStatus === "archived") return false;
      if (isManager(group)) return true;
      if (!isContributor(group)) return false;
      return resource.documentStatus === "draft" || owns(resource.ownerId);
    case "document.submit":
      return isManager(group) || (isContributor(group) && owns(resource.ownerId));
    case "document.approve":
      if (isManager(group)) return true;
      return group === "qa" && resource.documentType === "testing_report";
    case "document.return":
    case "document.archive":
    case "document.delete":
      return isManager(group);

    // GitHub and deployments
    case "github.connect":
      return isManager(group);
    case "github.sync":
    case "github.link":
      return isContributor(group);
    case "deployment.record":
      return isManager(group) || group === "contributor";

    default:
      return false;
  }
}

function canOrgAction(viewer: PermissionViewer, action: Action): boolean {
  switch (action) {
    case "project.create":
      /*
       * Organisation admins only. It used to be open to any member, which put
       * "New project" in a developer's sidebar beside the work they were
       * actually assigned. A project is a commitment the company makes, and the
       * creator becomes its manager — not a decision that belongs to whoever
       * happens to be looking at the screen.
       *
       * Matched by the projects_insert policy in
       * 20260923140000_tasks_and_create_policy.sql; the two must agree.
       */
      return viewer.orgRole === "owner" || viewer.orgRole === "admin";
    case "org.manage":
    case "org.invite":
    case "org.integrations":
    case "org.reports":
    case "org.inquiries":
      return isOrgAdmin(viewer);
    default:
      return false;
  }
}

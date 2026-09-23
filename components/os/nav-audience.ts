import type { OrgRole, ProjectRole } from "@/types/domain";

/**
 * Who is looking, in the only terms navigation cares about
 * (docs/product/user-roles.md#permission-matrix).
 *
 * Two facts decide what belongs in someone's sidebar: their organisation role,
 * and the project roles they hold anywhere. A `member` with no project is not
 * the same person as a `member` who runs two — the first has nothing to read on
 * six of the nine sections, and showing them anyway teaches that most of the
 * product is empty.
 */
export type NavAudience = {
  orgRole: OrgRole;
  /** Every project role this person holds, across all their projects. */
  projectRoles: readonly ProjectRole[];
};

export function isOrgAdmin(audience: NavAudience): boolean {
  return audience.orgRole === "owner" || audience.orgRole === "admin";
}

/** On at least one project in any capacity. Org admins reach every project. */
export function hasAnyProject(audience: NavAudience): boolean {
  return isOrgAdmin(audience) || audience.projectRoles.length > 0;
}

/**
 * Holds a role that does more than read. A person whose only role anywhere is
 * `viewer` is a stakeholder watching, and the matrix gives them a dash on the
 * team page and the activity feed.
 */
export function contributesSomewhere(audience: NavAudience): boolean {
  return isOrgAdmin(audience) || audience.projectRoles.some((role) => role !== "viewer");
}

/** Signs off or oversees testing: QA authority, or a manager watching the queue. */
export function ownsTesting(audience: NavAudience): boolean {
  return isOrgAdmin(audience) || audience.projectRoles.some((role) => role === "qa" || role === "manager");
}

/**
 * Visibility rules, one per section, quoting the capability matrix they come
 * from. Hiding a section is a courtesy, never a control: every page still
 * checks its own permissions, and RLS decides what any query returns.
 */
export const NAV_VISIBILITY: Record<string, { test: (audience: NavAudience) => boolean; because: string }> = {
  // Everyone has a home, a project list and their own work — even on day one
  // with nothing assigned, because that is where "nothing yet" is explained.
  "/os": { test: () => true, because: "Everyone" },
  "/os/projects": { test: () => true, because: "Any member may create a project" },
  "/os/my-tasks": { test: () => true, because: "Everyone has their own queue" },

  // Scoped read views: meaningless with no project behind them.
  "/os/timeline": { test: hasAnyProject, because: "Reads from projects you are on" },
  "/os/documents": { test: hasAnyProject, because: "Reads from projects you are on" },
  "/os/reports": { test: hasAnyProject, because: "Reports for their projects (user-roles.md)" },

  // "View team page" / "View organisation activity": Viewer is a dash.
  "/os/team": { test: contributesSomewhere, because: "Viewer has no team page (user-roles.md)" },
  "/os/activity": { test: contributesSomewhere, because: "Viewer has no activity feed (user-roles.md)" },

  // Testing authority sits with QA, and with managers who chase the queue.
  "/os/testing": { test: ownsTesting, because: "QA signs off; managers oversee" },
};

export function canSeeSection(href: string, audience: NavAudience): boolean {
  return NAV_VISIBILITY[href]?.test(audience) ?? true;
}

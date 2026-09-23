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

/**
 * Oversees other people's work rather than only doing their own.
 *
 * The line every sidebar rule now turns on: is this page here to run the
 * company, or to get your job done? A developer needs the projects they are on
 * and the work inside them; the team directory, the reports and the
 * organisation activity feed all exist to watch people, and watching is a
 * manager's job. Org admins qualify everywhere, managers qualify because they
 * answer for a project's delivery.
 */
export function oversees(audience: NavAudience): boolean {
  return isOrgAdmin(audience) || audience.projectRoles.includes("manager");
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
  "/os/projects": { test: () => true, because: "Everyone can see the projects they are on" },
  "/os/my-tasks": { test: () => true, because: "Everyone has their own queue" },

  // Doing your own work: needs a project behind it, nothing more.
  "/os/timeline": { test: hasAnyProject, because: "The schedule of projects you are on" },
  "/os/documents": { test: hasAnyProject, because: "The documents of projects you are on" },

  // Overseeing other people's: a manager's job, not a contributor's.
  "/os/team": { test: oversees, because: "A directory of people you manage" },
  "/os/reports": { test: oversees, because: "How the company is doing, not how you are" },
  "/os/activity": { test: oversees, because: "Watching what everyone did" },

  // Testing authority sits with QA, and with managers who chase the queue.
  "/os/testing": { test: ownsTesting, because: "QA signs off; managers oversee" },
};

export function canSeeSection(href: string, audience: NavAudience): boolean {
  return NAV_VISIBILITY[href]?.test(audience) ?? true;
}

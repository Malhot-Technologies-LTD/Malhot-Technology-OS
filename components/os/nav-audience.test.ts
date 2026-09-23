import { describe, expect, it } from "vitest";

import { PRIMARY_NAV, visibleGroups, visibleNavItems } from "./nav";
import { canSeeSection, contributesSomewhere, hasAnyProject, ownsTesting, type NavAudience } from "./nav-audience";

const audience = (orgRole: NavAudience["orgRole"], ...projectRoles: NavAudience["projectRoles"]): NavAudience => ({
  orgRole,
  projectRoles,
});

const OWNER = audience("owner");
const ADMIN = audience("admin");
const NEWCOMER = audience("member"); // approved, on no project yet
const DEVELOPER = audience("member", "developer");
const DESIGNER = audience("member", "designer");
const QA = audience("member", "qa");
const MANAGER = audience("member", "manager");
const WATCHER = audience("member", "viewer"); // stakeholder, read-only everywhere

const hrefs = (items: { href: string }[]) => items.map((item) => item.href);

describe("who counts as what", () => {
  it("treats org admins as reaching every project without holding a role", () => {
    for (const person of [OWNER, ADMIN]) {
      expect(hasAnyProject(person)).toBe(true);
      expect(contributesSomewhere(person)).toBe(true);
      expect(ownsTesting(person)).toBe(true);
    }
  });

  it("separates a member on no project from one on a project", () => {
    expect(hasAnyProject(NEWCOMER)).toBe(false);
    expect(hasAnyProject(DEVELOPER)).toBe(true);
  });

  it("treats a viewer-only member as not contributing", () => {
    // docs/product/user-roles.md gives Viewer a dash on team and activity.
    expect(contributesSomewhere(WATCHER)).toBe(false);
    expect(contributesSomewhere(DESIGNER)).toBe(true);
  });

  it("counts someone who is a viewer somewhere and a designer elsewhere", () => {
    expect(contributesSomewhere(audience("member", "viewer", "designer"))).toBe(true);
  });

  it("gives testing to QA and managers only", () => {
    expect(ownsTesting(QA)).toBe(true);
    expect(ownsTesting(MANAGER)).toBe(true);
    expect(ownsTesting(DEVELOPER)).toBe(false);
    expect(ownsTesting(DESIGNER)).toBe(false);
  });
});

describe("what each person sees in the sidebar", () => {
  it("shows an owner everything", () => {
    expect(hrefs(visibleNavItems(OWNER))).toEqual(hrefs([...PRIMARY_NAV]));
  });

  it("shows a newly approved member only what is not empty", () => {
    // The point of the change: six of nine sections have nothing behind them
    // for someone on no project, and showing them teaches that the product is
    // mostly empty.
    expect(hrefs(visibleNavItems(NEWCOMER))).toEqual(["/os", "/os/projects", "/os/my-tasks"]);
  });

  it("opens the scoped read views once a member is on a project", () => {
    const seen = hrefs(visibleNavItems(DESIGNER));
    expect(seen).toContain("/os/timeline");
    expect(seen).toContain("/os/documents");
    expect(seen).toContain("/os/reports");
    expect(seen).toContain("/os/team");
    expect(seen).toContain("/os/activity");
  });

  it("keeps testing out of a designer's sidebar but not a QA's", () => {
    expect(hrefs(visibleNavItems(DESIGNER))).not.toContain("/os/testing");
    expect(hrefs(visibleNavItems(QA))).toContain("/os/testing");
  });

  it("gives a viewer-only member no team, activity or testing", () => {
    const seen = hrefs(visibleNavItems(WATCHER));
    expect(seen).not.toContain("/os/team");
    expect(seen).not.toContain("/os/activity");
    expect(seen).not.toContain("/os/testing");
    // They still read the work they were invited to watch.
    expect(seen).toContain("/os/projects");
    expect(seen).toContain("/os/timeline");
  });

  it("never hides home, projects or my tasks from anyone", () => {
    for (const person of [OWNER, ADMIN, NEWCOMER, DEVELOPER, DESIGNER, QA, MANAGER, WATCHER]) {
      for (const href of ["/os", "/os/projects", "/os/my-tasks"]) {
        expect(canSeeSection(href, person), `${person.orgRole}/${person.projectRoles} ${href}`).toBe(true);
      }
    }
  });

  it("drops a group entirely when nothing in it survives", () => {
    const groups = visibleGroups(NEWCOMER);
    expect(groups.every((group) => group.items.length > 0)).toBe(true);
    // Quality is Documents + Testing; a newcomer has neither.
    expect(groups.map((group) => group.label)).not.toContain("Quality");
  });

  it("leaves an unknown href visible rather than silently hiding it", () => {
    // A new section must be opted into hiding, not accidentally disappear.
    expect(canSeeSection("/os/brand-new-thing", WATCHER)).toBe(true);
  });
});

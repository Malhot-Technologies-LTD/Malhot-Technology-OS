import { describe, expect, it } from "vitest";

import { PRIMARY_NAV, visibleGroups, visibleNavItems } from "./nav";
import {
  NAV_VISIBILITY,
  canSeeSection,
  contributesSomewhere,
  hasAnyProject,
  oversees,
  ownsTesting,
  type NavAudience,
} from "./nav-audience";

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
      expect(oversees(person)).toBe(true);
      expect(ownsTesting(person)).toBe(true);
    }
  });

  it("separates a member on no project from one on a project", () => {
    expect(hasAnyProject(NEWCOMER)).toBe(false);
    expect(hasAnyProject(DEVELOPER)).toBe(true);
  });

  it("treats a viewer-only member as not contributing", () => {
    expect(contributesSomewhere(WATCHER)).toBe(false);
    expect(contributesSomewhere(DESIGNER)).toBe(true);
  });

  it("counts someone who is a viewer somewhere and a designer elsewhere", () => {
    expect(contributesSomewhere(audience("member", "viewer", "designer"))).toBe(true);
  });

  it("separates doing your own work from overseeing other people's", () => {
    // The line the sidebar now turns on.
    expect(oversees(MANAGER)).toBe(true);
    expect(oversees(DEVELOPER)).toBe(false);
    expect(oversees(DESIGNER)).toBe(false);
    expect(oversees(QA)).toBe(false);
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
    expect(hrefs(visibleNavItems(NEWCOMER))).toEqual(["/os", "/os/projects", "/os/my-tasks"]);
  });

  it("opens the work views once a member is on a project", () => {
    const seen = hrefs(visibleNavItems(DESIGNER));
    expect(seen).toContain("/os/timeline");
    expect(seen).toContain("/os/documents");
  });

  it("keeps the oversight pages out of a contributor's sidebar", () => {
    // Team, Reports and Activity exist to watch people. A designer needs the
    // work they were given, not a directory of who else is on what.
    for (const person of [DESIGNER, DEVELOPER, QA]) {
      const seen = hrefs(visibleNavItems(person));
      const who = person.projectRoles.join("+");
      expect(seen, who).not.toContain("/os/team");
      expect(seen, who).not.toContain("/os/reports");
      expect(seen, who).not.toContain("/os/activity");
    }
  });

  it("gives the oversight pages to managers and org admins", () => {
    for (const person of [MANAGER, ADMIN, OWNER]) {
      const seen = hrefs(visibleNavItems(person));
      expect(seen).toContain("/os/team");
      expect(seen).toContain("/os/reports");
      expect(seen).toContain("/os/activity");
    }
  });

  it("keeps testing out of a designer's sidebar but not a QA's", () => {
    expect(hrefs(visibleNavItems(DESIGNER))).not.toContain("/os/testing");
    expect(hrefs(visibleNavItems(QA))).toContain("/os/testing");
  });

  it("leaves a viewer-only member with just the work they were invited to watch", () => {
    const seen = hrefs(visibleNavItems(WATCHER));
    expect(seen).not.toContain("/os/team");
    expect(seen).not.toContain("/os/activity");
    expect(seen).not.toContain("/os/reports");
    expect(seen).not.toContain("/os/testing");
    expect(seen).toContain("/os/projects");
    expect(seen).toContain("/os/timeline");
  });

  it("never hides home, projects or my tasks from anyone", () => {
    for (const person of [OWNER, ADMIN, NEWCOMER, DEVELOPER, DESIGNER, QA, MANAGER, WATCHER]) {
      for (const href of ["/os", "/os/projects", "/os/my-tasks"]) {
        expect(canSeeSection(href, person), `${person.orgRole} ${href}`).toBe(true);
      }
    }
  });

  it("drops a group entirely when nothing in it survives", () => {
    const groups = visibleGroups(NEWCOMER);
    expect(groups.every((group) => group.items.length > 0)).toBe(true);
    // Quality is Documents + Testing; a newcomer has neither. Company is Team,
    // Reports and Activity; a newcomer oversees nothing.
    expect(groups.map((group) => group.label)).not.toContain("Quality");
    expect(groups.map((group) => group.label)).not.toContain("Company");
  });

  it("leaves an unknown href visible rather than silently hiding it", () => {
    expect(canSeeSection("/os/brand-new-thing", WATCHER)).toBe(true);
  });

  it("has an explicit, reasoned rule for every section that ships", () => {
    /*
     * The default for an unknown href is "visible", which is the right default
     * for a section nobody has thought about yet — but not for one already in
     * the sidebar. Adding a section should mean deciding who it is for, and
     * writing down why, rather than defaulting into everyone's nav.
     */
    for (const item of PRIMARY_NAV) {
      const rule = NAV_VISIBILITY[item.href];
      expect(rule, item.href).toBeDefined();
      expect(rule.because.length, item.href).toBeGreaterThan(0);
    }
  });
});

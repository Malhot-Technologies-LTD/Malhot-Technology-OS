import { describe, expect, it } from "vitest";

import { GROUP_HREFS, NAV_GROUPS, PLANNED_SECTIONS, PRIMARY_NAV, SETTINGS_CHILDREN, visibleChildren } from "./nav";

/**
 * These assertions are the reason `nav.ts` has no module-level `throw`.
 *
 * `/os/[section]` imports that module, and Next evaluates it inside a render
 * worker while enumerating the segment. A throw there kills the worker process
 * and reports "Jest worker encountered N child process exceptions", naming
 * neither the file nor the bad value. Group resolution is therefore total, and
 * the guarantee is enforced here — where a mistake fails by name.
 */
describe("navigation groups", () => {
  it("resolves every grouped href against PRIMARY_NAV", () => {
    const known = new Set(PRIMARY_NAV.map((item) => item.href));
    const unresolved = GROUP_HREFS.flatMap((group) => group.hrefs).filter((href) => !known.has(href));
    expect(unresolved).toEqual([]);
  });

  it("groups every primary destination exactly once", () => {
    const grouped = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href));
    expect([...grouped].sort()).toEqual([...PRIMARY_NAV.map((item) => item.href)].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it("keeps the order declared in GROUP_HREFS, not PRIMARY_NAV's", () => {
    for (const [index, group] of NAV_GROUPS.entries()) {
      expect(group.items.map((item) => item.href)).toEqual([...GROUP_HREFS[index].hrefs]);
    }
  });
});

describe("planned sections", () => {
  it("only lists sections that have no real page yet", () => {
    // Home and Projects ship today; a placeholder for either would shadow them.
    expect(PLANNED_SECTIONS.projects).toBeUndefined();
    expect(PLANNED_SECTIONS.os).toBeUndefined();
  });

  it("names every placeholder the same way the sidebar does", () => {
    for (const item of PRIMARY_NAV) {
      const slug = item.href.replace("/os/", "");
      const planned = PLANNED_SECTIONS[slug];
      if (planned) expect(planned.label).toBe(item.label);
    }
  });
});

describe("visibleChildren", () => {
  it("hides admin-only settings from members", () => {
    const labels = visibleChildren(SETTINGS_CHILDREN, "member").map((child) => child.label);
    expect(labels).not.toContain("Members");
    expect(labels).not.toContain("Enquiries");
  });

  it("shows everything to owners and admins", () => {
    for (const role of ["owner", "admin"] as const) {
      expect(visibleChildren(SETTINGS_CHILDREN, role)).toHaveLength(SETTINGS_CHILDREN.length);
    }
  });

  it("treats a childless item as an empty list", () => {
    expect(visibleChildren(undefined, "owner")).toEqual([]);
  });
});

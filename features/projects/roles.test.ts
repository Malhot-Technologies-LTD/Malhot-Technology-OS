import { describe, expect, it } from "vitest";

import { can, groupFor, type ProjectContext } from "@/lib/permissions";
import type { ProjectRole } from "@/types/domain";

import { ASSIGNABLE_PROJECT_ROLES, PROJECT_ROLE_META, projectRoleLabel } from "./roles";

const ALL_ROLES: ProjectRole[] = ["manager", "developer", "designer", "qa", "marketer", "viewer"];

const viewer = { userId: "u1", organizationId: "org1", orgRole: "member" as const };

function contextFor(role: ProjectRole): ProjectContext {
  return {
    projectId: "p1",
    key: "MAL",
    status: "active",
    qaRequired: true,
    role,
    group: groupFor("member", role),
  };
}

describe("project role vocabulary", () => {
  it("describes every role in the enum", () => {
    for (const role of ALL_ROLES) {
      expect(PROJECT_ROLE_META[role]?.label, role).toBeTruthy();
      expect(PROJECT_ROLE_META[role]?.summary, role).toBeTruthy();
    }
  });

  it("offers every role for assignment, exactly once", () => {
    expect([...ASSIGNABLE_PROJECT_ROLES].sort()).toEqual([...ALL_ROLES].sort());
    expect(new Set(ASSIGNABLE_PROJECT_ROLES).size).toBe(ASSIGNABLE_PROJECT_ROLES.length);
  });

  it("leads with the roles people are most often added as", () => {
    // Assigning someone to build or design the work is the common case; making
    // a second manager is not, and should not sit at the top of the list.
    expect(ASSIGNABLE_PROJECT_ROLES[0]).toBe("developer");
    expect(ASSIGNABLE_PROJECT_ROLES[1]).toBe("designer");
  });
});

/**
 * The summaries above are the words people read when choosing a role, so they
 * have to agree with `can()`, which is the enforcement. These assertions are
 * the seam between the two.
 */
describe("what the roles actually permit", () => {
  it("lets only a manager change the team and the status", () => {
    for (const role of ALL_ROLES) {
      const allowed = can(viewer, "project.manage_members", contextFor(role));
      expect(allowed, `${role} manage_members`).toBe(role === "manager");
      expect(can(viewer, "project.change_status", contextFor(role)), `${role} change_status`).toBe(role === "manager");
    }
  });

  it("lets a designer work on tasks, as its summary claims", () => {
    expect(can(viewer, "task.create", contextFor("designer"))).toBe(true);
    expect(can(viewer, "task.edit", contextFor("designer"))).toBe(true);
  });

  it("groups designer with the other contributors", () => {
    expect(groupFor("member", "designer")).toBe("contributor");
    expect(groupFor("member", "developer")).toBe("contributor");
  });

  it("lets a viewer change nothing, as its summary claims", () => {
    for (const action of ["task.create", "goal.create", "mvp.create", "project.edit"] as const) {
      expect(can(viewer, action, contextFor("viewer")), action).toBe(false);
    }
  });

  it("gives an org admin a manager's reach without a project role", () => {
    const admin = { ...viewer, orgRole: "admin" as const };
    const ctx: ProjectContext = {
      projectId: "p1",
      key: "MAL",
      status: "active",
      qaRequired: true,
      role: null,
      group: groupFor("admin", null),
    };
    expect(can(admin, "project.manage_members", ctx)).toBe(true);
  });
});

describe("projectRoleLabel", () => {
  it("capitalises QA rather than title-casing it", () => {
    expect(projectRoleLabel("qa")).toBe("QA");
    expect(projectRoleLabel("designer")).toBe("Designer");
  });
});

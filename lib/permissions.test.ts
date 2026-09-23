import { describe, expect, it } from "vitest";

import {
  can,
  groupFor,
  type Action,
  type PermissionGroup,
  type PermissionViewer,
  type ProjectContext,
} from "./permissions";
import type { OrgRole, ProjectRole, ProjectStatus } from "@/types/domain";

/**
 * The matrix in docs/product/user-roles.md#permission-matrix, as a test table.
 * Each row names the groups allowed; every other group must be denied.
 */

const GROUPS: readonly PermissionGroup[] = ["admin", "manager", "contributor", "qa", "viewer", "none"];

const ORG_ROLE_FOR: Record<PermissionGroup, OrgRole> = {
  admin: "admin",
  manager: "member",
  contributor: "member",
  qa: "member",
  viewer: "member",
  none: "member",
};

const PROJECT_ROLE_FOR: Record<PermissionGroup, ProjectRole | null> = {
  admin: null,
  manager: "manager",
  contributor: "developer",
  qa: "qa",
  viewer: "viewer",
  none: null,
};

const ME = "user-me";
const SOMEONE_ELSE = "user-other";

function viewerFor(group: PermissionGroup): PermissionViewer {
  return { userId: ME, organizationId: "org-1", orgRole: ORG_ROLE_FOR[group] };
}

function contextFor(group: PermissionGroup, overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    projectId: "project-1",
    key: "MAL",
    status: "active" as ProjectStatus,
    qaRequired: true,
    role: PROJECT_ROLE_FOR[group],
    group,
    ...overrides,
  };
}

/** Rows that depend only on the group. Ownership/state rules get their own tests. */
const MATRIX: ReadonlyArray<[Action, readonly PermissionGroup[]]> = [
  // Projects
  ["project.edit", ["admin", "manager"]],
  ["project.change_status", ["admin", "manager"]],
  ["project.override_health", ["admin", "manager"]],
  ["project.manage_members", ["admin", "manager"]],
  ["project.archive", ["admin", "manager"]],
  ["project.delete", ["admin"]],
  // Goals, MVP, milestones
  ["goal.create", ["admin", "manager", "contributor", "qa"]],
  ["goal.edit", ["admin", "manager", "contributor", "qa"]],
  ["goal.delete", ["admin", "manager"]],
  ["goal.achieve", ["admin", "manager"]],
  ["mvp.create", ["admin", "manager", "contributor", "qa"]],
  ["mvp.edit", ["admin", "manager", "contributor", "qa"]],
  ["mvp.delete", ["admin", "manager"]],
  ["milestone.manage", ["admin", "manager"]],
  // Tasks
  ["task.create", ["admin", "manager", "contributor", "qa"]],
  ["task.edit", ["admin", "manager", "contributor", "qa"]],
  ["task.assign", ["admin", "manager", "contributor", "qa"]],
  ["task.change_status", ["admin", "manager", "contributor", "qa"]],
  ["comment.create", ["admin", "manager", "contributor", "qa"]],
  ["attachment.create", ["admin", "manager", "contributor", "qa"]],
  // Testing
  ["test_case.create", ["admin", "manager", "contributor", "qa"]],
  ["test_case.edit", ["admin", "manager", "contributor", "qa"]],
  ["test_case.delete", ["admin", "manager", "qa"]],
  ["test_run.create", ["admin", "manager", "qa"]],
  ["test_run.record", ["admin", "manager", "qa"]],
  ["bug.create", ["admin", "manager", "contributor", "qa"]],
  ["bug.verify", ["admin", "manager", "qa"]],
  ["bug.delete", ["admin", "manager"]],
  // Documents
  ["document.create", ["admin", "manager", "contributor", "qa"]],
  ["document.return", ["admin", "manager"]],
  ["document.archive", ["admin", "manager"]],
  ["document.delete", ["admin", "manager"]],
  // GitHub
  ["github.connect", ["admin", "manager"]],
  ["github.sync", ["admin", "manager", "contributor", "qa"]],
  ["github.link", ["admin", "manager", "contributor", "qa"]],
  ["deployment.record", ["admin", "manager", "contributor"]],
];

describe("groupFor", () => {
  it("puts org owners and admins above every project role", () => {
    expect(groupFor("owner", null)).toBe("admin");
    expect(groupFor("admin", "viewer")).toBe("admin");
  });

  it("maps the three delivery disciplines to one contributor group", () => {
    expect(groupFor("member", "developer")).toBe("contributor");
    expect(groupFor("member", "designer")).toBe("contributor");
    expect(groupFor("member", "marketer")).toBe("contributor");
  });

  it("gives a non-member no group", () => {
    expect(groupFor("member", null)).toBe("none");
  });
});

describe("permission matrix", () => {
  for (const [action, allowed] of MATRIX) {
    for (const group of GROUPS) {
      const expected = allowed.includes(group);
      it(`${expected ? "allows" : "denies"} ${group}: ${action}`, () => {
        expect(can(viewerFor(group), action, contextFor(group))).toBe(expected);
      });
    }
  }
});

describe("organisation actions", () => {
  it("lets only organisation admins create a project", () => {
    // Changed deliberately: a project is a company commitment whose creator
    // becomes its manager, so it is not a decision for whoever is looking at
    // the screen. Matched by the projects_insert policy in
    // 20260923140000_tasks_and_create_policy.sql.
    expect(can({ userId: ME, organizationId: "org-1", orgRole: "owner" }, "project.create")).toBe(true);
    expect(can({ userId: ME, organizationId: "org-1", orgRole: "admin" }, "project.create")).toBe(true);
    expect(can({ userId: ME, organizationId: "org-1", orgRole: "member" }, "project.create")).toBe(false);
    expect(can(viewerFor("contributor"), "project.create")).toBe(false);
  });

  for (const action of ["org.manage", "org.invite", "org.integrations", "org.reports", "org.inquiries"] as const) {
    it(`restricts ${action} to org admins`, () => {
      expect(can({ userId: ME, organizationId: "org-1", orgRole: "owner" }, action)).toBe(true);
      expect(can({ userId: ME, organizationId: "org-1", orgRole: "admin" }, action)).toBe(true);
      expect(can({ userId: ME, organizationId: "org-1", orgRole: "member" }, action)).toBe(false);
    });
  }

  it("denies project actions when no project context is given", () => {
    expect(can(viewerFor("admin"), "project.edit", null)).toBe(false);
  });
});

describe("task.complete — the QA gate", () => {
  it("needs testing authority when the project requires QA", () => {
    for (const group of GROUPS) {
      const expected = ["admin", "manager", "qa"].includes(group);
      expect(can(viewerFor(group), "task.complete", contextFor(group, { qaRequired: true }))).toBe(expected);
    }
  });

  it("lets any contributor finish when the project does not require QA", () => {
    for (const group of GROUPS) {
      const expected = ["admin", "manager", "contributor", "qa"].includes(group);
      expect(can(viewerFor(group), "task.complete", contextFor(group, { qaRequired: false }))).toBe(expected);
    }
  });
});

describe("ownership rules", () => {
  it("lets a contributor delete only their own childless task", () => {
    const ctx = contextFor("contributor");
    expect(can(viewerFor("contributor"), "task.delete", ctx, { ownerId: ME, taskHasChildrenOrDependents: false })).toBe(
      true,
    );
    expect(can(viewerFor("contributor"), "task.delete", ctx, { ownerId: ME, taskHasChildrenOrDependents: true })).toBe(
      false,
    );
    expect(
      can(viewerFor("contributor"), "task.delete", ctx, { ownerId: SOMEONE_ELSE, taskHasChildrenOrDependents: false }),
    ).toBe(false);
  });

  it("fails closed when the facts a rule needs are missing", () => {
    expect(can(viewerFor("contributor"), "task.delete", contextFor("contributor"), { ownerId: ME })).toBe(false);
    expect(can(viewerFor("contributor"), "comment.edit", contextFor("contributor"))).toBe(false);
  });

  it("lets a manager delete any task", () => {
    expect(
      can(viewerFor("manager"), "task.delete", contextFor("manager"), {
        ownerId: SOMEONE_ELSE,
        taskHasChildrenOrDependents: true,
      }),
    ).toBe(true);
  });

  it("never lets anyone edit someone else's comment", () => {
    for (const group of ["admin", "manager", "contributor", "qa"] as const) {
      expect(can(viewerFor(group), "comment.edit", contextFor(group), { ownerId: SOMEONE_ELSE })).toBe(false);
      expect(can(viewerFor(group), "comment.edit", contextFor(group), { ownerId: ME })).toBe(true);
    }
  });

  it("lets managers delete other people's comments but not contributors", () => {
    expect(can(viewerFor("manager"), "comment.delete", contextFor("manager"), { ownerId: SOMEONE_ELSE })).toBe(true);
    expect(can(viewerFor("contributor"), "comment.delete", contextFor("contributor"), { ownerId: SOMEONE_ELSE })).toBe(
      false,
    );
    expect(can(viewerFor("contributor"), "comment.delete", contextFor("contributor"), { ownerId: ME })).toBe(true);
  });

  it("scopes attachment deletion to owner or manager", () => {
    expect(can(viewerFor("qa"), "attachment.delete", contextFor("qa"), { ownerId: ME })).toBe(true);
    expect(can(viewerFor("qa"), "attachment.delete", contextFor("qa"), { ownerId: SOMEONE_ELSE })).toBe(false);
    expect(can(viewerFor("admin"), "attachment.delete", contextFor("admin"), { ownerId: SOMEONE_ELSE })).toBe(true);
  });
});

describe("bug rules", () => {
  it("lets a contributor edit a bug they reported or are assigned", () => {
    const ctx = contextFor("contributor");
    expect(can(viewerFor("contributor"), "bug.edit", ctx, { bugReporterId: ME })).toBe(true);
    expect(can(viewerFor("contributor"), "bug.edit", ctx, { bugAssigneeId: ME })).toBe(true);
    expect(can(viewerFor("contributor"), "bug.edit", ctx, { bugReporterId: SOMEONE_ELSE })).toBe(false);
  });

  it("lets only the assignee among contributors move a bug along", () => {
    const ctx = contextFor("contributor");
    expect(can(viewerFor("contributor"), "bug.transition", ctx, { bugAssigneeId: ME })).toBe(true);
    expect(can(viewerFor("contributor"), "bug.transition", ctx, { bugReporterId: ME })).toBe(false);
    expect(can(viewerFor("qa"), "bug.transition", contextFor("qa"))).toBe(true);
  });
});

describe("document rules", () => {
  it("shows viewers approved documents only", () => {
    expect(can(viewerFor("viewer"), "document.view", contextFor("viewer"), { documentStatus: "approved" })).toBe(true);
    expect(can(viewerFor("viewer"), "document.view", contextFor("viewer"), { documentStatus: "draft" })).toBe(false);
    expect(can(viewerFor("contributor"), "document.view", contextFor("contributor"), { documentStatus: "draft" })).toBe(
      true,
    );
  });

  it("lets contributors edit any draft but only their own in review", () => {
    const ctx = contextFor("contributor");
    expect(
      can(viewerFor("contributor"), "document.edit", ctx, { documentStatus: "draft", ownerId: SOMEONE_ELSE }),
    ).toBe(true);
    expect(can(viewerFor("contributor"), "document.edit", ctx, { documentStatus: "in_review", ownerId: ME })).toBe(
      true,
    );
    expect(
      can(viewerFor("contributor"), "document.edit", ctx, { documentStatus: "in_review", ownerId: SOMEONE_ELSE }),
    ).toBe(false);
  });

  it("keeps approved and archived documents immutable", () => {
    for (const group of ["admin", "manager", "contributor", "qa"] as const) {
      expect(
        can(viewerFor(group), "document.edit", contextFor(group), { documentStatus: "approved", ownerId: ME }),
      ).toBe(false);
      expect(
        can(viewerFor(group), "document.edit", contextFor(group), { documentStatus: "archived", ownerId: ME }),
      ).toBe(false);
    }
  });

  it("lets QA approve only a testing report", () => {
    expect(can(viewerFor("qa"), "document.approve", contextFor("qa"), { documentType: "testing_report" })).toBe(true);
    expect(can(viewerFor("qa"), "document.approve", contextFor("qa"), { documentType: "final_report" })).toBe(false);
    expect(can(viewerFor("manager"), "document.approve", contextFor("manager"), { documentType: "final_report" })).toBe(
      true,
    );
    expect(
      can(viewerFor("contributor"), "document.approve", contextFor("contributor"), { documentType: "testing_report" }),
    ).toBe(false);
  });

  it("lets the author submit their own document for review", () => {
    const ctx = contextFor("contributor");
    expect(can(viewerFor("contributor"), "document.submit", ctx, { ownerId: ME })).toBe(true);
    expect(can(viewerFor("contributor"), "document.submit", ctx, { ownerId: SOMEONE_ELSE })).toBe(false);
    expect(can(viewerFor("manager"), "document.submit", contextFor("manager"), { ownerId: SOMEONE_ELSE })).toBe(true);
  });
});

describe("archived projects are read-only", () => {
  const archived = { status: "archived" as ProjectStatus };

  it("blocks writes for everyone below org admin", () => {
    for (const group of ["manager", "contributor", "qa"] as const) {
      expect(can(viewerFor(group), "task.create", contextFor(group, archived))).toBe(false);
      expect(can(viewerFor(group), "goal.edit", contextFor(group, archived))).toBe(false);
      expect(can(viewerFor(group), "comment.create", contextFor(group, archived))).toBe(false);
    }
  });

  it("still lets an org admin correct an archived project", () => {
    expect(can(viewerFor("admin"), "task.create", contextFor("admin", archived))).toBe(true);
    expect(can(viewerFor("admin"), "project.edit", contextFor("admin", archived))).toBe(true);
  });

  it("does not block reading", () => {
    expect(
      can(viewerFor("contributor"), "document.view", contextFor("contributor", archived), { documentStatus: "draft" }),
    ).toBe(true);
  });
});

describe("non-members", () => {
  it("are denied every project action", () => {
    const ctx = contextFor("none");
    for (const [action] of MATRIX) {
      expect(can(viewerFor("none"), action, ctx)).toBe(false);
    }
    expect(can(viewerFor("none"), "document.view", ctx, { documentStatus: "approved" })).toBe(false);
  });
});

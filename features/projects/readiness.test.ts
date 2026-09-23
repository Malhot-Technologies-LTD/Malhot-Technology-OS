import { describe, expect, it } from "vitest";

import { isReadyToStart, readinessBlockers, readinessItems, readinessMessage, type ReadinessFacts } from "./readiness";

const NOTHING: ReadinessFacts = { goalCount: 0, mvpCount: 0, managerId: null, startDate: null };
const READY: ReadinessFacts = { goalCount: 1, mvpCount: 1, managerId: "user-1", startDate: "2026-10-01" };

describe("readiness rule", () => {
  it("blocks on all four when the project is empty", () => {
    expect(readinessBlockers(NOTHING).map((item) => item.key)).toEqual(["goal", "mvp", "manager", "startDate"]);
    expect(isReadyToStart(NOTHING)).toBe(false);
  });

  it("clears once all four are present", () => {
    expect(readinessBlockers(READY)).toEqual([]);
    expect(isReadyToStart(READY)).toBe(true);
  });

  it.each([
    ["goal", { ...READY, goalCount: 0 }],
    ["mvp", { ...READY, mvpCount: 0 }],
    ["manager", { ...READY, managerId: null }],
    ["startDate", { ...READY, startDate: null }],
  ])("blocks on %s alone", (key, facts) => {
    expect(readinessBlockers(facts).map((item) => item.key)).toEqual([key]);
  });

  it("treats a milestone as recommended, never blocking", () => {
    const withMilestones = { ...READY, milestoneCount: 0 };
    expect(readinessItems(withMilestones).some((item) => item.key === "milestone")).toBe(true);
    expect(readinessBlockers(withMilestones)).toEqual([]);
    expect(isReadyToStart(withMilestones)).toBe(true);
  });

  it("omits the milestone row when the caller did not load milestones", () => {
    // The dashboard query does not fetch milestones; it must not imply they are missing.
    expect(readinessItems(READY).map((item) => item.key)).not.toContain("milestone");
  });
});

describe("readinessMessage", () => {
  /**
   * The bug this replaces: a project with a goal already set was told
   * "A project needs at least one goal, one MVP item, a manager and a start
   * date before it can start." That restates the whole rule, reads as a denial
   * of work already done, and leaves the person to guess which one it means.
   */
  it("names only what is missing", () => {
    const facts = { ...READY, mvpCount: 0, startDate: null };
    expect(readinessMessage(readinessBlockers(facts))).toBe(
      "This project still needs an MVP item and a start date before it can start.",
    );
  });

  it("does not mention a requirement that is already satisfied", () => {
    const message = readinessMessage(readinessBlockers({ ...READY, mvpCount: 0 }));
    expect(message).toBe("This project still needs an MVP item before it can start.");
    expect(message).not.toContain("goal");
    expect(message).not.toContain("manager");
  });

  it("lists all four readably when nothing is set", () => {
    expect(readinessMessage(readinessBlockers(NOTHING))).toBe(
      "This project still needs a goal, an MVP item, a manager and a start date before it can start.",
    );
  });

  it("says so when there is nothing left", () => {
    expect(readinessMessage(readinessBlockers(READY))).toBe("This project is ready to start.");
  });
});

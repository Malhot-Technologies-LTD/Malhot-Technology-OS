import { describe, expect, it } from "vitest";

import { milestoneScopes, milestoneState } from "./milestones";

describe("milestoneScopes", () => {
  const beta = { id: "beta", due_date: "2026-10-01" };
  const launch = { id: "launch", due_date: "2026-10-20" };

  it("gives each milestone the tasks due since the one before it", () => {
    const early = { id: "a", due_at: "2026-09-20T10:00:00Z" };
    const onTheDay = { id: "b", due_at: "2026-10-01T15:00:00Z" };
    const later = { id: "c", due_at: "2026-10-05T10:00:00Z" };
    const after = { id: "d", due_at: "2026-11-01T10:00:00Z" };
    const undated = { id: "e", due_at: null };
    const scopes = milestoneScopes([launch, beta], [early, onTheDay, later, after, undated]);
    expect(scopes.get("beta")).toEqual([early, onTheDay]);
    expect(scopes.get("launch")).toEqual([later]);
  });

  it("has an empty scope for every milestone even with no tasks", () => {
    expect(milestoneScopes([beta], [])).toEqual(new Map([["beta", []]]));
  });
});

describe("milestoneState", () => {
  it("is reached once completed, otherwise overdue or upcoming against today", () => {
    expect(milestoneState({ due_date: "2026-09-01", completed_at: "2026-09-02T00:00:00Z" }, "2026-09-24")).toBe(
      "reached",
    );
    expect(milestoneState({ due_date: "2026-09-23", completed_at: null }, "2026-09-24")).toBe("overdue");
    expect(milestoneState({ due_date: "2026-09-24", completed_at: null }, "2026-09-24")).toBe("upcoming");
  });
});

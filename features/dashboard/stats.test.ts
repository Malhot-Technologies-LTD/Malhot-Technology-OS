import { describe, expect, it } from "vitest";

import { computeDashboardStats, weekStart, type DashboardTask } from "./stats";

// Wednesday 24 September 2026, 12:00 UTC.
const NOW = Date.UTC(2026, 8, 24, 12);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (offset: number) => new Date(NOW + offset).toISOString();

let n = 0;
function task(overrides: Partial<DashboardTask> = {}): DashboardTask {
  n += 1;
  return {
    id: `t${n}`,
    seq: n,
    title: `Task ${n}`,
    status: "todo",
    priority: "medium",
    due_at: null,
    completed_at: null,
    created_at: iso(-DAY),
    accepted_at: null,
    assignee: { id: "me", full_name: "Me", avatar_url: null },
    project: { id: "p1", key: "AS", name: "Alpha" },
    ...overrides,
  };
}

const projects = [
  { id: "p1", key: "AS", name: "Alpha", status: "active" as const, target_end_date: null },
  { id: "p2", key: "BE", name: "Beta", status: "planning" as const, target_end_date: null },
  { id: "p3", key: "OLD", name: "Old", status: "archived" as const, target_end_date: null },
];

describe("weekStart", () => {
  it("returns Monday 00:00 UTC", () => {
    expect(new Date(weekStart(NOW)).toISOString()).toBe("2026-09-21T00:00:00.000Z");
    // A Sunday belongs to the week that started six days earlier.
    expect(new Date(weekStart(Date.UTC(2026, 8, 27, 23))).toISOString()).toBe("2026-09-21T00:00:00.000Z");
  });
});

describe("computeDashboardStats", () => {
  it("counts open, overdue and due-soon work by instant", () => {
    const stats = computeDashboardStats(
      [
        task({ due_at: iso(-HOUR) }), // overdue
        task({ due_at: iso(2 * DAY) }), // due soon
        task({ due_at: iso(10 * DAY) }), // later
        task({ assignee: null }), // no deadline, unassigned
        task({ status: "done", completed_at: iso(-2 * DAY), due_at: iso(-3 * DAY) }), // done: not overdue
      ],
      projects,
      "me",
      NOW,
    );
    expect(stats.openTasks).toBe(4);
    expect(stats.mine).toBe(3);
    expect(stats.overdue).toBe(1);
    expect(stats.dueSoon).toBe(1);
    expect(stats.completedThisWeek).toBe(1);
    expect(stats.activeProjects).toBe(1);
    expect(stats.planningProjects).toBe(1);
  });

  it("compares completions with the previous seven days", () => {
    const stats = computeDashboardStats(
      [
        task({ status: "done", completed_at: iso(-DAY) }),
        task({ status: "done", completed_at: iso(-8 * DAY) }),
        task({ status: "done", completed_at: iso(-9 * DAY) }),
      ],
      projects,
      "me",
      NOW,
    );
    expect(stats.completedThisWeek).toBe(1);
    expect(stats.completedLastWeek).toBe(2);
  });

  it("buckets created and completed work into eight Monday weeks, oldest first", () => {
    const stats = computeDashboardStats(
      [
        task({ created_at: iso(-DAY), status: "done", completed_at: iso(-HOUR) }),
        task({ created_at: iso(-8 * DAY) }),
        task({ created_at: iso(-200 * DAY) }), // outside the window
      ],
      projects,
      "me",
      NOW,
    );
    expect(stats.weeks).toHaveLength(8);
    expect(stats.weeks[7]).toMatchObject({ start: "2026-09-21T00:00:00.000Z", created: 1, completed: 1 });
    expect(stats.weeks[6]).toMatchObject({ created: 1, completed: 0 });
    expect(stats.weeks.reduce((sum, week) => sum + week.created, 0)).toBe(2);
  });

  it("lists my next deadlines soonest first, undated last", () => {
    const stats = computeDashboardStats(
      [
        task({ title: "undated" }),
        task({ title: "later", due_at: iso(5 * DAY) }),
        task({ title: "soon", due_at: iso(HOUR) }),
      ],
      projects,
      "me",
      NOW,
    );
    expect(stats.myNext.map((t) => t.title)).toEqual(["soon", "later", "undated"]);
  });

  it("leaves archived projects out of project health and sorts the most overdue first", () => {
    const stats = computeDashboardStats(
      [
        task({ project: { id: "p2", key: "BE", name: "Beta" }, due_at: iso(-HOUR) }),
        task({ project: { id: "p1", key: "AS", name: "Alpha" } }),
      ],
      projects,
      "me",
      NOW,
    );
    expect(stats.projects.map((p) => p.key)).toEqual(["BE", "AS"]);
    expect(stats.projects[0]).toMatchObject({ open: 1, overdue: 1, total: 1, done: 0 });
  });

  it("totals each person's load, most overdue first", () => {
    const other = { id: "you", full_name: "You", avatar_url: null };
    const stats = computeDashboardStats(
      [task(), task({ assignee: other, due_at: iso(-HOUR) }), task({ assignee: other })],
      projects,
      "me",
      NOW,
    );
    expect(stats.people.map((p) => [p.fullName, p.open, p.overdue])).toEqual([
      ["You", 2, 1],
      ["Me", 1, 0],
    ]);
  });
});

import { describe, expect, it } from "vitest";

import {
  burnup,
  daysLeft,
  flowStats,
  projectHealth,
  startOfWeek,
  statusCounts,
  taskTotals,
  workload,
  type InsightTask,
} from "./insights";

// Wednesday 24 September 2026, 12:00 UTC.
const NOW = Date.UTC(2026, 8, 24, 12);
const DAY = 86_400_000;
const iso = (offset: number) => new Date(NOW + offset).toISOString();

let n = 0;
function task(overrides: Partial<InsightTask> = {}): InsightTask {
  n += 1;
  return {
    id: `t${n}`,
    status: "todo",
    due_at: null,
    completed_at: null,
    created_at: iso(-DAY),
    accepted_at: iso(-DAY),
    assignee: { id: "ana", full_name: "Ana", avatar_url: null },
    ...overrides,
  };
}

describe("taskTotals", () => {
  it("counts open, done, overdue, due soon and the hand-over gaps", () => {
    const totals = taskTotals(
      [
        task({ status: "done", completed_at: iso(-DAY), due_at: iso(-2 * DAY) }),
        task({ due_at: iso(-DAY) }),
        task({ due_at: iso(3 * DAY) }),
        task({ due_at: iso(30 * DAY), assignee: null }),
        task({ accepted_at: null }),
      ],
      NOW,
    );
    expect(totals).toEqual({
      total: 5,
      done: 1,
      open: 4,
      overdue: 1,
      dueSoon: 1,
      unassigned: 1,
      notAccepted: 1,
      percent: 20,
    });
  });

  it("does not count a finished task as overdue", () => {
    expect(taskTotals([task({ status: "done", due_at: iso(-DAY) })], NOW).overdue).toBe(0);
  });

  it("reports 0% rather than dividing by zero", () => {
    expect(taskTotals([], NOW).percent).toBe(0);
  });
});

describe("projectHealth", () => {
  const totals = (tasks: InsightTask[]) => taskTotals(tasks, NOW);

  it("has no reading outside delivery", () => {
    for (const status of ["planning", "completed", "archived"] as const)
      expect(projectHealth({ status, targetEndDate: null, totals: totals([]), now: NOW })).toBeNull();
  });

  it("is off track past the target date with work open", () => {
    const reading = projectHealth({
      status: "active",
      targetEndDate: "2026-09-20",
      totals: totals([task()]),
      now: NOW,
    });
    expect(reading?.health).toBe("off_track");
  });

  it("is on track past the target date once everything is done", () => {
    const reading = projectHealth({
      status: "active",
      targetEndDate: "2026-09-20",
      totals: totals([task({ status: "done" })]),
      now: NOW,
    });
    expect(reading?.health).toBe("on_track");
  });

  it("is at risk with any overdue task, off track when a quarter of open work is late", () => {
    const one = [task({ due_at: iso(-DAY) }), task(), task(), task(), task(), task()];
    expect(projectHealth({ status: "active", targetEndDate: null, totals: totals(one), now: NOW })?.health).toBe(
      "at_risk",
    );
    const many = [task({ due_at: iso(-DAY) }), task({ due_at: iso(-DAY) }), task({ due_at: iso(-DAY) }), task()];
    expect(projectHealth({ status: "active", targetEndDate: null, totals: totals(many), now: NOW })?.health).toBe(
      "off_track",
    );
  });

  it("is at risk in the final week with most of the work still open", () => {
    const reading = projectHealth({
      status: "active",
      targetEndDate: "2026-09-28",
      totals: totals([task(), task(), task({ status: "done" })]),
      now: NOW,
    });
    expect(reading).toEqual({ health: "at_risk", reason: "4 days left at 33% done" });
  });
});

describe("burnup", () => {
  it("accumulates created and done per week, oldest first", () => {
    const points = burnup(
      [
        task({ created_at: iso(-20 * DAY), completed_at: iso(-10 * DAY), status: "done" }),
        task({ created_at: iso(-9 * DAY) }),
        task({ created_at: iso(-DAY) }),
      ],
      NOW,
      4,
    );
    expect(points).toHaveLength(4);
    expect(points.map((point) => point.created)).toEqual([1, 1, 2, 3]);
    expect(points.map((point) => point.done)).toEqual([0, 0, 1, 1]);
    expect(points[3]!.start).toBe(startOfWeek(NOW));
  });
});

describe("startOfWeek", () => {
  it("lands on Monday midnight UTC", () => {
    expect(new Date(startOfWeek(NOW)).toISOString()).toBe("2026-09-21T00:00:00.000Z");
  });
});

describe("workload", () => {
  it("ranks people by open work and keeps unassigned work last", () => {
    const rows = workload(
      [
        task({ assignee: null }),
        task({ assignee: { id: "ben", full_name: "Ben", avatar_url: null } }),
        task({ assignee: { id: "ben", full_name: "Ben", avatar_url: null }, due_at: iso(-DAY) }),
        task({ status: "in_progress" }),
        task({ status: "done" }),
      ],
      NOW,
    );
    expect(rows.map((row) => [row.fullName, row.open, row.overdue, row.inProgress, row.done])).toEqual([
      ["Ben", 2, 1, 0, 0],
      ["Ana", 1, 0, 1, 1],
      ["Unassigned", 1, 0, 0, 0],
    ]);
  });
});

describe("statusCounts", () => {
  it("has a zero for every status", () => {
    expect(statusCounts([task({ status: "review" })])).toEqual({
      backlog: 0,
      todo: 0,
      in_progress: 0,
      review: 1,
      testing: 0,
      done: 0,
    });
  });
});

describe("daysLeft", () => {
  it("counts to the end of the target day", () => {
    expect(daysLeft("2026-09-24", NOW)).toBe(0);
    expect(daysLeft("2026-09-30", NOW)).toBe(6);
    expect(daysLeft("2026-09-23", NOW)).toBe(-1);
  });
});

describe("flowStats", () => {
  it("reports the median time to done, recent throughput and scope growth", () => {
    const stats = flowStats(
      [
        task({ status: "done", created_at: iso(-10 * DAY), completed_at: iso(-8 * DAY) }),
        task({ status: "done", created_at: iso(-6 * DAY), completed_at: iso(-2 * DAY) }),
        task({ status: "done", created_at: iso(-3 * DAY), completed_at: iso(-DAY / 2) }),
        task({ created_at: iso(-DAY) }),
      ],
      NOW,
    );
    expect(stats).toEqual({ medianDaysToDone: 2.5, weeklyThroughput: 0.8, doneThisWeek: 2, createdLastTwoWeeks: 4 });
  });

  it("has no median without finished work", () => {
    expect(flowStats([task()], NOW).medianDaysToDone).toBeNull();
  });
});

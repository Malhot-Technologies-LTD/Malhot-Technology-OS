import { describe, expect, it } from "vitest";

import { EMPTY_FILTER, filterTasks, groupTasks, sortTasks, type ListTask } from "./filters";

// Wednesday 24 September 2026, 12:00 local.
const NOW = new Date(2026, 8, 24, 12);
const HOUR = 3_600_000;
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR).toISOString();

let n = 0;
function task(overrides: Partial<ListTask> = {}): ListTask {
  n += 1;
  return {
    seq: n,
    title: `Task ${n}`,
    status: "todo",
    priority: "medium",
    due_at: null,
    created_at: at(-n),
    assignee: { id: "me", full_name: "Ana" },
    project: { key: "AS", name: "Attendance" },
    ...overrides,
  };
}

const context = { now: NOW, viewerUserId: "me" };

describe("filterTasks", () => {
  const overdue = task({ title: "Late one", due_at: at(-2) });
  const today = task({ due_at: at(3) });
  const week = task({ due_at: at(72), assignee: { id: "ben", full_name: "Ben" } });
  const undated = task({ assignee: null, priority: "urgent" });
  const done = task({ status: "done", due_at: at(-5) });
  const all = [overdue, today, week, undated, done];

  it("passes everything through the empty filter", () => {
    expect(filterTasks(all, EMPTY_FILTER, context)).toHaveLength(5);
  });

  it("filters by due window, never counting finished work as late", () => {
    expect(filterTasks(all, { ...EMPTY_FILTER, due: "overdue" }, context)).toEqual([overdue]);
    expect(filterTasks(all, { ...EMPTY_FILTER, due: "today" }, context)).toEqual([today]);
    expect(filterTasks(all, { ...EMPTY_FILTER, due: "week" }, context)).toEqual([today, week]);
    expect(filterTasks(all, { ...EMPTY_FILTER, due: "none" }, context)).toEqual([undated]);
  });

  it("hides nothing by date before the reader's clock is known", () => {
    expect(filterTasks(all, { ...EMPTY_FILTER, due: "overdue" }, { ...context, now: null })).toHaveLength(5);
  });

  it("filters by owner, status, priority and project", () => {
    expect(filterTasks(all, { ...EMPTY_FILTER, assignee: "none" }, context)).toEqual([undated]);
    expect(filterTasks(all, { ...EMPTY_FILTER, assignee: "ben" }, context)).toEqual([week]);
    expect(filterTasks(all, { ...EMPTY_FILTER, assignee: "me" }, context)).toHaveLength(3);
    expect(filterTasks(all, { ...EMPTY_FILTER, status: "open" }, context)).toHaveLength(4);
    expect(filterTasks(all, { ...EMPTY_FILTER, status: "done" }, context)).toEqual([done]);
    expect(filterTasks(all, { ...EMPTY_FILTER, priority: "urgent" }, context)).toEqual([undated]);
    expect(filterTasks(all, { ...EMPTY_FILTER, project: "MAL" }, context)).toEqual([]);
  });

  it("searches title, reference and owner, ignoring case", () => {
    expect(filterTasks(all, { ...EMPTY_FILTER, query: "LATE" }, context)).toEqual([overdue]);
    expect(filterTasks(all, { ...EMPTY_FILTER, query: `as-${week.seq}` }, context)).toEqual([week]);
    expect(filterTasks(all, { ...EMPTY_FILTER, query: "ben" }, context)).toEqual([week]);
  });
});

describe("sortTasks", () => {
  const a = task({ due_at: at(10), priority: "low" });
  const b = task({ due_at: null, priority: "urgent" });
  const c = task({ due_at: at(1), priority: "high" });

  it("keeps undated tasks last in both directions", () => {
    expect(sortTasks([a, b, c], "due").map((t) => t.seq)).toEqual([c.seq, a.seq, b.seq]);
    expect(sortTasks([a, b, c], "due", "desc").map((t) => t.seq)).toEqual([a.seq, c.seq, b.seq]);
  });

  it("sorts urgency first by priority", () => {
    expect(sortTasks([a, b, c], "priority").map((t) => t.priority)).toEqual(["urgent", "high", "low"]);
  });

  it("does not mutate its input", () => {
    const input = [a, b, c];
    sortTasks(input, "title", "desc");
    expect(input).toEqual([a, b, c]);
  });
});

describe("groupTasks", () => {
  it("groups by status in workflow order", () => {
    const groups = groupTasks([task({ status: "review" }), task({ status: "backlog" }), task()], "status");
    expect(groups.map((group) => group.label)).toEqual(["Backlog", "To do", "In review"]);
  });

  it("puts unassigned work last when grouping by person", () => {
    const groups = groupTasks(
      [task({ assignee: null }), task({ assignee: { id: "z", full_name: "Zed" } }), task()],
      "assignee",
    );
    expect(groups.map((group) => group.label)).toEqual(["Ana", "Zed", "Unassigned"]);
  });

  it("returns one unlabelled group for none", () => {
    expect(groupTasks([task()], "none")).toEqual([expect.objectContaining({ key: "all", label: "" })]);
  });
});

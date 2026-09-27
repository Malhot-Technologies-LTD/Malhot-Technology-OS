import { describe, expect, it } from "vitest";

import { groupTasks, type MyTask } from "./due-groups";

// Local-time clock: groupTasks works in the reader's timezone.
const now = new Date(2026, 8, 24, 10, 0);
const at = (days: number, hours = 0) => new Date(2026, 8, 24 + days, hours).toISOString();

const task = (id: string, dueAt: string | null): MyTask => ({
  id,
  seq: 1,
  title: id,
  status: "todo",
  priority: "medium",
  dueAt,
  acceptedAt: null,
  project: { key: "AS", name: "Alpha" },
});

describe("groupTasks", () => {
  it("buckets by the reader's calendar and drops empty groups", () => {
    const groups = groupTasks(
      [
        task("late", at(0, 9)),
        task("tonight", at(0, 23)),
        task("friday", at(2, 12)),
        task("next-month", at(40)),
        task("undated", null),
      ],
      now,
    );
    expect(groups.map((group) => [group.key, group.tasks.map((t) => t.id)])).toEqual([
      ["overdue", ["late"]],
      ["today", ["tonight"]],
      ["week", ["friday"]],
      ["later", ["next-month"]],
      ["none", ["undated"]],
    ]);
  });

  it("returns nothing for no tasks", () => {
    expect(groupTasks([], now)).toEqual([]);
  });
});

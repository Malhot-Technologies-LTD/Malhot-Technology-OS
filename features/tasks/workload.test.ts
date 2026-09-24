import { describe, expect, it } from "vitest";

import type { TeamTaskRow } from "./queries";
import { groupByAssignee } from "./workload";

let counter = 0;

function task(overrides: Partial<TeamTaskRow> & { who?: string | null; due?: string | null }): TeamTaskRow {
  const { who = "u1", due = null, ...rest } = overrides;
  counter += 1;
  return {
    id: `task-${counter}`,
    seq: counter,
    title: `Task ${counter}`,
    description: null,
    status: "todo",
    priority: "medium",
    due_at: due,
    started_at: null,
    completed_at: null,
    assignee: who === null ? null : { id: who, full_name: who.toUpperCase(), avatar_url: null },
    project: { id: "p1", key: "MAL", name: "Malhot OS" },
    ...rest,
  } as TeamTaskRow;
}

const names = (people: ReturnType<typeof groupByAssignee>) => people.map((person) => person.fullName);

describe("groupByAssignee", () => {
  it("puts each person's work under them", () => {
    const people = groupByAssignee([task({ who: "levi" }), task({ who: "levi" }), task({ who: "kenny" })]);
    expect(people).toHaveLength(2);
    expect(people.find((person) => person.fullName === "LEVI")?.tasks).toHaveLength(2);
    expect(people.find((person) => person.fullName === "KENNY")?.tasks).toHaveLength(1);
  });

  it("orders people by whoever runs out first", () => {
    // A manager reads this to find who is about to be late, not who is busiest.
    const people = groupByAssignee([
      task({ who: "calm", due: "2026-12-01T09:00:00Z" }),
      task({ who: "urgent", due: "2026-09-25T09:00:00Z" }),
      task({ who: "middling", due: "2026-10-10T09:00:00Z" }),
    ]);
    expect(names(people)).toEqual(["URGENT", "MIDDLING", "CALM"]);
  });

  it("ranks someone on their soonest deadline, not their busiest pile", () => {
    // Four comfortable tasks must not outrank one due tomorrow.
    const people = groupByAssignee([
      task({ who: "loaded", due: "2026-12-01T09:00:00Z" }),
      task({ who: "loaded", due: "2026-12-02T09:00:00Z" }),
      task({ who: "loaded", due: "2026-12-03T09:00:00Z" }),
      task({ who: "loaded", due: "2026-12-04T09:00:00Z" }),
      task({ who: "tomorrow", due: "2026-09-25T09:00:00Z" }),
    ]);
    expect(names(people)[0]).toBe("TOMORROW");
  });

  it("sorts people with no dated work after everyone who has some", () => {
    const people = groupByAssignee([
      task({ who: "undated", due: null }),
      task({ who: "dated", due: "2026-10-01T09:00:00Z" }),
    ]);
    expect(names(people)).toEqual(["DATED", "UNDATED"]);
  });

  it("falls back to name when nobody has a deadline", () => {
    const people = groupByAssignee([task({ who: "zoe", due: null }), task({ who: "adam", due: null })]);
    expect(names(people)).toEqual(["ADAM", "ZOE"]);
  });

  it("always puts unassigned work last, however urgent it is", () => {
    // It is not a person's problem, it is the reader's — but burying the people
    // behind it would be the wrong trade.
    const people = groupByAssignee([
      task({ who: null, due: "2020-01-01T09:00:00Z" }),
      task({ who: "levi", due: "2026-12-01T09:00:00Z" }),
    ]);
    expect(names(people)).toEqual(["LEVI", "Unassigned"]);
    expect(people[1].userId).toBeNull();
  });

  it("keeps unassigned work rather than dropping it", () => {
    const people = groupByAssignee([task({ who: null })]);
    expect(people).toHaveLength(1);
    expect(people[0].tasks).toHaveLength(1);
  });

  it("carries the project key through so a row can link somewhere", () => {
    const people = groupByAssignee([task({ who: "levi" })]);
    expect(people[0].tasks[0].projectKey).toBe("MAL");
  });

  it("returns nothing for nothing", () => {
    expect(groupByAssignee([])).toEqual([]);
  });
});

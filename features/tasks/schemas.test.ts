import { describe, expect, it } from "vitest";

import { createTaskSchema, formatRemaining, remainingTone } from "./schemas";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const valid = {
  projectKey: "MAL",
  title: "Wire up the booking form",
  description: "",
  assigneeId: "",
  priority: "medium" as const,
  dueAt: "",
};

describe("createTaskSchema", () => {
  it("accepts a task with nothing but a title", () => {
    // Work can exist before it has an owner or a deadline.
    const parsed = createTaskSchema.parse(valid);
    expect(parsed.assigneeId).toBeNull();
    expect(parsed.dueAt).toBeNull();
    expect(parsed.description).toBeNull();
  });

  it("refuses an empty title", () => {
    expect(createTaskSchema.safeParse({ ...valid, title: "   " }).success).toBe(false);
  });

  it("turns a datetime-local value into an instant", () => {
    // The browser sends "2026-09-30T17:00" with no zone; it means 5pm where the
    // person typing it is, which is exactly what new Date() reads it as.
    const parsed = createTaskSchema.parse({ ...valid, dueAt: "2026-09-30T17:00" });
    expect(parsed.dueAt).toBe(new Date("2026-09-30T17:00").toISOString());
  });

  it("rejects a deadline that is not a date", () => {
    expect(createTaskSchema.safeParse({ ...valid, dueAt: "next tuesday" }).success).toBe(false);
  });
});

describe("formatRemaining", () => {
  it("never shows more than two units", () => {
    // "2d 4h 17m 3s" is not more useful than "2d 4h" — it just moves.
    expect(formatRemaining(2 * DAY + 4 * HOUR + 17 * MINUTE)).toBe("2d 4h left");
  });

  it("drops the smaller unit when it is zero", () => {
    expect(formatRemaining(3 * DAY)).toBe("3d left");
    expect(formatRemaining(5 * HOUR)).toBe("5h left");
  });

  it("sharpens to minutes under an hour", () => {
    expect(formatRemaining(42 * MINUTE)).toBe("42m left");
    expect(formatRemaining(2 * HOUR + 30 * MINUTE)).toBe("2h 30m left");
  });

  it("says something honest in the last minute rather than counting seconds", () => {
    expect(formatRemaining(30_000)).toBe("under a minute left");
  });

  it("reads as overdue once the deadline has passed", () => {
    expect(formatRemaining(-(3 * HOUR))).toBe("3h overdue");
    expect(formatRemaining(-(2 * DAY + 6 * HOUR))).toBe("2d 6h overdue");
    expect(formatRemaining(-5_000)).toBe("under a minute overdue");
  });
});

describe("remainingTone", () => {
  it("turns red once the deadline is gone", () => {
    expect(remainingTone(-1)).toBe("danger");
  });

  it("warns inside the last four hours, which is when a day can still be rescued", () => {
    expect(remainingTone(3 * HOUR)).toBe("warning");
    expect(remainingTone(5 * HOUR)).toBe("neutral");
  });

  it("stays quiet when there is plenty of time", () => {
    expect(remainingTone(3 * DAY)).toBe("neutral");
  });
});

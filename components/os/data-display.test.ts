import { describe, expect, it } from "vitest";

import { daysUntil, EMPTY, formatDate, relativeDays } from "./data-display";

/** The rules in docs/design/design-system.md#data-display-rules. */

const TODAY = new Date("2026-09-22T10:00:00Z");

describe("formatDate", () => {
  it("omits the year inside the current year", () => {
    expect(formatDate("2026-03-12", TODAY)).toBe("12 Mar");
    expect(formatDate("2026-12-31", TODAY)).toBe("31 Dec");
  });

  it("includes the year outside it", () => {
    expect(formatDate("2025-03-12", TODAY)).toBe("12 Mar 2025");
    expect(formatDate("2027-01-02", TODAY)).toBe("2 Jan 2027");
  });

  it("renders an em dash for missing or unparseable values", () => {
    expect(formatDate(null, TODAY)).toBe(EMPTY);
    expect(formatDate(undefined, TODAY)).toBe(EMPTY);
    expect(formatDate("", TODAY)).toBe(EMPTY);
    expect(formatDate("not a date", TODAY)).toBe(EMPTY);
  });
});

describe("daysUntil", () => {
  it("counts whole days regardless of time of day", () => {
    expect(daysUntil("2026-09-22", TODAY)).toBe(0);
    expect(daysUntil("2026-09-23", TODAY)).toBe(1);
    expect(daysUntil("2026-09-21", TODAY)).toBe(-1);
    expect(daysUntil("2026-10-02", TODAY)).toBe(10);
  });

  it("still counts late evening as today, in the viewer's own timezone", () => {
    // Local time, deliberately: a `date` column is a day on a calendar, so
    // 23:59 on the 22nd is still the 22nd wherever the viewer happens to be.
    expect(daysUntil("2026-09-22", new Date(2026, 8, 22, 23, 59))).toBe(0);
    expect(daysUntil("2026-09-22", new Date(2026, 8, 22, 0, 1))).toBe(0);
    expect(daysUntil("2026-09-23", new Date(2026, 8, 22, 23, 59))).toBe(1);
  });

  it("reads a date column as a calendar day, not a UTC instant", () => {
    // The bug this guards: "2026-09-22" parsed as UTC midnight and read back
    // with local getters renders as the 21st anywhere west of UTC. The day
    // number is the assertion; "Sept" is en-GB's own abbreviation for September
    // (the only four-letter one), not a formatting slip.
    expect(formatDate("2026-09-22", new Date(2026, 8, 1))).toBe("22 Sept");
  });

  it("crosses month and year boundaries", () => {
    expect(daysUntil("2026-10-01", new Date("2026-09-30T08:00:00Z"))).toBe(1);
    expect(daysUntil("2027-01-01", new Date("2026-12-31T08:00:00Z"))).toBe(1);
  });
});

describe("relativeDays", () => {
  it("names today and tomorrow rather than counting", () => {
    expect(relativeDays(0)).toBe("today");
    expect(relativeDays(1)).toBe("tomorrow");
  });

  it("singularises one day overdue", () => {
    expect(relativeDays(-1)).toBe("1 day overdue");
    expect(relativeDays(-4)).toBe("4 days overdue");
  });

  it("looks forward in days", () => {
    expect(relativeDays(3)).toBe("in 3 days");
  });
});

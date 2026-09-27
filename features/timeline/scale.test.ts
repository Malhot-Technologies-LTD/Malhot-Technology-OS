import { describe, expect, it } from "vitest";

import { dayKey, monthGrid, monthParam, parseMonth } from "./calendar";
import { bar, offset, ticks, timelineRange, toTime } from "./scale";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 24, 12);

describe("toTime", () => {
  it("places date-only values at UTC midnight and rejects junk", () => {
    expect(toTime("2026-10-01")).toBe(Date.UTC(2026, 9, 1));
    expect(toTime("2026-10-01T09:00:00Z")).toBe(Date.UTC(2026, 9, 1, 9));
    expect(toTime(null)).toBeNull();
    expect(toTime("soon")).toBeNull();
  });
});

describe("timelineRange", () => {
  it("contains today and every moment, snapped to whole days", () => {
    const range = timelineRange([NOW - 40 * DAY, NOW + 20 * DAY, null], NOW);
    expect(range.start).toBeLessThanOrEqual(NOW - 40 * DAY);
    expect(range.end).toBeGreaterThanOrEqual(NOW + 20 * DAY);
    expect(range.start % DAY).toBe(0);
    expect(range.end % DAY).toBe(0);
  });

  it("is never shorter than four weeks", () => {
    const range = timelineRange([], NOW);
    expect(range.end - range.start).toBe(28 * DAY);
    expect(offset(range, NOW)).toBeGreaterThan(0);
    expect(offset(range, NOW)).toBeLessThan(100);
  });
});

describe("offset and bar", () => {
  const range = { start: 0, end: 100 * DAY };
  it("clamps outside the range", () => {
    expect(offset(range, -DAY)).toBe(0);
    expect(offset(range, 200 * DAY)).toBe(100);
    expect(offset(range, 25 * DAY)).toBe(25);
  });
  it("orders its ends and keeps a minimum width inside the track", () => {
    expect(bar(range, 50 * DAY, 10 * DAY)).toEqual({ left: 10, width: 40 });
    expect(bar(range, 100 * DAY, 100 * DAY, 2)).toEqual({ left: 98, width: 2 });
  });
});

describe("ticks", () => {
  it("is weekly on Mondays for short ranges", () => {
    const result = ticks({ start: Date.UTC(2026, 8, 23), end: Date.UTC(2026, 9, 20) });
    expect(result.map((tick) => new Date(tick.at).getUTCDay())).toEqual([1, 1, 1, 1]);
    expect(result[0]!.label).toBe("28 Sept");
  });
  it("is monthly for long ranges, with January marked major and dated", () => {
    const result = ticks({ start: Date.UTC(2026, 8, 15), end: Date.UTC(2027, 2, 15) });
    expect(result.map((tick) => tick.label)).toEqual(["Oct", "Nov", "Dec", "Jan 2027", "Feb", "Mar"]);
    expect(result.find((tick) => tick.major)?.label).toBe("Jan 2027");
  });
});

describe("calendar", () => {
  it("builds six Monday-first weeks", () => {
    const grid = monthGrid(2026, 8);
    expect(grid).toHaveLength(42);
    expect(grid[0]).toEqual({ key: "2026-08-31", day: 31, inMonth: false, weekend: false });
    expect(grid[1]!.key).toBe("2026-09-01");
    expect(grid.filter((day) => day.inMonth)).toHaveLength(30);
  });

  it("parses and prints month params, rolling over the year", () => {
    expect(parseMonth("2026-09")).toEqual({ year: 2026, month: 8 });
    expect(parseMonth("2026-13")).toBeNull();
    expect(parseMonth(undefined)).toBeNull();
    expect(monthParam(2026, 12)).toBe("2027-01");
    expect(monthParam(2026, -1)).toBe("2025-12");
  });

  it("keys an instant by the viewer's own day", () => {
    const late = "2026-09-24T22:30:00Z";
    expect(dayKey(late, "UTC")).toBe("2026-09-24");
    expect(dayKey(late, "Africa/Kigali")).toBe("2026-09-25");
    expect(dayKey(late, "Not/AZone")).toBe("2026-09-24");
  });
});

import { describe, expect, it } from "vitest";

import { formatSpan, spanBetween } from "./durations";

describe("formatSpan", () => {
  it("uses at most two units", () => {
    expect(formatSpan(3 * 86_400_000 + 4 * 3_600_000 + 5 * 60_000)).toBe("3d 4h");
    expect(formatSpan(2 * 86_400_000)).toBe("2d");
    expect(formatSpan(90 * 60_000)).toBe("1h 30m");
    expect(formatSpan(45 * 60_000)).toBe("45m");
    expect(formatSpan(10_000)).toBe("under a minute");
    expect(formatSpan(-5)).toBe("under a minute");
  });
});

describe("spanBetween", () => {
  it("is null when either end is missing", () => {
    expect(spanBetween(null, "2026-09-01T00:00:00Z")).toBeNull();
    expect(spanBetween("2026-09-01T00:00:00Z", "2026-09-02T00:00:00Z")).toBe(86_400_000);
  });
});

import { describe, expect, it } from "vitest";

import { compactNumber, fromWallTime, toWallTime } from "./format";

describe("wall time on the profile clock", () => {
  it("shows and reads Kigali time whatever the machine's clock", () => {
    expect(toWallTime("2026-10-08T07:00:00.000Z", "Africa/Kigali")).toBe("2026-10-08T09:00");
    expect(fromWallTime("2026-10-08T09:00", "Africa/Kigali")).toBe("2026-10-08T07:00:00.000Z");
  });

  it("round-trips across a daylight-saving change", () => {
    // London moves to GMT on 25 October 2026.
    for (const wall of ["2026-10-24T10:00", "2026-10-26T10:00"]) {
      expect(toWallTime(fromWallTime(wall, "Europe/London"), "Europe/London")).toBe(wall);
    }
    expect(fromWallTime("2026-10-24T10:00", "Europe/London")).toBe("2026-10-24T09:00:00.000Z");
    expect(fromWallTime("2026-10-26T10:00", "Europe/London")).toBe("2026-10-26T10:00:00.000Z");
  });

  it("crosses midnight into the right day", () => {
    expect(toWallTime("2026-10-08T23:30:00.000Z", "Africa/Kigali")).toBe("2026-10-09T01:30");
  });
});

describe("compactNumber", () => {
  it("shortens without ever rounding up past the real figure", () => {
    expect(compactNumber(860)).toBe("860");
    expect(compactNumber(12_400)).toBe("12K");
    expect(compactNumber(3_180)).toBe("3.1K");
    expect(compactNumber(1_000)).toBe("1K");
    expect(compactNumber(2_450_000)).toBe("2.4M");
  });
});

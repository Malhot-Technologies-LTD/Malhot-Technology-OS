import { describe, expect, it } from "vitest";

import { hashClientIp } from "./ip-hash";

describe("hashClientIp", () => {
  const day1 = new Date("2026-09-16T10:00:00Z");
  const day1Later = new Date("2026-09-16T23:59:00Z");
  const day2 = new Date("2026-09-17T00:01:00Z");

  it("is stable within a day and salt", async () => {
    expect(await hashClientIp("203.0.113.9", "salt", day1)).toBe(await hashClientIp("203.0.113.9", "salt", day1Later));
  });

  it("rotates daily", async () => {
    expect(await hashClientIp("203.0.113.9", "salt", day1)).not.toBe(await hashClientIp("203.0.113.9", "salt", day2));
  });

  it("depends on the salt and the address", async () => {
    expect(await hashClientIp("203.0.113.9", "salt", day1)).not.toBe(await hashClientIp("203.0.113.9", "other", day1));
    expect(await hashClientIp("203.0.113.9", "salt", day1)).not.toBe(await hashClientIp("203.0.113.10", "salt", day1));
  });

  it("produces a 64-character hex digest", async () => {
    expect(await hashClientIp("::1", "salt", day1)).toMatch(/^[0-9a-f]{64}$/);
  });
});

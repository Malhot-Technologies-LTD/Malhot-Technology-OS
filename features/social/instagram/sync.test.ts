import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ requireServerEnv: () => "", siteUrl: "https://os.test" }));
vi.mock("@/lib/supabase/elevated/social-connections", () => ({}));

const { shouldRefresh } = await import("./sync");

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-07T03:00:00Z");
const at = (days: number) => new Date(NOW + days * DAY).toISOString();

describe("shouldRefresh", () => {
  it("renews a token in its last two weeks", () => {
    expect(shouldRefresh({ token_expires_at: at(10), token_issued_at: at(-50) }, NOW)).toBe(true);
  });

  it("leaves a fresh token alone", () => {
    expect(shouldRefresh({ token_expires_at: at(40), token_issued_at: at(-20) }, NOW)).toBe(false);
  });

  it("waits until the token is a day old, as Instagram requires", () => {
    expect(
      shouldRefresh({ token_expires_at: at(10), token_issued_at: new Date(NOW - 3_600_000).toISOString() }, NOW),
    ).toBe(false);
  });

  it("does not try to refresh an expired token: that needs a reconnect", () => {
    expect(shouldRefresh({ token_expires_at: at(-1), token_issued_at: at(-61) }, NOW)).toBe(false);
  });

  it("does nothing when Instagram gave no expiry", () => {
    expect(shouldRefresh({ token_expires_at: null, token_issued_at: at(-59) }, NOW)).toBe(false);
  });
});

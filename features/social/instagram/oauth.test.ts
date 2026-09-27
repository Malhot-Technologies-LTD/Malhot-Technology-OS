import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ siteUrl: "https://os.malhot.test" }));

const { checkState, newStateCookie, redirectUri } = await import("./oauth");

describe("OAuth state", () => {
  it("accepts only the state this browser was given, and returns its account", () => {
    const { state, value } = newStateCookie("acc-1");
    expect(checkState(value, state)).toBe("acc-1");
    expect(checkState(value, `${state}x`)).toBeNull();
    expect(checkState(value, newStateCookie("acc-1").state)).toBeNull();
  });

  it("refuses a missing cookie or state", () => {
    const { state, value } = newStateCookie("acc-1");
    expect(checkState(undefined, state)).toBeNull();
    expect(checkState(value, null)).toBeNull();
    expect(checkState("garbage", "garbage")).toBeNull();
  });
});

describe("redirectUri", () => {
  it("is the callback on the site's own origin, as registered in the Meta app", () => {
    expect(redirectUri()).toBe("https://os.malhot.test/api/integrations/instagram/callback");
  });
});

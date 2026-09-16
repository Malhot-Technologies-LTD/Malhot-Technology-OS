import { describe, expect, it } from "vitest";

import { DEFAULT_NEXT, safeNext } from "./redirects";

describe("safeNext", () => {
  it("falls back when empty", () => {
    expect(safeNext(null)).toBe(DEFAULT_NEXT);
    expect(safeNext(undefined)).toBe(DEFAULT_NEXT);
    expect(safeNext("")).toBe(DEFAULT_NEXT);
  });

  it("accepts same-site paths with query strings", () => {
    expect(safeNext("/os/projects/MAL?tab=goals")).toBe("/os/projects/MAL?tab=goals");
    expect(safeNext("/invite/abc")).toBe("/invite/abc");
  });

  it("rejects protocol-relative and external URLs", () => {
    expect(safeNext("//evil.example")).toBe(DEFAULT_NEXT);
    expect(safeNext("https://evil.example/os")).toBe(DEFAULT_NEXT);
    expect(safeNext("/\\evil.example")).toBe(DEFAULT_NEXT);
    expect(safeNext("/os\\..\\x")).toBe(DEFAULT_NEXT);
    expect(safeNext("javascript:alert(1)")).toBe(DEFAULT_NEXT);
  });

  it("rejects control characters", () => {
    expect(safeNext("/os\n/evil")).toBe(DEFAULT_NEXT);
  });

  it("strips our own origin from absolute URLs", () => {
    expect(safeNext("http://localhost:3000/invite/t", "http://localhost:3000")).toBe("/invite/t");
    expect(safeNext("http://localhost:3000", "http://localhost:3000")).toBe("/");
    expect(safeNext("http://localhost:3000.evil.example/x", "http://localhost:3000")).toBe(DEFAULT_NEXT);
  });

  it("never loops back into the auth flow", () => {
    expect(safeNext("/login")).toBe(DEFAULT_NEXT);
    expect(safeNext("/login?next=/os")).toBe(DEFAULT_NEXT);
    expect(safeNext("/auth/callback")).toBe(DEFAULT_NEXT);
  });
});

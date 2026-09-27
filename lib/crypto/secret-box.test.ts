import { randomBytes } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { open, seal } = await import("./secret-box");

const KEY = randomBytes(32).toString("base64");

describe("secret box", () => {
  it("round-trips, and never stores the plaintext", () => {
    const sealed = seal("IGAAtoken123", KEY);
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("IGAAtoken123");
    expect(open(sealed, KEY)).toBe("IGAAtoken123");
  });

  it("uses a fresh IV every time", () => {
    expect(seal("same", KEY)).not.toBe(seal("same", KEY));
  });

  it("rejects a wrong key and a tampered value", () => {
    const sealed = seal("secret", KEY);
    expect(() => open(sealed, randomBytes(32).toString("base64"))).toThrow();
    const parts = sealed.split(".");
    parts[3] = Buffer.from("forged").toString("base64url");
    expect(() => open(parts.join("."), KEY)).toThrow();
  });

  it("refuses keys of the wrong length", () => {
    expect(() => seal("x", randomBytes(16).toString("base64"))).toThrow(/32 random bytes/);
  });
});

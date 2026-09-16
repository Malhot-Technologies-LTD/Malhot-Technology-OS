import { describe, expect, it } from "vitest";

import { generateInvitationToken, hashInvitationToken, isWellFormedInvitationToken } from "./invitation-token";

describe("invitation tokens", () => {
  it("generates URL-safe tokens of a fixed length", () => {
    const token = generateInvitationToken();
    expect(token).toHaveLength(43);
    expect(isWellFormedInvitationToken(token)).toBe(true);
    expect(generateInvitationToken()).not.toBe(token);
  });

  it("rejects malformed tokens", () => {
    expect(isWellFormedInvitationToken("")).toBe(false);
    expect(isWellFormedInvitationToken("abc")).toBe(false);
    expect(isWellFormedInvitationToken("a".repeat(43) + "!")).toBe(false);
    expect(isWellFormedInvitationToken("a".repeat(42) + "/")).toBe(false);
  });

  it("hashes deterministically with SHA-256", async () => {
    const hash = await hashInvitationToken("hello");
    expect(hash).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    expect(await hashInvitationToken("hello")).toBe(hash);
    expect(await hashInvitationToken("hellp")).not.toBe(hash);
  });
});

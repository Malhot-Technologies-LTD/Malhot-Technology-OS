import { describe, expect, it } from "vitest";

import { connectRepositorySchema, parseRepoFullName, repoHtmlUrl } from "./schemas";

/**
 * The parser exists because nobody types `owner/name` — they paste whatever
 * GitHub's interface handed them. These are the forms that actually arrive.
 */
describe("parseRepoFullName", () => {
  const expected = "Malhot-Technologies-LTD/Malhot-Technology-OS";

  it.each([
    ["the address bar", "https://github.com/Malhot-Technologies-LTD/Malhot-Technology-OS"],
    ["a clone URL", "https://github.com/Malhot-Technologies-LTD/Malhot-Technology-OS.git"],
    ["an scp remote", "git@github.com:Malhot-Technologies-LTD/Malhot-Technology-OS.git"],
    ["no scheme", "github.com/Malhot-Technologies-LTD/Malhot-Technology-OS"],
    ["bare owner/name", "Malhot-Technologies-LTD/Malhot-Technology-OS"],
    ["a trailing slash", "https://github.com/Malhot-Technologies-LTD/Malhot-Technology-OS/"],
    ["surrounding space", "  https://github.com/Malhot-Technologies-LTD/Malhot-Technology-OS  "],
    ["www", "https://www.github.com/Malhot-Technologies-LTD/Malhot-Technology-OS"],
  ])("reads %s", (_label, input) => {
    expect(parseRepoFullName(input)).toEqual({ ok: true, fullName: expected });
  });

  it("drops the rest of a deep link", () => {
    // Copying the URL while browsing a file is the most likely paste of all.
    const deep = "https://github.com/Malhot-Technologies-LTD/Malhot-Technology-OS/blob/main/lib/permissions.ts#L42";
    expect(parseRepoFullName(deep)).toEqual({ ok: true, fullName: expected });
  });

  it("keeps the case GitHub shows, since the display should match the repo", () => {
    const parsed = parseRepoFullName("github.com/Malhot/OS");
    expect(parsed).toEqual({ ok: true, fullName: "Malhot/OS" });
  });

  /*
   * The important negative case. `gitlab.com/a/b` reduces to `a/b` under any
   * naive split, which would look connected while pointing nowhere.
   */
  it("refuses a non-GitHub host rather than silently keeping the path", () => {
    const parsed = parseRepoFullName("https://gitlab.com/malhot/os");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toContain("gitlab.com");
  });

  it("refuses an scp remote on another host", () => {
    expect(parseRepoFullName("git@bitbucket.org:malhot/os.git").ok).toBe(false);
  });

  it.each([
    ["empty", ""],
    ["only whitespace", "   "],
    ["owner with no repository", "malhot"],
    ["a GitHub URL with no repository", "https://github.com/malhot"],
    ["a name with a space", "malhot/my repo"],
  ])("refuses %s", (_label, input) => {
    expect(parseRepoFullName(input).ok).toBe(false);
  });

  it("explains which half is missing", () => {
    const parsed = parseRepoFullName("malhot");
    if (!parsed.ok) expect(parsed.message).toMatch(/owner/i);
    else expect.unreachable("a bare owner is not a repository");
  });
});

describe("repoHtmlUrl", () => {
  it("builds the address the row links to", () => {
    expect(repoHtmlUrl("malhot/os")).toBe("https://github.com/malhot/os");
  });
});

describe("connectRepositorySchema", () => {
  const projectId = "8f4a1f6e-1b3c-4d5e-9a7b-2c8d0e1f3a4b";

  it("stores owner/name from a pasted URL", () => {
    const parsed = connectRepositorySchema.safeParse({
      projectId,
      repository: "https://github.com/malhot/os.git",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.repository).toBe("malhot/os");
  });

  it("surfaces the parser's message against the field", () => {
    const parsed = connectRepositorySchema.safeParse({ projectId, repository: "https://gitlab.com/a/b" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("gitlab.com");
    }
  });

  it("rejects a project id that is not a uuid", () => {
    expect(connectRepositorySchema.safeParse({ projectId: "MAL", repository: "malhot/os" }).success).toBe(false);
  });

  it("rejects an address too long to be real", () => {
    const parsed = connectRepositorySchema.safeParse({ projectId, repository: `malhot/${"a".repeat(400)}` });
    expect(parsed.success).toBe(false);
  });
});

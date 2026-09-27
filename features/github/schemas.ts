import { z } from "zod";

/**
 * Shared by the connect form (zodResolver) and the Server Action (re-parse).
 * Mirrors the constraints in supabase/migrations/…_github_repositories.sql —
 * the database is the backstop, these are the readable messages.
 */

/** `owner/name`. Deliberately looser than GitHub's own rules; see the migration. */
export const REPO_FULL_NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,100}$/;

/**
 * What people actually paste.
 *
 * Nobody types `owner/name`. They copy the address bar, or the clone box, or
 * they right-click → Copy link, and each of those hands over something
 * different. Rejecting all of them to teach the correct format would be the
 * interface being pedantic about a problem it can solve, so every form below
 * reduces to the same two segments:
 *
 *   https://github.com/owner/name
 *   https://github.com/owner/name.git
 *   https://github.com/owner/name/tree/main/src
 *   git@github.com:owner/name.git
 *   github.com/owner/name
 *   owner/name
 *
 * A URL pointing at some other host is not silently accepted — `gitlab.com/a/b`
 * would reduce to `a/b` and look connected while pointing nowhere — so any input
 * carrying a host must carry GitHub's.
 */
export function parseRepoFullName(input: string): { ok: true; fullName: string } | { ok: false; message: string } {
  const raw = input.trim();
  if (raw === "") return { ok: false, message: "Paste a repository URL or owner/name" };

  // scp-style remote: git@github.com:owner/name.git
  const scp = /^(?:[\w.-]+@)?([\w.-]+):(.+)$/.exec(raw);
  let host: string | null = null;
  let path = raw;

  if (scp && !raw.includes("//")) {
    host = scp[1]!.toLowerCase();
    path = scp[2]!;
  } else if (/^[a-z][\w+.-]*:\/\//i.test(raw) || /^[\w.-]+\.[a-z]{2,}\//i.test(raw)) {
    const withScheme = /^[a-z][\w+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    let url: URL;
    try {
      url = new URL(withScheme);
    } catch {
      return { ok: false, message: "That does not look like a repository address" };
    }
    host = url.hostname.toLowerCase();
    path = url.pathname;
  }

  if (host !== null && host !== "github.com" && host !== "www.github.com") {
    return { ok: false, message: `That is a ${host} address, not a GitHub one` };
  }

  const segments = path
    .replace(/\.git$/i, "")
    .split("/")
    .filter((segment) => segment !== "");

  // A deep link carries the repository in its first two segments; drop the rest.
  if (segments.length < 2) return { ok: false, message: "Include both the owner and the repository name" };
  const fullName = `${segments[0]}/${segments[1]}`;

  if (!REPO_FULL_NAME_PATTERN.test(fullName)) {
    return { ok: false, message: "That does not look like a repository name" };
  }
  return { ok: true, fullName };
}

/** github.com is case-insensitive about owner and name; the unique index matches. */
export function repoHtmlUrl(fullName: string): string {
  return `https://github.com/${fullName}`;
}

export const connectRepositorySchema = z.object({
  projectId: z.string().uuid(),
  /*
   * Parsed rather than pattern-matched, so the field accepts a pasted URL and
   * stores `owner/name`. The message comes from the parser because it knows
   * which part was wrong.
   */
  repository: z
    .string()
    .trim()
    .min(1, "Paste a repository URL or owner/name")
    .max(300, "That is too long to be a repository address")
    .transform((value, ctx) => {
      const parsed = parseRepoFullName(value);
      if (!parsed.ok) {
        ctx.addIssue({ code: "custom", message: parsed.message });
        return z.NEVER;
      }
      return parsed.fullName;
    }),
});

export const disconnectRepositorySchema = z.object({
  repositoryId: z.string().uuid(),
});

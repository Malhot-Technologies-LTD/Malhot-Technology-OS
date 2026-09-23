import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PostgREST embeds must name the foreign key they travel along.
 *
 * `project_members` reaches `profiles` twice — through `user_id` and through
 * `added_by` — so `profile:profiles(...)` is ambiguous and PostgREST refuses
 * the entire query rather than guessing. That is not a soft failure: the rows
 * come back as an error, and a caller that tolerates errors renders "nobody is
 * on this project", which is a confident statement about the team rather than
 * an admission that nothing was read.
 *
 * The rule is therefore "always name it", not "name it where it is currently
 * ambiguous". A table with one relationship today gets a second one the day
 * someone adds `invited_by`, and the query that breaks is the one nobody
 * touched.
 *
 * Source-level rather than behavioural because the failure only reproduces
 * against a live PostgREST, and this catches it at the keystroke instead.
 */
const FEATURES = join(process.cwd(), "features");

function queryFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return queryFiles(path);
    return entry === "queries.ts" ? [path] : [];
  });
}

/** `profiles(` or `clients(` not preceded by `!fk_name`. */
const BARE_EMBED = /(?<!![a-z_]*)\b(profiles|clients|projects)\(/g;

describe("supabase embeds", () => {
  const files = queryFiles(FEATURES);

  it("finds the query modules to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((file) => [file.replace(process.cwd(), "").replace(/\\/g, "/"), file]))(
    "%s names the foreign key on every embed",
    (_label, file) => {
      const source = readFileSync(file, "utf8");
      // Only the select strings matter; prose in comments may mention profiles().
      const selects = [...source.matchAll(/\.select\(\s*("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g)].map((m) => m[1]);

      const offenders = selects.flatMap((select) => [...select.matchAll(BARE_EMBED)].map((m) => m[0]));
      expect(offenders, `unnamed embed in ${file}`).toEqual([]);
    },
  );
});

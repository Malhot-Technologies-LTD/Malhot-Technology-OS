// Regenerates types/database.ts from the live schema.
//   npm run db:types
//
// Replaces a hardcoded --project-id: the ref is derived from
// NEXT_PUBLIC_SUPABASE_URL in .env.local, so pointing the repo at a different
// Supabase project needs no code change.
//
// Two routes, in order of preference:
//   1. SUPABASE_DB_PASSWORD (or SUPABASE_DB_URL) set → connects straight to
//      Postgres. Needs no `supabase login`.
//   2. Otherwise → `--project-id`, which needs a logged-in CLI
//      (`npx supabase login`) or SUPABASE_ACCESS_TOKEN.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });

const OUT = "types/database.ts";

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is not set (see .env.example).");

const ref = new URL(url).hostname.split(".")[0];
if (!/^[a-z]{20}$/.test(ref)) {
  fail(`Could not read a project ref from NEXT_PUBLIC_SUPABASE_URL (got "${ref}").`);
}

const dbUrl =
  process.env.SUPABASE_DB_URL ??
  (process.env.SUPABASE_DB_PASSWORD
    ? `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@db.${ref}.supabase.co:5432/postgres`
    : null);

const args = dbUrl
  ? ["supabase", "gen", "types", "typescript", "--db-url", dbUrl, "--schema", "public"]
  : ["supabase", "gen", "types", "typescript", "--project-id", ref, "--schema", "public"];

console.log(`Generating ${OUT} from project ${ref} (${dbUrl ? "direct connection" : "management API"})…`);

let generated;
try {
  generated = execFileSync("npx", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, shell: true });
} catch (error) {
  const detail = error.stderr?.toString().trim() || error.message;
  fail(
    `supabase gen types failed:\n\n${detail}\n\n` +
      (dbUrl
        ? "Check SUPABASE_DB_PASSWORD (Supabase → Settings → Database)."
        : "Run `npx supabase login` first, or set SUPABASE_DB_PASSWORD to skip the login."),
  );
}

if (!generated.includes("export type Database")) {
  fail("supabase gen types returned no schema. Nothing was written.");
}

// Keep the hand-written header that tells the next person how to regenerate.
const header = readFileSync(OUT, "utf8").match(/^\/\*\*[\s\S]*?\*\/\n/)?.[0] ?? "";
const stamp = header.replace(/Source: .*/, `Source: supabase gen types typescript, project ${ref}.`);

writeFileSync(OUT, stamp + generated, "utf8");
console.log(`✔ Wrote ${OUT}`);

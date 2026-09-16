// Compares types/database.ts with freshly generated output, ignoring the
// hand-written header and the environment-specific __InternalSupabase block.
//   node scripts/check-types-drift.mjs <generated-file>
import { readFileSync } from "node:fs";

const [, , generatedPath] = process.argv;
if (!generatedPath) {
  console.error("usage: node scripts/check-types-drift.mjs <generated-file>");
  process.exit(2);
}

function normalise(source) {
  return source
    .replace(/^\/\*\*[\s\S]*?\*\/\s*/, "") // leading JSDoc header
    .replace(/\s*\/\/ Allows to automatically[\s\S]*?__InternalSupabase: \{[\s\S]*?\}\n/, "\n")
    .replace(/\s+$/gm, "")
    .trim();
}

const committed = normalise(readFileSync("types/database.ts", "utf8"));
const generated = normalise(readFileSync(generatedPath, "utf8"));

if (committed !== generated) {
  const a = committed.split("\n");
  const b = generated.split("\n");
  const firstDiff = a.findIndex((line, i) => line !== b[i]);
  console.error(`types/database.ts is stale — run npm run db:types (first difference near line ${firstDiff + 1}):`);
  console.error(`  committed: ${a[firstDiff] ?? "<end>"}`);
  console.error(`  generated: ${b[firstDiff] ?? "<end>"}`);
  process.exit(1);
}
console.log("types/database.ts matches the schema");

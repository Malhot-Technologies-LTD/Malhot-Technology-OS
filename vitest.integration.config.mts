import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Integration tests against a local Supabase stack (`npx supabase start`).
 * Run with `npm run test:integration`; env from `npx supabase status -o env`.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});

import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Unit + component tests (docs/engineering/testing-strategy.md). Integration
 * tests against local Supabase get their own config when they land.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "tests/e2e/**", "tests/integration/**"],
    // Component tests opt into jsdom with a `// @vitest-environment jsdom` file header.
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/auth/redirects.ts", "features/auth/lib/**", "features/organization/lib/**"],
      thresholds: { branches: 100 },
    },
  },
});

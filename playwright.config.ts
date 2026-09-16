import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end journeys (docs/engineering/testing-strategy.md). Runs against a
 * production build so behaviour matches deploys. Set E2E_BASE_URL to target a
 * running server instead.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    viewport: { width: 1366, height: 800 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Website specs also run at phone size (docs/design/responsive-strategy.md: website is mobile-first).
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /website.spec.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});

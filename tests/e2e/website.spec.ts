import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Journey 12: website renders, navigation works, contact form validates and
 * submits. Submission needs the secret key on the server (creates a real
 * enquiry), so it runs only where E2E credentials are configured, and the
 * enquiry it creates is marked with a recognisable email for cleanup.
 */
const canSubmit = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

const PAGES = [
  { path: "/", heading: "Software that ships. Systems that last." },
  { path: "/services", heading: "Complete software delivery, one team" },
  { path: "/work", heading: "Problems we have solved" },
  { path: "/process", heading: "How we work" },
  { path: "/about", heading: "A software company that ships" },
  { path: "/contact", heading: "Start a project" },
  { path: "/privacy", heading: "Privacy notice" },
] as const;

for (const page of PAGES) {
  test(`${page.path} renders its heading and has no serious accessibility violations`, async ({ page: browser }) => {
    await browser.goto(page.path);
    await expect(browser.getByRole("heading", { level: 1, name: page.heading })).toBeVisible();
    const results = await new AxeBuilder({ page: browser }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`).join("\n")).toEqual([]);
  });
}

test("primary navigation reaches every section", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: "Open menu" }).click();
  }
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Work" }).click();
  await expect(page).toHaveURL(/\/work$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Problems we have solved");
});

test("case study pages open from the work index", async ({ page }) => {
  await page.goto("/work");
  await page.getByRole("link", { name: /delivery tracking tool/i }).click();
  await expect(page).toHaveURL(/\/work\/delivery-tracking-tool$/);
  await expect(page.getByRole("heading", { level: 2, name: "Problem", exact: true })).toBeVisible();
});

test("login page is reachable from the website and noindexed", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Team login" }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("contact form validates before sending", async ({ page }) => {
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/fields? needs? attention/)).toBeVisible();
  await expect(page.getByText("Enter your name")).toBeVisible();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
});

test("sitemap and robots exclude the OS", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \/os/);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/work/delivery-tracking-tool");
  expect(sitemap).not.toContain("/os");
});

test.describe("with a configured backend", () => {
  test.skip(!canSubmit, "E2E_EMAIL / E2E_PASSWORD not set");

  test("submits an enquiry", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("textbox", { name: "Name" }).fill("E2E Visitor");
    await page.getByRole("textbox", { name: "Email" }).fill("e2e-visitor@example.com");
    await page
      .getByRole("textbox", { name: "What are you trying to build?" })
      .fill("Automated end-to-end enquiry: safe to delete. We need a small internal tool.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Thanks, we have your message.")).toBeVisible();
  });
});

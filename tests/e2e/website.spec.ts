import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Journey 12: website renders, navigation works, contact form validates and
 * submits.
 *
 * /work and /process only exist as redirects since the Malhot-Website import;
 * the headings below are the light corporate redesign's.
 *
 * Submission needs the secret key on the server (it creates a real enquiry),
 * so it runs only where E2E credentials are configured, and the enquiry it
 * creates is marked with a recognisable email for cleanup.
 */
const canSubmit = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

const PAGES = [
  { path: "/", heading: "We design, build and ship software that businesses run on." },
  { path: "/about", heading: "A software team that finishes what it starts" },
  { path: "/services", heading: "Everything you need to build, launch and grow" },
  { path: "/projects", heading: "Real solutions. Real impact." },
  { path: "/contact", heading: "We'd love to hear from you." },
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
  // Exact: the Projects dropdown opens on hover and holds an "All projects" link too.
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Projects", exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Real solutions");
});

test("project pages open from the projects index", async ({ page }) => {
  await page.goto("/projects");
  const card = page.getByRole("link", { name: /nexus circle pulse/i }).first();
  await expect(card).toHaveAttribute("href", "/projects/nexus-circle-pulse");
  await card.click();
  await expect(page).toHaveURL(/\/projects\/nexus-circle-pulse$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nexus Circle Pulse");
});

test("the previous site's routes still resolve", async ({ page }) => {
  // Indexed before the site was replaced; a 308 keeps the inbound links alive.
  await page.goto("/work");
  await expect(page).toHaveURL(/\/projects$/);
  await page.goto("/work/delivery-tracking-tool");
  await expect(page).toHaveURL(/\/projects$/);
  await page.goto("/process");
  await expect(page).toHaveURL(/\/services$/);
});

test("login page is reachable from the footer and noindexed", async ({ page }) => {
  // The team login lives in the footer, not the header: visitors have no account.
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Team sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("contact form validates before sending", async ({ page }) => {
  await page.goto("/contact");
  /*
   * Type first. The page is static, so a click fired before hydration lands on
   * inert HTML and the test watches for an error that was never going to
   * appear. A filled field is proof React is listening — and one character is
   * still too short to pass, so the assertion below is unaffected.
   */
  await page.getByRole("textbox", { name: "Your name" }).fill("A");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Please tell us your name")).toBeVisible();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
});

test("the project brief wizard refuses to advance on an empty step", async ({ page }) => {
  await page.goto("/start");
  // Wait for hydration before clicking, as above.
  await expect(page.getByRole("button", { name: "Next step" })).toBeEnabled();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByText("Choose the option that fits best.")).toBeVisible();
  await page.getByText("Build a new product").click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByRole("heading", { name: "Project type" })).toBeVisible();
});

test("sitemap and robots exclude the OS", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \/os/);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/projects/nexus-circle-pulse");
  expect(sitemap).not.toContain("/os");
  // A form at the end of a funnel has no business in a search result.
  expect(sitemap).not.toContain("/start");
});

test.describe("with a configured backend", () => {
  test.skip(!canSubmit, "E2E_EMAIL / E2E_PASSWORD not set");

  test("submits an enquiry", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("textbox", { name: "Your name" }).fill("E2E Visitor");
    await page.getByRole("textbox", { name: "Email address" }).fill("e2e-visitor@example.com");
    await page
      .getByRole("textbox", { name: "Message" })
      .fill("Automated end-to-end enquiry: safe to delete. We need a small internal tool.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Message received")).toBeVisible();
  });
});

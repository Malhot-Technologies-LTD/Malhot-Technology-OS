import { expect, test } from "@playwright/test";

/**
 * Journey 1 — login, logout, protected redirect.
 * Password sign-in needs a real account: set E2E_EMAIL / E2E_PASSWORD
 * (create one with scripts/bootstrap-org.ts). Those steps skip otherwise.
 */
const credentials =
  process.env.E2E_EMAIL && process.env.E2E_PASSWORD
    ? { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
    : null;

test("unauthenticated visit to /os redirects to login and preserves the destination", async ({ page }) => {
  await page.goto("/os/settings/profile");
  await expect(page).toHaveURL(/\/login\?next=%2Fos%2Fsettings%2Fprofile$/);
  await expect(page.getByRole("heading", { name: "Sign in to Malhot OS" })).toBeVisible();
});

test("login form validates before submitting", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await expect(page.getByText("Enter your password")).toBeVisible();
});

test("callback errors are explained on the login page", async ({ page }) => {
  await page.goto(
    "/auth/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
  );
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.locator('[data-slot="field-error"]')).toContainText("expired");
});

test("open redirects are neutralised", async ({ page }) => {
  await page.goto("/login?next=https://evil.example");
  // The form carries the sanitised value; a successful login would land on /os.
  await expect(page.locator('input[name="next"]')).toHaveCount(0);
});

test.describe("with an account", () => {
  test.skip(!credentials, "E2E_EMAIL / E2E_PASSWORD not set");

  // Needs a reachable auth server, which only the account-configured environments have.
  test("wrong password shows a clear error and stays on the page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator('[data-slot="field-error"]')).toContainText(/not right|invited/);
    await expect(page).toHaveURL(/\/login/);
  });

  test("signs in, lands on the dashboard, and signs out", async ({ page }) => {
    await page.goto("/login?next=%2Fos%2Fsettings%2Fprofile");
    await page.getByLabel("Email").fill(credentials!.email);
    await page.getByLabel("Password").fill(credentials!.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/os\/settings\/profile$/);
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

    // Journey 1 also covers editing the profile.
    const title = page.getByLabel("Title");
    await title.fill("Smoke tester");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Profile saved")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Title")).toHaveValue("Smoke tester");

    await page.goto("/login");
    await expect(page).toHaveURL(/\/os$/);

    await page.getByRole("button", { name: /^Account menu/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/os");
    await expect(page).toHaveURL(/\/login/);
  });
});

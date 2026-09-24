import { expect } from "@playwright/test";
import { PLAN, startWithSample, test } from "./helpers";

test.describe("App shell", () => {
  test("screens that need a policy send a fresh visitor to the start", async ({ page }) => {
    for (const path of ["/coverage", "/hospitals", "/journey"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test("skip link is the first stop and moves focus to the content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("each screen has its own page title", async ({ page }) => {
    await startWithSample(page);
    await expect(page).toHaveTitle(/^Your coverage · Hospitality$/);
    await page.goto("/hospitals");
    await expect(page).toHaveTitle(/^Find a hospital · Hospitality$/);
    await page.goto("/journey");
    await expect(page).toHaveTitle(/^Your stay · Hospitality$/);
  });

  test("the AI disclosure is always present and expands", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /Not a coverage guarantee/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/does not diagnose, does not recommend treatment/)).toBeVisible();
  });

  test("starting over can be undone", async ({ page }) => {
    await startWithSample(page);
    await page.getByRole("button", { name: "Start over with a new policy" }).click();
    await expect(page).toHaveURL(/\/$/);

    const toast = page.getByRole("status").filter({ hasText: "Started over" });
    await expect(toast).toBeVisible();
    await toast.getByRole("button", { name: "Undo" }).click();

    await expect(page).toHaveURL(/\/coverage$/);
    await expect(page.getByRole("heading", { level: 1, name: PLAN })).toBeVisible();
  });

  test("unknown routes get a helpful 404", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This page isn’t here" })).toBeVisible();
    await page.getByRole("link", { name: "Back to the start" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("responses carry security headers and hide the framework", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("icon and social preview image are served", async ({ request }) => {
    const icon = await request.get("/icon.svg");
    expect(icon.ok()).toBeTruthy();
    const og = await request.get("/opengraph-image");
    expect(og.ok()).toBeTruthy();
    expect(og.headers()["content-type"]).toContain("image/png");
  });
});

test.describe("Theme", () => {
  test.use({ colorScheme: "dark" });

  test("follows the system, and a chosen theme survives a reload", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");

    const group = page.getByRole("radiogroup", { name: "Colour theme" }).first();
    await group.getByRole("radio", { name: "Light" }).click();
    await expect(html).toHaveAttribute("data-theme", "light");
    await expect(group.getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true");

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "light");

    await page.getByRole("radiogroup", { name: "Colour theme" }).first()
      .getByRole("radio", { name: "Match system" }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
  });
});

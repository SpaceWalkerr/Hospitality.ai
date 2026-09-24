import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, PLAN } from "./helpers";

test.describe("Landing", () => {
  test("leads with one primary action, visible without scrolling", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("decode a policy");

    const cta = page.getByRole("button", { name: /See it read a real policy/ }).first();
    await expect(cta).toBeInViewport();
    await expect(page.getByRole("banner").getByText(/^Demo/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("primary action opens the sample policy in one click", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /See it read a real policy/ }).first().click();
    await expect(page).toHaveURL(/\/coverage$/);
    await expect(page.getByRole("heading", { level: 1, name: PLAN })).toBeVisible();
  });

  test("'Use my own policy' opens the paste tab", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Use my own policy" }).first().click();
    await expect(page.getByRole("tab", { name: "Paste text" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Policy text")).toBeVisible();
  });

  test("start tabs follow the ARIA tabs pattern", async ({ page }) => {
    await page.goto("/#start");
    const sample = page.getByRole("tab", { name: "Use a sample" });
    await sample.focus();
    await page.keyboard.press("ArrowRight");

    const paste = page.getByRole("tab", { name: "Paste text" });
    await expect(paste).toBeFocused();
    await expect(paste).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "start-tab-paste");
  });

  test("paste validation explains what is missing and gates the button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Use my own policy" }).first().click();

    const input = page.getByLabel("Policy text");
    const submit = page.getByRole("tabpanel").getByRole("button", { name: /Read this policy/ });

    await input.fill("Too short to be a policy.");
    await input.blur();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(/to go\.$/)).toBeVisible();
    await expect(submit).toBeDisabled();

    await input.fill("Policy clause text. ".repeat(20));
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    await expect(submit).toBeEnabled();
  });

  test("a returning visitor is offered their previous session", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /See it read a real policy/ }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: PLAN })).toBeVisible();

    await page.goto("/");
    await expect(page.getByText("Welcome back.")).toBeVisible();
    await page.getByRole("link", { name: /Pick up where you left off/ }).click();
    await expect(page).toHaveURL(/\/hospitals$/);
  });
});

import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, startWithSample } from "./helpers";

test.describe("Coverage", () => {
  test.beforeEach(async ({ page }) => {
    await startWithSample(page);
  });

  test("leads with the verdict: sum insured and key limits", async ({ page }) => {
    const verdict = page.locator("#verdict");
    await expect(verdict.getByText("₹5,00,000")).toBeVisible();
    await expect(verdict.getByText("Room limit / day")).toBeVisible();
    await expect(verdict.getByText("₹5,000", { exact: true })).toBeVisible();
    await expect(verdict.getByText("Watch the room rate.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("the plain-language brief and summary points stream in", async ({ page }) => {
    const summary = page.locator("#summary");
    await expect(summary.getByText("In plain language")).toBeVisible();
    await expect(summary.locator("[aria-live=polite] p").first()).not.toBeEmpty();
    await expect(summary.getByRole("listitem").first()).toBeVisible();
  });

  test("a clause chip opens the source, and Escape returns focus to it", async ({ page }) => {
    const chip = page.locator("#verdict button[aria-haspopup=dialog]").first();
    await chip.click();

    const sheet = page.getByRole("dialog", { name: /Source for clause/ });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(/Verified in source|Close match|Not found in source/).first()).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Close source" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(chip).toBeFocused();
  });

  test("section nav jumps to a section and tracks it", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Coverage sections" });
    await nav.getByRole("link", { name: "Not covered" }).click();
    await expect(page).toHaveURL(/#exclusions$/);
    await expect(page.getByRole("heading", { name: "Exclusions and waiting periods" })).toBeInViewport();
    await expect(nav.getByRole("link", { name: "Not covered" })).toHaveAttribute("aria-current", "location");
    // Focus follows the jump, so keyboard and screen-reader users land there too.
    await expect(page.locator("#exclusions")).toBeFocused();
  });

  test("the next step is always reachable and leads to hospitals", async ({ page }) => {
    await page.locator("#next-step").scrollIntoViewIfNeeded();
    await page.locator("#next-step").getByRole("link", { name: /Find hospitals/ }).click();
    await expect(page).toHaveURL(/\/hospitals$/);
  });

  test("the sticky next-step bar appears once the verdict scrolls away", async ({ page }) => {
    // Hidden, the bar is faded out and inert: unfocusable and out of the
    // accessibility tree, so it can't be tabbed to by accident.
    const bar = page.locator("div.fixed").filter({ hasText: "find hospitals this cover fits" });
    await expect(bar).toHaveAttribute("inert", "");
    await page.locator("#costs").scrollIntoViewIfNeeded();
    await expect(bar).not.toHaveAttribute("inert");
    await expect(bar.getByRole("link", { name: /Find hospitals/ })).toBeInViewport();
  });
});

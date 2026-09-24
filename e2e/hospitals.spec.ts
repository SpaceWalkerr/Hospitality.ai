import { expect } from "@playwright/test";
import { expectNoHorizontalOverflow, startWithSample, test } from "./helpers";

test.describe("Hospitals", () => {
  test.beforeEach(async ({ page }) => {
    await startWithSample(page);
    await page.goto("/hospitals");
    await expect(page.locator("#top-match").getByRole("heading", { level: 2 })).toBeVisible();
  });

  test("puts the top match, with what you'd pay, before everything else", async ({ page }) => {
    const top = page.locator("#top-match");
    await expect(top.getByText("Top match for your cover")).toBeVisible();
    await expect(top.getByText("You’d pay, estimated")).toBeVisible();
    await expect(top.getByText(/^₹[\d,]+$/).first()).toBeVisible();

    const topName = await top.getByRole("heading", { level: 2 }).textContent();
    const firstCard = page.getByRole("list", { name: "Ranked hospitals" }).getByRole("article").first();
    await expect(firstCard.getByRole("heading", { level: 3 })).toHaveText(topName!);
    await expectNoHorizontalOverflow(page);
  });

  test("filters narrow the list and announce the new count", async ({ page }) => {
    const count = page.locator("#results p[aria-live=polite]");
    const cards = page.getByRole("list", { name: "Ranked hospitals" }).getByRole("article");
    await expect(count).toContainText("14");
    const before = await cards.count();

    const chip = page.getByRole("button", { name: /Room within limit/ });
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => cards.count()).toBeLessThan(before);
    await expect(count).toContainText(String(await cards.count()));

    await page.getByRole("button", { name: /Clear filters to see all/ }).click();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await expect(cards).toHaveCount(before);
  });

  test("sorting by distance puts the nearest first", async ({ page }) => {
    await page.getByRole("radio", { name: "Nearest" }).click();
    const distances = await page
      .getByRole("list", { name: "Ranked hospitals" })
      .getByRole("article")
      .evaluateAll((els) =>
        els.map((el) => parseFloat(el.textContent!.match(/([\d.]+) km/)![1])),
      );
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  test("choosing a hospital confirms it and offers the next step", async ({ page }) => {
    const top = page.locator("#top-match");
    const name = (await top.getByRole("heading", { level: 2 }).textContent())!;
    await top.getByRole("button", { name: "Choose this hospital" }).click();

    await expect(page.getByRole("status").filter({ hasText: `${name} selected` })).toBeVisible();
    await expect(top.getByRole("button", { name: "Selected" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("link", { name: /Plan the stay/ }).click();
    await expect(page).toHaveURL(/\/journey$/);
  });

  test("case inputs are a one-line summary on phones and a form on desktop", async ({ page, isMobile }) => {
    const reason = page.getByLabel("Reason for admission");
    if (isMobile) {
      await expect(reason).toBeHidden();
      const edit = page.getByRole("button", { name: /Your case/ });
      await edit.click();
      await expect(edit).toHaveAttribute("aria-expanded", "true");
    }
    await expect(reason).toBeVisible();
  });

  test("changing the case re-ranks the hospitals", async ({ page, isMobile }) => {
    if (isMobile) await page.getByRole("button", { name: /Your case/ }).click();
    await page.getByLabel("Starting from").selectOption({ index: 3 });
    await expect(page.locator("#top-match").getByRole("heading", { level: 2 })).toBeVisible();
    await expect(page.getByRole("list", { name: "Ranked hospitals" }).getByRole("article")).toHaveCount(14);
  });
});

import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, startWithHospital, startWithSample } from "./helpers";

test.describe("Journey", () => {
  test("walks all four stages with policy-grounded guidance", async ({ page }) => {
    await startWithHospital(page);
    await page.goto("/journey");

    const guidance = page.getByRole("list", { name: /^Guidance for/ });
    await expect(page.locator("#stage-title")).not.toHaveText(/Loading/);
    await expect(guidance.getByRole("article")).toHaveCount(4);
    await expect(page.getByText("Stage 1 of 4")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    for (const next of ["Investigation", "Procedure", "Recovery"]) {
      await page.getByRole("button", { name: `Next: ${next}` }).click();
      await expect(guidance).toHaveAccessibleName(`Guidance for ${next}`);
      await expect(guidance.getByRole("article")).toHaveCount(4);
    }

    await expect(page.getByText("Stage 4 of 4")).toBeVisible();
    await expect(page.getByRole("heading", { name: /all four stages/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to your coverage" })).toBeVisible();
  });

  test("every guidance item cites its clause", async ({ page }) => {
    await startWithHospital(page);
    await page.goto("/journey");
    const cards = page.getByRole("list", { name: /^Guidance for/ }).getByRole("article");
    await expect(cards).toHaveCount(4);
    for (const card of await cards.all()) {
      await expect(card.getByRole("button", { name: /Clause/ }).or(card.getByText("General guidance"))).toBeVisible();
    }
  });

  test("shows the chosen hospital, with a way to change it", async ({ page }) => {
    await startWithHospital(page);
    await page.goto("/journey");
    const admission = page.getByRole("region").filter({ hasText: "Your admission" });
    await expect(admission).toBeVisible();
    await expect(admission.getByRole("link", { name: "Change" })).toHaveAttribute("href", "/hospitals");
  });

  test("without a hospital, offers to pick one instead of a dead end", async ({ page }) => {
    await startWithSample(page);
    await page.goto("/journey");
    await expect(page.getByRole("heading", { name: "No hospital chosen yet" })).toBeVisible();
    await page.getByRole("link", { name: /Pick a hospital/ }).click();
    await expect(page).toHaveURL(/\/hospitals$/);
  });

  test("the Ask box answers from the document (Demo Mode)", async ({ page }) => {
    await startWithSample(page);
    await page.goto("/journey");
    const ask = page.getByRole("region", { name: "Ask about your cover" });
    await ask.getByRole("button", { name: "Is a private room worth it here?" }).click();
    await expect(ask.getByText("You asked:")).toBeVisible();
    await expect(ask.locator("[aria-live=polite]")).toContainText("Demo Mode");
  });
});

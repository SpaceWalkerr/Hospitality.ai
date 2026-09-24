import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { startWithHospital, test } from "./helpers";

/**
 * Automated WCAG 2.2 AA scan of every screen, in both themes.
 *
 * Motion is reduced so the scan never catches an element mid-fade (which
 * reads as a contrast failure), and the wait lets scroll-reveal fail-safes
 * settle. axe finds roughly a third of real accessibility problems; the
 * keyboard and focus tests in the other specs cover more.
 */
async function scan(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(1800);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length}× — ${v.nodes[0]?.target.join(" ")}`,
  );
  expect(summary, "axe WCAG 2.2 AA violations").toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`Accessibility (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    test("landing", async ({ page }) => {
      await page.goto("/");
      await scan(page);
    });

    test("coverage, hospitals and journey", async ({ page }) => {
      await startWithHospital(page);
      await page.goto("/coverage");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await scan(page);

      await page.goto("/hospitals");
      await expect(page.locator("#top-match h2")).toBeVisible();
      await scan(page);

      await page.goto("/journey");
      await expect(page.getByRole("list", { name: /^Guidance for/ }).getByRole("article")).toHaveCount(4);
      await scan(page);
    });

    test("citation sheet", async ({ page }) => {
      await startWithHospital(page);
      await page.goto("/coverage");
      await page.locator("#verdict button[aria-haspopup=dialog]").first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await scan(page);
    });
  });
}

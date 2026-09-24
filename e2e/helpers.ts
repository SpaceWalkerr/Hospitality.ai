import { test as base, expect, type Page } from "@playwright/test";

/**
 * Every test gets its own client address. The API is rate limited per client
 * (middleware.ts), and a parallel suite all arriving from 127.0.0.1 would
 * share one budget and trip it — which is the limiter working, not a bug.
 * The rate-limit spec exercises the limits deliberately.
 */
export const test = base.extend({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use, testInfo) => {
    const seed = `${testInfo.testId}:${testInfo.repeatEachIndex}:${testInfo.retry}`;
    let h = 0;
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const ip = `10.${(h >>> 16) & 255}.${(h >>> 8) & 255}.${h & 255}`;
    await use({ ...extraHTTPHeaders, "x-forwarded-for": ip });
  },
});

export const PLAN = /Sampoorna Suraksha/;

/**
 * Starts a session the way a first-time visitor does: the hero's primary
 * button, which opens the Meridian sample and lands on the coverage screen.
 * Session state lives in sessionStorage, so later page.goto calls in the same
 * test keep it.
 */
export async function startWithSample(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /See it read a real policy/ }).first().click();
  await expect(page).toHaveURL(/\/coverage$/);
  await expect(page.getByRole("heading", { level: 1, name: PLAN })).toBeVisible();
}

/** Starts a session and chooses the top-ranked hospital. */
export async function startWithHospital(page: Page) {
  await startWithSample(page);
  await page.goto("/hospitals");
  const top = page.locator("#top-match");
  await expect(top.getByRole("heading", { level: 2 })).toBeVisible();
  await top.getByRole("button", { name: "Choose this hospital" }).click();
  await expect(top.getByRole("button", { name: "Selected" })).toBeVisible();
}

/** Fails if the page scrolls sideways — the most common mobile layout bug. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page should not scroll horizontally").toBeLessThanOrEqual(0);
}

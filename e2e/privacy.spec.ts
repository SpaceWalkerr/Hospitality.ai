import { expect, type Page } from "@playwright/test";
import { startWithSample, test } from "./helpers";

const CONSENT = /I agree that Hospitality may read this document/;

/**
 * Opens a start-card tab and waits until it is actually selected. Under heavy
 * parallel load a click can land before hydration and do nothing, so the
 * click is retried until the tab takes.
 */
async function openTab(page: Page, name: "Paste text" | "Upload PDF") {
  await page.goto("/");
  const tab = page.getByRole("tab", { name });
  await expect(async () => {
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
}

test.describe("Consent", () => {
  test("upload stays locked until the box is ticked", async ({ page }) => {
    await openTab(page, "Upload PDF");

    const drop = page.getByRole("button", { name: /Choose a PDF or drag it here/ });
    await expect(drop).toBeDisabled();
    await expect(page.getByText("Tick the box above first.")).toBeVisible();

    await page.getByLabel(CONSENT).check();
    await expect(drop).toBeEnabled();
  });

  test("the consent names where the document goes and links the notice", async ({ page }) => {
    await openTab(page, "Paste text");
    const box = page.getByRole("tabpanel");
    // The public preview runs in Demo Mode, so the wording must say the
    // document is NOT sent anywhere — and never claim the opposite.
    await expect(box.getByText(/not sent to any AI service/)).toBeVisible();
    await expect(box.getByRole("link", { name: "Privacy notice" })).toHaveAttribute("href", "/privacy");
    await expect(box.getByRole("link", { name: "Terms of use" })).toHaveAttribute("href", "/terms");
  });
});

test.describe("Consent is enforced by the server", () => {
  test("reading someone's own document without consent is refused", async ({ request }) => {
    const res = await request.post("/api/policy/parse", {
      data: { text: "Policy clause text. ".repeat(40), name: "mine.txt" },
    });
    const body = await res.text();
    expect(body).toContain("confirm you agree to how your document is used");
    expect(body).not.toContain('"type":"policy"');
  });

  test("an out-of-date consent version is refused", async ({ request }) => {
    const res = await request.post("/api/policy/parse", {
      data: { text: "Policy clause text. ".repeat(40), name: "mine.txt", consent: "2020-01-01" },
    });
    expect(await res.text()).toContain("confirm you agree");
  });

  test("PDF extraction without consent is refused", async ({ request }) => {
    const res = await request.post("/api/policy/extract", {
      multipart: { file: { name: "p.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") } },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/tick the box/i);
  });

  test("the bundled samples need no consent — they are not personal data", async ({ request }) => {
    const res = await request.post("/api/policy/parse", { data: { sampleId: "meridian" } });
    expect(await res.text()).toContain('"type":"policy"');
  });
});

test.describe("Legal pages", () => {
  for (const [path, title] of [
    ["/privacy", "Privacy notice"],
    ["/terms", "Terms of use"],
  ] as const) {
    test(`${title} is reachable from every page and marked as a draft`, async ({ page }) => {
      await page.goto("/");
      await page.getByRole("contentinfo").getByRole("link", { name: title }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.getByRole("note")).toContainText("Draft, under legal review");
    });
  }

  test("the privacy notice discloses the AI provider and the IP retention window", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByText(/Our AI provider, Anthropic/)).toBeVisible();
    await expect(page.getByText(/at most 20 minutes/)).toBeVisible();
    await expect(page.getByText(/sets no cookies, uses no analytics/)).toBeVisible();
  });

  test("the terms lead with emergency numbers", async ({ page }) => {
    await page.goto("/terms");
    const first = page.locator("article section").first();
    await expect(first).toContainText("112");
    await expect(first).toContainText("108");
  });
});

test.describe("Delete my data", () => {
  test("removes the session and the theme, with no undo", async ({ page }) => {
    await startWithSample(page);
    await page.evaluate(() => localStorage.setItem("hospitality.theme", "dark"));

    await page.getByRole("contentinfo").getByRole("button", { name: "Delete my data" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("can’t be undone");
    await dialog.getByRole("button", { name: "Delete everything" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Your data was deleted")).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);

    const left = await page.evaluate(() =>
      [...Object.keys(sessionStorage), ...Object.keys(localStorage)].filter((k) => k.startsWith("hospitality.")),
    );
    expect(left).toEqual([]);

    // The coverage page has nothing to show and sends the reader back to the start.
    await page.goto("/coverage");
    await expect(page).toHaveURL(/\/$/);
  });

  test("“Keep it” leaves everything in place", async ({ page }) => {
    await startWithSample(page);
    await page.getByRole("contentinfo").getByRole("button", { name: "Delete my data" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Keep it" }).click();
    await page.goto("/coverage");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/coverage$/);
  });
});

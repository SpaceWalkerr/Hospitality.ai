import { readFileSync } from "node:fs";
import { expect } from "@playwright/test";
import { CONSENT_VERSION } from "../lib/legal";
import { test } from "./helpers";

/**
 * The PDF path, end to end, on a real text PDF of the Meridian sample
 * (e2e/fixtures/meridian-policy.pdf, generated from lib/data/samplePolicies.ts).
 *
 * Line structure is the thing to protect: every coverage claim cites a line
 * range, so an extractor that collapses the document into one paragraph
 * would leave every citation pointing at "line 1".
 */
const PDF = readFileSync("e2e/fixtures/meridian-policy.pdf");

test.describe("PDF upload", () => {
  test("extraction keeps the document's lines", async ({ request }) => {
    const res = await request.post("/api/policy/extract", {
      multipart: {
        file: { name: "meridian-policy.pdf", mimeType: "application/pdf", buffer: PDF },
        consent: CONSENT_VERSION,
      },
    });
    expect(res.ok()).toBe(true);
    const { text, pages } = await res.json();
    const lines = text.split("\n");

    expect(pages).toBe(3);
    expect(lines.length).toBeGreaterThan(100);
    expect(lines[0]).toBe("MERIDIAN HEALTH INSURANCE COMPANY LIMITED");
    // A clause that wraps across two lines in the source stays on two lines.
    expect(text).toContain(
      "1.2 Room, Boarding and Nursing Expenses are payable up to 1% (one percent) of\nthe Sum Insured per day",
    );
  });

  test("a file that is not really a PDF is refused politely", async ({ request }) => {
    const res = await request.post("/api/policy/extract", {
      multipart: {
        file: { name: "fake.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a pdf at all") },
        consent: CONSENT_VERSION,
      },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).error).toMatch(/could not be opened|could not read/);
  });

  test("uploading through the page carries the document to the coverage screen", async ({ page }) => {
    await page.goto("/");
    const tab = page.getByRole("tab", { name: "Upload PDF" });
    await expect(async () => {
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 1000 });
    }).toPass({ timeout: 15_000 });

    await page.getByLabel(/I agree that Hospitality may read this document/).check();
    await page.locator("input[type=file]").setInputFiles({
      name: "meridian-policy.pdf",
      mimeType: "application/pdf",
      buffer: PDF,
    });

    await expect(page).toHaveURL(/\/coverage$/);
    // The suite runs in Demo Mode, where only the samples are read; the
    // preview says so in words a member of the public can act on.
    await expect(page.getByText(/only read the three sample policies/)).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("hospitality.session.v1") ?? "{}"));
    expect(saved.source?.origin).toBe("pdf");
    expect(saved.consent).toBeTruthy();
  });
});

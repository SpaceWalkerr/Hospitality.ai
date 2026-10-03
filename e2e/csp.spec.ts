import { expect, type Page } from "@playwright/test";
import { startWithHospital, test } from "./helpers";

/**
 * The Content-Security-Policy (lib/csp.ts). A wrong CSP fails silently — the
 * browser just declines to run a script — so this watches every screen for
 * violations, and for hydration failures, which are what removed the nonce.
 */

async function watch(page: Page) {
  const problems: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      // Surfaced through the console so the test can collect it.
      console.error(
        `CSP violation: ${e.violatedDirective} blocked ${e.blockedURI || "inline"} at ${e.sourceFile}:${e.lineNumber}:${e.columnNumber} on ${location.pathname} — ${e.sample}`,
      );
    });
  });
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/CSP violation|Content Security Policy|Minified React error #4(18|19|23|25)|Hydration/i.test(t)) {
      problems.push(`${t.slice(0, 300)} [${new URL(page.url()).pathname}]`);
    }
  });
  page.on("pageerror", (e) => {
    if (/#4(18|19|23|25)|Hydration/i.test(e.message)) {
      problems.push(`${e.message.slice(0, 120)} [${new URL(page.url()).pathname}]`);
    }
  });
  return problems;
}

test.describe("Content-Security-Policy", () => {
  test("every page carries the policy, strict everywhere but inline scripts", async ({ request }) => {
    for (const route of ["/", "/privacy", "/coverage"]) {
      const csp = (await request.get(route)).headers()["content-security-policy"];
      expect(csp, route).toBeTruthy();
      // Scripts only from this origin — never from anywhere else.
      expect(csp).toMatch(/script-src 'self' 'unsafe-inline'(;|$)/);
      expect(csp).not.toContain("unsafe-eval");
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("connect-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
    }
  });

  test("pages stay prerendered — the reason the policy has no nonce", async ({ request }) => {
    // lib/csp.ts: per-request rendering produced a hydration failure on ~1 in
    // 10 loads under load. If this starts failing, read that note first.
    const res = await request.get("/");
    // Next.js may send the header twice ("1, 1").
    expect(res.headers()["x-nextjs-prerender"]).toMatch(/^1(, 1)*$/);
  });

  for (const route of ["/", "/privacy", "/terms"]) {
    test(`${route} runs without violations or hydration errors`, async ({ page }) => {
      const problems = await watch(page);
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      // The pre-paint theme script ran, and hydration did not undo it.
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toMatch(/^(light|dark)$/);
      expect(problems).toEqual([]);
    });
  }

  test("the session screens run without violations or hydration errors", async ({ page }) => {
    test.slow(); // three screens, each with a streamed answer
    const problems = await watch(page);
    await startWithHospital(page);
    for (const route of ["/coverage", "/hospitals", "/journey"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toMatch(/^(light|dark)$/);
    expect(problems).toEqual([]);
  });
});

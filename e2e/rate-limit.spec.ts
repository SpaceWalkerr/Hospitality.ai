import { expect } from "@playwright/test";
import {
  check,
  clientId,
  MemoryStore,
  ruleFor,
  UpstashStore,
  type Rule,
} from "../lib/rateLimit";
import { startWithSample, test } from "./helpers";

/* ------------------------------------------------------------------ */
/* The limiter itself — pure logic against a fake clock.               */
/* ------------------------------------------------------------------ */

test.describe("Rate limiter logic", () => {
  // Pure logic: no browser involved, so once is enough.
  test.skip(({ isMobile }) => isMobile, "runs on the desktop project only");
  const rule: Rule = { limit: 5, windowMs: 60_000 };
  // A fixed start aligned to a window boundary keeps the maths readable.
  const T0 = 1_000 * 60_000;

  test("allows up to the limit, then blocks with a Retry-After", async () => {
    const store = new MemoryStore(() => T0);
    const seen = [];
    for (let i = 0; i < 6; i++) seen.push(await check(store, "k", rule, T0));

    expect(seen.slice(0, 5).map((d) => d.ok)).toEqual([true, true, true, true, true]);
    expect(seen.slice(0, 5).map((d) => d.remaining)).toEqual([4, 3, 2, 1, 0]);
    expect(seen[5].ok).toBe(false);
    expect(seen[5].retryAfter).toBeGreaterThan(0);
  });

  test("the previous window still counts, weighted by overlap", async () => {
    let now = T0;
    const store = new MemoryStore(() => now);
    for (let i = 0; i < 5; i++) await check(store, "k", rule, now); // full window

    // Halfway into the next window, half of the previous 5 still counts:
    // 2.5 + n ≤ 5 allows two more, not five.
    now = T0 + 90_000;
    const next = [];
    for (let i = 0; i < 3; i++) next.push((await check(store, "k", rule, now)).ok);
    expect(next).toEqual([true, true, false]);
  });

  test("Retry-After is honest: waiting that long is enough", async () => {
    for (const offset of [0, 15_000, 45_000]) {
      let now = T0 + offset;
      const store = new MemoryStore(() => now);
      let last = await check(store, "k", rule, now);
      while (last.ok) last = await check(store, "k", rule, now);

      now += last.retryAfter * 1000;
      expect((await check(store, "k", rule, now)).ok, `blocked at +${offset}ms`).toBe(true);
    }
  });

  test("a client that keeps hammering stays blocked past the rollover", async () => {
    let now = T0;
    const store = new MemoryStore(() => now);
    for (let i = 0; i < 50; i++) await check(store, "k", rule, now);
    now = T0 + rule.windowMs + 1_000; // just into the next window
    expect((await check(store, "k", rule, now)).ok).toBe(false);
  });

  test("clients and routes have separate budgets", async () => {
    const store = new MemoryStore(() => T0);
    for (let i = 0; i < 6; i++) await check(store, "route:a", rule, T0);
    expect((await check(store, "route:a", rule, T0)).ok).toBe(false);
    expect((await check(store, "route:b", rule, T0)).ok).toBe(true);
  });

  test("the model routes are the tightest", () => {
    expect(ruleFor("/api/policy/parse").rule.limit).toBe(10);
    expect(ruleFor("/api/policy/parse").model).toBe(true);
    expect(ruleFor("/api/config").model).toBe(false);
    expect(ruleFor("/api/something-new").rule.limit).toBe(60);
    // Prefix matching respects path boundaries.
    expect(ruleFor("/api/policy/parser").prefix).toBe("/api");
  });

  test("client identity trusts only the nearest proxy's entry", () => {
    const h = (o: Record<string, string>) => new Headers(o);
    // Left entries are client-supplied and forgeable; the right-most is not.
    expect(clientId(h({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientId(h({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientId(h({ "fly-client-ip": "198.51.100.4" }), "fly-client-ip")).toBe("198.51.100.4");
    expect(clientId(h({}))).toBe("unknown");
  });

  test("the Redis store speaks the Upstash REST pipeline", async () => {
    const calls: { url: string; body: unknown; auth: string | null }[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({
        url,
        body: JSON.parse(String(init.body)),
        auth: new Headers(init.headers).get("authorization"),
      });
      return new Response(JSON.stringify([{ result: 3 }, { result: 1 }, { result: "7" }]));
    }) as typeof fetch;
    try {
      const store = new UpstashStore("https://example.upstash.io/", "tok");
      const counts = await store.hit("k", 42, 60_000);
      expect(counts).toEqual({ current: 3, previous: 7 });
      expect(calls[0].url).toBe("https://example.upstash.io/pipeline");
      expect(calls[0].auth).toBe("Bearer tok");
      expect(calls[0].body).toEqual([
        ["INCR", "rl:k:42"],
        ["PEXPIRE", "rl:k:42", "120000"],
        ["GET", "rl:k:41"],
      ]);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

/* ------------------------------------------------------------------ */
/* Through the real middleware on the production server.               */
/* ------------------------------------------------------------------ */

test.describe("Rate limiting over HTTP", () => {
  const rand = () => Math.floor(Math.random() * 250) + 1;

  test("successful responses advertise the budget", async ({ request }) => {
    const res = await request.post("/api/policy/extract", { multipart: {} });
    expect(res.headers()["ratelimit-limit"]).toBe("20");
    expect(Number(res.headers()["ratelimit-remaining"])).toBe(19);
  });

  test("over the limit: 429, Retry-After, a readable error, and other clients unaffected", async ({ request, isMobile }) => {
    test.skip(isMobile, "API-level; runs on the desktop project only");
    // Random so repeated runs against a reused server start with a fresh budget.
    const me = { "x-forwarded-for": `198.18.${rand()}.${rand()}` };
    for (let i = 0; i < 120; i++) {
      expect((await request.get("/api/config", { headers: me })).status()).toBe(200);
    }

    const blocked = await request.get("/api/config", { headers: me });
    expect(blocked.status()).toBe(429);
    expect(Number(blocked.headers()["retry-after"])).toBeGreaterThan(0);
    expect(blocked.headers()["ratelimit-remaining"]).toBe("0");
    expect((await blocked.json()).error).toMatch(/Please wait about/);

    // Someone else, and the same client on another route, are not blocked.
    expect((await request.get("/api/config", { headers: { "x-forwarded-for": `198.19.${rand()}.${rand()}` } })).status()).toBe(200);
    expect((await request.post("/api/policy/extract", { headers: me, multipart: {} })).status()).not.toBe(429);
  });

  test("the limit message reaches the reader (upload)", async ({ page, request }) => {
    // Use up this client's PDF budget; empty uploads are rejected fast but still count.
    await Promise.all(
      Array.from({ length: 20 }, () => request.post("/api/policy/extract", { multipart: {} })),
    );

    await page.goto("/");
    await page.getByRole("button", { name: "Use my own policy" }).first().click();
    await page.getByRole("tab", { name: "Upload PDF" }).click();
    await page.locator("input[type=file]").setInputFiles({
      name: "policy.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF"),
    });
    // Filter by text: Next.js also renders a (hidden) route announcer with role=alert.
    await expect(page.getByRole("alert").filter({ hasText: "a lot of requests" })).toBeVisible();
  });

  test("the limit message reaches the reader (streamed answers)", async ({ page, request }) => {
    // Wait for the parsed policy, not just "an h1" — the landing page has one
    // too, and navigating before the parse lands redirects back to "/".
    await startWithSample(page);

    await Promise.all(
      Array.from({ length: 20 }, () =>
        request.post("/api/journey/ask", {
          data: { documentText: "x", stage: "admission", question: "q" },
        }),
      ),
    );

    await page.goto("/journey");
    const ask = page.getByRole("region", { name: "Ask about your cover" });
    await ask.getByRole("button", { name: "Is a private room worth it here?" }).click();
    await expect(ask.getByRole("alert")).toContainText("a lot of requests");
    await expect(ask.getByRole("button", { name: /Try again/ })).toBeVisible();
  });
});

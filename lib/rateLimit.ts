/**
 * Rate limiting for the API routes.
 *
 * Why: the model routes spend real money per call, and without a limit one
 * client (or a script) can run a live key up. Limits are per client per route,
 * plus a global hourly ceiling on the routes that call the model.
 *
 * Algorithm: sliding-window counter. Each window keeps a count; the estimate
 * weights the previous window by how much of it still overlaps "the last
 * windowMs". Two keys per client, O(1), and no burst at window boundaries
 * the way a plain fixed window allows.
 *
 * Storage: Upstash Redis over its REST API when configured (shared across
 * instances, which serverless needs), otherwise in memory (per instance —
 * right for a single server or container). If Redis errors, the in-memory
 * store takes over for that request rather than letting everything through.
 *
 * Runs in middleware, so this file must stay edge-safe: fetch only, no Node
 * built-ins.
 */

export type Rule = { limit: number; windowMs: number };

const MIN = 60_000;

/** Per-client limits, by route. The most expensive routes are the tightest. */
export const RULES: { prefix: string; rule: Rule; model: boolean }[] = [
  // Full extraction + streamed brief: the most expensive call in the app.
  { prefix: "/api/policy/parse", rule: { limit: 10, windowMs: 10 * MIN }, model: true },
  // PDF text extraction: CPU, no model.
  { prefix: "/api/policy/extract", rule: { limit: 20, windowMs: 10 * MIN }, model: false },
  // Ranking is deterministic; the narration behind it calls the model.
  { prefix: "/api/hospitals/match", rule: { limit: 40, windowMs: 10 * MIN }, model: true },
  // Four stages, each cached client-side once fetched.
  { prefix: "/api/journey/guidance", rule: { limit: 30, windowMs: 10 * MIN }, model: true },
  { prefix: "/api/journey/ask", rule: { limit: 20, windowMs: 10 * MIN }, model: true },
  // Cheap, but still bounded.
  { prefix: "/api/config", rule: { limit: 120, windowMs: MIN }, model: false },
];

/** Anything under /api not listed above. */
export const DEFAULT_RULE: Rule = { limit: 60, windowMs: MIN };

export function ruleFor(pathname: string) {
  return (
    RULES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)) ?? {
      prefix: "/api",
      rule: DEFAULT_RULE,
      model: false,
    }
  );
}

/* ---------------- stores ---------------- */

type Counts = { current: number; previous: number };

export interface Store {
  /** Counts one hit in the current window and returns both windows' counts. */
  hit(key: string, window: number, windowMs: number): Promise<Counts>;
}

export class MemoryStore implements Store {
  private counts = new Map<string, { n: number; expires: number }>();
  private lastSweep = 0;

  constructor(private now: () => number = Date.now) {}

  async hit(key: string, window: number, windowMs: number): Promise<Counts> {
    const t = this.now();
    this.sweep(t);
    const cur = `${key}:${window}`;
    const prev = `${key}:${window - 1}`;
    const entry = this.counts.get(cur);
    const n = (entry && entry.expires > t ? entry.n : 0) + 1;
    // Keep a window for two lengths so it can serve as "previous".
    this.counts.set(cur, { n, expires: (window + 2) * windowMs });
    const p = this.counts.get(prev);
    return { current: n, previous: p && p.expires > t ? p.n : 0 };
  }

  /** Drops expired windows so memory stays bounded under many clients. */
  private sweep(t: number) {
    if (t - this.lastSweep < 30_000 && this.counts.size < 10_000) return;
    this.lastSweep = t;
    for (const [k, v] of this.counts) if (v.expires <= t) this.counts.delete(k);
  }
}

export class UpstashStore implements Store {
  constructor(
    private url: string,
    private token: string,
  ) {}

  async hit(key: string, window: number, windowMs: number): Promise<Counts> {
    const cur = `rl:${key}:${window}`;
    const prev = `rl:${key}:${window - 1}`;
    const res = await fetch(`${this.url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", cur],
        ["PEXPIRE", cur, String(windowMs * 2)],
        ["GET", prev],
      ]),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash responded ${res.status}`);
    const [incr, , get] = (await res.json()) as { result: unknown; error?: string }[];
    if (incr.error) throw new Error(incr.error);
    return { current: Number(incr.result), previous: Number(get?.result ?? 0) || 0 };
  }
}

/* ---------------- limiter ---------------- */

export type Decision = {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the estimate drops back under the limit. */
  retryAfter: number;
  /** Seconds until the current window rolls over. */
  reset: number;
};

export async function check(
  store: Store,
  key: string,
  rule: Rule,
  now = Date.now(),
): Promise<Decision> {
  const window = Math.floor(now / rule.windowMs);
  const elapsed = (now % rule.windowMs) / rule.windowMs;
  const { current, previous } = await store.hit(key, window, rule.windowMs);

  // The previous window counts in proportion to how much of it still falls
  // inside the trailing windowMs.
  const estimate = previous * (1 - elapsed) + current;
  const ok = estimate <= rule.limit;
  const reset = Math.ceil((rule.windowMs - (now % rule.windowMs)) / 1000);

  let retryAfter = 0;
  if (!ok) {
    // When would the *next* request (one more hit) be allowed, assuming the
    // client stops now? Two candidates; take the earlier.
    const W = rule.windowMs;
    // A: later in this window, as the previous window's weight decays.
    //    previous·(1−e) + current + 1 ≤ limit  ⇒  e ≥ 1 − (limit−current−1)/previous
    let inThis = Infinity;
    const room = rule.limit - current - 1;
    if (room >= 0 && previous > 0) {
      const e = 1 - room / previous;
      if (e > elapsed && e < 1) inThis = (e - elapsed) * W;
    }
    // B: after rollover, when this window becomes "previous" and decays.
    //    current·(1−e) + 1 ≤ limit  ⇒  e ≥ 1 − (limit−1)/current
    const eNext = current > 0 ? Math.max(0, 1 - (rule.limit - 1) / current) : 0;
    const inNext = reset * 1000 + eNext * W;
    retryAfter = Math.max(1, Math.ceil(Math.min(inThis, inNext) / 1000));
  }

  return {
    ok,
    limit: rule.limit,
    remaining: Math.max(0, Math.floor(rule.limit - estimate)),
    retryAfter,
    reset,
  };
}

/* ---------------- client identity ---------------- */

/**
 * Who the client is. Middleware only sees headers, so this has to trust
 * whichever header the hosting platform sets and clients cannot forge:
 *
 *   Vercel, most load balancers   x-forwarded-for (default)
 *   Fly.io                        RATE_LIMIT_IP_HEADER=fly-client-ip
 *   Cloudflare in front           RATE_LIMIT_IP_HEADER=cf-connecting-ip
 *
 * For x-forwarded-for the right-most entry is used: it is the address the
 * nearest proxy actually saw, whereas entries to its left were supplied by
 * the client and can be anything.
 */
export function clientId(headers: Headers, header = "x-forwarded-for"): string {
  const raw = headers.get(header.toLowerCase());
  if (!raw) return "unknown";
  if (header.toLowerCase() !== "x-forwarded-for") return raw.trim();
  const hops = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return hops[hops.length - 1] ?? "unknown";
}

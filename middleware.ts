import { NextResponse, type NextRequest } from "next/server";
import {
  check,
  clientId,
  MemoryStore,
  ruleFor,
  UpstashStore,
  type Decision,
  type Store,
} from "@/lib/rateLimit";

/**
 * Rate limiting for /api/*. Rejected requests stop here, before any route
 * handler or model call runs. See lib/rateLimit.ts for the algorithm and
 * README → Deploying for configuration.
 *
 *   RATE_LIMIT=off                     disable entirely (local debugging only)
 *   RATE_LIMIT_IP_HEADER               header that identifies the client
 *   RATE_LIMIT_GLOBAL_PER_HOUR         ceiling on model calls, all clients (default 600)
 *   UPSTASH_REDIS_REST_URL / _TOKEN    shared store (KV_REST_API_URL / _TOKEN also work)
 */

const memory = new MemoryStore();
const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = redisUrl && redisToken ? new UpstashStore(redisUrl, redisToken) : null;

const GLOBAL = {
  limit: Number(process.env.RATE_LIMIT_GLOBAL_PER_HOUR) || 600,
  windowMs: 60 * 60_000,
};

/** Shared store when configured; memory if it's absent or failing. */
const resilient: Store = {
  async hit(key, window, windowMs) {
    if (redis) {
      try {
        return await redis.hit(key, window, windowMs);
      } catch (err) {
        console.warn("[rate-limit] Redis unavailable, using in-memory store:", (err as Error).message);
      }
    }
    return memory.hit(key, window, windowMs);
  },
};

function headersFor(d: Decision): Record<string, string> {
  return {
    "RateLimit-Limit": String(d.limit),
    "RateLimit-Remaining": String(d.remaining),
    "RateLimit-Reset": String(d.reset),
  };
}

function minutes(seconds: number) {
  const m = Math.ceil(seconds / 60);
  return m <= 1 ? "a minute" : `${m} minutes`;
}

export async function middleware(req: NextRequest) {
  if (process.env.RATE_LIMIT === "off") return NextResponse.next();

  const { prefix, rule, model } = ruleFor(req.nextUrl.pathname);
  const who = clientId(req.headers, process.env.RATE_LIMIT_IP_HEADER);

  const perClient = await check(resilient, `${prefix}:${who}`, rule);
  const global = model && perClient.ok ? await check(resilient, "global:model", GLOBAL) : null;

  if (!perClient.ok || (global && !global.ok)) {
    const blocked = !perClient.ok ? perClient : global!;
    const message = !perClient.ok
      ? `You’ve made a lot of requests in a short time. Please wait about ${minutes(blocked.retryAfter)} and try again.`
      : "Hospitality is handling a lot of requests right now. Please try again in a little while.";
    return NextResponse.json(
      { error: message },
      {
        status: 429,
        headers: { ...headersFor(blocked), "Retry-After": String(blocked.retryAfter) },
      },
    );
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(headersFor(perClient))) res.headers.set(k, v);
  return res;
}

export const config = {
  matcher: "/api/:path*",
};

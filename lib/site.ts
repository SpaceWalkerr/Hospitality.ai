/**
 * The public origin, for Open Graph, canonical and robots URLs. Set
 * NEXT_PUBLIC_SITE_URL in production; on Vercel the production domain is
 * picked up automatically.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

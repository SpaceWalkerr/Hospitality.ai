import type { NextConfig } from "next";
import { buildCsp } from "./lib/csp";

/**
 * Security headers applied to every response, including the
 * Content-Security-Policy (see lib/csp.ts for why it is static).
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: buildCsp(process.env.NODE_ENV === "development"),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf"],
  poweredByHeader: false,
  // Self-contained server bundle for container hosts (see Dockerfile).
  // Vercel ignores this and deploys as usual.
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

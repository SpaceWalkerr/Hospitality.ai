import type { NextConfig } from "next";

/**
 * Security headers applied to every response. A Content-Security-Policy is
 * deliberately not set here: the pre-paint theme script and Next's own inline
 * bootstrapping would need per-request nonces (middleware), which is worth
 * doing before a real launch but is more than a static header can express.
 */
const securityHeaders = [
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

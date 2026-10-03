/**
 * Content-Security-Policy — a static header, set in next.config.ts.
 *
 * Why not nonces: a nonce changes per request, which forces every page to be
 * rendered per request instead of prerendered. We built that and measured it:
 * under parallel load, per-request rendering produced a React hydration
 * failure on roughly 1 in 10 page loads (14–18 of 144), each one dropping the
 * theme — with or without the nonce itself. The prerendered build failed 0 of
 * 144. So the pages stay static, and the CSP is one that a static page can carry.
 *
 * What that costs: script-src needs 'unsafe-inline' for Next.js's inline
 * bootstrap and our theme script, so this policy does not stop an injected
 * inline <script>. The exposure is small — React escapes everything it
 * renders, and model output is rendered as text, never as HTML — and every
 * other directive stays strict: no scripts from other origins, no requests to
 * other origins, no framing, no <base> or form hijacking, no plugins.
 *
 * Revisit if the pages become dynamic for some other reason: at that point
 * the nonce costs nothing extra, but find the hydration race first.
 */
export function buildCsp(dev: boolean): string {
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    // 'unsafe-eval' only in development, for React Refresh.
    ["script-src", ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])]],
    // Server-rendered style="" attributes need 'unsafe-inline'.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    // data: for the inline SVG grain texture in globals.css.
    ["img-src", ["'self'", "data:", "blob:"]],
    ["font-src", ["'self'"]],
    // The browser only ever talks to our own API; dev adds the HMR socket.
    ["connect-src", ["'self'", ...(dev ? ["ws:", "wss:"] : [])]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
    ["manifest-src", ["'self'"]],
    ["worker-src", ["'self'", "blob:"]],
  ];
  const policy = directives.map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");
  return dev ? policy : `${policy}; upgrade-insecure-requests`;
}

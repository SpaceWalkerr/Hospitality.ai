import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the production standalone server — the same
 * artifact the Dockerfile ships — on its own port, so they never collide with
 * `npm run dev`.
 *
 * ANTHROPIC_API_KEY is forced empty: the suite always runs in Demo Mode on
 * the bundled fixtures, so it is deterministic, free, and never sends a
 * document to a model.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  webServer: {
    // Skip the build when CI (or you) already built: E2E_SKIP_BUILD=1.
    command: process.env.E2E_SKIP_BUILD
      ? "npm run start"
      : "npm run build && npm run start",
    url: baseURL,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      ANTHROPIC_API_KEY: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdout: "ignore",
    stderr: "pipe",
  },
});

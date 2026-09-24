// Copies the assets `output: "standalone"` leaves out (static chunks and
// public/) next to the standalone server, so `node .next/standalone/server.js`
// serves a complete app. Used by `npm start`, the Playwright
// web server, and mirrored by the Dockerfile.
import { cpSync, existsSync } from "node:fs";

const root = ".next/standalone";
if (!existsSync(`${root}/server.js`)) {
  console.error("No standalone build found. Run `npm run build` first.");
  process.exit(1);
}

cpSync(".next/static", `${root}/.next/static`, { recursive: true });
if (existsSync("public")) cpSync("public", `${root}/public`, { recursive: true });
console.log("Standalone server prepared.");

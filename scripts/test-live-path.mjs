#!/usr/bin/env node
/**
 * Live-path test — exercises every model-calling route WITHOUT a real key.
 *
 * Demo Mode never touches the Anthropic SDK, so the e2e suite cannot see bugs
 * in the code that only runs once a key is set: request shape, structured-
 * output validation, stream handling, error mapping. This script stands up a
 * mock of the Messages API, starts the built app with a fake key and
 * ANTHROPIC_BASE_URL pointed at the mock, and drives every route through clean,
 * messy and failing responses.
 *
 * What it proves: our side of the integration is correct. What it cannot
 * prove: that the real model answers well. That needs a real key — see
 * README → "Turning on Live mode".
 *
 *   npm run build && npm run test:live-path
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { setTimeout as sleep } from "node:timers/promises";

const APP_PORT = Number(process.env.LIVE_TEST_PORT ?? 3200);
const APP = `http://127.0.0.1:${APP_PORT}`;
const FAKE_KEY = "sk-ant-test-0000-not-a-real-key";
const EXPECTED_MODEL = "claude-opus-5";

/* ------------------------------------------------------------------ */
/* Canned answers                                                      */
/* ------------------------------------------------------------------ */

const cite = (clause, quote) => ({ clause, quote, lineStart: 1, lineEnd: 2 });

/** A correct extraction of the Meridian sample. Quotes are verbatim. */
const MERIDIAN_CLEAN = {
  insurer: "Meridian Health Insurance Company Limited",
  planName: "Sampoorna Suraksha — Family Floater",
  policyNumber: "MHI/BLR/2025/0084412",
  kind: "private",
  policyHolder: "Ananya Ravindran",
  validFrom: "2025-03-14",
  validTo: "2026-03-13",
  sumInsured: {
    amount: 500000,
    basis: "Family floater across four members",
    citation: cite("Schedule", "SUM INSURED: Rs. 5,00,000 (Rupees Five Lakh only) on a FAMILY FLOATER basis"),
  },
  roomEligibility: {
    eligibleCategory: "Single Private",
    capMode: "percent_of_sum_insured_per_day",
    capValue: 1,
    icuCapMode: "percent_of_sum_insured_per_day",
    icuCapValue: 2,
    proportionateDeduction: true,
    notes: "Room rent up to 1% of the sum insured per day.",
    citation: cite("1.2", "Room, Boarding and Nursing Expenses are payable up to 1% (one percent) of the Sum Insured per day"),
  },
  coPay: {
    percent: 10,
    appliesTo: "Insured persons aged 61 or above on the date of admission",
    citation: cite("2.5", "A co-payment of 10% (ten percent) of each and every admissible claim shall be borne by the Insured Person where the claim relates to an Insured Person who has completed 61 years of age on the date of admission"),
  },
  deductible: null,
  preAuthorization: {
    required: true,
    plannedNoticeHours: 48,
    emergencyNoticeHours: 24,
    notes: "48 hours for planned, 24 for emergency.",
    citation: cite("5.2", "the pre-authorisation request must reach the TPA at least 48 hours before the proposed date of admission"),
  },
  reimbursement: {
    outOfNetworkAllowed: true,
    payablePercent: 80,
    claimWindowDays: 30,
    notes: "80% out of network.",
    citation: cite("5.4", "Such claims are payable at 80% (eighty percent) of the admissible amount, the balance 20% being borne by the Insured Person"),
  },
  preHospitalizationDays: 60,
  postHospitalizationDays: 90,
  subLimits: [
    {
      item: "Joint replacement",
      limit: "₹2,00,000 per joint",
      amount: 200000,
      citation: cite("2.4", "Joint replacement (knee or hip) is limited to Rs. 2,00,000 per joint, inclusive of the cost of the implant"),
    },
  ],
  exclusions: [
    {
      item: "Consumables",
      detail: "Never payable.",
      kind: "permanent",
      waitingMonths: null,
      citation: cite("4.6", "Non-medical and consumable items listed in Annexure I to this Policy"),
    },
    {
      item: "Pre-existing diabetes",
      detail: "36-month wait.",
      kind: "waiting_period",
      waitingMonths: 36,
      citation: cite("3.3", "covered after a continuous waiting period of 36 months from the first inception of the Policy"),
    },
  ],
  networkHospitals: [{ name: "Sanjeevani Multispeciality Hospital", city: "Bengaluru", cashless: true }],
  schemes: [],
  gaps: ["No maximum length of stay is stated."],
  confidence: "high",
  summaryPoints: [
    { heading: "₹5 lakh shared by four", body: "Family floater.", tone: "good" },
    { heading: "Room capped at ₹5,000", body: "1% of sum insured.", tone: "limit" },
    { heading: "Proportionate deduction applies", body: "Costly rooms scale everything.", tone: "watch" },
    { heading: "Out of network pays 80%", body: "Claim within 30 days.", tone: "watch" },
  ],
};

/** The same document, answered the way a model sometimes really does. */
const MERIDIAN_MESSY = {
  ...MERIDIAN_CLEAN,
  kind: "Retail indemnity", // not in the vocabulary at all
  confidence: "High",
  roomEligibility: {
    ...MERIDIAN_CLEAN.roomEligibility,
    eligibleCategory: "Single Private A/C Room",
    capMode: "1% of the sum insured per day",
    icuCapMode: "2% of sum insured",
  },
  exclusions: [
    { ...MERIDIAN_CLEAN.exclusions[0], kind: "Permanent exclusion" },
    { ...MERIDIAN_CLEAN.exclusions[1], kind: "Waiting period" },
    {
      item: "Invented clause",
      detail: "This quote does not exist in the document.",
      kind: "permanent",
      waitingMonths: null,
      citation: cite("9.9", "The insurer guarantees settlement of every claim within one hour of discharge"),
    },
  ],
  summaryPoints: MERIDIAN_CLEAN.summaryPoints.map((p) => ({ ...p, tone: p.tone === "watch" ? "Watch out" : p.tone })),
};

const GUIDANCE_CLEAN = {
  headline: "Start pre-authorisation before anything else.",
  items: [
    { title: "Intimate the TPA", detail: "Within 24 hours.", kind: "action", citation: cite("5.3", "intimation must be given to the TPA within 24 hours of admission") },
    { title: "Mind the room limit", detail: "₹5,000 a day.", kind: "watch", citation: cite("1.2", "Room, Boarding and Nursing Expenses are payable up to 1% (one percent) of the Sum Insured per day") },
    { title: "Carry ID", detail: "Photo ID and policy number.", kind: "document", citation: null },
    { title: "Consumables are on you", detail: "Gloves, kits.", kind: "cost", citation: null },
  ],
};

const GUIDANCE_MESSY = {
  ...GUIDANCE_CLEAN,
  items: GUIDANCE_CLEAN.items.map((it, i) => ({
    ...it,
    kind: ["Action item", "Cost implication", "Be careful", "Documents to keep"][i],
  })),
};

const STREAM_TEXT =
  "Your cover is ₹5,00,000 shared across the family. Keep the room at or under ₹5,000 a day. Confirm the details with your insurer before relying on this.";

/* ------------------------------------------------------------------ */
/* Mock Messages API                                                   */
/* ------------------------------------------------------------------ */

let scenario = "clean";
const requests = [];
let upstreamCancelled = 0;

function kindOf(body) {
  const schema = body.output_config?.format?.schema;
  if (schema?.properties?.sumInsured) return "extract";
  if (schema?.properties?.headline) return "guidance";
  if (body.stream) return "stream";
  return "unknown";
}

function message(content, stop_reason = "end_turn") {
  return {
    id: "msg_mock",
    type: "message",
    role: "assistant",
    model: EXPECTED_MODEL,
    content,
    stop_reason,
    stop_sequence: null,
    usage: { input_tokens: 100, output_tokens: 100 },
  };
}

function apiError(res, status, type, msg) {
  res.writeHead(status, { "content-type": "application/json", "request-id": "req_mock" });
  res.end(JSON.stringify({ type: "error", error: { type, message: msg } }));
}

function sse(res, text, stopReason = "end_turn") {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send("message_start", { type: "message_start", message: { ...message([], null), usage: { input_tokens: 100, output_tokens: 1 } } });
  send("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
  for (const chunk of text.match(/\S+\s*/g) ?? []) {
    send("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: chunk } });
  }
  send("content_block_stop", { type: "content_block_stop", index: 0 });
  send("message_delta", { type: "message_delta", delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 40 } });
  send("message_stop", { type: "message_stop" });
  res.end();
}

const mock = createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;

  if (req.url === "/__scenario") {
    scenario = JSON.parse(raw).name;
    res.end("ok");
    return;
  }
  if (req.method !== "POST" || !req.url.startsWith("/v1/messages")) {
    res.writeHead(404).end();
    return;
  }

  const body = JSON.parse(raw);
  const kind = kindOf(body);
  requests.push({ headers: req.headers, body, kind, scenario });

  if (scenario === "slow") {
    // Hold the answer back and note whether the app hangs up on us first.
    let answered = false;
    res.on("close", () => {
      if (!answered) upstreamCancelled += 1;
    });
    await sleep(4000);
    if (res.destroyed) return;
    answered = true;
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(message([{ type: "text", text: JSON.stringify(MERIDIAN_CLEAN) }])));
  }
  if (scenario === "auth") return apiError(res, 401, "authentication_error", "invalid x-api-key");
  if (scenario === "overloaded") return apiError(res, 529, "overloaded_error", "Overloaded");
  if (scenario === "badrequest") return apiError(res, 400, "invalid_request_error", "output_config.format.schema: unsupported keyword");

  if (kind === "stream") {
    if (scenario === "refusal") return sse(res, "I can explain part of", "refusal");
    return sse(res, STREAM_TEXT);
  }

  const payload =
    kind === "extract"
      ? scenario === "messy" ? MERIDIAN_MESSY : MERIDIAN_CLEAN
      : scenario === "messy" ? GUIDANCE_MESSY : GUIDANCE_CLEAN;

  res.writeHead(200, { "content-type": "application/json" });
  if (scenario === "refusal") return res.end(JSON.stringify(message([], "refusal")));
  if (scenario === "truncated") {
    const cut = JSON.stringify(payload).slice(0, 400);
    return res.end(JSON.stringify(message([{ type: "text", text: cut }], "max_tokens")));
  }
  if (scenario === "notjson") {
    return res.end(JSON.stringify(message([{ type: "text", text: "Here is a summary of the policy you sent." }])));
  }
  if (scenario === "wrongshape") {
    return res.end(JSON.stringify(message([{ type: "text", text: JSON.stringify({ insurer: "X" }) }])));
  }
  res.end(JSON.stringify(message([{ type: "text", text: JSON.stringify(payload) }])));
});

/* ------------------------------------------------------------------ */
/* Harness                                                             */
/* ------------------------------------------------------------------ */

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${!ok && detail ? `\n      ${detail}` : ""}`);
}

async function post(path, body) {
  const res = await fetch(`${APP}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const events = text.split("\n").filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return { type: "unparsable", raw: l }; }
  });
  return { status: res.status, events };
}

async function setScenario(name) {
  await fetch(`http://127.0.0.1:${mock.address().port}/__scenario`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

const errorOf = (events) => events.find((e) => e.type === "error")?.message ?? null;
const textOf = (events) => events.filter((e) => e.type === "delta").map((e) => e.text).join("");

/** A message a person might see must never leak transport details. */
function looksFriendly(msg) {
  return !!msg && !/\b(4\d\d|5\d\d)\b|[{}]|x-api-key|invalid_request|_error|stack|undefined/i.test(msg);
}

/**
 * Only keywords the strict structured-output schema accepts. The authority is
 * the SDK's own transform (lib/transform-json-schema.js): it passes these
 * through — including internal `$ref`/`$defs`, which Zod emits for any schema
 * used twice — and folds everything else into the description.
 */
const ALLOWED_SCHEMA_KEYS = new Set([
  "type", "properties", "required", "additionalProperties", "items", "anyOf", "allOf",
  "description", "title", "format", "minItems", "enum", "const", "$ref", "$defs",
]);
function schemaKeysOk(node, path = "$") {
  if (!node || typeof node !== "object") return [];
  const bad = [];
  for (const [k, v] of Object.entries(node)) {
    if (path.endsWith(".properties")) { bad.push(...schemaKeysOk(v, `${path}.${k}`)); continue; }
    if (!ALLOWED_SCHEMA_KEYS.has(k)) bad.push(`${path}.${k}`);
    if (k === "properties") bad.push(...schemaKeysOk(v, `${path}.properties`));
    if (k === "items") bad.push(...schemaKeysOk(v, `${path}.items`));
    if (k === "anyOf" || k === "allOf") v.forEach((x, i) => bad.push(...schemaKeysOk(x, `${path}.${k}[${i}]`)));
    if (k === "$defs") for (const [name, d] of Object.entries(v)) bad.push(...schemaKeysOk(d, `${path}.$defs.${name}`));
    if (k === "$ref" && !String(v).startsWith("#/")) bad.push(`${path}.$ref (external: ${v})`);
  }
  return bad;
}

/** Every key the schema marks required is present in our canned answer. */
function missingRequired(schema, value, path = "$") {
  if (!schema || value == null) return [];
  if (schema.anyOf) {
    const branch = schema.anyOf.find((b) => (b.type === "null") === (value === null)) ?? schema.anyOf[0];
    return missingRequired(branch, value, path);
  }
  if (schema.type === "object") {
    const out = (schema.required ?? []).filter((k) => !(k in value)).map((k) => `${path}.${k}`);
    for (const [k, sub] of Object.entries(schema.properties ?? {})) {
      if (k in value) out.push(...missingRequired(sub, value[k], `${path}.${k}`));
    }
    return out;
  }
  if (schema.type === "array" && Array.isArray(value)) {
    return value.flatMap((v, i) => missingRequired(schema.items, v, `${path}[${i}]`));
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Run                                                                 */
/* ------------------------------------------------------------------ */

if (!existsSync(".next/standalone/server.js")) {
  console.error("No production build found. Run `npm run build` first.");
  process.exit(1);
}

await new Promise((r) => mock.listen(0, "127.0.0.1", r));
const MOCK = `http://127.0.0.1:${mock.address().port}`;

let serverErr = "";
// Copies static assets into the standalone bundle, as `npm start` does.
const prep = spawn(process.execPath, ["scripts/prepare-standalone.mjs"], { stdio: "inherit" });
await new Promise((r) => prep.on("exit", r));

const server = spawn(process.execPath, [".next/standalone/server.js"], {
  env: {
    ...process.env,
    PORT: String(APP_PORT),
    HOSTNAME: "127.0.0.1",
    ANTHROPIC_API_KEY: FAKE_KEY,
    ANTHROPIC_BASE_URL: MOCK,
    RATE_LIMIT: "off",
    NEXT_TELEMETRY_DISABLED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (d) => (serverErr += d));
server.stderr.on("data", (d) => (serverErr += d));

const stop = () => {
  server.kill();
  mock.close();
};
process.on("exit", stop);

for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(`${APP}/api/config`);
    if (r.ok) break;
  } catch {}
  await sleep(500);
}

console.log(`\nLive-path test — app ${APP}, mock API ${MOCK}\n`);

const config = await (await fetch(`${APP}/api/config`)).json();
check("app reports Live mode when a key is set", config.demo === false, JSON.stringify(config));

/* ---------- 1. clean extraction + streamed brief ---------- */
console.log("\nPolicy extraction — clean answer");
await setScenario("clean");
let r = await post("/api/policy/parse", { sampleId: "meridian" });
const policy = r.events.find((e) => e.type === "policy")?.policy;
check("emits a policy", !!policy, errorOf(r.events) ?? "");
check("no error event", !errorOf(r.events), errorOf(r.events) ?? "");
check("room cap resolved to ₹5,000 from 1% of ₹5L", policy?.roomEligibility.resolvedDailyCap === 5000, String(policy?.roomEligibility.resolvedDailyCap));
check("ICU cap resolved to ₹10,000", policy?.roomEligibility.resolvedIcuDailyCap === 10000);
check("insurer mapped to dataset id", policy?.insurerId === "meridian", policy?.insurerId);
{
  const cites = [];
  const walk = (o) => o && typeof o === "object" && Object.entries(o).forEach(([k, v]) => (k === "citation" && v ? cites.push(v) : walk(v)));
  walk(policy);
  check("every citation verified exact against the source", cites.length > 0 && cites.every((c) => c.verification === "exact"),
    cites.filter((c) => c.verification !== "exact").map((c) => c.clause).join(", "));
  check("citation line numbers re-resolved (mock sent 1–2)", cites.some((c) => c.resolvedLineStart > 2));
}
check("summary points pass through", r.events.find((e) => e.type === "points")?.points.length === 4);
check("brief streams token by token", r.events.filter((e) => e.type === "delta").length > 5 && textOf(r.events) === STREAM_TEXT);
check("ends with done, demo:false", r.events.at(-1)?.type === "done" && r.events.at(-1)?.demo === false);

/* ---------- 2. messy enums + an invented quote ---------- */
console.log("\nPolicy extraction — messy answer");
await setScenario("messy");
r = await post("/api/policy/parse", { sampleId: "meridian" });
const messy = r.events.find((e) => e.type === "policy")?.policy;
check("off-vocabulary values do not crash the extraction", !!messy, errorOf(r.events) ?? "");
check('"Single Private A/C Room" → Single Private', messy?.roomEligibility.eligibleCategory === "Single Private");
check('"1% of the sum insured per day" → percent mode', messy?.roomEligibility.capMode === "percent_of_sum_insured_per_day");
check("cap still resolves to ₹5,000", messy?.roomEligibility.resolvedDailyCap === 5000);
check('"Waiting period" → waiting_period', messy?.exclusions[1]?.kind === "waiting_period");
check('unmappable "Retail indemnity" falls back to private', messy?.kind === "private");
check("a guessed field caps confidence at medium", messy?.confidence === "medium", messy?.confidence);
check("a guessed field is disclosed in the gaps", messy?.gaps.some((g) => /read conservatively/.test(g)));
check("the invented quote is flagged unverified", messy?.exclusions[2]?.citation.verification === "unverified",
  messy?.exclusions[2]?.citation.verification);
check('"Watch out" tone → watch', r.events.find((e) => e.type === "points")?.points.every((p) => ["good", "watch", "limit"].includes(p.tone)));

/* ---------- 3. failure modes, each with its own sentence ---------- */
console.log("\nPolicy extraction — failures reach the user as plain sentences");
const failures = [
  ["refusal", /declined/i],
  ["truncated", /too long/i],
  ["notjson", /could not read this document/i],
  ["wrongshape", /could not read this document/i],
  ["auth", /not set up correctly/i],
  ["badrequest", /could not process/i],
  ["overloaded", /temporarily unavailable/i],
];
for (const [name, expected] of failures) {
  await setScenario(name);
  r = await post("/api/policy/parse", { sampleId: "meridian" });
  const msg = errorOf(r.events);
  check(`${name}: ${msg ?? "(no error event)"}`, !!msg && expected.test(msg) && looksFriendly(msg), msg ?? "");
}

/* ---------- 4. matching narration ---------- */
console.log("\nHospital matching");
await setScenario("clean");
const ctx = { condition: "Angioplasty (single stent)", localityId: "jayanagar", expectedDays: 4, procedureCost: 250000, urgency: "emergency" };
r = await post("/api/hospitals/match", { policy, ctx });
check("ranking arrives before the narration", r.events.findIndex((e) => e.type === "matches") < r.events.findIndex((e) => e.type === "delta"));
check("14 hospitals ranked", r.events.find((e) => e.type === "matches")?.matches.length === 14);
check("narration streams", textOf(r.events) === STREAM_TEXT);
await setScenario("refusal");
r = await post("/api/hospitals/match", { policy, ctx });
check("a mid-stream refusal is reported, not left as a fragment", /stopped before finishing/i.test(errorOf(r.events) ?? ""), errorOf(r.events) ?? "");

/* ---------- 5. journey guidance ---------- */
console.log("\nJourney guidance");
const sampleText = (await import("node:fs")).readFileSync("lib/data/samplePolicies.ts", "utf8").match(/const MERIDIAN = `([\s\S]*?)`;/)[1];
for (const sc of ["clean", "messy"]) {
  await setScenario(sc);
  r = await post("/api/journey/guidance", { policy, documentText: sampleText, stage: "admission", ctx });
  const g = r.events.find((e) => e.type === "guidance")?.guidance;
  check(`${sc}: four items, every kind in vocabulary`, g?.items.length === 4 && g.items.every((i) => ["action", "cost", "watch", "document"].includes(i.kind)),
    errorOf(r.events) ?? JSON.stringify(g?.items.map((i) => i.kind)));
  if (sc === "clean") {
    check("guidance citations verified against the document", g?.items.filter((i) => i.citation).every((i) => i.citation.verification === "exact"));
  }
}
await setScenario("truncated");
r = await post("/api/journey/guidance", { policy, documentText: sampleText, stage: "admission", ctx });
check("truncated guidance → plain sentence", looksFriendly(errorOf(r.events)), errorOf(r.events) ?? "");

/* ---------- 6. ask ---------- */
console.log("\nAsk about your cover");
await setScenario("clean");
r = await post("/api/journey/ask", { documentText: sampleText, stage: "admission", question: "Is a private room covered?" });
check("answer streams", textOf(r.events) === STREAM_TEXT, errorOf(r.events) ?? "");
r = await post("/api/journey/ask", { documentText: sampleText, stage: "admission", question: "x".repeat(700) });
check("over-long question rejected before any model call", /shorter/.test(errorOf(r.events) ?? ""));

/* ---------- 7. limits ---------- */
console.log("\nInput limits");
const before = requests.length;
r = await post("/api/policy/parse", { text: "a ".repeat(130_000), name: "huge.txt" });
check("an oversized document is refused", /longer than a single health policy/.test(errorOf(r.events) ?? ""), errorOf(r.events) ?? "");
check("…without spending a model call", requests.length === before);

/* ---------- 8. leaving mid-answer stops the spend ---------- */
console.log("\nAbandoned requests");
await setScenario("slow");
{
  const errBefore = (serverErr.match(/model call failed/g) ?? []).length;
  const ac = new AbortController();
  const pending = fetch(`${APP}/api/policy/parse`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sampleId: "meridian" }),
    signal: ac.signal,
  }).then((r) => r.text()).catch(() => null);
  await sleep(1200);
  ac.abort();
  await pending;
  await sleep(1500);
  check("closing the page cancels the upstream model call", upstreamCancelled === 1, `cancelled=${upstreamCancelled}`);
  const errAfter = (serverErr.match(/model call failed/g) ?? []).length;
  check("…and is not logged as a failure", errAfter === errBefore, `${errAfter - errBefore} new failure log(s)`);
}

/* ---------- 9. every request we sent ---------- */
console.log("\nEvery request sent to the API");
const structured = requests.filter((q) => q.kind === "extract" || q.kind === "guidance");
const streams = requests.filter((q) => q.kind === "stream");
check(`${requests.length} requests recorded (${structured.length} structured, ${streams.length} streamed)`, requests.length > 15);
check("all carry the key in x-api-key", requests.every((q) => q.headers["x-api-key"] === FAKE_KEY));
check(`all use ${EXPECTED_MODEL}`, requests.every((q) => q.body.model === EXPECTED_MODEL));
check("all send the safety preamble", requests.every((q) => String(q.body.system).includes("ABSOLUTE LIMITS")));
check("none end on an assistant turn (no prefill)", requests.every((q) => q.body.messages.at(-1).role === "user"));
check("none use the removed budget_tokens thinking config", requests.every((q) => !q.body.thinking?.budget_tokens));
check("all set max_tokens", requests.every((q) => q.body.max_tokens > 0));
check("structured calls send a json_schema format", structured.every((q) => q.body.output_config?.format?.type === "json_schema"));
check("effort is a valid level", requests.every((q) => !q.body.output_config?.effort || ["low", "medium", "high", "xhigh", "max"].includes(q.body.output_config.effort)));
check("streamed calls set stream:true", streams.every((q) => q.body.stream === true));
check("the document is sent line-numbered", requests.some((q) => JSON.stringify(q.body.messages).includes("   1 | MERIDIAN HEALTH INSURANCE")));
{
  const bad = structured.flatMap((q) => schemaKeysOk(q.body.output_config.format.schema));
  check("schemas use only keywords strict mode accepts", bad.length === 0, [...new Set(bad)].slice(0, 6).join(", "));
  const ex = structured.find((q) => q.kind === "extract").body.output_config.format.schema;
  const gd = structured.find((q) => q.kind === "guidance").body.output_config.format.schema;
  const miss = [...missingRequired(ex, MERIDIAN_CLEAN), ...missingRequired(gd, GUIDANCE_CLEAN)];
  check("these canned answers match the schemas actually sent", miss.length === 0, miss.join(", "));
}

/* ---------- 10. logs ---------- */
console.log("\nServer logs");
check("failures are logged in full for the operator", /\[hospitality\] model call failed/.test(serverErr));
check("the API key never appears in the logs", !serverErr.includes(FAKE_KEY));

/* ---------- summary ---------- */
const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed${failed.length ? ` — ${failed.length} FAILED` : ""}\n`);
stop();
process.exit(failed.length ? 1 : 0);

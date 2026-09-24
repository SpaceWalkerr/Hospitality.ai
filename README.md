# Hospitality

**Insurance-aware hospital and treatment navigation.**
Built for the GE HealthCare Precision Care Challenge 2026.

During a medical emergency, nobody has time to read forty pages of policy
clauses. Hospitality reads them for you: it parses a health insurance document
into a normalized structure, explains what it covers in plain language with
every statement traced back to the clause it came from, ranks hospitals and
room categories against those terms, and stays with you through admission,
investigation, procedure and recovery.

---

## What it is not

This is decision support, not care. It is enforced in the prompts, in the
service layer, and in the UI:

- It does **not** diagnose, assess severity, or advise on treatment.
- It does **not** approve, reject, or guarantee any claim.
- It does **not** invent policy terms. What the document does not say goes into
  a visible `gaps` list rather than being filled in with what is "usually" true.
- Every coverage claim carries a citation, and every citation is re-verified
  against the source text server-side before it reaches the screen.

A persistent, non-dismissible disclosure sits under the header on every screen,
and every generated answer repeats the caveat in its own footer.

---

## Running it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for live model calls
npm run dev
```

Open http://localhost:3000. Node 20.9 or newer.

`npm run check` runs typecheck, lint and a production build in one go.

### Demo Mode

With no `ANTHROPIC_API_KEY` set, the app runs end to end on pre-authored
extractions of the three bundled sample policies, so every screen is
explorable offline. The header shows **Demo Mode** rather than **Live**, and
the coverage screen says so explicitly.

Demo Mode cannot parse a pasted or uploaded document — it says so plainly
rather than pretending. Add a key and restart to use your own policy.

Even in Demo Mode the citations are run through the same verification routine
as live output, so the "Verified in source" badge means the same thing in both.

### Environment

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Absent ⇒ Demo Mode. Read server-side only; never reaches the browser bundle. |
| `ANTHROPIC_MODEL` | `claude-opus-5` | Model used by all three AI components. |
| `ANTHROPIC_EFFORT` | `medium` | Thinking depth for the structured-extraction calls. |
| `NEXT_PUBLIC_SITE_URL` | — | Public origin for link previews and `robots.txt`. Picked up automatically on Vercel. |

### Tests

```bash
npx playwright install chromium   # once
npm run test:e2e                  # builds, starts the production server, runs the suite
npm run test:e2e:ui               # interactive runner
```

Playwright tests on a desktop and a phone viewport (91 runs; pure-logic and
API-level tests run on desktop only): the full flow from
landing to journey, keyboard and focus behaviour, theme persistence, undo,
404s, response headers, rate limiting (the limiter's maths against a fake
clock, and 429s through the real middleware), plus axe WCAG 2.2 AA scans of every screen in light
and dark. They run against the production standalone server on port 3100 with
`ANTHROPIC_API_KEY` forced empty, so they are deterministic, cost nothing, and
never send a document to a model. Set `E2E_SKIP_BUILD=1` to reuse an existing
build.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, build and the e2e suite
on every push and pull request, and checks that the Docker image builds.

## Deploying

The app is a standard Next.js server (API routes stream model output, so it
needs a Node runtime, not static hosting). Set `ANTHROPIC_API_KEY` in the
host's secret store for live mode; leave it unset for a public Demo Mode.

**Vercel** — import the repo; no configuration needed. Add
`ANTHROPIC_API_KEY` under Project → Settings → Environment Variables. The
model routes declare `maxDuration = 120`; check that your plan allows
functions to run that long, or long policies may be cut off mid-stream.

**Containers** (Fly.io, Render, Railway, Cloud Run, ECS…):

```bash
docker build -t hospitality .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-... hospitality
```

The image runs the standalone server as a non-root user, listens on `$PORT`
(default 3000) and has a health check on `/api/config`.

**Any Node host** — `npm ci && npm run build && npm start`. `npm start` runs
the standalone server and honours `PORT` and `HOSTNAME`.

### Rate limiting

Every `/api/*` request passes through `middleware.ts`, which rejects excess
traffic with `429`, `Retry-After` and `RateLimit-*` headers before any route or
model call runs. The UI shows the server's message rather than a status code.

| Route | Per client |
|---|---|
| `/api/policy/parse` | 10 per 10 min (full extraction — the most expensive call) |
| `/api/policy/extract` | 20 per 10 min |
| `/api/hospitals/match` | 40 per 10 min |
| `/api/journey/guidance` | 30 per 10 min |
| `/api/journey/ask` | 20 per 10 min |
| `/api/config` | 120 per min |

On top of that, the four model routes share a global ceiling
(`RATE_LIMIT_GLOBAL_PER_HOUR`, default 600 calls an hour across all clients),
so many clients together can't run a live key up either. Limits live in
`lib/rateLimit.ts`; the algorithm is a sliding-window counter.

| Variable | Purpose |
|---|---|
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shared counters across instances. **Needed on Vercel or any multi-instance host**; without it each instance counts separately. `KV_REST_API_URL`/`_TOKEN` (Vercel's Upstash integration) also work. If Redis is unreachable, counting falls back to memory rather than letting everything through. |
| `RATE_LIMIT_IP_HEADER` | Header that identifies the client. Default `x-forwarded-for` (right-most entry — the one the nearest proxy wrote). Use `fly-client-ip` on Fly.io, `cf-connecting-ip` behind Cloudflare. Don't expose the server directly to the internet without a proxy that sets this header, or clients can pick their own identity. |
| `RATE_LIMIT_GLOBAL_PER_HOUR` | Global model-call ceiling (default 600). |
| `RATE_LIMIT=off` | Disable entirely — local debugging only. |

**Before a real launch**

- `npm audit` reports advisories in `tar`, reached only through `unpdf 0.12`'s
  optional `canvas` dependency (install-time tooling, not the upload path).
  The fix is `unpdf` 1.x, a breaking upgrade to PDF extraction — worth doing,
  with the PDF tests re-run.
- Security headers are set in `next.config.ts`; a Content-Security-Policy is
  not, because the inline theme script and Next's bootstrapping need per-request
  nonces via middleware.

---

## The three AI components

### 1. Policy Understanding Agent — `lib/services/policyAgent.ts`

Structured extraction via `client.messages.parse()` with a Zod schema, so the
model returns a validated `NormalizedPolicy` rather than prose to be scraped.
Extraction is delegated to the model deliberately: the clauses that decide
what a patient pays — proportionate deduction, co-pay ordering, scheme
exclusivity — are semantic, not lexical, and regex extraction over documents
that vary this much is a trap.

What is **not** delegated:

- **Arithmetic.** Resolved rupee caps (`1% of ₹5,00,000` → `₹5,000/day`) are
  computed in TypeScript from the extracted mode and value.
- **Verification.** The document is sent to the model with line numbers, and
  the model returns a verbatim quote plus a line range for every claim. Each
  quote is then located in the source (`verifyQuote`) using an exact
  normalized-substring match, falling back to a token-overlap window scan.
  Citations are stamped `exact`, `fuzzy` or `unverified`, and the UI renders
  the three differently — an unverifiable claim is visibly flagged rather than
  quietly presented as fact.

The plain-language brief is a second, streamed call over the extraction only.

### 2. Hospital & Room Matching Engine — `lib/services/matchingEngine.ts`

Ranking and money are computed deterministically. No model is asked to do
arithmetic on somebody's hospital bill. The engine models:

- **Room fit** per category — within cap, over cap, or outside entitlement,
  including category-based schemes where the entitlement is a ward rather than
  a rupee figure.
- **Proportionate deduction** — where the policy applies it, exceeding the room
  cap scales *every* associated charge by `cap / actual`. This is the single
  largest source of surprise bills in the Indian market and usually dwarfs the
  room difference itself.
- **Procedure sub-limits**, **co-pay** (skipped and flagged when the document
  makes it age-conditional, rather than silently charged), **deductible
  ordering**, **out-of-network haircut**, **non-payable consumables** (only
  where the policy actually excludes them), **scheme package rates** for
  government cover, and the **sum insured** ceiling.

Scoring is a fixed weighted formula over network status, specialty fit,
out-of-pocket cost, distance, emergency capability, admission wait, rating and
bed availability. The full breakdown is exposed in the UI under "Why this
rank" — the ranking is auditable, not a black box.

The model's only job here is narration: explaining the ordering in the
patient's language, streamed in behind a list that has already painted.

### 3. Care Journey Copilot — `lib/services/journeyCopilot.ts`

A four-stage state machine — admission → investigation → procedure → recovery.
Each transition generates four stage-specific, policy-grounded guidance items
(structured output again, with citations verified the same way), plus a
stage-scoped question box answered strictly from the document.

The point is anticipation: telling someone about the 48-hour pre-authorisation
window while they can still act on it.

---

## Architecture

```
app/
  page.tsx              Landing / onboarding — sample, paste, or PDF upload
  coverage/             Coverage dashboard with clause citations
  hospitals/            Ranked hospital finder with trade-offs
  journey/              Stage tracker with contextual guidance
  api/
    policy/parse        NDJSON stream: status → policy → points → brief deltas
    policy/extract      Server-side PDF text extraction (unpdf)
    hospitals/match     NDJSON stream: ranking first, narration behind it
    journey/guidance    Stage guidance
    journey/ask         Stage-scoped Q&A stream
    config              Reports Demo/Live to the client
lib/
  types.ts              Domain model — Citation is threaded through everything
  store.tsx             Session context + the NDJSON stream hook
  data/                 Fixtures: 3 policies, 14 hospitals, localities
  services/             The three agents, plus client, verification, demo mode
components/             Shell, citation drawer, cap meter, hospital card, primitives
```

**Data** lives behind repository-shaped accessors (`listHospitals()`,
`getSamplePolicy()`) so a real database can replace the fixtures without
touching callers.

**Keys** never reach the browser. Every model call goes through a route handler
that imports from `lib/services/anthropic.ts`, which is the only place a client
is constructed.

**PDF upload** rebuilds text line by line from glyph positions
(`app/api/policy/extract/route.ts`) rather than accepting a flat string. Every
coverage claim cites a line range, so a PDF that collapsed into one paragraph
would leave every citation pointing at "line 1". Citations authored against the
original documents still resolve `exact` against the PDF-extracted text, whose
line wrapping differs — the quote normaliser is insensitive to re-wrapping.

**Streaming** is newline-delimited JSON over `fetch` + `ReadableStream`. One
response carries both structured payloads and token deltas, so the hospital
list can paint from a deterministic result while the narrative streams in
behind it. Deltas are flushed on animation frames rather than per token — a
token-per-render loop stutters, and this screen should feel calm.

---

## Design

A considered visual identity rather than component-library defaults.

**Quiet Plum.** Deep aubergine ink and a plum primary on a warm grey ground,
with one decorative form — the portico from the wordmark — reused as the hero
watermark, the section dividers and the journey's stage arc. Reusing a single
shape is what makes a restrained palette read as an identity rather than as a
theme.

**Voice and data are different typefaces.** Fraunces (optical-size and
"soft" axes) carries anything the reader has to sit with: headings, the
plain-language brief, an italic accent on the line that matters. Every *figure*
wears Instrument Sans, semibold, tabular — numerals need to be unambiguous more
than characterful, and a serif hero number reads as decoration rather than as a
fact someone is about to act on.

**One answer per screen.** Each screen opens with a single "verdict" block — the
policy and its sum insured, the top-matched hospital and what you'd pay, the
current stage — on a softly lit surface. Everything else is visibly secondary,
and the next step follows you in a sticky bar once the verdict scrolls away.

**Chrome is muted; data is chromatic.** Chips, accent rules and text use the
sage/ochre/clay steps. Anything that encodes a value — a meter fill, a split
bar, a plotted point — uses the deeper `--color-viz-*` trio, so the data is the
only loud thing on screen.

**Tokens, not values.** Everything lives in `app/globals.css`: a ten-step type
scale (nothing smaller than 12px; body at 15px), radius and shadow scales, and
colour tokens with a full dark theme that redefines the same names under
`[data-theme="dark"]`, so markup never branches on theme. Reusable components
(buttons, segmented controls, chips, fields, sheet/modal with focus trapping,
toasts, skeletons, empty and error states) live in `components/ui/`.

**Light and dark.** The theme follows the system by default, with a
System / Light / Dark toggle in the header and footer; a pre-paint script
prevents a flash of the wrong theme. Light suits a bright corridor; dark suits
a dim ward at 3am.

Fully responsive and phone-first — top stepper becomes a bottom tab bar, the
citation drawer becomes a bottom sheet, the stage arc becomes a vertical spine,
case inputs collapse to a one-line summary, wide tables scroll inside their own
containers. `prefers-reduced-motion` is honoured throughout, and every scroll
reveal carries a timeout fail-safe so content can never be left permanently
invisible. Entry animations fill `backwards`, never `both`: a finished
animation must not leave a transform behind, or it becomes the containing
block for every `position: fixed` descendant.

### Data visualization

Two custom visualizations, both chosen by the data's job rather than by taste.

**The cap meter** — room rent against the daily limit. Two stacked segments
separated by a 2px surface gap rather than a stroke, with the over-cap portion
hatched as well as red so it survives print and forced-colors. Excess is drawn
as an overhang past the limit line, so excess reads as excess.

**The trade-off plot** (`components/viz/TradeOffPlot.tsx`) — distance against
what you pay, which is the brief's "surface the trade-offs" requirement taken
literally. A ranked list flattens a two-dimensional decision into one number; a
scatter shows the cheap-and-close corner and what it costs to leave it. It is
how you discover, at a glance, that a hospital can be in-network *and* cashless
and still leave ₹1.5 lakh with you, because proportionate deduction applies.

Network status is a **state**, so it wears the reserved status trio, and never
colour alone: each state also carries its own shape and appears in the legend
with a label. Three states is also the all-pairs series cap the palette was
validated against. Hit targets are 15px around 9px marks, tooltips answer to
keyboard focus as well as hover, and the ranked list below the chart is its
table view — every plotted value is readable there without hovering anything.

The palette is computed, not eyeballed, in both themes. Light, against
`#fffdfb`: worst CVD ΔE **10.3** (deutan; target ≥8), worst normal-vision ΔE
**20.0** (floor ≥15). Dark, against `#1e1823`: worst CVD ΔE **9.7**,
normal-vision ΔE **16.1**. All six marks clear 3:1 contrast. Re-run before
changing any of them:

```bash
node scripts/validate_palette.js "#00846c,#b8871c,#9e2b23" --mode light --surface "#fffdfb" --pairs all
node scripts/validate_palette.js "#18a07e,#bb881a,#c04637" --mode dark --surface "#1e1823" --pairs all
```

## Data

Everything is synthetic. The three policy documents are fictional but modelled
closely on the structure and vocabulary of real Indian health insurance
paperwork — an IRDAI-style retail indemnity policy, an Ayushman Bharat PM-JAY
entitlement record, and an employer group mediclaim certificate, with
ESI/CGHS coordination clauses where they belong. The 14 Bengaluru hospitals,
their room tariffs, package costs and empanelment are invented. No real
insurer, facility or person is depicted.

---

## Known limits of the prototype

- Fixtures only — no persistence between sessions beyond `sessionStorage`.
- Rate limits are in memory per instance unless Redis is configured (see Deploying).
- Scanned PDFs will not read; there is no OCR. The upload path says so.
- Bed availability, tariffs and empanelment are static rather than live feeds.
- Distances are straight-line, not drive time.
- Demo Mode cannot parse arbitrary documents.

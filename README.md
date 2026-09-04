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

`npm run typecheck`, `npm run lint` and `npm run build` are all clean.

Open http://localhost:3000.

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

A considered visual identity rather than component-library defaults:

- **Quiet Plum** — deep aubergine ink and plum primary on a warm grey ground,
  with sage for covered, ochre for caution and clay for excluded. Semantic
  colour is consistent across all four screens: sage always means the policy
  bears it, clay always means you do.
- **Newsreader** for the voice and **Inter** for the interface, both
  self-hosted through `next/font`. Anything the reader has to sit with is set
  in the serif; anything they scan is set in Inter, with tabular figures
  everywhere money appears.
- Light-only, deliberately. High even luminance reads better on a phone in a
  bright hospital corridor than a dim theme does.
- Fully responsive, phone-first: top nav on desktop becomes a bottom tab bar,
  the citation drawer becomes a bottom sheet, wide tables scroll inside their
  own containers, and `prefers-reduced-motion` is respected throughout.

The **cap meter** is the one custom visualisation: room rent against the daily
limit, with over-cap drawn as a hatched overhang past the limit line rather
than as a longer bar, so excess reads as excess.

---

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
- Scanned PDFs will not read; there is no OCR. The upload path says so.
- Bed availability, tariffs and empanelment are static rather than live feeds.
- Distances are straight-line, not drive time.
- Demo Mode cannot parse arbitrary documents.

# Hospitality — Frontend Redesign Plan

Status: **implemented** on `redesign/frontend` (approved with all four recommendations).
Deviation from the proposal: body text ships at 15px rather than 15.5px —
15.5 made the dense hospital cards too loose.

## 1. What this is

**Product.** Insurance-aware hospital navigation for India. A patient or family
member provides a health-insurance document; the app explains it clause by
clause, ranks hospitals against its terms, and guides them through the stay.

**Users.** Family members and patients under acute stress, often on a phone,
often at night, often in a hospital corridor. They are not insurance experts.
Secondary audience: challenge judges (GE HealthCare Precision Care Challenge).

**Stack.** Next.js 15 (App Router, all pages client components), React 19,
Tailwind v4 (CSS-first `@theme` in `app/globals.css`), `next/font`
(Newsreader + Inter), hand-rolled SVG icons, no component library, no
animation library. Session state in React context mirrored to
`sessionStorage`. No project test suite; `typecheck` and `lint` are clean.

### Pages and the main flow

| Route | Purpose |
|---|---|
| `/` | Landing + onboarding: choose a sample, paste text, or upload a PDF |
| `/coverage` | Parsed policy: key limits, plain-language brief, room eligibility, costs, sub-limits, exclusions, network, gaps |
| `/hospitals` | Case inputs → trade-off scatter → AI narration → filters/sort → ranked hospital cards → choose one |
| `/journey` | 4-stage tracker (admission → investigation → procedure → recovery), guidance cards, chosen-hospital card, Q&A box |

Global: sticky header, non-dismissible AI disclosure strip, citation drawer
(side sheet on desktop, bottom sheet on mobile), mobile bottom tab bar.

**Main flow:** Landing → pick policy → *Coverage* → *Hospitals* → choose →
*Journey*. It takes 4+ screens, and the next step on each screen sits at the
very bottom.

---

## 2. Audit

The starting point is **not** a generic site. There is a deliberate, documented
identity ("Quiet Plum": arch motif, serif/sans voice-vs-data split, a
colour-blind-validated data palette), and it is good work. The weaknesses are
mostly about **hierarchy, flow and consistency**, not taste. My recommendation
is to evolve that identity, not throw it away.

### 2.1 Visual weaknesses

- **Everything is a card at the same volume.** Coverage has 4 stat tiles + brief
  + 4 summary cards + 6 sections, all white cards with 3px coloured rules. No
  single view says "this is the answer". The eye has nowhere to land.
- **Typography has drifted.** 32 distinct arbitrary font sizes
  (`text-[11px]`, `[11.5px]`, `[12px]`, `[12.5px]`, `[13px]`, `[13.5px]` …)
  and 10 arbitrary radii. There is no type scale, only a pile of values.
- **Body copy is too small for the audience.** Most explanatory text is
  12.5–13.5px, and a lot of UI is 11px uppercase with wide tracking. That is
  hard to read on a phone for a tired reader.
- **The primary action doesn't look primary.** The plum-500 pill is small
  (≈32px tall, 12.5–13px text), and there is no `Button` component: 5+
  hand-written button class strings, each slightly different.
- **The hero headline breaks badly at tablet widths.** Forced `<br>`s produce
  "Nobody should / have / to decode a / policy / document" at ~800px.
- **The landing footer is one line of disclaimer.** No navigation, and it
  ends the page flat.
- **The palette is quite dark and flat.** It is calm, but there is very little
  light or depth. Surfaces are near-identical warm greys.

### 2.2 Likely drop-off points

1. **Landing (mobile): no call to action above the fold.** At 360×780 the
   "Start with your policy" card begins at y=750. There is no button in the
   hero at all.
2. **Landing: too many equal choices.** 3 tabs × 3 sample cards. First-time
   visitors don't know which sample to pick or why.
3. **Coverage: the next step is 3,650px down.** "Find hospitals" only appears
   at the bottom. There is no section navigation, and it is a long scroll
   on mobile.
4. **Hospitals: the answer is ~1,000px down.** The case bar, scatter plot and
   narration all come before the first ranked hospital. The #1 match is never
   presented as a recommendation.
5. **Destructive action with no safety net.** "New policy" wipes the session
   (including a parse that took real tokens) with no confirmation or undo.
6. **Dead ends.** Error states have no retry button (Coverage, Hospitals).
   "No hospital chosen" on Journey is a paragraph, not a path forward. There
   are no `not-found` or `error` pages.
7. **Silent actions.** Choosing a hospital, changing filters and resetting all
   give no feedback beyond a label change. There are no toasts at all.

### 2.3 Accessibility

| Issue | Where |
|---|---|
| Tabs have no `role="tablist"/"tab"`, `aria-selected`, or arrow-key support | Landing start card |
| Toggle buttons lack `aria-pressed` | Filter chips, sort, urgency |
| Dialog has no focus management: focus isn't moved in, trapped, or returned | Citation drawer |
| `aria-label` on a non-interactive `<span>` (ignored by AT) | Citation "unverified" dot |
| Streaming answers are not in an `aria-live` region | Brief, narration, Ask box |
| No skip-to-content link | Global |
| Tap targets under 24px (WCAG 2.2 AA 2.5.8) | Citation chips (~20px), sort pills |
| `ink-subtle` on `surface-sunk` = **4.31:1** (fails AA for small text) | Various |
| `plum-300` numerals on surface = **2.40:1** | Landing "01/02/03" |
| Disabled buttons: white on `line-strong` = **1.58:1** (exempt, but unreadable) | Paste / Ask |
| Filter result count isn't announced | Hospitals |

What's already right: `prefers-reduced-motion` is honoured, reveals have a
fail-safe, focus-visible outlines exist, the charts carry shape + label
(not colour alone), and semantic `dl`/`ol`/`article` are used.

### 2.4 Mobile

- No above-the-fold CTA on landing (above).
- The disclosure strip truncates mid-sentence at 360px.
- The Hospitals case bar stacks 4 full-width fields, pushing results off-screen.
  It should collapse to a one-line summary with "Edit".
- Filter chips wrap to 2–3 rows. A horizontally scrolling row would be better.
- The sticky "Selected … Start the journey" pill competes with the bottom tab
  bar.
- No horizontal overflow at 360px (checked: `scrollWidth === innerWidth`). Good.

---

## 3. Design direction

**"Calm clarity, with warmth."** Keep the soul (plum, the arch, the serif voice,
the validated data colours) and add *light, depth and hierarchy*. The product
should feel like a composed friend who has read the fine print, not a bank and
not a startup.

### 3.1 Palette

Keep the families, restructure them into **semantic tokens** that switch
per theme. Components use only semantic names (`bg`, `surface`, `fg`, `muted`,
`accent`, `good/warn/bad`), never raw steps.

| Token | Light | Dark |
|---|---|---|
| `bg` | `#f7f4f1` warm paper | `#141017` aubergine night |
| `surface` | `#fffdfb` | `#1e1823` |
| `surface-2` (raised/sunk) | `#f1ece8` | `#28212e` |
| `line` | `#e6dfdc` | `#382f3f` |
| `fg` | `#221a29` | `#f2edf4` |
| `fg-muted` | `#554a5e` | `#c6bccc` |
| `fg-subtle` | `#6e6377` (≥4.5 on every surface) | `#9d92a4` |
| `accent` (primary action) | `#5a3570`, a touch more saturated than today's plum-500 | `#cfa9e3` |
| `accent-soft` | `#efe4f4` | `#2f2238` |
| `glow` (hero/CTA light) | apricot `#e9a86b` @ low alpha | same, lower alpha |

Status (sage/ochre/clay) and the **data trio** keep their meaning. The light
data trio stays exactly as validated. A dark trio will be tuned and **must pass
`scripts/validate_palette.js --mode dark`** before shipping. Shipped trio: `#18a07e, #bb881a, #c04637` (worst CVD ΔE 9.7, normal-vision
ΔE 16.1, all ≥3:1).

### 3.2 Typography

Recommended pair:

- **Display & reading voice: Fraunces** (variable, optical-size + "soft" axes).
  It is warmer and more distinctive than Newsreader at hero sizes, and its
  optical sizing keeps it comfortable for the plain-language brief.
- **UI & figures: Instrument Sans.** It has character without novelty, is
  crisp at small sizes, and supports tabular figures (I'll verify `tnum`
  renders before committing, and fall back to IBM Plex Sans if not).

Both load through `next/font` (self-hosted, no layout shift), still two
families. The "voice vs data" rule stays: serif for sentences, sans for every
number.

**Type scale** (replaces 32 ad-hoc sizes with 10 tokens):

| Token | Size / line-height | Use |
|---|---|---|
| `text-label` | 12px / 1.3, +0.08em, semibold | eyebrows, meta, never smaller |
| `text-xs` | 13px / 1.5 | captions, chips |
| `text-sm` | 14px / 1.55 | secondary UI |
| `text-base` | **15px / 1.65** | body (up from 13.5px) |
| `text-lg` | 17.5px / 1.6 | lead paragraphs, brief |
| `text-xl` | 20px / 1.35 | card titles |
| `text-2xl` | 24px / 1.25 | section titles |
| `text-3xl` | 30px / 1.15 | page titles |
| `text-4xl` | 40px / 1.05 | section heroes |
| `text-display` | clamp(40px, 6.2vw, 76px) / 1.0 | landing headline |

Headlines use `text-wrap: balance` instead of forced `<br>`s. Prose uses
`text-wrap: pretty`.

### 3.3 Spacing, radii, elevation, motion

- **Spacing:** Tailwind's 4px grid, plus rhythm tokens `--space-section`
  (64px mobile / 104px desktop) and `--space-block` (24 / 32px).
- **Radii:** `sm 8` · `md 12` · `lg 16` · `xl 24` · `full` (replacing 10
  arbitrary values).
- **Shadows:** `xs`, `sm`, `md`, `lg`, `glow`, still warm-tinted and never
  grey-blue. In dark mode, shadows give way to 1px inner highlights, since
  shadows are invisible on dark surfaces.
- **Motion:** durations `fast 140ms`, `base 220ms`, `slow 420ms`, one ease
  curve (existing `ease-out-soft`). Hover lift = 2px + shadow step; press = 0.98
  scale. The global `prefers-reduced-motion` override is kept.

### 3.4 Visual personality

- **One answer per screen.** Each page opens with a "verdict" block: a large
  figure plus a sentence, on a slightly tinted, softly lit surface. Everything
  else is visibly secondary (quieter cards, fewer borders, more whitespace).
- **Light in the room.** The hero's ambient washes get a soft apricot glow
  behind the primary CTA and the verdict blocks. This is depth, not decoration.
- **The arch stays the only ornament.** It becomes the hero visual's frame, the
  stepper's shape, and the empty-state illustration, all in a single stroke
  style.
- **Fewer coloured rules.** The 3px left/top bars on nearly every card get
  replaced by small icon + label status markers. Colour then means something
  again.

### 3.5 Dark mode — this reverses a documented decision

The README says "Light-only, deliberately" (bright corridors). I'd argue the
product's own headline, *"at 3am"*, is the case for a dark theme: a
full-brightness page in a dim ward at night is harsh. Proposal: **follow the
system setting by default**, add a three-way toggle (System / Light / Dark) in
the header, persist the choice in `localStorage`, and prevent a flash of the
wrong theme with an inline pre-hydration script. **Needs your sign-off.**

### 3.6 Social proof — a caution

Everything in this prototype is synthetic, and it is a healthcare decision
tool. **I recommend no invented testimonials, user counts or star ratings.**
Fabricated social proof would undercut the product's core promise ("every
claim traced to its source"). Trust will come from things that are true:

- a "How we check" strip: citations re-verified server-side, arithmetic done in
  code, never stored, never diagnoses;
- live stats computed from the bundled data ("3 sample policies · 14
  hospitals · every claim linked to a clause");
- the challenge badge (GE HealthCare Precision Care Challenge 2026);
- the existing "what it is / what it is not" boundary section, made more
  prominent.

---

## 4. Implementation plan (after approval)

No new runtime dependencies. Toasts, modal and focus trap are hand-rolled
(~150 lines total); motion stays CSS-only. Commits land on a
`redesign/frontend` branch, one per chunk below, with `typecheck`, `lint` and
`build` run after each.

1. **Tokens & theme.** Semantic tokens + dark theme in `globals.css`, font
   swap, type/radius/shadow scales, theme toggle + no-flash script,
   `template.tsx` route fade.
2. **Component kit** in `components/ui/`: `Button` (primary / secondary /
   ghost / danger × sm/md/lg, with loading, disabled, focus and press states),
   `Card` (default / raised / verdict), `Input`, `Select`, `Textarea`,
   `SegmentedControl` (accessible tabs/toggles), `Badge`, `Chip` (aria-pressed),
   `Modal`/`Sheet` (focus trap and return), `Toast` provider, `Skeleton`
   variants, `EmptyState`, `ErrorState` (with retry). Existing `Pill`,
   `StatTile` etc. are migrated onto these.
3. **Shell.** Header with a 3-step flow stepper (Coverage → Hospitals →
   Journey, showing completion), theme toggle, "New policy" with undo toast;
   skip link; a real footer (links, disclaimer, mode, challenge badge);
   disclosure strip that wraps rather than truncates; `not-found` and `error`
   pages.
4. **Landing.** Balanced display headline; **one primary CTA**: "See how it
   reads a real policy" (one click → coverage on the most instructive sample),
   secondary "Use my own policy"; the CTA is above the fold at 360px. Hero
   visual: a layered, gently animated product preview (verdict card + citation
   highlight + cap meter) inside the arch. Then "How it works" (3 steps mapped
   to the 3 screens), the proportionate-deduction showcase, "How we check"
   trust strip, boundaries, and the footer. Start card: accessible tabs;
   samples explained with "best for…" hints.
5. **Coverage.** Verdict header (sum insured + the 3 facts that matter most);
   sticky in-page section nav (scrolling chips on mobile); calmer secondary
   sections; a **sticky "Find hospitals that fit →" bar** once the header
   scrolls away; error state with retry; parsing panel with a real progress bar.
6. **Hospitals.** Collapsible case summary on mobile ("Angioplasty · Jayanagar
   · 4 days · Emergency — Edit"); a **"Top match" verdict card before the
   chart**; a sticky filter/sort row with a live result count; a hospital card
   rebuilt around one number ("You pay ₹X"); a toast on choose; an empty state
   with "Clear filters"; retry on error.
7. **Journey.** Stage header with "Stage 2 of 4" + progress; refreshed
   guidance cards; a friendly empty state for no hospital (inline CTA); Ask box
   with chip suggestions, a live region and a skeleton; a completion card at
   Recovery.
8. **A11y & QA pass.** Fix every item in §2.3; check at 360 / 768 / 1024 /
   1440 in light and dark; Lighthouse on the production build; update the
   README's Design section.

### Out of scope (unchanged)

API routes, `lib/services/*`, `lib/types.ts`, the store's shape, the
matching/verification logic, and all copy that carries a safety caveat. The
caveats may be restyled but never removed or weakened.

---

## 5. Decisions needed from you

1. **Evolve the existing Quiet Plum identity (recommended) or start fresh?**
2. **Dark mode** — OK to reverse the documented light-only decision?
3. **Fonts** — Fraunces + Instrument Sans (recommended), or keep Newsreader
   and only replace Inter?
4. **Social proof** — agree to true trust signals only, no invented
   testimonials?

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CapMeter } from "@/components/CapMeter";
import { HeroPreview } from "@/components/HeroPreview";
import { AmbientWash, ArchRule } from "@/components/Ornament";
import { Reveal } from "@/components/motion";
import {
  Button,
  ButtonLink,
  ErrorNote,
  Eyebrow,
  Pill,
  Segmented,
  TabPanel,
} from "@/components/ui";
import {
  ArrowRight,
  Calculator,
  Check,
  Doc,
  Lock,
  Pin,
  Route,
  Shield,
  Stethoscope,
  Upload,
} from "@/components/ui/Icons";
import { SAMPLE_POLICIES } from "@/lib/data/samplePolicies";
import { listHospitals } from "@/lib/data/hospitals";
import { useStore } from "@/lib/store";

type Tab = "sample" | "paste" | "upload";
type Origin = "sample" | "paste" | "pdf";

/** Why you might pick each sample — the first-time visitor's missing context. */
const SAMPLE_HINT: Record<string, string> = {
  meridian: "Best first look",
  pmjay: "Government scheme",
  ridgeway: "Co-pay & deductible",
};

/** Starts a fresh session from a document and moves to the coverage screen. */
function useBegin() {
  const router = useRouter();
  const { update } = useStore();
  return useCallback(
    (text: string, name: string, origin: Origin, sampleId?: string) => {
      update({
        source: { text, name, origin },
        sampleId: sampleId ?? null,
        policy: null,
        points: [],
        brief: "",
        matches: [],
        comparison: "",
        guidance: {},
        visited: ["admission"],
        stage: "admission",
        chosen: null,
      });
      router.push("/coverage");
    },
    [router, update],
  );
}

export default function Landing() {
  const [tab, setTab] = useState<Tab>("sample");

  const openOwn = () => {
    setTab("paste");
    document.getElementById("start")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AppShell>
      <Resume />
      <Hero onOwn={openOwn} />
      <Start tab={tab} setTab={setTab} />
      <HowItWorks />
      <Showcase />
      <HowWeCheck />
      <Boundaries />
      <FinalCta onOwn={openOwn} />
    </AppShell>
  );
}

/* ---------------- returning visitor ---------------- */

function Resume() {
  const { session, hydrated } = useStore();
  if (!hydrated || !session.policy) return null;
  const next = session.chosen ? "/journey" : "/hospitals";
  return (
    <div className="border-b border-line/70 bg-surface/60">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">Welcome back.</span> You were
          reading <span className="font-medium text-ink">{session.policy.planName}</span>.
        </p>
        <ButtonLink href={next} size="sm" variant="soft">
          Pick up where you left off <ArrowRight className="size-3.5" />
        </ButtonLink>
      </div>
    </div>
  );
}

/* ---------------- hero ---------------- */

function Hero({ onOwn }: { onOwn: () => void }) {
  const begin = useBegin();
  const [going, setGoing] = useState(false);
  const first = SAMPLE_POLICIES[0];

  return (
    <section className="relative overflow-hidden">
      <AmbientWash />

      <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-4 pt-10 pb-16 sm:px-6 sm:pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:pt-20 lg:pb-24">
        <div className="animate-rise relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-plum-200 bg-surface/70 px-3 py-1.5 text-label font-semibold tracking-[0.1em] text-plum-600 uppercase backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-plum-400" />
            Insurance-aware care navigation
          </span>

          <h1 className="mt-5 max-w-[13ch] font-display text-display tracking-[-0.03em] text-ink">
            Nobody should have to decode a policy{" "}
            <em className="font-normal whitespace-nowrap text-plum-500 italic">at 3am.</em>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-ink-muted">
            Hospitality reads your health cover, answers the questions that come
            up at admission in plain language, and shows you the exact line
            every answer came from.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              loading={going}
              onClick={() => {
                setGoing(true);
                begin(first.text, first.label, "sample", first.id);
              }}
            >
              See it read a real policy <ArrowRight />
            </Button>
            <Button size="lg" variant="secondary" onClick={onOwn}>
              Use my own policy
            </Button>
          </div>
          <p className="mt-3 text-sm text-ink-subtle">
            No sign-up. Takes about ten seconds. Nothing is stored.
          </p>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
            {[
              "Every claim cites its clause",
              "Built for a phone in a waiting room",
              "Never diagnoses or advises treatment",
            ].map((t, i) => (
              <Reveal
                as="li"
                key={t}
                delay={220 + i * 90}
                className="inline-flex items-center gap-2 text-sm text-ink-muted"
              >
                <span className="grid size-5 place-items-center rounded-full bg-sage-100 text-sage-700">
                  <Check className="size-3" />
                </span>
                {t}
              </Reveal>
            ))}
          </ul>
        </div>

        <div className="animate-rise [animation-delay:160ms]">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

/* ---------------- start ---------------- */

function Start({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <section id="start" className="scroll-mt-28 border-y border-line/70 bg-surface/50">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] [&>*]:min-w-0 lg:gap-16 lg:py-24">
        <Reveal>
          <Eyebrow>Step one</Eyebrow>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Start with your policy
            <em className="font-normal text-plum-500 italic"> — or one of ours.</em>
          </h2>
          <p className="mt-4 max-w-md text-base text-ink-muted">
            The samples are complete, realistic policy documents: a retail
            floater, a government scheme and an employer cover. They work
            without an API key, so they are the fastest way to see what
            Hospitality does.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink-muted">
            <li className="flex gap-3">
              <Lock className="mt-0.5 size-5 shrink-0 text-plum-400" />
              Read on the server and never stored. Your session lives only in
              this browser tab.
            </li>
            <li className="flex gap-3">
              <Doc className="mt-0.5 size-5 shrink-0 text-plum-400" />
              A policy schedule, certificate of insurance or scheme entitlement
              letter all work.
            </li>
          </ul>
        </Reveal>

        <Reveal delay={100}>
          <StartCard tab={tab} setTab={setTab} />
        </Reveal>
      </div>
    </section>
  );
}

const MIN_CHARS = 200;

function StartCard({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const begin = useBegin();
  const { config } = useStore();
  const [pasted, setPasted] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const prefix = "start";

  const chars = pasted.trim().length;
  const pasteError =
    touched && chars > 0 && chars < MIN_CHARS
      ? `Paste at least ${MIN_CHARS} characters so there is something to read — ${MIN_CHARS - chars} to go.`
      : null;

  const onUpload = async (file: File) => {
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      setError("That doesn’t look like a PDF. Choose a .pdf file, or paste the text instead.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/policy/extract", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "That file could not be read.");
      begin(data.text, data.name, "pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That file could not be read.");
      setBusy(false);
    }
  };

  return (
    <div className="card overflow-hidden shadow-[var(--shadow-lg)]">
      <div className="border-b border-line p-3 sm:p-4">
        <Segmented
          as="tabs"
          idPrefix={prefix}
          label="How to add your policy"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setError(null);
          }}
          options={[
            ["sample", "Use a sample"],
            ["paste", "Paste text"],
            ["upload", "Upload PDF"],
          ]}
        />
      </div>

      <div className="p-4 sm:p-5">
        {tab === "sample" && (
          <TabPanel id="sample" prefix={prefix}>
            <ul className="stagger space-y-3" style={{ ["--stagger-step" as string]: "70ms" }}>
              {SAMPLE_POLICIES.map((s, i) => (
                <li key={s.id} style={{ ["--i" as string]: i }}>
                  <button
                    type="button"
                    onClick={() => begin(s.text, s.label, "sample", s.id)}
                    className="lift group relative block w-full overflow-hidden rounded-[14px] border border-line bg-surface p-4 text-left sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="label">{s.insurer}</div>
                        <div className="mt-1 font-display text-xl text-ink">{s.label}</div>
                      </div>
                      <Pill tone={s.accent}>{SAMPLE_HINT[s.id] ?? s.tag}</Pill>
                    </div>
                    <p className="mt-2 text-sm text-ink-muted">{s.blurb}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                      Read this policy
                      <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </TabPanel>
        )}

        {tab === "paste" && (
          <TabPanel id="paste" prefix={prefix} className="space-y-3">
            <label htmlFor="paste-input" className="label block">
              Policy text
            </label>
            <textarea
              id="paste-input"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              onBlur={() => setTouched(true)}
              rows={9}
              aria-invalid={pasteError ? true : undefined}
              aria-describedby="paste-help"
              placeholder="Paste the text of your policy schedule, certificate of insurance, or entitlement letter…"
              className="field resize-y font-mono text-xs leading-relaxed"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span id="paste-help" className={`text-xs ${pasteError ? "font-medium text-clay-600" : "text-ink-subtle"}`}>
                {pasteError ?? (
                  <>
                    <span className="figure font-normal">{chars.toLocaleString()}</span> characters
                    {chars >= MIN_CHARS && (
                      <span className="ml-2 inline-flex items-center gap-1 text-sage-700">
                        <Check className="size-3" /> Ready
                      </span>
                    )}
                  </>
                )}
              </span>
              <Button
                disabled={chars < MIN_CHARS}
                onClick={() => begin(pasted, "Pasted policy text", "paste")}
              >
                Read this policy <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </TabPanel>
        )}

        {tab === "upload" && (
          <TabPanel id="upload" prefix={prefix} className="space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void onUpload(f);
              }}
              className={`flex w-full flex-col items-center gap-3 rounded-[14px] border-2 border-dashed px-4 py-10 transition-colors disabled:cursor-progress ${
                dragging
                  ? "border-accent bg-accent-soft"
                  : "border-line-strong bg-canvas hover:border-plum-300 hover:bg-plum-50"
              }`}
            >
              {busy ? (
                <>
                  <span className="relative h-1 w-40 overflow-hidden rounded-full bg-plum-100">
                    <span className="progress-indeterminate absolute inset-y-0 w-1/3 rounded-full bg-accent" />
                  </span>
                  <span className="text-base font-medium text-ink-muted" role="status">
                    Reading the file…
                  </span>
                </>
              ) : (
                <>
                  <span className="grid size-12 place-items-center rounded-full bg-plum-100 text-plum-500">
                    <Upload className="size-6" />
                  </span>
                  <span className="text-base font-medium text-ink">
                    {dragging ? "Drop it here" : "Choose a PDF or drag it here"}
                  </span>
                  <span className="text-xs text-ink-subtle">
                    Text-based PDFs up to 12 MB. Scanned images won’t read.
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
                e.target.value = "";
              }}
            />
          </TabPanel>
        )}

        {error && (
          <div className="mt-3">
            <ErrorNote message={error} />
          </div>
        )}

        {config?.demo && tab !== "sample" && (
          <div className="mt-3 rounded-[12px] border border-ochre-300/50 bg-ochre-50 p-3.5 text-xs text-ochre-700">
            Demo Mode is on because no{" "}
            <code className="font-mono">ANTHROPIC_API_KEY</code> is set. Your
            own document can be added, but it cannot be parsed until a key is
            configured — the three samples work either way.
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- how it works ---------------- */

const STEPS = [
  {
    Icon: Shield,
    to: "Coverage",
    q: "What does my policy actually cover?",
    a: "Room limits, co-pay, sub-limits, exclusions and waiting periods, explained in plain language. Every line links to the clause it came from.",
  },
  {
    Icon: Pin,
    to: "Hospitals",
    q: "Which hospitals will actually take my card?",
    a: "Every hospital and room category is checked against your network and daily limits, then ranked. What you'd pay is shown next to each one.",
  },
  {
    Icon: Route,
    to: "Journey",
    q: "What do I need to do at each stage?",
    a: "Admission, tests, the procedure and recovery. At each stage you're told about the deadlines and caps while you can still act on them.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-28">
      <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
        <Reveal className="max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            Three questions nobody can answer
            <em className="font-normal text-plum-500 italic"> in a corridor.</em>
          </h2>
        </Reveal>

        <ol className="relative mt-12 grid gap-5 md:grid-cols-3">
          <span
            aria-hidden="true"
            className="absolute top-7 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-plum-200 via-plum-300 to-plum-200 md:block"
          />
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.to} delay={i * 120} className="relative">
              <div className="card lift h-full p-6">
                <div className="flex items-center gap-3">
                  <span className="relative grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent ring-8 ring-canvas">
                    <s.Icon className="size-6" />
                  </span>
                  <div>
                    <div className="figure text-label tracking-[0.18em] text-plum-400">
                      STEP {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="text-sm font-semibold text-ink">{s.to}</div>
                  </div>
                </div>
                <h3 className="mt-5 font-display text-xl text-ink">{s.q}</h3>
                <p className="mt-2.5 text-base text-ink-muted">{s.a}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------- showcase ---------------- */

function Showcase() {
  return (
    <section className="border-y border-line/70 bg-surface/50">
      <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:py-24">
        <Reveal>
          <Eyebrow>The clause that catches people</Eyebrow>
          <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            A nicer room can cost you
            <em className="font-normal text-plum-500 italic"> five times</em> the
            room difference.
          </h2>
          <p className="mt-4 max-w-lg text-base text-ink-muted">
            Most retail policies in India cap room rent at 1% of the sum insured
            and then apply <strong className="font-semibold text-ink">proportionate
            deduction</strong>: exceed the cap and the insurer pays a reduced
            share of <em>every</em> associated charge — surgeon, anaesthetist,
            theatre, nursing — in the same ratio. On a ₹2.5 lakh bill that is
            usually far more than the room itself.
          </p>
          <p className="mt-3.5 max-w-lg text-sm text-ink-subtle">
            It is one sentence, on page nine, in a document nobody reads at
            admission. So we put it on the first screen instead.
          </p>
        </Reveal>

        <Reveal delay={140}>
          <div className="card-verdict">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <span className="label">Single Private · Kaveri Institute</span>
              <Pill tone="clay">Over limit</Pill>
            </div>
            <div className="space-y-5 p-5">
              <CapMeter rate={11500} cap={5000} label="Room rent" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[14px] border border-line bg-canvas p-4">
                  <div className="label">Room difference</div>
                  <div className="figure mt-2 text-2xl leading-none text-ink">₹26,000</div>
                  <div className="mt-1.5 text-xs text-ink-subtle">4 days over the cap</div>
                </div>
                <div className="rounded-[14px] border border-clay-300/60 bg-clay-50 p-4">
                  <div className="label !text-clay-600">Also deducted</div>
                  <div className="figure mt-2 text-2xl leading-none text-clay-600">₹1,39,650</div>
                  <div className="mt-1.5 text-xs text-clay-600">
                    57% of every associated charge
                  </div>
                </div>
              </div>
              <p className="text-xs text-ink-subtle">
                Illustrative, on the bundled Meridian sample policy. Your own
                numbers come from your own document.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- trust ---------------- */

const CHECKS = [
  {
    Icon: Doc,
    title: "Every claim cites its clause",
    body: "Press any clause chip to see the exact lines of your document, highlighted.",
  },
  {
    Icon: Shield,
    title: "Quotes are re-checked against the source",
    body: "The server looks for each quoted passage in your document. Anything it can’t find is marked, not hidden.",
  },
  {
    Icon: Calculator,
    title: "Money is computed, not generated",
    body: "Caps, co-pay, deductibles and proportionate deduction are calculated in code. No model does arithmetic on your bill.",
  },
  {
    Icon: Stethoscope,
    title: "It never gives medical advice",
    body: "It doesn’t diagnose, judge how serious something is, or recommend treatment. Only coverage.",
  },
];

function HowWeCheck() {
  const hospitals = listHospitals().length;
  const stats = [
    { value: String(SAMPLE_POLICIES.length), label: "real-world policy formats" },
    { value: String(hospitals), label: "hospitals ranked per case" },
    { value: "100%", label: "of claims linked to a clause" },
    { value: "0", label: "documents stored" },
  ];

  return (
    <section id="how-we-check" className="scroll-mt-28">
      <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <Reveal>
            <Eyebrow>How we check</Eyebrow>
            <h2 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
              Built so you don’t have to
              <em className="font-normal text-plum-500 italic"> take our word for it.</em>
            </h2>
            <p className="mt-4 max-w-md text-base text-ink-muted">
              An answer about your hospital bill is only useful if you can check
              it. So every answer shows where it came from.
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-line bg-line">
              {stats.map((s) => (
                <div key={s.label} className="bg-surface p-4 sm:p-5">
                  <dt className="sr-only">{s.label}</dt>
                  <dd>
                    <div className="figure text-3xl leading-none text-ink">{s.value}</div>
                    <div className="mt-1.5 text-xs text-ink-muted">{s.label}</div>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-label font-medium text-ink-muted">
              <span className="size-1.5 rounded-full bg-plum-400" />
              Built for the GE HealthCare Precision Care Challenge 2026
            </p>
          </Reveal>

          <ul className="grid gap-4 sm:grid-cols-2">
            {CHECKS.map((c, i) => (
              <Reveal as="li" key={c.title} delay={i * 90}>
                <div className="card h-full p-5 sm:p-6">
                  <span className="grid size-10 place-items-center rounded-xl bg-sage-100 text-sage-700">
                    <c.Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-display text-xl text-ink">{c.title}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Boundaries() {
  const does = [
    "Explain what your policy document appears to say",
    "Show the exact lines behind every statement",
    "Compare hospitals on coverage, cost and distance",
    "Warn you about deadlines and caps before they bite",
  ];
  const doesNot = [
    "Diagnose anything or judge how serious a situation is",
    "Recommend a treatment, a procedure or a doctor",
    "Approve, reject or guarantee any claim",
    "Replace confirming the specifics with your insurer",
  ];

  return (
    <section id="boundaries" className="scroll-mt-28 border-t border-line/70 bg-surface/50">
      <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-20">
        <Reveal className="max-w-2xl">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            What this is, and
            <em className="font-normal text-plum-500 italic"> what it is not.</em>
          </h2>
          <p className="mt-3.5 max-w-lg text-base text-ink-muted">
            The boundary matters more here than in most software, so it is
            drawn explicitly rather than left to a footer.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <BoundaryList tone="sage" title="It does" items={does} delay={80} />
          <BoundaryList tone="clay" title="It does not" items={doesNot} delay={160} />
        </div>
      </div>
    </section>
  );
}

function BoundaryList({
  tone,
  title,
  items,
  delay,
}: {
  tone: "sage" | "clay";
  title: string;
  items: string[];
  delay: number;
}) {
  const sage = tone === "sage";
  return (
    <Reveal delay={delay}>
      <div className="card h-full p-6">
        <h3 className={`label flex items-center gap-2 font-sans ${sage ? "!text-sage-700" : "!text-clay-600"}`}>
          <span className={`size-2 rounded-full ${sage ? "bg-viz-good" : "bg-viz-bad"}`} />
          {title}
        </h3>
        <ul className="mt-4 space-y-3">
          {items.map((t) => (
            <li key={t} className="flex gap-3 text-base text-ink-muted">
              <span
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${
                  sage ? "bg-sage-100 text-sage-700" : "bg-clay-100 text-clay-600"
                }`}
                aria-hidden="true"
              >
                {sage ? (
                  <Check className="size-3" />
                ) : (
                  <svg viewBox="0 0 16 16" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="m4 4 8 8M12 4l-8 8" />
                  </svg>
                )}
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

function FinalCta({ onOwn }: { onOwn: () => void }) {
  const begin = useBegin();
  const first = SAMPLE_POLICIES[0];
  return (
    <section className="mx-auto max-w-[1240px] px-4 pt-16 sm:px-6 lg:pt-24">
      <Reveal>
        <div className="card-verdict px-6 py-12 text-center sm:px-12 sm:py-16">
          <ArchRule className="mx-auto mb-8 max-w-xs" />
          <h2 className="mx-auto max-w-2xl font-display text-3xl text-ink sm:text-4xl">
            Read your cover before you’re at the desk.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-ink-muted">
            Ten minutes now is worth more than an hour in a corridor. Start with
            a sample, or bring your own policy.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={() => begin(first.text, first.label, "sample", first.id)}>
              See it read a real policy <ArrowRight />
            </Button>
            <Button size="lg" variant="secondary" onClick={onOwn}>
              Use my own policy
            </Button>
          </div>
          <p className="mt-6 text-sm text-ink-subtle">
            Already started?{" "}
            <Link href="/coverage" className="font-medium text-accent underline decoration-plum-300 underline-offset-2">
              Go to your coverage
            </Link>
          </p>
        </div>
      </Reveal>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CapMeter } from "@/components/CapMeter";
import { AmbientWash, ArchField, ArchRule } from "@/components/Ornament";
import { Reveal } from "@/components/motion";
import { ErrorNote, Pill } from "@/components/ui";
import { SAMPLE_POLICIES } from "@/lib/data/samplePolicies";
import { useStore } from "@/lib/store";

type Tab = "sample" | "paste" | "upload";

export default function Landing() {
  return (
    <AppShell>
      <Hero />
      <Questions />
      <Showcase />
      <Boundaries />
      <Footer />
    </AppShell>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <AmbientWash />

      {/* The arch motif as a watermark behind the headline — the wordmark's
          portico at scale, drawn once on load. Sits under the type rather than
          beside it so it reads as the room the words are standing in. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-6 -left-24 hidden w-[720px] text-plum-300/55 lg:block"
      >
        <ArchField className="w-full" />
      </div>

      <div className="relative mx-auto grid max-w-[1240px] items-start gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.06fr_0.94fr] lg:gap-16 lg:pt-20 lg:pb-28">
        <div className="animate-rise relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-plum-200 bg-surface/70 px-3 py-1 text-label font-semibold tracking-[0.13em] text-plum-600 uppercase backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-plum-400" />
            Insurance-aware care navigation
          </span>

          <h1 className="mt-6 font-display text-display leading-[1.02] tracking-[-0.03em] text-ink sm:text-display lg:text-display">
            Nobody should have
            <br className="hidden sm:block" /> to decode a policy
            <br className="hidden sm:block" /> document{" "}
            <em className="font-normal text-plum-500 italic">at 3am.</em>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-[1.72] text-ink-muted sm:text-lg">
            When someone is being admitted, the questions come fast and the
            answers are buried in forty pages of clauses. Hospitality reads your
            cover, answers them in plain language, and shows you the exact line
            every answer came from.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3">
            {[
              "Every claim cites its clause",
              "Built for a phone in a waiting room",
              "Never diagnoses or advises treatment",
            ].map((t, i) => (
              <Reveal
                key={t}
                delay={220 + i * 90}
                className="inline-flex items-center gap-2 text-sm text-ink-muted"
              >
                <CheckMark /> {t}
              </Reveal>
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-[124px]">
          <StartCard />
        </div>
      </div>
    </section>
  );
}

const QUESTIONS = [
  {
    n: "01",
    q: "Which hospitals will actually take my card?",
    a: "Your policy's network is cross-referenced against every hospital, room category and daily rate — then ranked, with the trade-offs said out loud rather than buried in a score.",
    to: "Hospital finder",
  },
  {
    n: "02",
    q: "What room am I allowed to ask for?",
    a: "Room rent is the most consequential number in an Indian admission and almost never shown visually. We draw it against your limit, and warn you when taking a better room quietly scales down the surgeon's fee too.",
    to: "Coverage dashboard",
  },
  {
    n: "03",
    q: "What am I going to be asked to pay at discharge?",
    a: "Co-pay, deductible, sub-limits, consumables, proportionate deduction, the reimbursement haircut. Each modelled, each itemised, none of it guessed.",
    to: "Cost estimate",
  },
];

function Questions() {
  return (
    <section className="border-t border-line/70 bg-surface/50">
      <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
        <Reveal className="max-w-2xl">
          <h2 className="font-display text-3xl leading-[1.15] tracking-[-0.02em] text-ink sm:text-4xl">
            Three questions nobody can answer
            <em className="font-normal text-plum-500 italic"> in a corridor.</em>
          </h2>
        </Reveal>

        <ArchRule className="my-10" />

        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {QUESTIONS.map((item, i) => (
            <Reveal key={item.n} delay={i * 120}>
              <div className="figure text-label tracking-[0.2em] text-plum-300">
                {item.n}
              </div>
              <h3 className="mt-3.5 font-display text-xl leading-snug text-ink">
                {item.q}
              </h3>
              <p className="mt-3 text-base leading-[1.72] text-ink-muted">
                {item.a}
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-label font-semibold tracking-[0.11em] text-plum-400 uppercase">
                <span className="h-px w-5 bg-plum-300" />
                {item.to}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Showcase() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <Reveal>
          <div className="text-label font-semibold tracking-[0.16em] text-plum-400 uppercase">
            The clause that catches people
          </div>
          <h2 className="mt-3 font-display text-3xl leading-[1.16] tracking-[-0.02em] text-ink sm:text-4xl">
            A nicer room can cost you
            <em className="font-normal text-plum-500 italic"> four times</em> the
            room difference.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-[1.75] text-ink-muted">
            Most retail policies in India cap room rent at 1% of the sum insured
            and then apply <strong className="font-semibold text-ink">proportionate
            deduction</strong>: exceed the cap and the insurer pays a reduced
            share of <em>every</em> associated charge — surgeon, anaesthetist,
            theatre, nursing — in the same ratio. On a ₹2.5 lakh bill that is
            usually far more than the room itself.
          </p>
          <p className="mt-3.5 max-w-lg text-base leading-relaxed text-ink-subtle">
            It is one sentence, on page nine, in a document nobody reads at
            admission. So we put it on the first screen instead.
          </p>
        </Reveal>

        <Reveal delay={140}>
          <div className="card overflow-hidden shadow-[var(--shadow-lift)]">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas px-4 py-3">
              <span className="text-label font-semibold tracking-[0.14em] text-ink-subtle uppercase">
                Single Private · Kaveri Institute
              </span>
              <Pill tone="clay">Over limit</Pill>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <CapMeter rate={11500} cap={5000} label="Room rent" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[11px] border border-line bg-canvas p-3.5">
                  <div className="text-label font-semibold tracking-[0.12em] text-ink-subtle uppercase">
                    Room difference
                  </div>
                  <div className="figure mt-1.5 text-2xl leading-none text-ink">
                    ₹26,000
                  </div>
                  <div className="mt-1 text-label text-ink-subtle">
                    4 days over the cap
                  </div>
                </div>
                <div className="rounded-[11px] border border-clay-300/50 bg-clay-50 p-3.5">
                  <div className="text-label font-semibold tracking-[0.12em] text-clay-600 uppercase">
                    Also deducted
                  </div>
                  <div className="figure mt-1.5 text-2xl leading-none text-clay-600">
                    ₹1,39,650
                  </div>
                  <div className="mt-1 text-label text-clay-600/80">
                    57% of every associated charge
                  </div>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-ink-subtle">
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

function StartCard() {
  const router = useRouter();
  const { update, config } = useStore();
  const [tab, setTab] = useState<Tab>("sample");
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const begin = (
    text: string,
    name: string,
    origin: "sample" | "paste" | "pdf",
    sampleId?: string,
  ) => {
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
  };

  const onUpload = async (file: File) => {
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
    <div
      className="card animate-rise overflow-hidden shadow-[var(--shadow-hero)]"
      style={{ animationDelay: "120ms" }}
    >
      <div className="border-b border-line px-5 pt-5 pb-4">
        <h2 className="font-display text-2xl leading-tight text-ink">
          Start with your policy
        </h2>
        <p className="mt-1.5 text-base leading-relaxed text-ink-muted">
          Read on the server, never stored. Nothing you add here leaves this app.
        </p>
      </div>

      <div className="flex gap-1 border-b border-line bg-canvas px-2 py-2">
        {(
          [
            ["sample", "Use a sample"],
            ["paste", "Paste text"],
            ["upload", "Upload PDF"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setError(null);
            }}
            className={`flex-1 rounded-[9px] px-3 py-2 text-sm font-medium transition-all duration-200 ${
              tab === id
                ? "bg-surface text-ink shadow-[var(--shadow-xs)]"
                : "text-ink-subtle hover:text-ink-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        {tab === "sample" && (
          <div className="stagger space-y-2.5" style={{ ["--stagger-step" as string]: "70ms" }}>
            {SAMPLE_POLICIES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                style={{ ["--i" as string]: i }}
                onClick={() => begin(s.text, s.label, "sample", s.id)}
                className="group relative block w-full overflow-hidden rounded-[12px] border border-line bg-surface p-4 text-left transition-all duration-300 hover:-translate-y-[2px] hover:border-plum-200 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-plum-400 transition-transform duration-300 group-hover:scale-y-100" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-label font-semibold tracking-[0.13em] text-ink-subtle uppercase">
                      {s.insurer}
                    </div>
                    <div className="mt-1 font-display text-lg leading-snug text-ink">
                      {s.label}
                    </div>
                  </div>
                  <Pill tone={s.accent}>{s.tag}</Pill>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {s.blurb}
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-plum-500">
                  Read this policy
                  <svg viewBox="0 0 16 16" className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        )}

        {tab === "paste" && (
          <div className="space-y-3">
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={10}
              placeholder="Paste the text of your policy schedule, certificate of insurance, or entitlement letter…"
              className="w-full resize-y rounded-[11px] border border-line bg-canvas px-3.5 py-3 font-mono text-xs leading-relaxed text-ink placeholder:text-ink-subtle/80 focus:border-plum-300 focus:bg-surface focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="figure text-label font-normal text-ink-subtle">
                {pasted.trim().length.toLocaleString()} characters
              </span>
              <button
                type="button"
                disabled={pasted.trim().length < 200}
                onClick={() => begin(pasted, "Pasted policy text", "paste")}
                className="rounded-full bg-plum-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-plum-600 disabled:cursor-not-allowed disabled:bg-line-strong"
              >
                Read this policy
              </button>
            </div>
            {pasted.trim().length > 0 && pasted.trim().length < 200 && (
              <p className="text-label text-ink-subtle">
                Paste at least a couple of hundred characters so there is
                something to read.
              </p>
            )}
          </div>
        )}

        {tab === "upload" && (
          <div className="space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-[12px] border border-dashed border-line-strong bg-canvas px-4 py-9 transition-colors hover:border-plum-300 hover:bg-plum-50/50 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <span className="animate-breathe size-6 rounded-full bg-plum-300" />
                  <span className="text-base font-medium text-ink-muted">
                    Reading the file…
                  </span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="size-7 text-plum-400" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
                    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                  </svg>
                  <span className="text-base font-medium text-ink">
                    Choose a PDF
                  </span>
                  <span className="text-xs text-ink-subtle">
                    Text-based PDFs up to 12 MB. Scans will not read.
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
              }}
            />
          </div>
        )}

        {error && (
          <div className="mt-3">
            <ErrorNote message={error} />
          </div>
        )}

        {config?.demo && tab !== "sample" && (
          <div className="mt-3 rounded-[11px] border border-ochre-300/50 bg-ochre-50 p-3 text-xs leading-relaxed text-ochre-700">
            Demo Mode is on because no{" "}
            <code className="font-mono text-label">ANTHROPIC_API_KEY</code> is
            set. Your own document can be uploaded, but it cannot be parsed until
            a key is configured — the three samples work either way.
          </div>
        )}
      </div>
    </div>
  );
}

function Boundaries() {
  return (
    <section className="border-t border-line/70 bg-surface/50">
      <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-14">
          <Reveal>
            <h2 className="font-display text-3xl leading-[1.18] tracking-[-0.02em] text-ink sm:text-3xl">
              What this is, and
              <em className="font-normal text-plum-500 italic"> what it is not.</em>
            </h2>
            <p className="mt-3.5 max-w-sm text-base leading-[1.72] text-ink-muted">
              The boundary matters more here than in most software, so it is
              drawn explicitly rather than left to a footer.
            </p>
          </Reveal>

          <div className="grid gap-8 sm:grid-cols-2">
            <Reveal delay={100}>
              <div className="mb-3 inline-flex items-center gap-2 text-label font-semibold tracking-[0.12em] text-sage-700 uppercase">
                <span className="size-1.5 rounded-full bg-viz-good" /> It does
              </div>
              <ul className="space-y-2.5 text-base leading-relaxed text-ink-muted">
                {[
                  "Explain what your policy document appears to say",
                  "Show the exact lines behind every statement",
                  "Compare hospitals on coverage, cost and distance",
                  "Warn you about deadlines and caps before they bite",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-line-strong" />
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={180}>
              <div className="mb-3 inline-flex items-center gap-2 text-label font-semibold tracking-[0.12em] text-clay-600 uppercase">
                <span className="size-1.5 rounded-full bg-viz-bad" /> It does not
              </div>
              <ul className="space-y-2.5 text-base leading-relaxed text-ink-muted">
                {[
                  "Diagnose anything or judge how serious a situation is",
                  "Recommend a treatment, a procedure or a doctor",
                  "Approve, reject or guarantee any claim",
                  "Replace confirming the specifics with your insurer",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-line-strong" />
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6">
      <ArchRule className="mb-8" />
      <p className="text-center text-label leading-relaxed text-ink-subtle">
        Sample policies, hospitals, rates and people in this prototype are
        synthetic. No real insurer, facility or person is depicted.
      </p>
    </footer>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-viz-good" fill="currentColor" aria-hidden="true">
      <path d="M6.2 11.4 3.3 8.5l1.1-1.1 1.8 1.8 4.4-4.4 1.1 1.1z" />
    </svg>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CapMeter } from "@/components/CapMeter";
import { ErrorNote, Pill } from "@/components/ui";
import { SAMPLE_POLICIES } from "@/lib/data/samplePolicies";
import { useStore } from "@/lib/store";

type Tab = "sample" | "paste" | "upload";

export default function Landing() {
  return (
    <AppShell>
      <div className="mx-auto grid max-w-[1240px] gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pt-16">
        <Hero />
        <div className="lg:sticky lg:top-[132px] lg:self-start">
          <StartCard />
        </div>
      </div>
      <HowItWorks />
      <Boundaries />
    </AppShell>
  );
}

function Hero() {
  return (
    <div className="animate-rise">
      <div className="inline-flex items-center gap-2 rounded-full border border-plum-200 bg-plum-50 px-3 py-1 text-[11.5px] font-semibold tracking-[0.11em] text-plum-600 uppercase">
        Insurance-aware care navigation
      </div>

      <h1 className="mt-5 font-display text-[38px] leading-[1.08] tracking-[-0.025em] text-ink sm:text-[52px] lg:text-[58px]">
        Nobody should have to decode a policy document
        <span className="text-plum-500"> at 3am.</span>
      </h1>

      <p className="mt-6 max-w-xl text-[16px] leading-[1.68] text-ink-muted sm:text-[17px]">
        When someone is being admitted, the questions come fast and the answers
        are buried in forty pages of clauses. Which hospitals are in network.
        What room you are entitled to. What comes back to you, and what does
        not. Hospitality reads your cover, answers those questions in plain
        language, and shows you the exact line every answer came from.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-ink-muted">
        <span className="inline-flex items-center gap-2">
          <CheckMark /> Every claim cites its clause
        </span>
        <span className="inline-flex items-center gap-2">
          <CheckMark /> Works on a phone in a waiting room
        </span>
        <span className="inline-flex items-center gap-2">
          <CheckMark /> Never diagnoses or advises treatment
        </span>
      </div>

      <PreviewCard />
    </div>
  );
}

function PreviewCard() {
  return (
    <div className="animate-rise mt-10 max-w-lg" style={{ animationDelay: "160ms" }}>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas px-4 py-2.5">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-ink-subtle uppercase">
            What the room limit actually means
          </span>
          <Pill tone="clay">Over limit</Pill>
        </div>
        <div className="space-y-4 p-4">
          <CapMeter
            rate={11500}
            cap={5000}
            label="Single Private — Kaveri Institute of Medical Sciences"
          />
          <div className="rounded-[10px] border border-ochre-300/50 bg-ochre-50 p-3">
            <p className="text-[13px] leading-relaxed text-ochre-700">
              Because this policy applies proportionate deduction, taking this
              room does not just cost ₹6,500 a day more — it also scales the
              surgeon&rsquo;s fee, theatre charges and nursing down to 43% of
              the bill.
            </p>
          </div>
        </div>
      </div>
    </div>
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

  const begin = (text: string, name: string, origin: "sample" | "paste" | "pdf", sampleId?: string) => {
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
    <div className="card animate-rise overflow-hidden" style={{ animationDelay: "80ms" }}>
      <div className="border-b border-line px-5 pt-5 pb-4">
        <h2 className="font-display text-[21px] leading-tight text-ink">
          Start with your policy
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
          Nothing you add here leaves this app — the document is read on the
          server and never stored.
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
            className={`flex-1 rounded-[9px] px-3 py-2 text-[13px] font-medium transition-colors ${
              tab === id
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(36,28,43,.07)]"
                : "text-ink-subtle hover:text-ink-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        {tab === "sample" && (
          <div className="stagger space-y-2.5" style={{ ["--stagger-step" as string]: "60ms" }}>
            {SAMPLE_POLICIES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                style={{ ["--i" as string]: i }}
                onClick={() => begin(s.text, s.label, "sample", s.id)}
                className="group block w-full rounded-[12px] border border-line bg-surface p-4 text-left transition-all duration-200 hover:-translate-y-[1px] hover:border-plum-200 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold tracking-[0.12em] text-ink-subtle uppercase">
                      {s.insurer}
                    </div>
                    <div className="mt-1 font-display text-[16.5px] leading-snug text-ink">
                      {s.label}
                    </div>
                  </div>
                  <Pill tone={s.accent}>{s.tag}</Pill>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                  {s.blurb}
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-plum-500">
                  Read this policy
                  <svg viewBox="0 0 16 16" className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
              className="w-full resize-y rounded-[11px] border border-line bg-canvas px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-ink placeholder:text-ink-subtle/70 focus:border-plum-300 focus:bg-surface focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="tnum text-[12px] text-ink-subtle">
                {pasted.trim().length.toLocaleString()} characters
              </span>
              <button
                type="button"
                disabled={pasted.trim().length < 200}
                onClick={() => begin(pasted, "Pasted policy text", "paste")}
                className="rounded-full bg-plum-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-plum-600 disabled:cursor-not-allowed disabled:bg-line-strong"
              >
                Read this policy
              </button>
            </div>
            {pasted.trim().length > 0 && pasted.trim().length < 200 && (
              <p className="text-[12px] text-ink-subtle">
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
              className="flex w-full flex-col items-center gap-3 rounded-[12px] border border-dashed border-line-strong bg-canvas px-4 py-9 transition-colors hover:border-plum-300 hover:bg-plum-50/40 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <span className="animate-breathe size-6 rounded-full bg-plum-300" />
                  <span className="text-[13.5px] font-medium text-ink-muted">
                    Reading the file…
                  </span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="size-7 text-plum-400" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
                    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                  </svg>
                  <span className="text-[14px] font-medium text-ink">
                    Choose a PDF
                  </span>
                  <span className="text-[12.5px] text-ink-subtle">
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
          <div className="mt-3 rounded-[11px] border border-ochre-300/50 bg-ochre-50 p-3 text-[12.5px] leading-relaxed text-ochre-700">
            Demo Mode is on because no <code className="font-mono">ANTHROPIC_API_KEY</code>{" "}
            is set. Your own document can be uploaded, but it cannot be parsed
            until a key is configured — the three samples work either way.
          </div>
        )}
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Understand the policy",
    body: "The document is parsed into sum insured, room eligibility, sub-limits, waiting periods, exclusions and network — then explained back to you in plain language, with each statement linked to the clause it came from.",
  },
  {
    n: "02",
    title: "Find hospitals that fit it",
    body: "Your cover is cross-referenced against hospitals, room categories and daily rates. Options are ranked with the trade-offs stated out loud: in network but further away, closer but only partly reimbursable.",
  },
  {
    n: "03",
    title: "Stay oriented through the stay",
    body: "Admission, investigation, procedure, recovery. At each stage the guidance changes — pre-authorisation windows, room upgrade consequences, what to collect before discharge.",
  },
];

function HowItWorks() {
  return (
    <section className="border-y border-line/70 bg-surface/60">
      <div className="mx-auto max-w-[1240px] px-4 py-14 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((s) => (
            <div key={s.n}>
              <div className="font-display text-[13px] font-semibold tracking-[0.2em] text-plum-300">
                {s.n}
              </div>
              <h3 className="mt-3 font-display text-[19px] leading-snug text-ink">
                {s.title}
              </h3>
              <p className="mt-2.5 text-[13.5px] leading-[1.7] text-ink-muted">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Boundaries() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 py-14 sm:px-6">
      <div className="grid gap-8 rounded-[16px] border border-line bg-surface p-6 md:grid-cols-[0.8fr_1.2fr] md:p-8">
        <div>
          <h3 className="font-display text-[21px] leading-snug text-ink">
            What this is, and what it is not
          </h3>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-muted">
            The boundary matters more here than in most software, so it is drawn
            explicitly rather than left to a footer.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.11em] text-sage-700 uppercase">
              <span className="size-1.5 rounded-full bg-sage-500" /> It does
            </div>
            <ul className="space-y-2 text-[13px] leading-relaxed text-ink-muted">
              <li>Explain what your policy document appears to say</li>
              <li>Show you the exact lines behind every statement</li>
              <li>Compare hospitals on coverage, cost and distance</li>
              <li>Warn you about deadlines and caps before they bite</li>
            </ul>
          </div>
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.11em] text-clay-600 uppercase">
              <span className="size-1.5 rounded-full bg-clay-500" /> It does not
            </div>
            <ul className="space-y-2 text-[13px] leading-relaxed text-ink-muted">
              <li>Diagnose anything or assess how serious a situation is</li>
              <li>Recommend a treatment, a procedure or a doctor</li>
              <li>Approve, reject or guarantee any claim</li>
              <li>Replace confirming the specifics with your insurer</li>
            </ul>
          </div>
        </div>
      </div>
      <p className="mt-6 text-center text-[12px] text-ink-subtle">
        Sample policies, hospitals, rates and people in this prototype are
        synthetic. No real insurer or facility is depicted.
      </p>
    </section>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-sage-500" fill="currentColor" aria-hidden="true">
      <path d="M6.2 11.4 3.3 8.5l1.1-1.1 1.8 1.8 4.4-4.4 1.1 1.1z" />
    </svg>
  );
}

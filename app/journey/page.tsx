"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppShell, SparkIcon } from "@/components/AppShell";
import { CitationChip } from "@/components/Citation";
import {
  ErrorNote,
  Pill,
  SectionHeading,
  Skeleton,
  StatusLine,
  StreamingProse,
} from "@/components/ui";
import { STAGES, STAGE_META } from "@/lib/services/journeyCopilot";
import { StageSpine } from "@/components/StageSpine";
import { Reveal } from "@/components/motion";
import { getHospital } from "@/lib/data/hospitals";
import { inr } from "@/lib/services/matchingEngine";
import { useNdjson, useStore } from "@/lib/store";
import type { GuidanceItem, JourneyStage } from "@/lib/types";

const KIND = {
  action: { label: "Do this now", bar: "bg-plum-400", icon: "text-plum-400", Icon: BoltIcon },
  cost: { label: "Costs money", bar: "bg-ochre-500", icon: "text-ochre-500", Icon: CoinIcon },
  watch: { label: "Careful here", bar: "bg-clay-500", icon: "text-clay-500", Icon: AlertIcon },
  document: { label: "Keep this", bar: "bg-sage-500", icon: "text-sage-500", Icon: DocIcon },
} as const;

export default function JourneyPage() {
  const router = useRouter();
  const { session, update, hydrated, config } = useStore();
  const { run, running, status, error } = useNdjson();
  const requested = useRef<string>("");

  useEffect(() => {
    if (!hydrated) return;
    if (!session.policy || !session.source) {
      router.replace("/");
      return;
    }
    const stage = session.stage;
    if (session.guidance[stage] || requested.current === stage) return;
    requested.current = stage;

    const chosenHospital = session.chosen
      ? getHospital(session.chosen.hospitalId)?.name
      : undefined;

    void run(
      "/api/journey/guidance",
      {
        policy: session.policy,
        documentText: session.source.text,
        stage,
        ctx: session.ctx,
        hospitalName: chosenHospital,
        roomCategory: session.chosen?.roomCategory,
      },
      {
        onEvent: (e) => {
          if (e.type === "guidance") {
            update((prev) => ({
              guidance: { ...prev.guidance, [stage]: e.guidance },
            }));
          }
        },
      },
    );
  }, [hydrated, session, router, run, update]);

  if (!hydrated || !session.policy) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6">
          <Skeleton className="h-40 w-full" />
        </div>
      </AppShell>
    );
  }

  const stage = session.stage;
  const guidance = session.guidance[stage];
  const idx = STAGES.indexOf(stage);
  const hospital = session.chosen ? getHospital(session.chosen.hospitalId) : null;

  const goTo = (next: JourneyStage) => {
    requested.current = "";
    update({
      stage: next,
      visited: session.visited.includes(next)
        ? session.visited
        : [...session.visited, next],
    });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1240px] px-4 pt-7 pb-10 sm:px-6">
        <SectionHeading
          eyebrow="Care journey copilot"
          title="Where you are, and what it costs to get it wrong"
          caption="Guidance changes at every stage of the stay. Each point is read from your own policy, and links to the clause it came from."
        />

        <StageSpine stage={stage} visited={session.visited} onSelect={goTo} />

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <div>
            <div className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-plum-400 uppercase">
                  <SparkIcon className="size-3.5" />
                  {STAGE_META[stage].label} · {STAGE_META[stage].caption}
                </div>
                {running && <StatusLine status={status} />}
              </div>

              {guidance ? (
                <h2 className="mt-3 font-display text-[23px] leading-snug text-ink sm:text-[26px]">
                  {guidance.headline}
                </h2>
              ) : (
                <div className="mt-3 space-y-2">
                  <Skeleton className="h-6 w-4/5" />
                  <Skeleton className="h-6 w-2/5" />
                </div>
              )}

              <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-muted">
                {STAGE_META[stage].blurb}
              </p>
            </div>

            {error && (
              <div className="mt-4">
                <ErrorNote message={error} />
              </div>
            )}

            <div className="stagger mt-4 grid gap-3 sm:grid-cols-2">
              {guidance
                ? guidance.items.map((item, i) => (
                    <Reveal key={i} delay={i * 70}>
                      <GuidanceCard item={item} index={i} />
                    </Reveal>
                  ))
                : [0, 1, 2, 3].map((i) => (
                    <div key={i} className="card space-y-2.5 p-4">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                  ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => goTo(STAGES[idx - 1])}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 8H4M7.5 4.5 4 8l3.5 3.5" />
                </svg>
                {idx > 0 ? STAGE_META[STAGES[idx - 1]].label : "Back"}
              </button>

              {idx < STAGES.length - 1 ? (
                <button
                  type="button"
                  onClick={() => goTo(STAGES[idx + 1])}
                  className="inline-flex items-center gap-1.5 rounded-full bg-plum-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-plum-600"
                >
                  Move to {STAGE_META[STAGES[idx + 1]].label}
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
                  </svg>
                </button>
              ) : (
                <Link
                  href="/coverage"
                  className="inline-flex items-center gap-1.5 rounded-full border border-plum-200 bg-plum-50 px-4 py-2 text-[13px] font-medium text-plum-600 transition-colors hover:bg-plum-100"
                >
                  Back to your coverage
                </Link>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <CaseCard hospital={hospital} />
            <AskBox stage={stage} demo={config?.demo ?? false} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function GuidanceCard({ item, index }: { item: GuidanceItem; index: number }) {
  const k = KIND[item.kind];
  const Icon = k.Icon;
  return (
    <div
      style={{ ["--i" as string]: index }}
      className="card relative overflow-hidden p-4 pl-5"
    >
      <div className={`absolute inset-y-0 left-0 w-[3px] ${k.bar}`} />
      <div className="flex items-center gap-1.5">
        <Icon className={`size-3.5 shrink-0 ${k.icon}`} />
        <span className="text-[10.5px] font-semibold tracking-[0.12em] text-ink-subtle uppercase">
          {k.label}
        </span>
      </div>
      <h3 className="mt-2 font-display text-[16.5px] leading-snug text-ink">
        {item.title}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
        {item.detail}
      </p>
      <div className="mt-3">
        <CitationChip citation={item.citation} />
      </div>
    </div>
  );
}

function CaseCard({
  hospital,
}: {
  hospital: ReturnType<typeof getHospital> | null;
}) {
  const { session } = useStore();
  if (!hospital) {
    return (
      <div className="card p-5">
        <div className="text-[11px] font-semibold tracking-[0.13em] text-ink-subtle uppercase">
          No hospital chosen
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
          Guidance gets sharper once we know where you are being admitted — room
          rates and empanelment change what matters at each stage.
        </p>
        <Link
          href="/hospitals"
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:border-plum-200 hover:text-plum-600"
        >
          Pick a hospital
        </Link>
      </div>
    );
  }

  const room = hospital.rooms.find(
    (r) => r.category === session.chosen?.roomCategory,
  );

  return (
    <div className="card p-5">
      <div className="text-[11px] font-semibold tracking-[0.13em] text-ink-subtle uppercase">
        Your admission
      </div>
      <h3 className="mt-2 font-display text-[18px] leading-snug text-ink">
        {hospital.name}
      </h3>
      <p className="mt-0.5 text-[12.5px] text-ink-muted">
        {hospital.area}, {hospital.city} · {hospital.phone}
      </p>

      <dl className="mt-4 space-y-2.5 border-t border-line pt-3.5 text-[13px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted">Room</dt>
          <dd className="font-medium text-ink">
            {session.chosen?.roomCategory ?? "—"}
          </dd>
        </div>
        {room && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-muted">Rate</dt>
            <dd className="figure text-ink">{inr(room.ratePerDay)}/day</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted">Expected stay</dt>
          <dd className="figure text-ink">{session.ctx.expectedDays} days</dd>
        </div>
      </dl>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {hospital.accreditation.map((a) => (
          <Pill key={a}>{a}</Pill>
        ))}
        {hospital.emergency24x7 && <Pill tone="sage">24×7 emergency</Pill>}
      </div>
    </div>
  );
}

function AskBox({ stage, demo }: { stage: JourneyStage; demo: boolean }) {
  const { session } = useStore();
  const { run, running } = useNdjson();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const ask = (q: string) => {
    if (!q.trim() || !session.source) return;
    setAnswer("");
    void run(
      "/api/journey/ask",
      { documentText: session.source.text, stage, question: q },
      { onDelta: setAnswer },
    );
  };

  const suggestions = [
    "Is a private room worth it here?",
    "What happens if the bill goes over the approval?",
    "Which items will I have to pay in cash?",
  ];

  return (
    <div className="card p-5">
      <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-plum-400 uppercase">
        <SparkIcon className="size-3.5" />
        Ask about your cover
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
        Answered only from your policy document. Clinical questions are for your
        treating team, not for this.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="mt-3.5 flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. does my policy cover the implant?"
          className="min-w-0 flex-1 rounded-full border border-line bg-canvas px-3.5 py-2 text-[13px] text-ink placeholder:text-ink-subtle/70 focus:border-plum-300 focus:bg-surface focus:outline-none"
        />
        <button
          type="submit"
          disabled={running || !question.trim()}
          className="shrink-0 rounded-full bg-plum-500 px-4 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-plum-600 disabled:bg-line-strong"
        >
          {running ? "…" : "Ask"}
        </button>
      </form>

      {!answer && !running && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuestion(s);
                ask(s);
              }}
              className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-ink-muted transition-colors hover:border-plum-200 hover:text-plum-600"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {(answer || running) && (
        <div className="mt-4 rounded-[11px] border border-line bg-canvas p-3.5">
          <StreamingProse
            text={answer}
            streaming={running}
            className="[&_p]:font-sans [&_p]:text-[13px] [&_p]:leading-[1.7]"
          />
          <p className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-ink-subtle">
            {demo ? "Demo Mode response." : "Generated by Claude"} — confirm
            anything that affects money with your insurer before acting on it.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---- icons ---- */

function BoltIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M9.2 1 3.4 9h3.3l-.9 6 5.8-8H8.3l.9-6Z" />
    </svg>
  );
}
function CoinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" />
      <path d="M5.8 5.4h4.4M5.8 7.6h4.4M6.6 5.4c1.9 0 2.6 1 2.6 2.2S8.5 9.8 6.6 9.8l3.2 2.4" strokeLinecap="round" />
    </svg>
  );
}
function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 1.4 15.2 14H.8L8 1.4Zm0 4.2a.8.8 0 0 0-.8.8v3a.8.8 0 0 0 1.6 0v-3a.8.8 0 0 0-.8-.8Zm0 6.5a.95.95 0 1 0 0-1.9.95.95 0 0 0 0 1.9Z" />
    </svg>
  );
}
function DocIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M4.4 1.5h5l3.1 3.1v9.9a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1Zm4.7 1.6v2.1h2.1L9.1 3.1ZM5.6 8.2h4.8v1.2H5.6V8.2Zm0 2.6h3.2V12H5.6v-1.2Z" />
    </svg>
  );
}

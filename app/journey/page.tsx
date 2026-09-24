"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CitationChip } from "@/components/Citation";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorNote,
  ErrorState,
  Eyebrow,
  Pill,
  SectionHeading,
  Skeleton,
  SkeletonText,
  StatusLine,
  StreamingProse,
} from "@/components/ui";
import { ArrowLeft, ArrowRight, Check, Refresh, Spark } from "@/components/ui/Icons";
import { STAGES, STAGE_META } from "@/lib/services/journeyCopilot";
import { StageSpine } from "@/components/StageSpine";
import { Reveal } from "@/components/motion";
import { getHospital } from "@/lib/data/hospitals";
import { inr } from "@/lib/services/matchingEngine";
import { useNdjson, useStore } from "@/lib/store";
import type { GuidanceItem, JourneyStage } from "@/lib/types";

const KIND = {
  action: { label: "Do this now", chip: "bg-plum-100 text-plum-600", Icon: BoltIcon },
  cost: { label: "Costs money", chip: "bg-ochre-100 text-ochre-700", Icon: CoinIcon },
  watch: { label: "Careful here", chip: "bg-clay-100 text-clay-600", Icon: AlertIcon },
  document: { label: "Keep this", chip: "bg-sage-100 text-sage-700", Icon: DocIcon },
} as const;

export default function JourneyPage() {
  const router = useRouter();
  const { session, update, hydrated, config } = useStore();
  const { run, running, status, error } = useNdjson();
  const requested = useRef<string>("");

  const fetchGuidance = useCallback(
    (stage: JourneyStage) => {
      if (!session.policy || !session.source) return;
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
    },
    [run, session.policy, session.source, session.chosen, session.ctx, update],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!session.policy || !session.source) {
      router.replace("/");
      return;
    }
    const stage = session.stage;
    if (session.guidance[stage] || requested.current === stage) return;
    requested.current = stage;
    fetchGuidance(stage);
  }, [hydrated, session.policy, session.source, session.stage, session.guidance, router, fetchGuidance]);

  if (!hydrated || !session.policy) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1240px] space-y-4 px-4 py-10 sm:px-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppShell>
    );
  }

  const stage = session.stage;
  const guidance = session.guidance[stage];
  const idx = STAGES.indexOf(stage);
  const last = idx === STAGES.length - 1;
  const hospital = session.chosen ? getHospital(session.chosen.hospitalId) : null;

  const goTo = (next: JourneyStage) => {
    requested.current = "";
    update({
      stage: next,
      visited: session.visited.includes(next) ? session.visited : [...session.visited, next],
    });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1240px] px-4 pt-6 pb-10 sm:px-6 sm:pt-8">
        <SectionHeading
          as="h1"
          eyebrow="Care journey copilot"
          title="Where you are, and what it costs to get it wrong"
          caption="Guidance changes at every stage of the stay. Each point is read from your own policy and links to the clause it came from."
        />

        <StageSpine stage={stage} visited={session.visited} onSelect={goTo} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <div className="min-w-0">
            <section aria-labelledby="stage-title" className="card-verdict p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Eyebrow>
                  <Spark /> {STAGE_META[stage].label} · {STAGE_META[stage].caption}
                </Eyebrow>
                {running ? (
                  <StatusLine status={status} />
                ) : (
                  <span className="figure text-label text-ink-subtle">
                    Stage {idx + 1} of {STAGES.length}
                  </span>
                )}
              </div>

              <div className="mt-3 h-1 overflow-hidden rounded-full bg-plum-100" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: `${((idx + 1) / STAGES.length) * 100}%` }}
                />
              </div>

              {guidance ? (
                <h2 id="stage-title" className="mt-5 font-display text-2xl text-ink sm:text-3xl">
                  {guidance.headline}
                </h2>
              ) : (
                <div className="mt-5 space-y-2.5" aria-busy="true">
                  <h2 id="stage-title" className="sr-only">
                    Loading guidance for {STAGE_META[stage].label}
                  </h2>
                  <Skeleton className="h-7 w-4/5" />
                  <Skeleton className="h-7 w-2/5" />
                </div>
              )}

              <p className="mt-3 text-base text-ink-muted">{STAGE_META[stage].blurb}</p>
            </section>

            {error && !guidance && (
              <div className="mt-4">
                <ErrorState
                  title="Guidance for this stage didn’t load"
                  message={error}
                  onRetry={() => fetchGuidance(stage)}
                />
              </div>
            )}

            <ul className="mt-4 grid gap-3 sm:grid-cols-2" aria-label={`Guidance for ${STAGE_META[stage].label}`}>
              {guidance
                ? guidance.items.map((item, i) => (
                    <li key={`${stage}-${i}`}>
                      <Reveal delay={i * 70} className="h-full">
                        <GuidanceCard item={item} />
                      </Reveal>
                    </li>
                  ))
                : !error &&
                  [0, 1, 2, 3].map((i) => (
                    <li key={i} className="card space-y-3 p-5" aria-hidden="true">
                      <Skeleton className="h-6 w-28 rounded-full" />
                      <Skeleton className="h-5 w-3/4" />
                      <SkeletonText lines={2} />
                    </li>
                  ))}
            </ul>

            {last && guidance && <Complete />}

            <nav aria-label="Stages" className="mt-6 flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                disabled={idx === 0}
                onClick={() => goTo(STAGES[idx - 1])}
              >
                <ArrowLeft className="size-3.5" />
                {idx > 0 ? STAGE_META[STAGES[idx - 1]].label : "Back"}
              </Button>

              {!last ? (
                <Button onClick={() => goTo(STAGES[idx + 1])}>
                  Next: {STAGE_META[STAGES[idx + 1]].label}
                  <ArrowRight className="size-3.5" />
                </Button>
              ) : (
                <ButtonLink href="/coverage" variant="soft">
                  Back to your coverage
                </ButtonLink>
              )}
            </nav>
          </div>

          <aside className="space-y-4" aria-label="Your admission and questions">
            <CaseCard hospital={hospital} />
            <AskBox stage={stage} demo={config?.demo ?? false} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function GuidanceCard({ item }: { item: GuidanceItem }) {
  const k = KIND[item.kind];
  const Icon = k.Icon;
  return (
    <article className="card flex h-full flex-col p-5">
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-label font-semibold ${k.chip}`}
      >
        <Icon className="size-3.5 shrink-0" />
        {k.label}
      </span>
      <h3 className="mt-3 font-display text-lg text-ink">{item.title}</h3>
      <p className="mt-1.5 text-sm text-ink-muted">{item.detail}</p>
      <div className="mt-auto pt-3.5">
        <CitationChip citation={item.citation} />
      </div>
    </article>
  );
}

function Complete() {
  return (
    <Reveal>
      <div className="mt-4 flex items-start gap-4 rounded-[var(--radius-card)] border border-sage-300/60 bg-sage-50 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sage-500 text-white dark:text-canvas">
          <Check className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-xl text-sage-700">
            You’ve been through all four stages
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Keep your discharge summary, final bill and every receipt together
            — the claim window starts at discharge. You can revisit any stage
            above at any time.
          </p>
        </div>
      </div>
    </Reveal>
  );
}

function CaseCard({ hospital }: { hospital: ReturnType<typeof getHospital> | null }) {
  const { session } = useStore();
  if (!hospital) {
    return (
      <div className="card">
        <EmptyState
          compact
          title="No hospital chosen yet"
          body="Guidance gets sharper once we know where you’re being admitted, because room rates and network status change what matters at each stage."
          action={
            <ButtonLink href="/hospitals" size="sm">
              Pick a hospital <ArrowRight className="size-3.5" />
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const room = hospital.rooms.find((r) => r.category === session.chosen?.roomCategory);

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="admission-title">
      <div className="flex items-start justify-between gap-3">
        <div className="label">Your admission</div>
        <ButtonLink href="/hospitals" variant="ghost" size="sm" className="-mt-2 -mr-2">
          Change
        </ButtonLink>
      </div>
      <h2 id="admission-title" className="mt-1 font-display text-xl text-ink">
        {hospital.name}
      </h2>
      <p className="mt-0.5 text-sm text-ink-muted">
        {hospital.area}, {hospital.city} ·{" "}
        <a href={`tel:${hospital.phone.replace(/\s/g, "")}`} className="text-accent underline decoration-plum-300 underline-offset-2">
          {hospital.phone}
        </a>
      </p>

      <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted">Room</dt>
          <dd className="font-medium text-ink">{session.chosen?.roomCategory ?? "—"}</dd>
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

      <div className="mt-4 flex flex-wrap gap-1.5">
        {hospital.accreditation.map((a) => (
          <Pill key={a}>{a}</Pill>
        ))}
        {hospital.emergency24x7 && <Pill tone="sage">24×7 emergency</Pill>}
      </div>
    </section>
  );
}

const SUGGESTIONS = [
  "Is a private room worth it here?",
  "What happens if the bill goes over the approval?",
  "Which items will I have to pay in cash?",
];

function AskBox({ stage, demo }: { stage: JourneyStage; demo: boolean }) {
  const { session } = useStore();
  const { run, running, error } = useNdjson();
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [answer, setAnswer] = useState("");

  const ask = (q: string) => {
    if (!q.trim() || !session.source) return;
    setAsked(q.trim());
    setAnswer("");
    void run(
      "/api/journey/ask",
      { documentText: session.source.text, stage, question: q },
      { onDelta: setAnswer },
    );
  };

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="ask-title">
      <Eyebrow>
        <Spark /> <span id="ask-title">Ask about your cover</span>
      </Eyebrow>
      <p className="mt-2 text-sm text-ink-muted">
        Answered only from your policy document. Clinical questions are for
        your treating team, not for this.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="mt-4 flex gap-2"
      >
        <label htmlFor="ask-input" className="sr-only">
          Your question about your policy
        </label>
        <input
          id="ask-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. does my policy cover the implant?"
          className="field min-w-0 flex-1 rounded-full"
          autoComplete="off"
        />
        <Button type="submit" loading={running} disabled={!question.trim()}>
          Ask
        </Button>
      </form>

      {!asked && (
        <div className="mt-3">
          <p className="label mb-2">Try asking</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuestion(s);
                  ask(s);
                }}
                className="min-h-9 rounded-full border border-line bg-surface px-3 text-xs text-ink-muted transition-colors hover:border-plum-300 hover:bg-plum-50 hover:text-accent"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {asked && (
        <div className="mt-4 rounded-[14px] border border-line bg-canvas p-4">
          <p className="text-xs font-medium text-ink-subtle">
            You asked: <span className="text-ink">{asked}</span>
          </p>
          <div className="mt-2.5">
            {error ? (
              <div className="space-y-2.5">
                <ErrorNote message={error} />
                <Button variant="secondary" size="sm" onClick={() => ask(asked)}>
                  <Refresh className="size-3.5" /> Try again
                </Button>
              </div>
            ) : (
              <StreamingProse
                text={answer}
                streaming={running}
                className="[&_p]:font-sans [&_p]:text-sm [&_p]:leading-[1.7]"
              />
            )}
          </div>
          {!running && answer && (
            <p className="mt-3 border-t border-line pt-2.5 text-xs text-ink-subtle">
              {demo ? "Demo Mode response." : "Generated by Claude."} Confirm
              anything that affects money with your insurer before acting on it.
            </p>
          )}
        </div>
      )}
    </section>
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

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HospitalCard } from "@/components/HospitalCard";
import { TradeOffPlot } from "@/components/viz/TradeOffPlot";
import { Reveal } from "@/components/motion";
import {
  Button,
  ButtonLink,
  Chip,
  EmptyState,
  ErrorState,
  Eyebrow,
  Meter,
  Pill,
  Segmented,
  SectionHeading,
  Skeleton,
  SkeletonCard,
  StatusLine,
  StreamingProse,
  useToast,
} from "@/components/ui";
import { ArrowRight, Chevron, Sliders, Spark } from "@/components/ui/Icons";
import { CONDITION_PRESETS, LOCALITIES } from "@/lib/data/hospitals";
import { coPayIsConditional, inr } from "@/lib/services/matchingEngine";
import { useNdjson, useStore } from "@/lib/store";
import type { CaseContext, HospitalMatch, NormalizedPolicy } from "@/lib/types";

type Sort = "match" | "cost" | "distance";
type Filters = {
  networkOnly: boolean;
  cashless: boolean;
  roomWithinLimit: boolean;
  emergency: boolean;
};
const NO_FILTERS: Filters = {
  networkOnly: false,
  cashless: false,
  roomWithinLimit: false,
  emergency: false,
};

export default function HospitalsPage() {
  const router = useRouter();
  const { session, update, hydrated } = useStore();
  const { run, running, status, error } = useNdjson();
  const toast = useToast();
  const lastKey = useRef<string>("");

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sort, setSort] = useState<Sort>("match");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);

  const ctxKey = JSON.stringify(session.ctx);

  const match = useCallback(() => {
    if (!session.policy) return;
    void run(
      "/api/hospitals/match",
      { policy: session.policy, ctx: session.ctx },
      {
        onEvent: (e) => {
          if (e.type === "matches") update({ matches: e.matches });
        },
        onDelta: (full) => update({ comparison: full }),
      },
    );
  }, [run, session.policy, session.ctx, update]);

  useEffect(() => {
    if (!hydrated) return;
    if (!session.policy) {
      router.replace("/");
      return;
    }
    if (lastKey.current === ctxKey) return;
    // First load ranks at once. Later case edits wait for the input to settle:
    // dragging the stay slider would otherwise send one ranking (and one
    // model narration) per tick.
    const first = lastKey.current === "";
    const t = window.setTimeout(
      () => {
        lastKey.current = ctxKey;
        match();
      },
      first ? 0 : 350,
    );
    return () => window.clearTimeout(t);
  }, [hydrated, session.policy, ctxKey, router, match]);

  const choose = useCallback(
    (hospitalId: string, announce = true) => {
      const m = session.matches.find((x) => x.hospital.id === hospitalId);
      if (!m) return;
      const already = session.chosen?.hospitalId === hospitalId;
      update({
        chosen: {
          hospitalId,
          roomCategory: m.bestRoom?.room.category ?? "General Ward",
        },
        guidance: {},
      });
      if (announce && !already) {
        toast({
          title: `${m.hospital.name} selected`,
          description: "Journey guidance will use its room rates and network status.",
        });
      }
    },
    [session.matches, session.chosen, update, toast],
  );

  /** A point on the plot is the same thing as a card in the list. */
  const focusHospital = useCallback(
    (hospitalId: string) => {
      choose(hospitalId, false);
      cardRefs.current[hospitalId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [choose],
  );

  const visible = useMemo(() => {
    let list = [...session.matches];
    if (filters.networkOnly) list = list.filter((m) => m.inNetwork);
    if (filters.cashless) list = list.filter((m) => m.cashless);
    if (filters.roomWithinLimit) list = list.filter((m) => m.bestRoom?.status === "covered");
    if (filters.emergency) list = list.filter((m) => m.hospital.emergency24x7);

    if (sort === "cost")
      list.sort((a, b) => (a.estimate?.patientPays ?? 0) - (b.estimate?.patientPays ?? 0));
    if (sort === "distance") list.sort((a, b) => a.distanceKm - b.distanceKm);
    return list;
  }, [session.matches, filters, sort]);

  if (!hydrated || !session.policy) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1240px] space-y-4 px-4 py-10 sm:px-6">
          <Skeleton className="h-10 w-2/3" />
          <SkeletonCard tall />
          <SkeletonCard tall />
        </div>
      </AppShell>
    );
  }

  const policy = session.policy;
  const top = session.matches[0];
  const anyFilter = Object.values(filters).some(Boolean);
  const chosenMatch = session.matches.find((m) => m.hospital.id === session.chosen?.hospitalId);

  const toggle = (k: keyof Filters) => setFilters((f) => ({ ...f, [k]: !f[k] }));
  const count = (pred: (m: HospitalMatch) => boolean) => session.matches.filter(pred).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1240px] px-4 pt-6 pb-10 sm:px-6 sm:pt-8">
        <SectionHeading
          as="h1"
          eyebrow={`${policy.insurer} · ${inr(policy.sumInsured.amount)} cover`}
          title="Hospitals your policy actually fits"
          caption="Ranked by coverage, cost and distance. What you'd pay is shown next to each one."
        />

        <CaseBar
          ctx={session.ctx}
          onChange={(next) => update({ ctx: next, matches: [], comparison: "" })}
        />

        {error && !session.matches.length ? (
          <div className="mt-6">
            <ErrorState
              title="We couldn’t rank hospitals"
              message={error}
              onRetry={() => {
                lastKey.current = ctxKey;
                match();
              }}
            />
          </div>
        ) : (
          <div id="top-match" className="mt-6">
            {top ? (
              <TopMatch
                match={top}
                policy={policy}
                chosen={session.chosen?.hospitalId === top.hospital.id}
                onChoose={() => choose(top.hospital.id)}
                onDetails={() =>
                  cardRefs.current[top.hospital.id]?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              />
            ) : (
              <div className="card-verdict p-6 sm:p-7" aria-busy="true">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-3 w-40" />
                  <StatusLine status={status} />
                </div>
                <Skeleton className="mt-4 h-8 w-2/3" />
                <Skeleton className="mt-3 h-4 w-1/2" />
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <section className="card p-5 sm:p-6" aria-labelledby="plot-title">
            <h2 id="plot-title" className="font-display text-xl text-ink">
              The shape of the choice
            </h2>
            <p className="mt-1 max-w-md text-sm text-ink-muted">
              How far you travel against what you end up paying. Closer and
              cheaper is the bottom-left. Press any point to jump to it.
            </p>
            <div className="mt-4">
              {session.matches.length ? (
                <TradeOffPlot
                  matches={session.matches}
                  policy={policy}
                  selectedId={session.chosen?.hospitalId ?? null}
                  onSelect={focusHospital}
                />
              ) : (
                <Skeleton className="h-[280px] w-full" />
              )}
            </div>
          </section>

          <CoverageContext policy={policy} matches={session.matches} />
        </div>

        <section className="card mt-4 p-5 sm:p-6" aria-labelledby="narration-title">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <Eyebrow>
              <Spark /> <span id="narration-title">Reading the ranking</span>
            </Eyebrow>
            {running && <StatusLine status={status} />}
          </div>
          <StreamingProse
            text={session.comparison}
            streaming={running}
            className="max-w-[68ch] [&_p]:text-base sm:[&_p]:text-lg"
          />
          <p className="mt-5 border-t border-line pt-3.5 text-xs text-ink-subtle">
            Cost and coverage only. This is not a comparison of clinical
            quality, and empanelment changes. Confirm with the hospital&rsquo;s
            insurance desk before admission.
          </p>
        </section>

        {/* Filters & sort — sticky while browsing the list */}
        <div
          id="results"
          className="sticky top-[var(--chrome-h)] z-20 -mx-4 mt-10 border-b border-line/70 bg-canvas/85 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6"
        >
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="no-scrollbar fade-x -mx-1 flex items-center gap-2 overflow-x-auto px-1 py-0.5" role="group" aria-label="Filters">
              <span className="hidden shrink-0 items-center gap-1.5 pr-1 text-sm text-ink-subtle sm:inline-flex">
                <Sliders /> Filter
              </span>
              <Chip active={filters.networkOnly} onClick={() => toggle("networkOnly")} count={count((m) => m.inNetwork)}>
                In network
              </Chip>
              <Chip active={filters.cashless} onClick={() => toggle("cashless")} count={count((m) => m.cashless)}>
                Cashless
              </Chip>
              <Chip active={filters.roomWithinLimit} onClick={() => toggle("roomWithinLimit")} count={count((m) => m.bestRoom?.status === "covered")}>
                Room within limit
              </Chip>
              <Chip active={filters.emergency} onClick={() => toggle("emergency")} count={count((m) => m.hospital.emergency24x7)}>
                24×7 emergency
              </Chip>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-muted" aria-live="polite">
                <span className="figure text-ink">{visible.length}</span> of{" "}
                <span className="figure">{session.matches.length}</span>
                <span className="sr-only"> hospitals shown</span>
                <span aria-hidden="true"> shown</span>
              </p>
              <Segmented
                label="Sort hospitals"
                size="sm"
                value={sort}
                onChange={setSort}
                options={[
                  ["match", "Best match"],
                  ["cost", "Lowest cost"],
                  ["distance", "Nearest"],
                ]}
              />
            </div>
          </div>
        </div>

        <ol className="mt-5 space-y-4" aria-label="Ranked hospitals">
          {running && !session.matches.length &&
            [0, 1, 2].map((i) => (
              <li key={i}>
                <SkeletonCard tall />
              </li>
            ))}

          {visible.map((m, i) => (
            <li key={m.hospital.id}>
              <Reveal delay={Math.min(i, 5) * 55}>
                <div
                  ref={(el) => {
                    cardRefs.current[m.hospital.id] = el;
                  }}
                  className="scroll-mt-48"
                >
                  <HospitalCard
                    match={m}
                    rank={i + 1}
                    policy={policy}
                    chosen={session.chosen?.hospitalId === m.hospital.id}
                    onChoose={() => choose(m.hospital.id)}
                  />
                </div>
              </Reveal>
            </li>
          ))}
        </ol>

        {!running && session.matches.length > 0 && !visible.length && (
          <EmptyState
            title="No hospitals match every filter"
            body="Each filter removes options. Try turning one off. The room-limit filter is usually the strictest."
            action={
              <Button variant="secondary" onClick={() => setFilters(NO_FILTERS)}>
                Clear all filters
              </Button>
            }
          />
        )}

        {anyFilter && visible.length > 0 && (
          <div className="mt-5 text-center">
            <Button variant="ghost" size="sm" onClick={() => setFilters(NO_FILTERS)}>
              Clear filters to see all {session.matches.length}
            </Button>
          </div>
        )}

        {chosenMatch && (
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 px-3 md:bottom-5">
            <div className="animate-toast pointer-events-auto mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-full border border-plum-200 bg-surface/95 py-2 pr-2 pl-5 shadow-[var(--shadow-lg)] backdrop-blur-xl">
              <span className="min-w-0 truncate text-sm text-ink-muted">
                <span className="hidden sm:inline">Selected </span>
                <span className="font-medium text-ink">{chosenMatch.hospital.name}</span>
              </span>
              <ButtonLink href="/journey" size="sm">
                Plan the stay <ArrowRight className="size-3.5" />
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ---------------- top match ---------------- */

function TopMatch({
  match: m,
  policy,
  chosen,
  onChoose,
  onDetails,
}: {
  match: HospitalMatch;
  policy: NormalizedPolicy;
  chosen: boolean;
  onChoose: () => void;
  onDetails: () => void;
}) {
  const plus = m.tradeOffs.filter((t) => t.kind === "plus").slice(0, 2);
  const minus = m.tradeOffs.find((t) => t.kind !== "plus");
  const pays = m.estimate?.patientPays ?? 0;

  return (
    <section aria-labelledby="top-match-title" className="animate-rise card-verdict">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
        <div className="min-w-0">
          <Eyebrow>Top match for your cover</Eyebrow>
          <h2 id="top-match-title" className="mt-2 font-display text-3xl text-ink">
            {m.hospital.name}
          </h2>
          <p className="mt-1.5 text-sm text-ink-muted">
            {m.hospital.area} · <span className="figure font-normal">{m.distanceKm} km</span> away
            {m.bestRoom && <> · {m.bestRoom.room.category}</>}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {m.inNetwork ? (
              <Pill tone="sage">{m.cashless ? "In network · cashless" : "In network"}</Pill>
            ) : (
              <Pill tone={policy.reimbursement.outOfNetworkAllowed ? "ochre" : "clay"}>
                {policy.reimbursement.outOfNetworkAllowed ? "Out of network" : "Not payable here"}
              </Pill>
            )}
            {m.specialtyMatch && <Pill tone="plum">Treats this</Pill>}
            {m.hospital.emergency24x7 && <Pill>24×7 emergency</Pill>}
          </div>

          <ul className="mt-5 space-y-2">
            {plus.map((t, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink-muted">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-sage-500" />
                {t.text}
              </li>
            ))}
            {minus && (
              <li className="flex gap-2.5 text-sm text-ink-muted">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-clay-500" />
                <span>
                  <span className="sr-only">Trade-off: </span>
                  {minus.text}
                </span>
              </li>
            )}
          </ul>
        </div>

        <div className="flex flex-col justify-between gap-5 rounded-[20px] border border-line bg-surface/70 p-5">
          <div>
            <div className="label">You’d pay, estimated</div>
            <div className={`hero-figure mt-2 text-[44px] ${pays > 0 ? "text-ink" : "text-sage-700"}`}>
              {inr(pays)}
            </div>
            {m.estimate && (
              <p className="mt-2 text-sm text-ink-muted">
                of a <span className="figure font-normal">{inr(m.estimate.policyPays + pays)}</span>{" "}
                {m.estimate.days}-day bill. Your policy covers{" "}
                <span className="figure font-normal text-ink">{inr(m.estimate.policyPays)}</span>.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <Button
              onClick={onChoose}
              variant={chosen ? "soft" : "primary"}
              aria-pressed={chosen}
              className="flex-1"
            >
              {chosen ? "Selected" : "Choose this hospital"}
            </Button>
            <Button onClick={onDetails} variant="secondary" className="flex-1">
              See the breakdown
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- case inputs ---------------- */

function CaseBar({
  ctx,
  onChange,
}: {
  ctx: CaseContext;
  onChange: (next: CaseContext) => void;
}) {
  const [open, setOpen] = useState(false);
  const preset =
    CONDITION_PRESETS.find((p) => p.procedure === ctx.condition) ?? CONDITION_PRESETS[0];
  const locality = LOCALITIES.find((l) => l.id === ctx.localityId);

  return (
    <div className="card">
      {/* Phones: a one-line summary. The form opens on demand. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="case-form"
        className="flex w-full items-center gap-3 p-4 text-left md:hidden"
      >
        <span className="min-w-0 flex-1">
          <span className="label block">Your case</span>
          <span className="mt-1 block truncate text-sm font-medium text-ink">
            {preset.label} · {locality?.label} · {ctx.expectedDays}d ·{" "}
            {ctx.urgency === "emergency" ? "Emergency" : "Planned"}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
          {open ? "Done" : "Edit"}
          <Chevron className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      <div
        id="case-form"
        className={`grid gap-4 border-t border-line p-4 sm:grid-cols-2 sm:p-5 md:border-t-0 lg:grid-cols-4 ${
          open ? "" : "hidden md:grid"
        }`}
      >
        <div>
          <label htmlFor="case-reason" className="label mb-1.5 block">
            Reason for admission
          </label>
          <select
            id="case-reason"
            value={preset.id}
            onChange={(e) => {
              const p = CONDITION_PRESETS.find((x) => x.id === e.target.value)!;
              onChange({
                ...ctx,
                condition: p.procedure,
                expectedDays: p.days,
                urgency: p.urgency,
                procedureCost: p.fallbackCost,
              });
            }}
            className="field"
          >
            {CONDITION_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="case-from" className="label mb-1.5 block">
            Starting from
          </label>
          <select
            id="case-from"
            value={ctx.localityId}
            onChange={(e) => onChange({ ...ctx, localityId: e.target.value })}
            className="field"
          >
            {LOCALITIES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}, Bengaluru
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="case-days" className="label mb-1.5 block">
            Expected stay
          </label>
          <div className="flex min-h-[44px] items-center gap-3">
            <input
              id="case-days"
              type="range"
              min={1}
              max={14}
              value={ctx.expectedDays}
              aria-valuetext={`${ctx.expectedDays} ${ctx.expectedDays === 1 ? "day" : "days"}`}
              onChange={(e) => onChange({ ...ctx, expectedDays: Number(e.target.value) })}
              className="range flex-1 cursor-pointer"
            />
            <span className="figure w-16 shrink-0 text-base text-ink">
              {ctx.expectedDays} {ctx.expectedDays === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        <div>
          <span className="label mb-1.5 block" id="case-urgency">
            Urgency
          </span>
          <Segmented
            label="Urgency"
            value={ctx.urgency}
            onChange={(u) => onChange({ ...ctx, urgency: u })}
            options={[
              ["emergency", "Emergency"],
              ["planned", "Planned"],
            ]}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------- context panel ---------------- */

function CoverageContext({
  policy,
  matches,
}: {
  policy: NormalizedPolicy;
  matches: HospitalMatch[];
}) {
  const inNetwork = matches.filter((m) => m.inNetwork).length;
  const covered = matches.filter((m) => m.bestRoom?.status === "covered").length;
  const cheapest = matches.reduce<HospitalMatch | null>(
    (best, m) =>
      m.estimate && (!best?.estimate || m.estimate.patientPays < best.estimate.patientPays)
        ? m
        : best,
    null,
  );

  return (
    <section className="card flex h-full flex-col p-5 sm:p-6" aria-labelledby="constraints-title">
      <h2 id="constraints-title" className="label font-sans">
        Your constraints
      </h2>
      <dl className="mt-4 space-y-3">
        <Line
          term="Room limit"
          detail={
            policy.roomEligibility.resolvedDailyCap
              ? `${inr(policy.roomEligibility.resolvedDailyCap)} a day`
              : `${policy.roomEligibility.eligibleCategory} entitlement`
          }
        />
        <Line
          term="Proportionate deduction"
          detail={policy.roomEligibility.proportionateDeduction ? "Applies" : "Waived"}
          tone={policy.roomEligibility.proportionateDeduction ? "clay" : "sage"}
        />
        <Line
          term="Outside the network"
          detail={
            policy.reimbursement.outOfNetworkAllowed
              ? `${policy.reimbursement.payablePercent ?? 100}% reimbursed`
              : "Nothing payable"
          }
          tone={policy.reimbursement.outOfNetworkAllowed ? "ochre" : "clay"}
        />
        {policy.coPay && (
          <Line
            term="Co-payment"
            detail={
              coPayIsConditional(policy.coPay.appliesTo)
                ? `${policy.coPay.percent}% · conditional`
                : `${policy.coPay.percent}% on every claim`
            }
            tone="ochre"
          />
        )}
      </dl>

      {cheapest?.estimate && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="label mb-2.5">Best case against your cover</div>
          <Meter
            value={cheapest.estimate.policyPays}
            max={policy.sumInsured.amount}
            tone={
              cheapest.estimate.policyPays / policy.sumInsured.amount > 0.85 ? "warn" : "good"
            }
            leftLabel={`${inr(cheapest.estimate.policyPays)} of your cover used`}
            rightLabel={inr(policy.sumInsured.amount)}
          />
          <p className="mt-2.5 text-xs text-ink-subtle">
            At {cheapest.hospital.name}, the option that leaves least with you.
            Whatever the policy bears here comes off the same annual pot.
          </p>
        </div>
      )}

      <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-4">
        <Mini label="In network" value={`${inNetwork}/${matches.length || 0}`} />
        <Mini label="Room fits" value={`${covered}/${matches.length || 0}`} />
        <Mini
          label="Least you pay"
          value={cheapest?.estimate ? inr(cheapest.estimate.patientPays) : "—"}
        />
      </dl>
    </section>
  );
}

function Line({
  term,
  detail,
  tone,
}: {
  term: string;
  detail: string;
  tone?: "sage" | "ochre" | "clay";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-ink-muted">{term}</dt>
      <dd>
        {tone ? (
          <Pill tone={tone}>{detail}</Pill>
        ) : (
          <span className="figure text-sm text-ink">{detail}</span>
        )}
      </dd>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="figure mt-1.5 text-base leading-none text-ink">{value}</dd>
    </div>
  );
}

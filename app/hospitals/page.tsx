"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell, SparkIcon } from "@/components/AppShell";
import { HospitalCard } from "@/components/HospitalCard";
import { TradeOffPlot } from "@/components/viz/TradeOffPlot";
import { Reveal } from "@/components/motion";
import {
  ErrorNote,
  Meter,
  Pill,
  SectionHeading,
  Skeleton,
  StatusLine,
  StreamingProse,
} from "@/components/ui";
import { CONDITION_PRESETS, LOCALITIES } from "@/lib/data/hospitals";
import { coPayIsConditional, inr } from "@/lib/services/matchingEngine";
import { useNdjson, useStore } from "@/lib/store";
import type { CaseContext, HospitalMatch } from "@/lib/types";

type Sort = "match" | "cost" | "distance";

export default function HospitalsPage() {
  const router = useRouter();
  const { session, update, hydrated } = useStore();
  const { run, running, status, error } = useNdjson();
  const lastKey = useRef<string>("");

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sort, setSort] = useState<Sort>("match");
  const [filters, setFilters] = useState({
    networkOnly: false,
    cashless: false,
    roomWithinLimit: false,
    emergency: false,
  });

  const ctxKey = JSON.stringify(session.ctx);

  useEffect(() => {
    if (!hydrated) return;
    if (!session.policy) {
      router.replace("/");
      return;
    }
    if (lastKey.current === ctxKey) return;
    lastKey.current = ctxKey;

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
  }, [hydrated, session.policy, ctxKey, router, run, update, session.ctx]);

  /** A point on the plot is the same thing as a card in the list. */
  const focusHospital = useCallback(
    (hospitalId: string) => {
      const match = session.matches.find((m) => m.hospital.id === hospitalId);
      if (!match) return;
      update({
        chosen: {
          hospitalId,
          roomCategory: match.bestRoom?.room.category ?? "General Ward",
        },
        guidance: {},
      });
      cardRefs.current[hospitalId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    },
    [session.matches, update],
  );

  const visible = useMemo(() => {
    let list = [...session.matches];
    if (filters.networkOnly) list = list.filter((m) => m.inNetwork);
    if (filters.cashless) list = list.filter((m) => m.cashless);
    if (filters.roomWithinLimit)
      list = list.filter((m) => m.bestRoom?.status === "covered");
    if (filters.emergency) list = list.filter((m) => m.hospital.emergency24x7);

    if (sort === "cost")
      list.sort(
        (a, b) => (a.estimate?.patientPays ?? 0) - (b.estimate?.patientPays ?? 0),
      );
    if (sort === "distance") list.sort((a, b) => a.distanceKm - b.distanceKm);
    return list;
  }, [session.matches, filters, sort]);

  if (!hydrated || !session.policy) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6">
          <Skeleton className="h-40 w-full" />
        </div>
      </AppShell>
    );
  }

  const policy = session.policy;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1240px] px-4 pt-7 pb-10 sm:px-6">
        <SectionHeading
          eyebrow={`${policy.insurer} · ${inr(policy.sumInsured.amount)} cover`}
          title="Hospitals your policy actually fits"
          caption="Ranked by coverage, cost and distance — with the trade-offs stated out loud, not buried."
        />

        <CaseBar
          ctx={session.ctx}
          onChange={(next) => update({ ctx: next, matches: [], comparison: "" })}
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <div className="card p-5">
            <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl leading-tight text-ink">
                  The shape of the choice
                </h2>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-ink-muted">
                  How far you travel against what you end up paying — closer
                  and cheaper is the bottom-left. Press any point to jump to it.
                </p>
              </div>
              {running && !session.matches.length && (
                <StatusLine status={status} />
              )}
            </div>
            <div className="mt-3">
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
          </div>

          <CoverageContext policy={policy} matches={session.matches} />
        </div>

        <div className="card relative mt-4 overflow-hidden p-5">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-plum-300" />
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-label font-semibold tracking-[0.14em] text-plum-400 uppercase">
              <SparkIcon className="size-3.5" />
              Reading the ranking
            </div>
            {running && <StatusLine status={status} />}
          </div>
          <StreamingProse
            text={session.comparison}
            streaming={running}
            className="max-w-[68ch] [&_p]:text-base"
          />
          <p className="mt-4 border-t border-line pt-3 text-label leading-relaxed text-ink-subtle">
            Cost and coverage only. This is not a comparison of clinical
            quality, and empanelment changes — confirm with the hospital&rsquo;s
            insurance desk before admission.
          </p>
        </div>

        {error && (
          <div className="mt-6">
            <ErrorNote message={error} />
          </div>
        )}

        <div className="mt-9 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={filters.networkOnly}
              onClick={() =>
                setFilters((f) => ({ ...f, networkOnly: !f.networkOnly }))
              }
            >
              In network only
            </FilterChip>
            <FilterChip
              active={filters.cashless}
              onClick={() => setFilters((f) => ({ ...f, cashless: !f.cashless }))}
            >
              Cashless
            </FilterChip>
            <FilterChip
              active={filters.roomWithinLimit}
              onClick={() =>
                setFilters((f) => ({ ...f, roomWithinLimit: !f.roomWithinLimit }))
              }
            >
              Room within my limit
            </FilterChip>
            <FilterChip
              active={filters.emergency}
              onClick={() =>
                setFilters((f) => ({ ...f, emergency: !f.emergency }))
              }
            >
              24×7 emergency
            </FilterChip>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-label text-ink-subtle">Sort</span>
            <div className="flex rounded-full border border-line bg-surface p-[3px]">
              {(
                [
                  ["match", "Best match"],
                  ["cost", "Lowest cost"],
                  ["distance", "Nearest"],
                ] as [Sort, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSort(id)}
                  className={`rounded-full px-3 py-1 text-label font-medium transition-colors ${
                    sort === id
                      ? "bg-plum-100 text-plum-700"
                      : "text-ink-subtle hover:text-ink-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3.5">
          {running && !session.matches.length &&
            [0, 1, 2].map((i) => (
              <div key={i} className="card space-y-3 p-5">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}

          {visible.map((m, i) => (
            <Reveal
              key={m.hospital.id}
              delay={Math.min(i, 5) * 55}
            >
              <div
                ref={(el) => {
                  cardRefs.current[m.hospital.id] = el;
                }}
                className="scroll-mt-32"
              >
                <HospitalCard
                  match={m}
                  rank={i + 1}
                  policy={policy}
                  chosen={session.chosen?.hospitalId === m.hospital.id}
                  onChoose={() =>
                    update({
                      chosen: {
                        hospitalId: m.hospital.id,
                        roomCategory: m.bestRoom?.room.category ?? "General Ward",
                      },
                      guidance: {},
                    })
                  }
                />
              </div>
            </Reveal>
          ))}

          {!running && !visible.length && (
            <div className="card p-8 text-center">
              <p className="text-base text-ink-muted">
                No hospitals match those filters. Try relaxing one.
              </p>
            </div>
          )}
        </div>

        {session.chosen && (
          <div className="sticky bottom-20 z-30 mt-8 md:bottom-6">
            <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-full border border-plum-200 bg-surface/95 px-4 py-2.5 shadow-[var(--shadow-lift)] backdrop-blur-md">
              <span className="text-sm text-ink-muted">
                Selected{" "}
                <span className="font-medium text-ink">
                  {
                    session.matches.find(
                      (m) => m.hospital.id === session.chosen!.hospitalId,
                    )?.hospital.name
                  }
                </span>
              </span>
              <Link
                href="/journey"
                className="inline-flex items-center gap-1.5 rounded-full bg-plum-500 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-plum-600"
              >
                Start the journey
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CaseBar({
  ctx,
  onChange,
}: {
  ctx: CaseContext;
  onChange: (next: CaseContext) => void;
}) {
  const preset =
    CONDITION_PRESETS.find((p) => p.procedure === ctx.condition) ??
    CONDITION_PRESETS[0];

  return (
    <div className="card mt-1 grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
      <Field label="Reason for admission">
        <select
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
          className="w-full rounded-[9px] border border-line bg-canvas px-3 py-2 text-base text-ink focus:border-plum-300 focus:bg-surface focus:outline-none"
        >
          {CONDITION_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Starting from">
        <select
          value={ctx.localityId}
          onChange={(e) => onChange({ ...ctx, localityId: e.target.value })}
          className="w-full rounded-[9px] border border-line bg-canvas px-3 py-2 text-base text-ink focus:border-plum-300 focus:bg-surface focus:outline-none"
        >
          {LOCALITIES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}, Bengaluru
            </option>
          ))}
        </select>
      </Field>

      <Field label="Expected stay">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={14}
            value={ctx.expectedDays}
            onChange={(e) =>
              onChange({ ...ctx, expectedDays: Number(e.target.value) })
            }
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-sunk accent-plum-500"
          />
          <span className="figure w-14 shrink-0 text-base text-ink">
            {ctx.expectedDays} {ctx.expectedDays === 1 ? "day" : "days"}
          </span>
        </div>
      </Field>

      <Field label="Urgency">
        <div className="flex rounded-[9px] border border-line bg-canvas p-[3px]">
          {(
            [
              ["emergency", "Emergency"],
              ["planned", "Planned"],
            ] as [CaseContext["urgency"], string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ ...ctx, urgency: id })}
              className={`flex-1 rounded-[7px] px-2 py-1.5 text-xs font-medium transition-colors ${
                ctx.urgency === id
                  ? "bg-surface text-ink shadow-[var(--shadow-xs)]"
                  : "text-ink-subtle hover:text-ink-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-label font-semibold tracking-[0.13em] text-ink-subtle uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function CoverageContext({
  policy,
  matches,
}: {
  policy: import("@/lib/types").NormalizedPolicy;
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
    <div className="card flex h-full flex-col p-5">
      <div className="text-label font-semibold tracking-[0.13em] text-ink-subtle uppercase">
        Your constraints
      </div>
      <dl className="mt-3.5 space-y-3">
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
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-label font-semibold tracking-[0.13em] text-ink-subtle uppercase">
              Best case against your cover
            </span>
          </div>
          <Meter
            value={cheapest.estimate.policyPays}
            max={policy.sumInsured.amount}
            tone={
              cheapest.estimate.policyPays / policy.sumInsured.amount > 0.85
                ? "warn"
                : "good"
            }
            leftLabel={`${inr(cheapest.estimate.policyPays)} of your cover used`}
            rightLabel={inr(policy.sumInsured.amount)}
          />
          <p className="mt-2.5 text-label leading-relaxed text-ink-subtle">
            At {cheapest.hospital.name}, the option that leaves least with you.
            Whatever the policy bears here comes off the same annual pot.
          </p>
        </div>
      )}

      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-4">
        <Mini label="In network" value={`${inNetwork}/${matches.length || 0}`} />
        <Mini label="Room fits" value={`${covered}/${matches.length || 0}`} />
        <Mini
          label="Least you pay"
          value={cheapest?.estimate ? inr(cheapest.estimate.patientPays) : "—"}
        />
      </div>
    </div>
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
      <div className="text-label font-semibold tracking-[0.1em] text-ink-subtle uppercase">
        {label}
      </div>
      <div className="figure mt-1 text-base leading-none text-ink">
        {value}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-plum-300 bg-plum-100 text-plum-700"
          : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

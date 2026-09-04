"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { CitationChip } from "@/components/Citation";
import { SparkIcon } from "@/components/AppShell";
import {
  ErrorNote,
  Expander,
  Pill,
  SectionHeading,
  Skeleton,
  StatTile,
  StatusLine,
  StreamingProse,
} from "@/components/ui";
import { useNdjson, useStore } from "@/lib/store";
import { inr } from "@/lib/services/matchingEngine";
import { formatDate } from "@/lib/format";
import type { Exclusion, NormalizedPolicy } from "@/lib/types";

export default function CoveragePage() {
  return (
    <AppShell>
      <Coverage />
    </AppShell>
  );
}

function Coverage() {
  const router = useRouter();
  const { session, update, hydrated, config } = useStore();
  const { run, running, status, error } = useNdjson();
  const started = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!session.source) {
      router.replace("/");
      return;
    }
    if (session.policy || started.current) return;
    started.current = true;

    const sampleId = session.sampleId ?? undefined;
    void run(
      "/api/policy/parse",
      sampleId
        ? { sampleId }
        : { text: session.source.text, name: session.source.name },
      {
        onEvent: (e) => {
          if (e.type === "policy") update({ policy: e.policy });
          if (e.type === "points") update({ points: e.points });
        },
        onDelta: (full) => update({ brief: full }),
      },
    );
  }, [hydrated, session.source, session.policy, session.sampleId, router, run, update]);

  if (!hydrated || (!session.policy && !error)) {
    return <ParsingPanel status={status} />;
  }

  if (error && !session.policy) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <ErrorNote message={error} />
        <Link
          href="/"
          className="mt-5 inline-flex rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          Choose a different policy
        </Link>
      </div>
    );
  }

  const policy = session.policy!;

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-7 pb-10 sm:px-6">
      <PolicyHeader policy={policy} demo={config?.demo ?? false} />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          tone="plum"
          label="Sum insured"
          value={inr(policy.sumInsured.amount)}
          sub={policy.sumInsured.basis}
          footer={<CitationChip citation={policy.sumInsured.citation} />}
        />
        <StatTile
          tone={policy.roomEligibility.resolvedDailyCap ? "ochre" : "sage"}
          label="Room limit / day"
          value={
            policy.roomEligibility.resolvedDailyCap
              ? inr(policy.roomEligibility.resolvedDailyCap)
              : policy.roomEligibility.eligibleCategory
          }
          sub={
            policy.roomEligibility.capMode === "percent_of_sum_insured_per_day"
              ? `${policy.roomEligibility.capValue}% of sum insured, per day`
              : policy.roomEligibility.capMode === "category_capped"
                ? "Entitlement is by ward category, not a rupee cap"
                : "Flat daily limit, not linked to sum insured"
          }
          footer={<CitationChip citation={policy.roomEligibility.citation} />}
        />
        <StatTile
          tone="neutral"
          label="ICU limit / day"
          value={
            policy.roomEligibility.resolvedIcuDailyCap
              ? inr(policy.roomEligibility.resolvedIcuDailyCap)
              : "Included"
          }
          sub={
            policy.roomEligibility.resolvedIcuDailyCap
              ? "Applies to ICU, CCU and HDU beds"
              : "No separate ICU cap stated in the document"
          }
        />
        <StatTile
          tone={policy.reimbursement.outOfNetworkAllowed ? "ochre" : "clay"}
          label="Outside the network"
          value={
            policy.reimbursement.outOfNetworkAllowed
              ? `${policy.reimbursement.payablePercent ?? 100}% back`
              : "Not payable"
          }
          sub={
            policy.reimbursement.claimWindowDays
              ? `Claim papers due within ${policy.reimbursement.claimWindowDays} days of discharge`
              : "No reimbursement route in this cover"
          }
          footer={<CitationChip citation={policy.reimbursement.citation} />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <BriefCard
          brief={session.brief}
          streaming={running}
          status={status}
          demo={config?.demo ?? false}
        />
        <SummaryPoints points={session.points} loading={running && !session.points.length} />
      </div>

      <RoomSection policy={policy} />
      <CostSection policy={policy} />
      <SubLimitSection policy={policy} />
      <ExclusionSection policy={policy} />
      <NetworkSection policy={policy} />
      <GapSection policy={policy} />

      <NextStep />
    </div>
  );
}

/* ---------------- pieces ---------------- */

function PolicyHeader({
  policy,
  demo,
}: {
  policy: NormalizedPolicy;
  demo: boolean;
}) {
  const kindTone =
    policy.kind === "government" ? "sage" : policy.kind === "employer" ? "ochre" : "plum";
  const kindLabel = {
    government: "Government scheme",
    private: "Private retail",
    employer: "Employer group",
    topup: "Top-up cover",
  }[policy.kind];

  return (
    <div className="animate-rise card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-plum-400 uppercase">
            {policy.insurer}
          </div>
          <h1 className="mt-1.5 font-display text-[26px] leading-tight text-ink sm:text-[31px]">
            {policy.planName}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-ink-muted">
            {policy.policyHolder && (
              <span>
                <span className="text-ink-subtle">Holder</span> {policy.policyHolder}
              </span>
            )}
            {policy.policyNumber && (
              <span className="tnum">
                <span className="text-ink-subtle">No.</span> {policy.policyNumber}
              </span>
            )}
            {policy.validTo && (
              <span>
                <span className="text-ink-subtle">Valid to</span>{" "}
                {formatDate(policy.validTo)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={kindTone as "plum"}>{kindLabel}</Pill>
          {policy.schemes.map((s) => (
            <Pill key={s} tone="sage">
              {s}
            </Pill>
          ))}
          <Pill tone={policy.confidence === "high" ? "sage" : "ochre"}>
            <span className="capitalize">{policy.confidence}</span> confidence
          </Pill>
        </div>
      </div>
      {demo && (
        <p className="mt-4 border-t border-line pt-3.5 text-[12.5px] leading-relaxed text-ink-subtle">
          Demo Mode: this extraction is a stored fixture rather than a live
          model call. Its citations are verified against the source document by
          the same routine used on live output.
        </p>
      )}
    </div>
  );
}

function BriefCard({
  brief,
  streaming,
  status,
  demo,
}: {
  brief: string;
  streaming: boolean;
  status: { label: string; step: number; of: number } | null;
  demo: boolean;
}) {
  return (
    <div className="card relative overflow-hidden p-5 sm:p-6">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-plum-300" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-plum-400 uppercase">
          <SparkIcon className="size-3.5" />
          In plain language
        </div>
        {streaming && <StatusLine status={status} />}
      </div>
      <StreamingProse text={brief} streaming={streaming} />
      <p className="mt-5 border-t border-line pt-3.5 text-[12px] leading-relaxed text-ink-subtle">
        Written by {demo ? "a stored fixture" : "Claude"} from the clauses above.
        It is a reading of your document, not a decision on your claim — confirm
        anything that affects money with your insurer or TPA.
      </p>
    </div>
  );
}

function SummaryPoints({
  points,
  loading,
}: {
  points: { heading: string; body: string; tone: "good" | "watch" | "limit" }[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-2 p-4">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const meta = {
    good: { tone: "sage", label: "Works for you", bar: "bg-sage-500" },
    watch: { tone: "ochre", label: "Watch this", bar: "bg-ochre-500" },
    limit: { tone: "clay", label: "Hard limit", bar: "bg-clay-500" },
  } as const;

  return (
    <div className="stagger space-y-3">
      {points.map((p, i) => {
        const m = meta[p.tone];
        return (
          <div
            key={i}
            style={{ ["--i" as string]: i }}
            className="card relative overflow-hidden py-4 pr-4 pl-5"
          >
            <div className={`absolute inset-y-0 left-0 w-[3px] ${m.bar}`} />
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-[16.5px] leading-snug text-ink">
                {p.heading}
              </h3>
              <Pill tone={m.tone}>{m.label}</Pill>
            </div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
              {p.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function RoomSection({ policy }: { policy: NormalizedPolicy }) {
  const re = policy.roomEligibility;
  return (
    <section className="mt-12">
      <SectionHeading
        eyebrow="The decision at the desk"
        title="Room eligibility"
        caption="What you are entitled to occupy, and what happens if you take something better."
      />
      <div className="grid gap-3 md:grid-cols-[1fr_1.15fr]">
        <div className="card p-5">
          <div className="text-[11px] font-semibold tracking-[0.13em] text-ink-subtle uppercase">
            Your entitlement
          </div>
          <div className="mt-2 font-display text-[24px] leading-tight text-ink">
            {re.eligibleCategory}
          </div>
          {re.resolvedDailyCap != null && (
            <div className="tnum mt-1 text-[14px] text-ink-muted">
              up to {inr(re.resolvedDailyCap)} a day
            </div>
          )}
          <p className="mt-3.5 text-[13.5px] leading-relaxed text-ink-muted">
            {re.notes}
          </p>
          <div className="mt-4">
            <CitationChip citation={re.citation} />
          </div>
        </div>

        <div
          className={`card relative overflow-hidden p-5 ${
            re.proportionateDeduction ? "border-clay-300/60" : "border-sage-300/60"
          }`}
        >
          <div
            className={`absolute inset-x-0 top-0 h-[3px] ${
              re.proportionateDeduction ? "bg-clay-500" : "bg-sage-500"
            }`}
          />
          <div className="flex items-center gap-2">
            <span
              className={`inline-block size-2 rounded-full ${
                re.proportionateDeduction ? "bg-clay-500" : "bg-sage-500"
              }`}
            />
            <div className="text-[11px] font-semibold tracking-[0.13em] text-ink-subtle uppercase">
              Proportionate deduction
            </div>
          </div>
          <div className="mt-2 font-display text-[22px] leading-tight text-ink">
            {re.proportionateDeduction ? "Applies to this policy" : "Waived under this policy"}
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-muted">
            {re.proportionateDeduction ? (
              <>
                If you take a room above the limit, the policy pays a reduced
                share of <em>every</em> associated charge — surgeon, theatre,
                nursing, consultant visits — in the same ratio, not just the
                room. On a bill of a few lakh this is usually much larger than
                the room difference itself.
              </>
            ) : (
              <>
                If you take a room above the limit you pay the room difference
                and nothing else is scaled down. Surgeon, theatre and nursing
                charges are assessed on their own terms. This is unusually
                favourable, and worth knowing before you decline a better room.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

function CostSection({ policy }: { policy: NormalizedPolicy }) {
  const items: {
    label: string;
    value: string;
    detail: string;
    tone: "sage" | "ochre" | "clay" | "neutral";
    citation: NormalizedPolicy["sumInsured"]["citation"] | null;
  }[] = [
    {
      label: "Co-payment",
      value: policy.coPay ? `${policy.coPay.percent}%` : "None",
      detail: policy.coPay
        ? policy.coPay.appliesTo
        : "No patient share is deducted from an admissible claim.",
      tone: policy.coPay ? "ochre" : "sage",
      citation: policy.coPay?.citation ?? null,
    },
    {
      label: "Deductible",
      value: policy.deductible ? inr(policy.deductible.amount) : "None",
      detail: policy.deductible
        ? policy.deductible.appliesTo
        : "Nothing comes off before the policy starts paying.",
      tone: policy.deductible ? "ochre" : "sage",
      citation: policy.deductible?.citation ?? null,
    },
    {
      label: "Pre-authorisation",
      value: policy.preAuthorization.plannedNoticeHours
        ? `${policy.preAuthorization.plannedNoticeHours}h notice`
        : policy.preAuthorization.required
          ? "Required"
          : "Not required",
      detail: policy.preAuthorization.notes,
      tone: "neutral",
      citation: policy.preAuthorization.citation,
    },
    {
      label: "Before & after the stay",
      value: `${policy.preHospitalizationDays ?? 0} / ${policy.postHospitalizationDays ?? 0} days`,
      detail:
        "Costs in the days before admission and after discharge that form part of the same claim.",
      tone: "neutral",
      citation: null,
    },
  ];

  return (
    <section className="mt-12">
      <SectionHeading
        eyebrow="Money"
        title="What you will bear yourself"
        caption="Deductions and conditions applied before the policy pays anything."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="card p-4">
            <div className="text-[11px] font-semibold tracking-[0.13em] text-ink-subtle uppercase">
              {it.label}
            </div>
            <div className="tnum mt-1.5 font-display text-[22px] leading-none text-ink">
              {it.value}
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
              {it.detail}
            </p>
            {it.citation && (
              <div className="mt-3">
                <CitationChip citation={it.citation} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SubLimitSection({ policy }: { policy: NormalizedPolicy }) {
  if (!policy.subLimits.length) return null;
  return (
    <section className="mt-12">
      <SectionHeading
        eyebrow="Caps inside the cap"
        title="Sub-limits"
        caption="Benefits with their own ceiling. These bite even when the sum insured is untouched."
      />
      <div className="card divide-y divide-line overflow-hidden">
        {policy.subLimits.map((s, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-canvas"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium text-ink">{s.item}</div>
            </div>
            <div className="tnum text-[13.5px] font-medium text-ochre-700">
              {s.limit}
            </div>
            <CitationChip citation={s.citation} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ExclusionSection({ policy }: { policy: NormalizedPolicy }) {
  const waits = policy.exclusions.filter((e) => e.kind === "waiting_period");
  const perms = policy.exclusions.filter((e) => e.kind === "permanent");
  if (!policy.exclusions.length) return null;

  return (
    <section className="mt-12">
      <SectionHeading
        eyebrow="Not covered"
        title="Exclusions and waiting periods"
        caption="A waiting period lapses with time. A permanent exclusion does not."
      />
      <div className="grid gap-3 md:grid-cols-2">
        <ExclusionColumn
          title="Waiting periods"
          caption="Covered eventually — but not yet."
          tone="ochre"
          items={waits}
        />
        <ExclusionColumn
          title="Permanent exclusions"
          caption="Never payable under this policy."
          tone="clay"
          items={perms}
        />
      </div>
    </section>
  );
}

function ExclusionColumn({
  title,
  caption,
  tone,
  items,
}: {
  title: string;
  caption: string;
  tone: "ochre" | "clay";
  items: Exclusion[];
}) {
  if (!items.length) return null;
  const bar = tone === "ochre" ? "bg-ochre-500" : "bg-clay-500";
  return (
    <div className="card relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-[3px] ${bar}`} />
      <div className="border-b border-line px-4 pt-4 pb-3">
        <h3 className="font-display text-[17px] leading-snug text-ink">{title}</h3>
        <p className="mt-0.5 text-[12.5px] text-ink-subtle">{caption}</p>
      </div>
      <div className="divide-y divide-line">
        {items.map((e, i) => (
          <div key={i} className="px-4 py-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="text-[14px] font-medium text-ink">{e.item}</div>
              {e.waitingMonths != null && (
                <Pill tone={tone}>
                  {e.waitingMonths >= 12
                    ? `${Math.round(e.waitingMonths / 12)} yr wait`
                    : `${e.waitingMonths} mo wait`}
                </Pill>
              )}
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
              {e.detail}
            </p>
            <div className="mt-2.5">
              <CitationChip citation={e.citation} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NetworkSection({ policy }: { policy: NormalizedPolicy }) {
  if (!policy.networkHospitals.length) return null;
  return (
    <section className="mt-12">
      <SectionHeading
        eyebrow="Where cashless works"
        title="Network hospitals named in the document"
        caption="Empanelment changes without notice — treat this as a starting point and confirm before admission."
        right={
          <Link
            href="/hospitals"
            className="hidden rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:border-plum-200 hover:text-plum-600 sm:inline-block"
          >
            Compare all hospitals
          </Link>
        }
      />
      <div className="flex flex-wrap gap-2">
        {policy.networkHospitals.map((h, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-ink"
          >
            <span
              className={`inline-block size-1.5 rounded-full ${
                h.cashless ? "bg-sage-500" : "bg-ochre-500"
              }`}
            />
            {h.name}
            <span className="text-ink-subtle">{h.city}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

function GapSection({ policy }: { policy: NormalizedPolicy }) {
  if (!policy.gaps.length) return null;
  return (
    <section className="mt-12">
      <div className="rounded-[14px] border border-dashed border-line-strong bg-surface/70 p-5">
        <Expander
          label={`What this document does not say (${policy.gaps.length})`}
          openLabel="Hide the gaps"
        >
          <ul className="mt-3 space-y-2">
            {policy.gaps.map((g, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-muted"
              >
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-line-strong" />
                {g}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-subtle">
            These are questions the document leaves open. Nothing has been
            guessed to fill them — ask your insurer directly.
          </p>
        </Expander>
      </div>
    </section>
  );
}

function NextStep() {
  return (
    <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-[16px] border border-plum-200 bg-plum-50/60 p-5 sm:flex-row sm:items-center sm:p-6">
      <div>
        <h3 className="font-display text-[20px] leading-snug text-ink">
          Now find a hospital this cover actually fits
        </h3>
        <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-ink-muted">
          We will cross-reference these terms against room rates and empanelment,
          and show you what each option leaves you paying.
        </p>
      </div>
      <Link
        href="/hospitals"
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-plum-500 px-5 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-plum-600"
      >
        Find hospitals
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
        </svg>
      </Link>
    </div>
  );
}

function ParsingPanel({
  status,
}: {
  status: { label: string; step: number; of: number } | null;
}) {
  const steps = [
    "Reading the document",
    "Extracting clauses",
    "Verifying citations against source",
    "Writing your summary",
  ];
  const current = status?.step ?? 1;

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-10 pb-16 sm:px-6">
      <div className="card mx-auto max-w-xl p-6">
        <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-plum-400 uppercase">
          <SparkIcon className="size-3.5" />
          Policy Understanding Agent
        </div>
        <h2 className="mt-3 font-display text-[23px] leading-snug text-ink">
          Reading your policy
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
          Extracting the clauses that decide what you pay, then checking every
          quote back against the document itself.
        </p>

        <ol className="mt-6 space-y-3.5">
          {steps.map((label, i) => {
            const n = i + 1;
            const state = n < current ? "done" : n === current ? "active" : "todo";
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors ${
                    state === "done"
                      ? "border-sage-500 bg-sage-500 text-white"
                      : state === "active"
                        ? "animate-breathe border-plum-400 bg-plum-100 text-plum-600"
                        : "border-line text-ink-subtle"
                  }`}
                >
                  {state === "done" ? (
                    <svg viewBox="0 0 16 16" className="size-3" fill="currentColor">
                      <path d="M6.2 11.4 3.3 8.5l1.1-1.1 1.8 1.8 4.4-4.4 1.1 1.1z" />
                    </svg>
                  ) : (
                    n
                  )}
                </span>
                <span
                  className={`text-[13.5px] transition-colors ${
                    state === "todo" ? "text-ink-subtle" : "font-medium text-ink"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-2.5 p-4">
            <Skeleton className="h-2.5 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

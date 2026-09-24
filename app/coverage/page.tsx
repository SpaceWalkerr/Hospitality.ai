"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { CitationChip } from "@/components/Citation";
import { CountUp, Reveal } from "@/components/motion";
import { SectionNav, StickyNext } from "@/components/PageNav";
import {
  ButtonLink,
  Dot,
  ErrorState,
  Expander,
  Eyebrow,
  HeroFigure,
  Pill,
  SectionHeading,
  Skeleton,
  SkeletonCard,
  StatusLine,
  StreamingProse,
} from "@/components/ui";
import type { Tone } from "@/components/ui";
import { ArrowRight, Check, Spark } from "@/components/ui/Icons";
import { useNdjson, useStore } from "@/lib/store";
import { inr } from "@/lib/services/matchingEngine";
import { formatDate } from "@/lib/format";
import type { Citation, Exclusion, NormalizedPolicy } from "@/lib/types";

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

  const parse = useCallback(() => {
    if (!session.source) return;
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
  }, [run, session.sampleId, session.source, update]);

  useEffect(() => {
    if (!hydrated) return;
    if (!session.source) {
      router.replace("/");
      return;
    }
    if (session.policy || started.current) return;
    started.current = true;
    parse();
  }, [hydrated, session.source, session.policy, router, parse]);

  if (!hydrated || (!session.policy && !error)) {
    return <ParsingPanel status={status} />;
  }

  if (error && !session.policy) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <ErrorState
          title="We couldn’t read this policy"
          message={error}
          onRetry={parse}
          secondary={
            <ButtonLink href="/#start" variant="secondary" size="sm">
              Choose a different policy
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const policy = session.policy!;

  const sections = [
    { id: "summary", label: "Summary" },
    { id: "room", label: "Room" },
    { id: "costs", label: "What you pay" },
    policy.subLimits.length ? { id: "sublimits", label: "Sub-limits" } : null,
    policy.exclusions.length ? { id: "exclusions", label: "Not covered" } : null,
    policy.networkHospitals.length ? { id: "network", label: "Network" } : null,
    policy.gaps.length ? { id: "gaps", label: "Unknowns" } : null,
  ].filter((s): s is { id: string; label: string } => !!s);

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-6 pb-10 sm:px-6 sm:pt-8">
      <Verdict policy={policy} demo={config?.demo ?? false} />

      <SectionNav sections={sections} label="Coverage sections" className="mt-6" />

      <section id="summary" tabIndex={-1} className="mt-8 focus:outline-none">
        <h2 className="sr-only">Summary</h2>
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <BriefCard
            brief={session.brief}
            streaming={running}
            status={status}
            demo={config?.demo ?? false}
          />
          <SummaryPoints points={session.points} loading={running && !session.points.length} />
        </div>
      </section>

      <Reveal><RoomSection policy={policy} /></Reveal>
      <Reveal><CostSection policy={policy} /></Reveal>
      <Reveal><SubLimitSection policy={policy} /></Reveal>
      <Reveal><ExclusionSection policy={policy} /></Reveal>
      <Reveal><NetworkSection policy={policy} /></Reveal>
      <Reveal><GapSection policy={policy} /></Reveal>

      <Reveal>
        <NextStep />
      </Reveal>

      <StickyNext showAfter="verdict" hideWhen="next-step">
        <span className="min-w-0 truncate text-sm text-ink-muted">
          <span className="hidden sm:inline">Next: </span>
          <span className="font-medium text-ink">find hospitals this cover fits</span>
        </span>
        <ButtonLink href="/hospitals" size="sm">
          Find hospitals <ArrowRight className="size-3.5" />
        </ButtonLink>
      </StickyNext>
    </div>
  );
}

/* ---------------- verdict ---------------- */

type Fact = {
  label: string;
  value: string;
  sub: string;
  tone: Tone;
  citation?: Citation;
};

function keyFacts(policy: NormalizedPolicy): Fact[] {
  const re = policy.roomEligibility;
  return [
    {
      label: "Room limit / day",
      value: re.resolvedDailyCap ? inr(re.resolvedDailyCap) : re.eligibleCategory,
      sub:
        re.capMode === "percent_of_sum_insured_per_day"
          ? `${re.capValue}% of sum insured, per day`
          : re.capMode === "category_capped"
            ? "Entitlement is by ward category"
            : "Flat daily limit",
      tone: re.resolvedDailyCap ? "ochre" : "sage",
      citation: re.citation,
    },
    {
      label: "ICU limit / day",
      value: re.resolvedIcuDailyCap ? inr(re.resolvedIcuDailyCap) : "Included",
      sub: re.resolvedIcuDailyCap
        ? "ICU, CCU and HDU beds"
        : "No separate ICU cap stated",
      tone: "neutral",
    },
    {
      label: "Co-payment",
      value: policy.coPay ? `${policy.coPay.percent}%` : "None",
      sub: policy.coPay ? policy.coPay.appliesTo : "No patient share on admissible claims",
      tone: policy.coPay ? "ochre" : "sage",
      citation: policy.coPay?.citation,
    },
    {
      label: "Outside the network",
      value: policy.reimbursement.outOfNetworkAllowed
        ? `${policy.reimbursement.payablePercent ?? 100}% back`
        : "Not payable",
      sub: policy.reimbursement.claimWindowDays
        ? `Claim within ${policy.reimbursement.claimWindowDays} days of discharge`
        : "No reimbursement route",
      tone: policy.reimbursement.outOfNetworkAllowed ? "ochre" : "clay",
      citation: policy.reimbursement.citation,
    },
  ];
}

function Verdict({ policy, demo }: { policy: NormalizedPolicy; demo: boolean }) {
  const kindTone: Tone =
    policy.kind === "government" ? "sage" : policy.kind === "employer" ? "ochre" : "plum";
  const kindLabel = {
    government: "Government scheme",
    private: "Private retail",
    employer: "Employer group",
    topup: "Top-up cover",
  }[policy.kind];

  const pd = policy.roomEligibility.proportionateDeduction;

  return (
    <section id="verdict" aria-labelledby="policy-title" className="animate-rise card-verdict">
      <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:gap-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={kindTone}>{kindLabel}</Pill>
            {policy.schemes.map((s) => (
              <Pill key={s} tone="sage">
                {s}
              </Pill>
            ))}
            <Pill tone={policy.confidence === "high" ? "sage" : "ochre"}>
              <span className="capitalize">{policy.confidence}</span> confidence
            </Pill>
          </div>
          <div className="label mt-5 !text-plum-400">{policy.insurer}</div>
          <h1 id="policy-title" className="mt-1.5 font-display text-3xl text-ink sm:text-4xl">
            {policy.planName}
          </h1>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
            {policy.policyHolder && (
              <div className="flex gap-1.5">
                <dt className="text-ink-subtle">Holder</dt>
                <dd>{policy.policyHolder}</dd>
              </div>
            )}
            {policy.policyNumber && (
              <div className="tnum flex gap-1.5">
                <dt className="text-ink-subtle">No.</dt>
                <dd>{policy.policyNumber}</dd>
              </div>
            )}
            {policy.validTo && (
              <div className="flex gap-1.5">
                <dt className="text-ink-subtle">Valid to</dt>
                <dd>{formatDate(policy.validTo)}</dd>
              </div>
            )}
          </dl>

          {/* The one sentence that matters most at the admission desk. */}
          <p
            className={`mt-5 flex max-w-2xl items-start gap-3 rounded-2xl border p-3.5 text-base ${
              pd
                ? "border-clay-300/60 bg-clay-50 text-clay-600"
                : "border-sage-300/60 bg-sage-50 text-sage-700"
            }`}
          >
            <Dot tone={pd ? "clay" : "sage"} className="mt-2" />
            <span>
              <strong className="font-semibold">
                {pd ? "Watch the room rate." : "A better room won’t shrink the rest."}
              </strong>{" "}
              {pd
                ? "Taking a room above your limit reduces what the policy pays on every other charge, not just the room."
                : "Proportionate deduction is waived: above the room limit you pay only the room difference."}
            </span>
          </p>
        </div>

        <div className="border-t border-line pt-6 lg:w-[290px] lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
          <HeroFigure
            label="Sum insured"
            value={<CountUp value={policy.sumInsured.amount} format={(n) => inr(n)} />}
            caption={policy.sumInsured.basis}
          >
            <CitationChip citation={policy.sumInsured.citation} />
          </HeroFigure>
        </div>
      </div>

      <dl className="grid grid-cols-1 border-t border-line bg-surface/60 sm:grid-cols-2 lg:grid-cols-4">
        {keyFacts(policy).map((f, i) => (
          <div
            key={f.label}
            className={`flex flex-col p-5 sm:p-6 ${i > 0 ? "border-t border-line sm:border-t-0" : ""} ${
              i % 2 === 1 ? "sm:border-l" : ""
            } ${i >= 2 ? "sm:border-t lg:border-t-0" : ""} ${i > 0 ? "lg:border-l" : ""} border-line`}
          >
            <dt className="label flex items-center gap-2">
              <Dot tone={f.tone} /> {f.label}
            </dt>
            <dd className="figure mt-2.5 text-2xl leading-none text-ink">{f.value}</dd>
            <dd className="mt-2 text-sm text-ink-muted">{f.sub}</dd>
            {f.citation && (
              <dd className="mt-auto pt-3">
                <CitationChip citation={f.citation} />
              </dd>
            )}
          </div>
        ))}
      </dl>

      {demo && (
        <p className="border-t border-line px-5 py-3 text-xs text-ink-subtle sm:px-7">
          Demo Mode: this extraction is a stored fixture rather than a live
          model call. Its citations are verified against the source document by
          the same routine used on live output.
        </p>
      )}
    </section>
  );
}

/* ---------------- summary ---------------- */

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
    <div className="card p-5 sm:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>
          <Spark /> In plain language
        </Eyebrow>
        {streaming && <StatusLine status={status} />}
      </div>
      <StreamingProse text={brief} streaming={streaming} className="max-w-[62ch]" />
      <p className="mt-6 border-t border-line pt-4 text-xs text-ink-subtle">
        Written by {demo ? "a stored fixture" : "Claude"} from the clauses in
        your document. It is a reading of your document, not a decision on your
        claim — confirm anything that affects money with your insurer or TPA.
      </p>
    </div>
  );
}

const POINT_META = {
  good: { tone: "sage", label: "Works for you" },
  watch: { tone: "ochre", label: "Watch this" },
  limit: { tone: "clay", label: "Hard limit" },
} as const;

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
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <ul className="stagger space-y-3">
      {points.map((p, i) => {
        const m = POINT_META[p.tone];
        return (
          <li key={i} style={{ ["--i" as string]: i }} className="card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg text-ink">{p.heading}</h3>
              <Pill tone={m.tone}>{m.label}</Pill>
            </div>
            <p className="mt-1.5 text-sm text-ink-muted">{p.body}</p>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- sections ---------------- */

function RoomSection({ policy }: { policy: NormalizedPolicy }) {
  const re = policy.roomEligibility;
  const pd = re.proportionateDeduction;
  return (
    <section id="room" tabIndex={-1} className="mt-16 focus:outline-none">
      <SectionHeading
        eyebrow="The decision at the desk"
        title="Room eligibility"
        caption="What you are entitled to occupy, and what happens if you take something better."
      />
      <div className="grid gap-4 md:grid-cols-[1fr_1.15fr]">
        <div className="card p-5 sm:p-6">
          <div className="label">Your entitlement</div>
          <div className="mt-2 font-display text-2xl text-ink">{re.eligibleCategory}</div>
          {re.resolvedDailyCap != null && (
            <div className="figure mt-1 text-base font-normal text-ink-muted">
              up to {inr(re.resolvedDailyCap)} a day
            </div>
          )}
          <p className="mt-3.5 text-base text-ink-muted">{re.notes}</p>
          <div className="mt-4">
            <CitationChip citation={re.citation} />
          </div>
        </div>

        <div
          className={`rounded-[var(--radius-card)] border p-5 sm:p-6 ${
            pd ? "border-clay-300/60 bg-clay-50" : "border-sage-300/60 bg-sage-50"
          }`}
        >
          <div className="label flex items-center gap-2">
            <Dot tone={pd ? "clay" : "sage"} /> Proportionate deduction
          </div>
          <div className={`mt-2 font-display text-2xl ${pd ? "text-clay-600" : "text-sage-700"}`}>
            {pd ? "Applies to this policy" : "Waived under this policy"}
          </div>
          <p className="mt-3 text-base text-ink-muted">
            {pd ? (
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
    tone: Tone;
    citation: Citation | null;
  }[] = [
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
    <section id="costs" tabIndex={-1} className="mt-16 focus:outline-none">
      <SectionHeading
        eyebrow="Money"
        title="What you will bear yourself"
        caption="Deductions and conditions applied before the policy pays anything."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.label} className="card flex flex-col p-5">
            <div className="label flex items-center gap-2">
              <Dot tone={it.tone} /> {it.label}
            </div>
            <div className="figure mt-2.5 text-2xl leading-none text-ink">{it.value}</div>
            <p className="mt-2.5 text-sm text-ink-muted">{it.detail}</p>
            {it.citation && (
              <div className="mt-auto pt-3">
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
    <section id="sublimits" tabIndex={-1} className="mt-16 focus:outline-none">
      <SectionHeading
        eyebrow="Caps inside the cap"
        title="Sub-limits"
        caption="Benefits with their own ceiling. These bite even when the sum insured is untouched."
      />
      <ul className="card divide-y divide-line overflow-hidden">
        {policy.subLimits.map((s, i) => (
          <li
            key={i}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-canvas"
          >
            <div className="min-w-0 flex-1 text-base font-medium text-ink">{s.item}</div>
            <div className="figure text-base text-ochre-700">{s.limit}</div>
            <CitationChip citation={s.citation} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExclusionSection({ policy }: { policy: NormalizedPolicy }) {
  const waits = policy.exclusions.filter((e) => e.kind === "waiting_period");
  const perms = policy.exclusions.filter((e) => e.kind === "permanent");
  if (!policy.exclusions.length) return null;

  return (
    <section id="exclusions" tabIndex={-1} className="mt-16 focus:outline-none">
      <SectionHeading
        eyebrow="Not covered"
        title="Exclusions and waiting periods"
        caption="A waiting period lapses with time. A permanent exclusion does not."
      />
      <div className="grid gap-4 md:grid-cols-2">
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
  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-3 border-b border-line px-5 pt-5 pb-4">
        <Dot tone={tone} className="mt-2.5" />
        <div>
          <h3 className="font-display text-xl text-ink">{title}</h3>
          <p className="mt-0.5 text-sm text-ink-subtle">{caption}</p>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {items.map((e, i) => (
          <li key={i} className="px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="text-base font-medium text-ink">{e.item}</div>
              {e.waitingMonths != null && (
                <Pill tone={tone}>
                  {e.waitingMonths >= 12
                    ? `${Math.round(e.waitingMonths / 12)} yr wait`
                    : `${e.waitingMonths} mo wait`}
                </Pill>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-muted">{e.detail}</p>
            <div className="mt-2.5">
              <CitationChip citation={e.citation} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NetworkSection({ policy }: { policy: NormalizedPolicy }) {
  if (!policy.networkHospitals.length) return null;
  return (
    <section id="network" tabIndex={-1} className="mt-16 focus:outline-none">
      <SectionHeading
        eyebrow="Where cashless works"
        title="Network hospitals named in the document"
        caption="Empanelment changes without notice — treat this as a starting point and confirm before admission."
        right={
          <ButtonLink href="/hospitals" variant="secondary" size="sm" className="hidden sm:inline-flex">
            Compare all hospitals
          </ButtonLink>
        }
      />
      <ul className="flex flex-wrap gap-2">
        {policy.networkHospitals.map((h, i) => (
          <li
            key={i}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm text-ink"
          >
            <Dot tone={h.cashless ? "sage" : "ochre"} />
            {h.name}
            <span className="text-ink-subtle">{h.city}</span>
            <span className="sr-only">{h.cashless ? "(cashless)" : "(reimbursement)"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-4 text-xs text-ink-subtle">
        <span className="inline-flex items-center gap-1.5"><Dot tone="sage" /> Cashless</span>
        <span className="inline-flex items-center gap-1.5"><Dot tone="ochre" /> Reimbursement</span>
      </p>
    </section>
  );
}

function GapSection({ policy }: { policy: NormalizedPolicy }) {
  if (!policy.gaps.length) return null;
  return (
    <section id="gaps" tabIndex={-1} className="mt-16 focus:outline-none">
      <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/70 p-5 sm:p-6">
        <h2 className="font-display text-xl text-ink">What this document doesn’t say</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {policy.gaps.length} question{policy.gaps.length === 1 ? "" : "s"} the
          document leaves open. Nothing has been guessed to fill them.
        </p>
        <div className="mt-3">
          <Expander label="Show what to ask your insurer" openLabel="Hide">
            <ul className="mt-3 space-y-2">
              {policy.gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-2.5 text-base text-ink-muted">
                  <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-line-strong" />
                  {g}
                </li>
              ))}
            </ul>
          </Expander>
        </div>
      </div>
    </section>
  );
}

function NextStep() {
  return (
    <div
      id="next-step"
      className="card-verdict mt-16 flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8"
    >
      <div>
        <Eyebrow>Step two</Eyebrow>
        <h2 className="mt-2 font-display text-2xl text-ink sm:text-3xl">
          Now find a hospital this cover actually fits
        </h2>
        <p className="mt-2 max-w-xl text-base text-ink-muted">
          We cross-reference these terms against room rates and empanelment,
          and show what each option leaves you paying.
        </p>
      </div>
      <ButtonLink href="/hospitals" size="lg" className="w-full shrink-0 sm:w-auto">
        Find hospitals <ArrowRight />
      </ButtonLink>
    </div>
  );
}

/* ---------------- loading ---------------- */

const PARSE_STEPS = [
  "Reading the document",
  "Extracting clauses",
  "Verifying citations against source",
  "Writing your summary",
];

function ParsingPanel({
  status,
}: {
  status: { label: string; step: number; of: number } | null;
}) {
  const current = status?.step ?? 1;
  const of = status?.of ?? PARSE_STEPS.length;
  const pct = Math.min(100, Math.max(6, ((current - 0.5) / of) * 100));

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-8 pb-16 sm:px-6 sm:pt-10">
      <div className="card-verdict mx-auto max-w-xl p-6 sm:p-7" role="status" aria-live="polite">
        <Eyebrow>
          <Spark /> Policy Understanding Agent
        </Eyebrow>
        <h1 className="mt-3 font-display text-2xl text-ink sm:text-3xl">
          Reading your policy
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          Extracting the clauses that decide what you pay, then checking every
          quote back against the document itself.
        </p>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-plum-100">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ol className="mt-6 space-y-3.5">
          {PARSE_STEPS.map((label, i) => {
            const n = i + 1;
            const state = n < current ? "done" : n === current ? "active" : "todo";
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full border text-label font-semibold transition-colors ${
                    state === "done"
                      ? "border-sage-500 bg-sage-500 text-white dark:text-canvas"
                      : state === "active"
                        ? "animate-breathe border-plum-400 bg-plum-100 text-plum-600"
                        : "border-line text-ink-subtle"
                  }`}
                >
                  {state === "done" ? <Check className="size-3.5" /> : n}
                </span>
                <span
                  className={`text-base transition-colors ${
                    state === "todo" ? "text-ink-subtle" : "font-medium text-ink"
                  }`}
                >
                  {label}
                  {state === "done" && <span className="sr-only"> (done)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-2" aria-hidden="true">
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

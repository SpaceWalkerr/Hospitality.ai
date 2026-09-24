"use client";

import { CapMeter } from "./CapMeter";
import { Button, Expander, Pill } from "./ui";
import { Check } from "./ui/Icons";
import { coPayIsConditional, inr } from "@/lib/services/matchingEngine";
import type { HospitalMatch, NormalizedPolicy } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  multi_specialty: "Multi-speciality",
  super_specialty: "Super-speciality",
  government: "Government",
  trust: "Trust-run",
};

/**
 * One hospital, built around the number people actually decide on: what
 * they would pay. Everything else — the room against the cap, the split of
 * the bill, the scoring — supports that number and sits one level down.
 */
export function HospitalCard({
  match,
  rank,
  policy,
  chosen,
  onChoose,
}: {
  match: HospitalMatch;
  rank: number;
  policy: NormalizedPolicy;
  chosen: boolean;
  onChoose: () => void;
}) {
  const { hospital: h, estimate, bestRoom } = match;
  const cap =
    bestRoom && ["ICU", "HDU"].includes(bestRoom.room.category)
      ? policy.roomEligibility.resolvedIcuDailyCap
      : policy.roomEligibility.resolvedDailyCap;

  const total = estimate ? estimate.policyPays + estimate.patientPays : 0;
  const policyShare = total ? (estimate!.policyPays / total) * 100 : 0;
  const titleId = `hospital-${h.id}`;

  return (
    <article
      aria-labelledby={titleId}
      className={`card overflow-hidden transition-[border-color,box-shadow] duration-300 ${
        chosen ? "border-plum-300 shadow-[var(--shadow-md)] ring-2 ring-accent/15" : ""
      }`}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-6">
        <div className="flex min-w-0 flex-1 gap-3.5">
          <span
            className={`figure grid size-10 shrink-0 place-items-center rounded-full text-sm ${
              rank === 1 ? "bg-accent text-accent-fg" : "bg-surface-sunk text-ink-muted"
            }`}
            aria-label={`Rank ${rank}`}
          >
            {String(rank).padStart(2, "0")}
          </span>

          <div className="min-w-0">
            <h3 id={titleId} className="font-display text-xl text-ink sm:text-2xl">
              {h.name}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-muted">
              <span>{h.area}</span>
              <span aria-hidden="true" className="text-line-strong">·</span>
              <span className="figure font-normal">{match.distanceKm} km</span>
              <span aria-hidden="true" className="text-line-strong">·</span>
              <span>{TYPE_LABEL[h.type]}</span>
              <span aria-hidden="true" className="text-line-strong">·</span>
              <span className="figure font-normal">
                {h.rating.toFixed(1)}
                <span aria-hidden="true">★</span>
                <span className="sr-only"> out of 5</span>
              </span>
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {match.inNetwork ? (
                <Pill tone="sage">{match.cashless ? "In network · cashless" : "In network"}</Pill>
              ) : (
                <Pill tone={policy.reimbursement.outOfNetworkAllowed ? "ochre" : "clay"}>
                  {policy.reimbursement.outOfNetworkAllowed ? "Out of network" : "Not payable here"}
                </Pill>
              )}
              {match.specialtyMatch && <Pill tone="plum">Treats this</Pill>}
              {h.emergency24x7 && <Pill>24×7 emergency</Pill>}
              {h.accreditation[0] && <Pill>{h.accreditation[0]}</Pill>}
              {h.schemes.includes("PM-JAY") && <Pill tone="sage">PM-JAY</Pill>}
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-line pt-4 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0 sm:text-right">
          {estimate && (
            <div>
              <div className="label">You’d pay</div>
              <div
                className={`figure mt-1 text-[28px] leading-none ${
                  estimate.patientPays > 0 ? "text-ink" : "text-sage-700"
                }`}
              >
                {inr(estimate.patientPays)}
              </div>
            </div>
          )}
          <Button
            size="sm"
            variant={chosen ? "soft" : "secondary"}
            aria-pressed={chosen}
            onClick={onChoose}
          >
            {chosen && <Check className="size-3.5" />}
            {chosen ? "Selected" : "Choose"}
            <span className="sr-only"> {h.name}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 border-t border-line p-4 sm:p-6 lg:grid-cols-2">
        <div>
          <div className="label">Best room for your cover</div>
          {bestRoom ? (
            <div className="mt-3">
              <CapMeter rate={bestRoom.room.ratePerDay} cap={cap} label={bestRoom.room.category} />
              <p
                className={`mt-2.5 text-sm ${
                  bestRoom.status === "covered"
                    ? "text-sage-700"
                    : bestRoom.status === "partial"
                      ? "text-ochre-700"
                      : "text-clay-600"
                }`}
              >
                {bestRoom.note}
              </p>
              <p className="mt-1.5 text-xs text-ink-subtle">
                {bestRoom.room.bedsAvailable > 0
                  ? `${bestRoom.room.bedsAvailable} beds free right now`
                  : "No beds free in this category"}
                {bestRoom.room.amenities.length > 0 &&
                  ` · ${bestRoom.room.amenities.slice(0, 2).join(", ")}`}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">No room categories listed for this facility.</p>
          )}
        </div>

        {estimate && (
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <div className="label">Estimated {estimate.days}-day bill</div>
              <span className="figure text-xs text-ink-subtle">{inr(total)} total</span>
            </div>

            {/* Part-to-whole, two segments, 2px surface gap between them. */}
            <div
              className="mt-3 flex h-[22px] overflow-hidden rounded-[6px] bg-surface-sunk"
              role="img"
              aria-label={`Policy pays ${inr(estimate.policyPays)}, you pay ${inr(estimate.patientPays)}`}
            >
              <div
                className="rounded-[5px] bg-viz-good transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${policyShare}%` }}
              />
              {policyShare < 99.5 && <span className="w-[2px] shrink-0 bg-surface" />}
              <div
                className="flex-1 rounded-[5px]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(115deg, var(--color-viz-bad) 0 3px, var(--color-viz-bad-wash) 3px 8px)",
                }}
              />
            </div>

            <div className="mt-2.5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-ink-subtle">
                  <span className="size-2 rounded-[3px] bg-viz-good" /> Policy pays
                </div>
                <div className="figure mt-1 text-xl leading-none text-ink">
                  {inr(estimate.policyPays)}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 text-xs text-ink-subtle">
                  <span className="size-2 rounded-[3px] bg-viz-bad" /> You pay
                </div>
                <div
                  className={`figure mt-1 text-xl leading-none ${
                    estimate.patientPays > 0 ? "text-clay-600" : "text-sage-700"
                  }`}
                >
                  {inr(estimate.patientPays)}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <Expander label="What makes up your share" openLabel="Hide the breakdown">
                <dl className="mt-2.5 space-y-1.5 text-sm">
                  <Row label="Room above your limit" value={estimate.overCapRoomAmount} />
                  <Row label="Consumables & non-medical items" value={estimate.nonPayableItems} />
                  <Row label="Above the procedure sub-limit" value={estimate.subLimitShortfall} />
                  <Row label="Proportionate deduction" value={estimate.proportionateShortfall} />
                  <Row label="Co-payment" value={estimate.coPayAmount} />
                  <Row label="Deductible" value={estimate.deductibleAmount} />
                  <Row label="Out-of-network share" value={estimate.outOfNetworkShortfall} />
                  {policy.coPay && coPayIsConditional(policy.coPay.appliesTo) && (
                    <div className="pt-1 text-xs text-ink-subtle">
                      A {policy.coPay.percent}% co-payment applies to{" "}
                      {policy.coPay.appliesTo.toLowerCase()}. It is left out of
                      this estimate because the document makes it conditional
                      — add it if it applies to this patient.
                    </div>
                  )}
                  {estimate.exceedsSumInsured && (
                    <div className="pt-1 text-xs text-clay-600">
                      The admissible amount runs past your sum insured — the
                      excess is on you.
                    </div>
                  )}
                </dl>
              </Expander>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-line bg-canvas/60 px-4 py-4 sm:px-6">
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {match.tradeOffs.map((t, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className={`mt-[7px] size-1.5 shrink-0 rounded-full ${
                  t.kind === "plus" ? "bg-sage-500" : "bg-clay-500"
                }`}
                aria-hidden="true"
              />
              <span className="text-sm text-ink-muted">
                <span className="sr-only">{t.kind === "plus" ? "Advantage: " : "Trade-off: "}</span>
                {t.text}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <Expander label="All room categories" openLabel="Hide rooms">
            <div className="scroll-x mt-3">
              <table className="w-full min-w-[440px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="label py-1.5 pr-3">Category</th>
                    <th scope="col" className="label py-1.5 pr-3 text-right">Rate/day</th>
                    <th scope="col" className="label py-1.5 pr-3">Under your cover</th>
                    <th scope="col" className="label py-1.5 text-right">Beds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {match.roomFits.map((f) => (
                    <tr key={f.room.category}>
                      <th scope="row" className="py-2 pr-3 font-medium text-ink">
                        {f.room.category}
                      </th>
                      <td className="figure py-2 pr-3 text-right font-normal text-ink-muted">
                        {inr(f.room.ratePerDay)}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            f.status === "covered"
                              ? "text-sage-700"
                              : f.status === "partial"
                                ? "text-ochre-700"
                                : "text-clay-600"
                          }
                        >
                          {f.status === "covered"
                            ? "Fully covered"
                            : f.status === "partial"
                              ? `You add ${inr(f.patientPaysPerDay)}/day`
                              : "Not covered"}
                        </span>
                      </td>
                      <td className="figure py-2 text-right font-normal text-ink-subtle">
                        {f.room.bedsAvailable}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Expander>

          <Expander label="Why this rank" openLabel="Hide the scoring">
            <ul className="mt-3 space-y-1">
              {match.scoreBreakdown.map((b, i) => (
                <li key={i} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-ink-muted">{b.label}</span>
                  <span
                    className={`figure ${
                      b.points > 0 ? "text-sage-700" : b.points < 0 ? "text-clay-600" : "text-ink-subtle"
                    }`}
                  >
                    {b.points > 0 ? "+" : ""}
                    {b.points}
                  </span>
                </li>
              ))}
              <li className="mt-1 flex items-center justify-between gap-4 border-t border-line pt-1.5 text-sm font-semibold">
                <span className="text-ink">Total</span>
                <span className="figure text-ink">{match.score}</span>
              </li>
            </ul>
            <p className="mt-2.5 text-xs text-ink-subtle">
              Scoring is a fixed formula over your policy terms, distance and
              hospital data — not a model judgement. It weighs coverage and
              cost, never clinical quality.
            </p>
          </Expander>
        </div>
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="figure text-clay-600">{inr(value)}</dd>
    </div>
  );
}

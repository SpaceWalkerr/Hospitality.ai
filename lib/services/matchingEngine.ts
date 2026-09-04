import type {
  CaseContext,
  SubLimit,
  CostEstimate,
  Hospital,
  HospitalMatch,
  NormalizedPolicy,
  Room,
  RoomCategory,
  RoomFit,
  TradeOff,
} from "@/lib/types";
import { getLocality, listHospitals } from "@/lib/data/hospitals";
import { MODEL, SAFETY_PREAMBLE, getClient } from "./anthropic";

/**
 * Hospital & Room Matching Engine.
 *
 * All money and ranking is computed deterministically here — an LLM is not
 * asked to do arithmetic on somebody's hospital bill. The model's job in this
 * component is narration only: explaining, in the patient's language, why the
 * ordering came out the way it did.
 */

const ROOM_RANK: Record<RoomCategory, number> = {
  "General Ward": 0,
  "Twin Sharing": 1,
  "Single Private": 2,
  Deluxe: 3,
  Suite: 4,
  HDU: 90,
  ICU: 91,
};

const CRITICAL: RoomCategory[] = ["ICU", "HDU"];

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/**
 * A co-payment that applies only above a certain age is left out of the
 * estimate and surfaced as a condition instead — quietly charging a 38-year-old
 * a senior-citizen co-pay would make every number wrong.
 *
 * The wording has to actually restrict it. "regardless of age" mentions age but
 * imposes no condition, and treating that as conditional understates what the
 * patient owes, which is the more damaging direction to be wrong in.
 */
export function coPayIsConditional(appliesTo: string): boolean {
  const t = appliesTo.toLowerCase();
  if (/senior citizen/.test(t)) return true;
  const namesAnAgeThreshold = /\b(5[5-9]|6\d|7\d|8\d)\b/.test(t);
  if (!namesAnAgeThreshold) return false;
  return !/\b(regardless|irrespective)\b/.test(t);
}

export function fitRoom(policy: NormalizedPolicy, room: Room): RoomFit {
  const re = policy.roomEligibility;
  const critical = CRITICAL.includes(room.category);
  const mode = critical ? re.icuCapMode : re.capMode;
  const cap = critical ? re.resolvedIcuDailyCap : re.resolvedDailyCap;
  const rate = room.ratePerDay;

  const full = (note: string): RoomFit => ({
    room,
    status: "covered",
    policyPaysPerDay: rate,
    patientPaysPerDay: 0,
    associatedChargeFactor: 1,
    note,
  });

  if (mode === "no_limit") {
    return full("No room rent limit under this policy.");
  }

  if (mode === "category_capped") {
    if (critical) {
      return full("Critical care is included in the scheme package rate.");
    }
    if (ROOM_RANK[room.category] <= ROOM_RANK[re.eligibleCategory]) {
      return full(`Included — this is at or below your ${re.eligibleCategory} entitlement.`);
    }
    return {
      room,
      status: "excluded",
      policyPaysPerDay: 0,
      patientPaysPerDay: rate,
      associatedChargeFactor: 1,
      note: `Above your ${re.eligibleCategory} entitlement. The scheme pays nothing towards this room and you pay the full rate.`,
    };
  }

  if (cap == null) {
    return full("No explicit cap found for this room type in the document.");
  }

  if (rate <= cap) {
    return full(`Within your ${inr(cap)}/day limit.`);
  }

  const factor = re.proportionateDeduction ? cap / rate : 1;
  return {
    room,
    status: "partial",
    policyPaysPerDay: cap,
    patientPaysPerDay: rate - cap,
    associatedChargeFactor: factor,
    note: re.proportionateDeduction
      ? `Over your ${inr(cap)}/day limit. Because proportionate deduction applies, the policy also scales every associated charge to ${Math.round(factor * 100)}%.`
      : `Over your ${inr(cap)}/day limit. You pay the ${inr(rate - cap)}/day difference, but other charges are not scaled down.`,
  };
}

export function estimateStay(
  policy: NormalizedPolicy,
  hospital: Hospital,
  fit: RoomFit,
  ctx: CaseContext,
  inNetwork: boolean,
): CostEstimate {
  const days = Math.max(1, ctx.expectedDays);
  const roomTotal = fit.room.ratePerDay * days;
  const policyRoom = fit.policyPaysPerDay * days;
  const overCapRoomAmount = fit.patientPaysPerDay * days;

  const associatedTotal = ctx.procedureCost;
  // Consumables, PPE and attendant charges are struck off every bill that a
  // policy excludes them from. Package-rate schemes that fold them in are left
  // alone, so this only fires when the extraction actually found the exclusion.
  const nonPayableItems = excludesConsumables(policy)
    ? Math.round(associatedTotal * NON_PAYABLE_SHARE)
    : 0;
  const payableAssociated = associatedTotal - nonPayableItems;

  // A procedure-specific sub-limit is a hard ceiling that bites long before the
  // sum insured does — a 2 lakh joint-replacement cap on a 3.4 lakh package
  // leaves the difference with the patient however much cover is left.
  const subLimit = findSubLimit(policy, ctx.condition);
  const cappedAssociated =
    subLimit?.amount != null
      ? Math.min(payableAssociated, subLimit.amount)
      : payableAssociated;
  const subLimitShortfall = payableAssociated - cappedAssociated;

  const admissibleAssociated = Math.round(
    cappedAssociated * fit.associatedChargeFactor,
  );
  const proportionateShortfall = cappedAssociated - admissibleAssociated;

  const admissible = policyRoom + admissibleAssociated;

  const deductibleAmount = Math.min(policy.deductible?.amount ?? 0, admissible);
  const afterDeductible = admissible - deductibleAmount;

  const coPayPct =
    policy.coPay && !coPayIsConditional(policy.coPay.appliesTo)
      ? policy.coPay.percent
      : 0;
  const coPayAmount = Math.round((afterDeductible * coPayPct) / 100);
  const afterCoPay = afterDeductible - coPayAmount;

  let outOfNetworkShortfall = 0;
  let policyPays = afterCoPay;
  if (!inNetwork) {
    if (!policy.reimbursement.outOfNetworkAllowed) {
      outOfNetworkShortfall = afterCoPay;
      policyPays = 0;
    } else {
      const pct = policy.reimbursement.payablePercent ?? 100;
      outOfNetworkShortfall = Math.round((afterCoPay * (100 - pct)) / 100);
      policyPays = afterCoPay - outOfNetworkShortfall;
    }
  }

  const exceedsSumInsured = policyPays > policy.sumInsured.amount;
  if (exceedsSumInsured) policyPays = policy.sumInsured.amount;

  const totalBill = roomTotal + associatedTotal;

  return {
    days,
    roomTotal,
    associatedTotal,
    admissible,
    coPayAmount,
    deductibleAmount,
    overCapRoomAmount,
    nonPayableItems,
    subLimitShortfall,
    proportionateShortfall,
    outOfNetworkShortfall,
    policyPays,
    patientPays: Math.max(0, totalBill - policyPays),
    exceedsSumInsured,
  };
}

/**
 * Share of a hospital bill that is typically non-medical consumables — gloves,
 * PPE, admission kits, attendant charges. IRDAI publishes these as a standard
 * exclusion list, and they are the most common surprise on a discharge bill.
 */
const NON_PAYABLE_SHARE = 0.04;

/**
 * Finds the sub-limit that governs a given procedure, if the policy has one.
 * Matching is intentionally narrow: a wrong match here understates what the
 * policy will pay, which is worse than reporting no cap at all.
 */
export function findSubLimit(
  policy: NormalizedPolicy,
  condition: string,
): SubLimit | undefined {
  const c = condition.toLowerCase();
  return policy.subLimits.find((s) => {
    const i = s.item.toLowerCase();
    if (/knee|hip|joint/.test(c) && /joint|knee|hip/.test(i)) return true;
    if (/cataract/.test(c) && /cataract/.test(i)) return true;
    if (/caesarean|delivery/.test(c) && /maternity|delivery/.test(i)) return true;
    if (/mental|psychiat/.test(c) && /mental/.test(i)) return true;
    return false;
  });
}

function excludesConsumables(policy: NormalizedPolicy): boolean {
  return policy.exclusions.some((e) =>
    /consumable|non-medical|non medical|ppe/i.test(`${e.item} ${e.detail}`),
  );
}

/**
 * Package price at this hospital for the case's procedure.
 *
 * Government schemes reimburse the hospital at a published package rate rather
 * than at its list tariff, so where the hospital carries a scheme rate that is
 * the number the claim actually turns on.
 */
function procedureCostAt(
  hospital: Hospital,
  ctx: CaseContext,
  policy: NormalizedPolicy,
): number {
  const pkg = hospital.packages.find(
    (p) => p.procedure.toLowerCase() === ctx.condition.toLowerCase(),
  );
  if (!pkg) return ctx.procedureCost;
  if (policy.kind === "government" && pkg.schemeRate != null) return pkg.schemeRate;
  return pkg.estCost;
}

/**
 * Picks the room to headline for a hospital: the best-covered room the patient
 * can actually get a bed in, preferring full coverage over a nicer room.
 */
function chooseBestRoom(fits: RoomFit[]): RoomFit | null {
  const available = fits.filter(
    (f) => f.room.bedsAvailable > 0 && !CRITICAL.includes(f.room.category),
  );
  const pool = available.length ? available : fits.filter((f) => !CRITICAL.includes(f.room.category));
  if (!pool.length) return null;

  const covered = pool.filter((f) => f.status === "covered");
  if (covered.length) {
    // Best comfort among fully covered rooms.
    return covered.sort(
      (a, b) => ROOM_RANK[b.room.category] - ROOM_RANK[a.room.category],
    )[0];
  }
  // Nothing fully covered — the cheapest partial exposure.
  return pool.sort((a, b) => a.patientPaysPerDay - b.patientPaysPerDay)[0];
}

export function rankHospitals(
  policy: NormalizedPolicy,
  ctx: CaseContext,
): HospitalMatch[] {
  const origin = getLocality(ctx.localityId).coords;
  const specialty = specialtyForCondition(ctx.condition);

  const preliminary = listHospitals().map((hospital) => {
    const emp = hospital.empanelment[policy.insurerId];
    const inNetwork = emp?.inNetwork ?? false;
    const cashless = emp?.cashless ?? false;
    const distanceKm = haversineKm(origin, hospital.coords);
    const specialtyMatch = specialty
      ? hospital.specialties.includes(specialty)
      : true;

    const caseAtHospital: CaseContext = {
      ...ctx,
      procedureCost: procedureCostAt(hospital, ctx, policy),
    };

    const roomFits = hospital.rooms.map((r) => fitRoom(policy, r));
    const bestRoom = chooseBestRoom(roomFits);
    const estimate = bestRoom
      ? estimateStay(policy, hospital, bestRoom, caseAtHospital, inNetwork)
      : null;

    return {
      hospital,
      distanceKm,
      inNetwork,
      cashless,
      specialtyMatch,
      roomFits,
      bestRoom,
      estimate,
    };
  });

  const outOfPocket = preliminary
    .map((p) => p.estimate?.patientPays ?? 0)
    .filter((n) => n > 0);
  const maxOop = Math.max(1, ...outOfPocket);

  const matches: HospitalMatch[] = preliminary.map((p) => {
    const breakdown: { label: string; points: number }[] = [];

    if (p.inNetwork && p.cashless) {
      breakdown.push({ label: "In network, cashless available", points: 40 });
    } else if (p.inNetwork) {
      breakdown.push({ label: "In network, reimbursement only", points: 25 });
    } else if (policy.reimbursement.outOfNetworkAllowed) {
      breakdown.push({ label: "Out of network, partly reimbursable", points: 8 });
    } else {
      breakdown.push({ label: "Out of network, not payable", points: 0 });
    }

    if (specialty) {
      // A hospital that does not list the relevant specialty is penalised, not
      // merely unrewarded — being in network is no help if they cannot treat it.
      breakdown.push(
        p.specialtyMatch
          ? { label: `Treats ${specialty}`, points: 18 }
          : { label: `Does not list ${specialty}`, points: -22 },
      );
    }

    const oop = p.estimate?.patientPays ?? maxOop;
    const affordability = Math.round(28 * (1 - Math.min(oop, maxOop) / maxOop));
    breakdown.push({ label: "Lower money out of your pocket", points: affordability });

    const proximity = Math.round(12 * (1 - Math.min(p.distanceKm, 25) / 25));
    breakdown.push({ label: `${p.distanceKm} km away`, points: proximity });

    if (ctx.urgency === "emergency" && !p.hospital.emergency24x7) {
      breakdown.push({ label: "No 24x7 emergency department", points: -30 });
    }

    const waitPenalty = -Math.min(8, Math.round(p.hospital.admissionWaitHours * 1.6));
    if (waitPenalty < 0) {
      breakdown.push({
        label: `~${p.hospital.admissionWaitHours}h typical admission wait`,
        points: waitPenalty,
      });
    }

    const quality = Math.round(6 * Math.max(0, (p.hospital.rating - 3.4) / 1.3));
    breakdown.push({ label: `Rated ${p.hospital.rating.toFixed(1)}`, points: quality });

    if (p.bestRoom && p.bestRoom.room.bedsAvailable === 0) {
      breakdown.push({ label: "No beds free in that category", points: -15 });
    }

    const score = breakdown.reduce((s, b) => s + b.points, 0);

    return {
      ...p,
      score,
      scoreBreakdown: breakdown,
      tradeOffs: buildTradeOffs(policy, p, specialty),
    };
  });

  return matches.sort((a, b) => b.score - a.score);
}

function buildTradeOffs(
  policy: NormalizedPolicy,
  p: {
    hospital: Hospital;
    distanceKm: number;
    inNetwork: boolean;
    cashless: boolean;
    specialtyMatch: boolean;
    bestRoom: RoomFit | null;
    estimate: CostEstimate | null;
  },
  specialty: string | null,
): TradeOff[] {
  const out: TradeOff[] = [];

  if (p.inNetwork && p.cashless) {
    out.push({
      kind: "plus",
      text: "Cashless — you should not need to arrange money up front.",
    });
  } else if (!p.inNetwork && !policy.reimbursement.outOfNetworkAllowed) {
    out.push({
      kind: "minus",
      text: "Not empanelled. Under this cover nothing here is payable, even in an emergency.",
    });
  } else if (!p.inNetwork) {
    const pct = policy.reimbursement.payablePercent ?? 100;
    out.push({
      kind: "minus",
      text: `Out of network — you pay the hospital and claim back, at ${pct}% of the admissible amount.`,
    });
  }

  if (p.distanceKm <= 6) {
    out.push({ kind: "plus", text: `Close by — ${p.distanceKm} km.` });
  } else if (p.distanceKm >= 14) {
    out.push({ kind: "minus", text: `${p.distanceKm} km away, which matters in traffic.` });
  }

  if (specialty && !p.specialtyMatch) {
    out.push({
      kind: "minus",
      text: `Does not list ${specialty} among its specialties.`,
    });
  } else if (specialty && p.hospital.type === "super_specialty") {
    out.push({ kind: "plus", text: `Super-speciality centre for ${specialty}.` });
  }

  if (p.bestRoom) {
    if (p.bestRoom.status === "covered") {
      out.push({
        kind: "plus",
        text: `${p.bestRoom.room.category} at ${inr(p.bestRoom.room.ratePerDay)}/day is fully within your room limit.`,
      });
    } else if (p.bestRoom.status === "partial") {
      out.push({
        kind: "minus",
        text: `Cheapest room still exceeds your limit by ${inr(p.bestRoom.patientPaysPerDay)}/day.`,
      });
    } else {
      out.push({
        kind: "minus",
        text: "Every room here sits above what your cover entitles you to.",
      });
    }
  }

  if (p.estimate && p.estimate.subLimitShortfall > 0) {
    out.push({
      kind: "minus",
      text: `A procedure sub-limit caps what is admissible — about ${inr(p.estimate.subLimitShortfall)} falls outside it.`,
    });
  }

  if (p.estimate && p.estimate.proportionateShortfall > 0) {
    out.push({
      kind: "minus",
      text: `Proportionate deduction would remove about ${inr(p.estimate.proportionateShortfall)} from the admissible amount.`,
    });
  }

  if (p.hospital.emergency24x7) {
    out.push({ kind: "plus", text: "24x7 emergency department." });
  } else {
    out.push({ kind: "minus", text: "No round-the-clock emergency cover." });
  }

  if (p.estimate?.exceedsSumInsured) {
    out.push({
      kind: "minus",
      text: "Estimated admissible amount runs past your sum insured.",
    });
  }

  return out;
}

function specialtyForCondition(condition: string): string | null {
  const c = condition.toLowerCase();
  if (/angio|cabg|cardiac|stent|pacemaker|coronary/.test(c)) return "Cardiology";
  if (/stroke|thrombo|cranio|neuro/.test(c)) return "Neurology";
  if (/knee|hip|spine|fracture|arthro/.test(c)) return "Orthopaedics";
  if (/caesarean|delivery|hysterect/.test(c)) return "Obstetrics";
  if (/cataract/.test(c)) return "Ophthalmology";
  if (/append|gall|hernia/.test(c)) return "General Surgery";
  if (/dialysis/.test(c)) return "Nephrology";
  return null;
}

export function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/* ---------------- Narrated comparison (streamed) ---------------- */

const COMPARE_SYSTEM = `${SAFETY_PREAMBLE}

TASK: The ranking below was produced by a deterministic engine from the person's policy. Explain the top options to them in plain language.

FORMAT:
- 3 short paragraphs, no headings, no bullets, no markdown.
- Paragraph 1: which option the numbers favour and why, in rupee terms.
- Paragraph 2: the most meaningful trade-off against the runner-up — name both hospitals.
- Paragraph 3: what would change the answer (e.g. if a bed is not free, if the stay runs longer), and one sentence telling them to confirm empanelment and the room rate with the hospital's insurance desk before admission.
- Never recommend a hospital on clinical grounds. You are comparing cost and coverage only; say so if the choice looks clinically consequential.
- Under 180 words. Do not invent numbers.`;

export async function streamComparison(
  policy: NormalizedPolicy,
  matches: HospitalMatch[],
  ctx: CaseContext,
  onDelta: (text: string) => void,
): Promise<void> {
  const client = getClient();
  const top = matches.slice(0, 4).map((m) => ({
    hospital: m.hospital.name,
    area: m.hospital.area,
    distanceKm: m.distanceKm,
    inNetwork: m.inNetwork,
    cashless: m.cashless,
    room: m.bestRoom?.room.category,
    roomRatePerDay: m.bestRoom?.room.ratePerDay,
    roomStatus: m.bestRoom?.status,
    estimatedPatientPays: m.estimate?.patientPays,
    estimatedPolicyPays: m.estimate?.policyPays,
    tradeOffs: m.tradeOffs.map((t) => t.text),
  }));

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low" },
    system: COMPARE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `<case>\ncondition: ${ctx.condition}\nurgency: ${ctx.urgency}\nexpected stay: ${ctx.expectedDays} days\nstarting from: ${getLocality(ctx.localityId).label}\n</case>

<cover>
insurer: ${policy.insurer}
sum insured: ${inr(policy.sumInsured.amount)}
room limit: ${policy.roomEligibility.resolvedDailyCap ? `${inr(policy.roomEligibility.resolvedDailyCap)}/day` : policy.roomEligibility.capMode}
proportionate deduction: ${policy.roomEligibility.proportionateDeduction}
out of network: ${policy.reimbursement.outOfNetworkAllowed ? `${policy.reimbursement.payablePercent}% payable` : "not payable"}
</cover>

<ranking>
${JSON.stringify(top, null, 2)}
</ranking>`,
      },
    ],
  });

  stream.on("text", onDelta);
  await stream.finalMessage();
}

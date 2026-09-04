import type {
  CaseContext,
  Citation,
  GuidanceItem,
  HospitalMatch,
  JourneyStage,
  NormalizedPolicy,
  PolicySummaryPoint,
  StageGuidance,
} from "@/lib/types";
import { indexDocument, verifyQuote } from "./anthropic";
import { getSamplePolicy } from "@/lib/data/samplePolicies";
import { coPayIsConditional, findSubLimit, inr } from "./matchingEngine";

/**
 * Demo Mode.
 *
 * With no ANTHROPIC_API_KEY present the app still runs end to end, on
 * pre-authored extractions of the three sample policies. This exists so the
 * prototype can be demonstrated offline, and so a reviewer without a key can
 * still see every screen.
 *
 * Two honest constraints, both surfaced in the UI:
 *  - Demo Mode cannot parse a pasted or uploaded document. It says so.
 *  - Citations here are authored, not model-generated — but they are verified
 *    against the source text by the same routine used on live output, so the
 *    line numbers and the "verified" badge mean exactly what they mean live.
 */

type Cite = { clause: string; quote: string };

/** Resolves an authored citation's line numbers against the real document. */
function cite(docText: string, c: Cite): Citation {
  const doc = indexDocument(docText);
  const v = verifyQuote(doc, c.quote);
  return {
    clause: c.clause,
    quote: c.quote,
    lineStart: v.resolvedLineStart ?? 0,
    lineEnd: v.resolvedLineEnd ?? 0,
    ...v,
  };
}

type DemoBundle = {
  policy: NormalizedPolicy;
  summaryPoints: PolicySummaryPoint[];
  brief: string;
};

function meridian(text: string): DemoBundle {
  const c = (clause: string, quote: string) => cite(text, { clause, quote });
  const policy: NormalizedPolicy = {
    insurer: "Meridian Health Insurance Company Limited",
    insurerId: "meridian",
    planName: "Sampoorna Suraksha — Family Floater",
    policyNumber: "MHI/BLR/2025/0084412",
    kind: "private",
    policyHolder: "Ananya Ravindran",
    validFrom: "2025-03-14",
    validTo: "2026-03-13",
    sumInsured: {
      amount: 500000,
      basis: "Family floater — shared across all four insured members in one policy year",
      citation: c(
        "Policy Schedule",
        "SUM INSURED: Rs. 5,00,000 (Rupees Five Lakh only) on a FAMILY FLOATER basis",
      ),
    },
    roomEligibility: {
      eligibleCategory: "Single Private",
      capMode: "percent_of_sum_insured_per_day",
      capValue: 1,
      resolvedDailyCap: 5000,
      icuCapMode: "percent_of_sum_insured_per_day",
      icuCapValue: 2,
      resolvedIcuDailyCap: 10000,
      proportionateDeduction: true,
      notes:
        "You may occupy a Single Private A/C room, but the rent must stay within ₹5,000 a day. Go above it and the policy scales down every associated charge in the same ratio.",
      citation: c(
        "1.2",
        "Room, Boarding and Nursing Expenses are payable up to 1% (one percent) of the Sum Insured per day",
      ),
    },
    coPay: {
      percent: 10,
      appliesTo: "Insured persons aged 61 or above on the date of admission",
      citation: c(
        "2.5",
        "A co-payment of 10% (ten percent) of each and every admissible claim shall be borne by the Insured Person where the claim relates to an Insured Person who has completed 61 years of age on the date of admission",
      ),
    },
    deductible: null,
    preAuthorization: {
      required: true,
      plannedNoticeHours: 48,
      emergencyNoticeHours: 24,
      notes:
        "Cashless is arranged by the hospital with the TPA, MedAssist. Planned admissions need 48 hours' notice; emergencies must be intimated within 24 hours of admission.",
      citation: c(
        "5.2",
        "the pre-authorisation request must reach the TPA at least 48 hours before the proposed date of admission",
      ),
    },
    reimbursement: {
      outOfNetworkAllowed: true,
      payablePercent: 80,
      claimWindowDays: 30,
      notes:
        "You can use a non-network hospital, but you pay the bill and claim back only 80% of what the policy admits.",
      citation: c(
        "5.4",
        "Such claims are payable at 80% (eighty percent) of the admissible amount, the balance 20% being borne by the Insured Person",
      ),
    },
    preHospitalizationDays: 60,
    postHospitalizationDays: 90,
    subLimits: [
      {
        item: "Joint replacement (knee or hip)",
        limit: "₹2,00,000 per joint, implant included",
        amount: 200000,
        citation: c(
          "2.4",
          "Joint replacement (knee or hip) is limited to Rs. 2,00,000 per joint, inclusive of the cost of the implant",
        ),
      },
      {
        item: "Cataract surgery",
        limit: "₹40,000 per eye, ₹80,000 a year",
        amount: 40000,
        citation: c(
          "2.1",
          "Cataract surgery is limited to Rs. 40,000 per eye and Rs. 80,000 per Policy Year in aggregate",
        ),
      },
      {
        item: "Modern treatment methods",
        limit: "50% of sum insured a year",
        amount: 250000,
        citation: c(
          "2.2",
          "are limited in aggregate to 50% of the Sum Insured per Policy Year",
        ),
      },
      {
        item: "Road ambulance",
        limit: "₹3,000 per hospitalisation",
        amount: 3000,
        citation: c(
          "1.8",
          "Road Ambulance charges are payable up to Rs. 3,000 per Hospitalisation event",
        ),
      },
      {
        item: "Maternity",
        limit: "₹50,000 normal, ₹75,000 caesarean, after 36 months",
        amount: 50000,
        citation: c(
          "3.4",
          "limited to Rs. 50,000 for normal delivery and Rs. 75,000 for caesarean section",
        ),
      },
    ],
    exclusions: [
      {
        item: "Pre-existing diabetes",
        detail:
          "Type 2 diabetes was declared at proposal. Anything attributable to it is not payable until 13 March 2028.",
        kind: "waiting_period",
        waitingMonths: 36,
        citation: c(
          "3.3",
          "covered after a continuous waiting period of 36 months from the first inception of the Policy",
        ),
      },
      {
        item: "Listed conditions — cataract, hernia, piles, gall stones",
        detail: "A 24-month waiting period applies to this list of conditions.",
        kind: "waiting_period",
        waitingMonths: 24,
        citation: c(
          "3.2",
          "Specified Illness Waiting Period of 24 months applies to: cataract, benign prostatic hypertrophy, hernia of all types",
        ),
      },
      {
        item: "Illness in the first 30 days",
        detail: "Accidents are covered from day one; illness is not.",
        kind: "waiting_period",
        waitingMonths: 1,
        citation: c(
          "3.1",
          "no claim is payable for any Illness contracted within 30 days of the first inception of this Policy",
        ),
      },
      {
        item: "Consumables and non-medical items",
        detail:
          "Gloves, sanitiser, admission kits, attendant charges, phone and TV are never payable and will appear on your bill.",
        kind: "permanent",
        citation: c(
          "4.6",
          "Non-medical and consumable items listed in Annexure I to this Policy",
        ),
      },
      {
        item: "Treatment outside India",
        detail: "The policy is limited to treatment within India.",
        kind: "permanent",
        citation: c("4.4", "Treatment taken outside the geographical limits of India"),
      },
      {
        item: "Dental treatment",
        detail: "Only covered if caused by an injury requiring hospitalisation.",
        kind: "permanent",
        citation: c(
          "4.2",
          "Dental treatment or surgery of any kind unless necessitated by Injury and requiring Hospitalisation",
        ),
      },
    ],
    networkHospitals: [
      { name: "Sanjeevani Multispeciality Hospital", city: "Bengaluru", cashless: true },
      { name: "Kaveri Institute of Medical Sciences", city: "Bengaluru", cashless: true },
      { name: "Vasavi Heart and Vascular Centre", city: "Bengaluru", cashless: true },
      { name: "Nandi Hills Super Speciality Hospital", city: "Bengaluru", cashless: true },
      { name: "St. Aloysius Mission Hospital", city: "Bengaluru", cashless: true },
      { name: "Prakruthi Mother and Child Hospital", city: "Bengaluru", cashless: true },
      { name: "Chinmaya General Hospital", city: "Bengaluru", cashless: true },
      { name: "Tarangini Speciality Hospital", city: "Bengaluru", cashless: true },
      { name: "Sirsi Circle Trauma and Emergency Centre", city: "Bengaluru", cashless: true },
    ],
    schemes: [],
    gaps: [
      "The document does not say what happens if the hospital's insurance desk is closed at night.",
      "It does not state a maximum number of days of hospitalisation.",
      "It does not list which specific implants or brands are admissible.",
    ],
    confidence: "high",
  };

  return {
    policy,
    summaryPoints: [
      {
        heading: "₹5 lakh, shared by four people",
        body: "The cover is a family floater, so anything one member claims reduces what is left for the rest of the year. ₹50,000 of cumulative bonus sits on top.",
        tone: "good",
      },
      {
        heading: "Room rent capped at ₹5,000 a day",
        body: "That is 1% of the sum insured. Most private rooms in a large Bengaluru hospital cost more than this.",
        tone: "limit",
      },
      {
        heading: "Proportionate deduction is the real risk",
        body: "Take a ₹10,000 room and the policy pays only half of the surgeon's fee, theatre charges and nursing too — not just half the room. This is where large surprise bills come from.",
        tone: "watch",
      },
      {
        heading: "Out of network pays only 80%",
        body: "Non-network treatment is allowed, but you pay first and get back four-fifths of what the policy admits, with claim papers due within 30 days.",
        tone: "watch",
      },
    ],
    brief: `Your Meridian Sampoorna Suraksha policy carries ₹5,00,000 of cover, shared as a floater across you, your spouse, your child and your mother, valid to 13 March 2026. A ₹50,000 cumulative bonus sits on top of that. Hospitalisation of more than 24 hours is covered up to that amount, along with 60 days of costs before admission and 90 days after.

The constraint that matters tonight is the room. Room rent is payable only up to ₹5,000 a day, and ICU up to ₹10,000 a day. If you take a room above ₹5,000, clause 1.4 scales down every associated charge — surgeon, anaesthetist, theatre, nursing, consultant visits — in the same ratio the eligible rent bears to the rent actually charged. On a ₹10,000 room that halves those charges too, which is usually a far larger number than the room difference itself.

At the desk, ask for the room category that keeps you at or under ₹5,000, give them the policy number MHI/BLR/2025/0084412 and ask them to raise pre-authorisation with MedAssist — 48 hours ahead for a planned admission, within 24 hours for an emergency. Please confirm the current room rate and the hospital's empanelment with MedAssist directly before you rely on any of this.`,
  };
}

function pmjay(text: string): DemoBundle {
  const c = (clause: string, quote: string) => cite(text, { clause, quote });
  const policy: NormalizedPolicy = {
    insurer: "National Health Authority — Ayushman Bharat PM-JAY",
    insurerId: "pmjay",
    planName: "PM-JAY Family Entitlement (Karnataka)",
    policyNumber: "PMJAY-KA-29-0774-13920",
    kind: "government",
    policyHolder: "Mahadeva Naik",
    validFrom: "2025-04-01",
    validTo: "2026-03-31",
    sumInsured: {
      amount: 500000,
      basis: "Per eligible family per year, floater, no cap on family size",
      citation: c(
        "1.1",
        "The scheme provides a health cover of Rs. 5,00,000 (Rupees Five Lakh only) per eligible family per year",
      ),
    },
    roomEligibility: {
      eligibleCategory: "General Ward",
      capMode: "category_capped",
      capValue: null,
      resolvedDailyCap: null,
      icuCapMode: "no_limit",
      icuCapValue: null,
      resolvedIcuDailyCap: null,
      proportionateDeduction: false,
      notes:
        "The entitlement is a general ward bed, with bed charges built into the package rate. Choosing anything above general ward puts the whole room difference on you.",
      citation: c(
        "2.1",
        "The scheme entitles the beneficiary to admission in the GENERAL WARD of an Empanelled Health Care Provider",
      ),
    },
    coPay: null,
    deductible: null,
    preAuthorization: {
      required: true,
      plannedNoticeHours: 6,
      emergencyNoticeHours: 24,
      notes:
        "The Arogya Mitra desk at the hospital raises pre-authorisation for you. Planned cases are usually decided in about 6 hours; emergencies are regularised within 24.",
      citation: c(
        "5.3",
        "Pre-authorisation for a planned admission is ordinarily decided within 6 hours of submission",
      ),
    },
    reimbursement: {
      outOfNetworkAllowed: false,
      payablePercent: 0,
      claimWindowDays: null,
      notes:
        "There is no reimbursement route. If the hospital is not empanelled, the scheme pays nothing — including in an emergency.",
      citation: c(
        "4.1",
        "Treatment at a non-empanelled hospital is NOT covered and is NOT reimbursable under any circumstance, including emergencies",
      ),
    },
    preHospitalizationDays: 3,
    postHospitalizationDays: 15,
    subLimits: [
      {
        item: "All treatment",
        limit: "Paid at HBP 2.2 package rates, all-inclusive",
        citation: c(
          "3.1",
          "Treatment is reimbursed to the hospital at the rates specified in the Health Benefit Package master (HBP 2.2)",
        ),
      },
      {
        item: "Transport allowance",
        limit: "₹1,000 per hospitalisation, paid to you at discharge",
        amount: 1000,
        citation: c(
          "3.5",
          "Transport allowance of Rs. 1,000 per hospitalisation is payable to the beneficiary at the time of discharge",
        ),
      },
    ],
    exclusions: [
      {
        item: "Any non-empanelled hospital",
        detail:
          "The single biggest limitation. Verify empanelment before the ambulance leaves, if there is any choice at all.",
        kind: "permanent",
        citation: c(
          "4.1",
          "The scheme is available ONLY at Empanelled Health Care Providers",
        ),
      },
      {
        item: "Room above general ward",
        detail:
          "If you ask for a private room, the room difference and any resulting tariff difference are entirely yours.",
        kind: "permanent",
        citation: c(
          "2.2",
          "the differential room charges and any consequent difference in tariff shall be borne entirely by the beneficiary and shall not be reimbursed by the scheme",
        ),
      },
      {
        item: "Outpatient treatment",
        detail: "Consultations that do not lead to admission are not covered.",
        kind: "permanent",
        citation: c(
          "4.2",
          "Out-patient department (OPD) consultations and treatment not resulting in hospitalisation are excluded",
        ),
      },
      {
        item: "Fertility, cosmetic and rehab programmes",
        detail: "Excluded from the benefit package.",
        kind: "permanent",
        citation: c(
          "4.3",
          "Drug rehabilitation programmes, cosmetic procedures, fertility treatment and individual diagnostics for evaluation are excluded",
        ),
      },
    ],
    networkHospitals: [
      { name: "Bengaluru Government General Hospital", city: "Bengaluru", cashless: true },
      { name: "Sirsi Circle Trauma and Emergency Centre", city: "Bengaluru", cashless: true },
      { name: "St. Aloysius Mission Hospital", city: "Bengaluru", cashless: true },
      { name: "Tarangini Speciality Hospital", city: "Bengaluru", cashless: true },
      { name: "Sanjeevani Multispeciality Hospital", city: "Bengaluru", cashless: true },
      { name: "Hosahalli Community Health Centre", city: "Bengaluru", cashless: true },
      { name: "Vani Vilas District Hospital Annexe", city: "Bengaluru", cashless: true },
    ],
    schemes: ["PM-JAY", "Arogya Karnataka", "ESI", "CGHS"],
    gaps: [
      "The document does not say what to do if the nearest empanelled hospital has no bed.",
      "It does not list which procedures are outside HBP 2.2.",
      "It does not say how quickly the transport allowance is actually paid.",
    ],
    confidence: "high",
  };

  return {
    policy,
    summaryPoints: [
      {
        heading: "₹5 lakh a year, nothing to pay",
        body: "No premium, no co-payment, no deductible and no waiting period. Pre-existing conditions are covered from day one.",
        tone: "good",
      },
      {
        heading: "Only at empanelled hospitals",
        body: "This is absolute. Treatment anywhere else is not reimbursable under any circumstance, emergencies included.",
        tone: "limit",
      },
      {
        heading: "General ward is the entitlement",
        body: "Bed charges are inside the package rate. Ask for a private room and the entire difference becomes yours to pay.",
        tone: "limit",
      },
      {
        heading: "Nobody should ask you for money",
        body: "The hospital cannot collect a deposit or a top-up for a covered procedure. If they do, the grievance line is 14555.",
        tone: "watch",
      },
    ],
    brief: `Your Ayushman Bharat PM-JAY entitlement gives your family ₹5,00,000 of hospitalisation cover for the year to 31 March 2026, shared across all five members with no cap on family size and no waiting period. There is no premium, no co-payment and no deductible. Pre-existing conditions are covered from the first day, and three days of costs before admission and fifteen days after are already inside the package rate.

The constraint is where you go, not what it costs. Clause 4.1 is absolute: the scheme pays only at empanelled hospitals, and treatment anywhere else is not reimbursable under any circumstance, including emergencies. The second constraint is the ward. Your entitlement is a general ward bed with bed charges built into the package rate; if you ask for a private room, clause 2.2 puts the room difference and any resulting tariff difference entirely on you.

At the hospital, go to the Ayushman Mitra desk with the card and one government photo ID, and let them raise the pre-authorisation. No one should ask you for a deposit or a top-up for a covered procedure — if they do, call 14555. Please confirm the hospital's current empanelment before admission, as the list does change.`,
  };
}

function ridgeway(text: string): DemoBundle {
  const c = (clause: string, quote: string) => cite(text, { clause, quote });
  const policy: NormalizedPolicy = {
    insurer: "Ridgeway General Insurance Company Limited",
    insurerId: "ridgeway",
    planName: "Nexora Technologies Group Mediclaim",
    policyNumber: "RGI/GMC/2025/NEXORA/0031",
    kind: "employer",
    policyHolder: "Farhan Qureshi",
    validFrom: "2025-07-01",
    validTo: "2026-06-30",
    sumInsured: {
      amount: 400000,
      basis: "Per family per policy year, floater, with a discretionary ₹1,00,000 corporate buffer",
      citation: c(
        "Certificate",
        "SUM INSURED: Rs. 4,00,000 per family per policy year, on a floater basis",
      ),
    },
    roomEligibility: {
      eligibleCategory: "Single Private",
      capMode: "absolute_per_day",
      capValue: 6000,
      resolvedDailyCap: 6000,
      icuCapMode: "absolute_per_day",
      icuCapValue: 12000,
      resolvedIcuDailyCap: 12000,
      proportionateDeduction: false,
      notes:
        "₹6,000 a day for the room and ₹12,000 for ICU, as flat amounts rather than a percentage. Crucially, going over only costs you the room difference — nothing else is scaled down.",
      citation: c(
        "1.2",
        "Room, boarding and nursing charges are payable up to Rs. 6,000 per day. This is an absolute limit and is not linked to the Sum Insured",
      ),
    },
    coPay: {
      percent: 10,
      appliesTo: "Every admissible claim, regardless of age, room or hospital",
      citation: c(
        "2.1",
        "A co-payment of 10% (ten percent) of every admissible claim shall be borne by the Insured Person, irrespective of age, room category or hospital",
      ),
    },
    deductible: {
      amount: 10000,
      appliesTo: "Once per policy year, against the first admissible claim",
      citation: c(
        "2.2",
        "an annual aggregate deductible of Rs. 10,000 per family shall apply",
      ),
    },
    preAuthorization: {
      required: true,
      plannedNoticeHours: 72,
      emergencyNoticeHours: 24,
      notes:
        "Planned admissions need the form 72 hours ahead, decided in about 4 working hours. Emergencies get an interim approval for the first 24 hours on intimation.",
      citation: c(
        "6.2",
        "the pre-authorisation form must be submitted at least 72 hours before admission",
      ),
    },
    reimbursement: {
      outOfNetworkAllowed: true,
      payablePercent: 100,
      claimWindowDays: 45,
      notes:
        "Unusually generous — non-network treatment is reimbursed at the full admissible amount, still subject to the room cap and the 10% co-pay.",
      citation: c(
        "7.1",
        "Treatment at a hospital outside the Ridgeway Network is payable on a reimbursement basis at 100% of the admissible amount",
      ),
    },
    preHospitalizationDays: 30,
    postHospitalizationDays: 60,
    subLimits: [
      {
        item: "Knee or hip replacement",
        limit: "₹1,50,000 per joint including implant",
        amount: 150000,
        citation: c("4.2", "Knee or hip replacement: Rs. 1,50,000 per joint including implant"),
      },
      {
        item: "Maternity",
        limit: "₹60,000 normal, ₹85,000 caesarean, 9-month wait",
        amount: 60000,
        citation: c(
          "1.8",
          "Rs. 60,000 for normal delivery and Rs. 85,000 for caesarean section, limited to two events",
        ),
      },
      {
        item: "Cataract surgery",
        limit: "₹35,000 per eye",
        amount: 35000,
        citation: c("4.1", "Cataract surgery: Rs. 35,000 per eye"),
      },
      {
        item: "Mental illness requiring admission",
        limit: "₹1,00,000 a year",
        amount: 100000,
        citation: c(
          "4.3",
          "Treatment of mental illness requiring hospitalisation: Rs. 1,00,000 per policy year",
        ),
      },
      {
        item: "Ambulance",
        limit: "₹2,500 per event",
        amount: 2500,
        citation: c("1.7", "Ambulance charges up to Rs. 2,500 per event"),
      },
    ],
    exclusions: [
      {
        item: "Maternity in the first 9 months",
        detail: "The only waiting period left standing under this group policy.",
        kind: "waiting_period",
        waitingMonths: 9,
        citation: c(
          "3.2",
          "The maternity benefit at Clause 1.8 carries a 9-month waiting period from the date of enrolment",
        ),
      },
      {
        item: "Consumables and PPE",
        detail:
          "Gloves, PPE kits, nebuliser masks and attendant comfort charges are on you, per the IRDAI standard list.",
        kind: "permanent",
        citation: c(
          "5.4",
          "Expenses on non-medical consumables as per the IRDAI standard exclusion list",
        ),
      },
      {
        item: "Fertility treatment and IVF",
        detail: "Excluded entirely.",
        kind: "permanent",
        citation: c("5.3", "Infertility and assisted reproduction, including IVF"),
      },
      {
        item: "Treatment outside India",
        detail: "Not covered.",
        kind: "permanent",
        citation: c("5.6", "Any treatment taken outside India"),
      },
      {
        item: "Dental, unless from an accident",
        detail: "Routine dental work is not payable.",
        kind: "permanent",
        citation: c(
          "5.2",
          "Dental treatment other than that arising from accidental injury",
        ),
      },
    ],
    networkHospitals: [
      { name: "Kaveri Institute of Medical Sciences", city: "Bengaluru", cashless: true },
      { name: "Nandi Hills Super Speciality Hospital", city: "Bengaluru", cashless: true },
      { name: "Chinmaya General Hospital", city: "Bengaluru", cashless: true },
      { name: "Vasavi Heart and Vascular Centre", city: "Bengaluru", cashless: true },
      { name: "Meenakshi Orthopaedic and Spine Institute", city: "Bengaluru", cashless: true },
      { name: "Ashwini Neuro Centre", city: "Bengaluru", cashless: true },
      { name: "Sanjeevani Multispeciality Hospital", city: "Bengaluru", cashless: true },
      { name: "Prakruthi Mother and Child Hospital", city: "Bengaluru", cashless: true },
    ],
    schemes: ["ESI"],
    gaps: [
      "The corporate buffer is discretionary — the document does not say on what basis HR approves it.",
      "It does not say what happens to cover if you leave the company mid-year.",
      "It does not name the hospitals outside Bengaluru in the Ridgeway network.",
    ],
    confidence: "high",
  };

  return {
    policy,
    summaryPoints: [
      {
        heading: "Proportionate deduction is waived",
        body: "Clause 1.4 is the best line in this policy. Exceed the room limit and you pay only the room difference — surgeon, theatre and nursing charges are untouched.",
        tone: "good",
      },
      {
        heading: "Flat ₹6,000/day room limit",
        body: "Not tied to the sum insured, so it does not shrink. ICU is ₹12,000 a day.",
        tone: "limit",
      },
      {
        heading: "10% co-pay on everything",
        body: "Applied to every claim regardless of age, after a ₹10,000 deductible has come off the first claim of the year.",
        tone: "watch",
      },
      {
        heading: "No waiting periods",
        body: "Group cover waives the 30-day, specified-illness and pre-existing disease waits from your date of joining. Maternity still waits 9 months.",
        tone: "good",
      },
    ],
    brief: `Your Nexora group mediclaim with Ridgeway carries ₹4,00,000 for the family for the year to 30 June 2026, with a further ₹1,00,000 corporate buffer that HR may release at its discretion. Because this is group cover, the usual waiting periods are waived from your date of joining — the 30-day wait, the specified illness list and pre-existing disease are all covered from day one. Only maternity still carries a nine-month wait.

The number to hold on to is ₹6,000 a day for the room and ₹12,000 for ICU. What makes this policy unusually forgiving is clause 1.4: if you take a costlier room, you pay only the room difference. Nothing else is scaled down. Set against that, a 10% co-payment applies to every admissible claim regardless of age, and a ₹10,000 deductible comes off the first claim of the policy year before that co-payment is calculated.

At admission, give the desk your employee ID NXT-4417 and the master policy number, and have them submit pre-authorisation — 72 hours ahead if planned, within 24 hours if it is an emergency. A pre-authorisation is an estimate, not a final settlement, so please confirm the numbers with the Ridgeway claims desk before you count on them.`,
  };
}

const BUILDERS: Record<string, (text: string) => DemoBundle> = {
  meridian,
  pmjay,
  ridgeway,
};

export function isDemoSupported(sampleId: string | null | undefined): boolean {
  return !!sampleId && sampleId in BUILDERS;
}

export function demoBundle(sampleId: string): DemoBundle {
  const sample = getSamplePolicy(sampleId);
  const build = BUILDERS[sampleId];
  if (!sample || !build) {
    throw new Error(`No demo fixture for "${sampleId}".`);
  }
  return build(sample.text);
}

/* ---------------- Derived demo output ---------------- */

/**
 * Stage guidance in Demo Mode is composed from the extracted policy rather
 * than hand-written per policy, so the numbers and citations shown are the
 * real ones for whichever policy is loaded.
 */
export function demoStageGuidance(
  policy: NormalizedPolicy,
  stage: JourneyStage,
  ctx: CaseContext,
  hospitalName?: string,
): StageGuidance {
  const cap = policy.roomEligibility.resolvedDailyCap;
  const re = policy.roomEligibility;
  const at = hospitalName ? ` at ${hospitalName}` : "";

  const byStage: Record<JourneyStage, { headline: string; items: GuidanceItem[] }> = {
    admission: {
      headline:
        ctx.urgency === "emergency"
          ? "Get intimation in first, then settle the room category."
          : "Pre-authorisation and room category are the two decisions that matter now.",
      items: [
        {
          title: "Start pre-authorisation immediately",
          detail:
            policy.preAuthorization.required
              ? `${policy.preAuthorization.notes} For an emergency admission${at}, intimation within ${policy.preAuthorization.emergencyNoticeHours ?? 24} hours keeps the cashless route open.`
              : "This cover does not require pre-authorisation, but tell the hospital insurance desk anyway so the claim is opened correctly.",
          kind: "action",
          citation: policy.preAuthorization.citation,
        },
        {
          title:
            cap != null
              ? `Keep the room at or under ${inr(cap)} a day`
              : `Ask for a ${re.eligibleCategory} bed`,
          detail: re.notes,
          kind: re.proportionateDeduction ? "watch" : "cost",
          citation: re.citation,
        },
        {
          title: "Carry these to the insurance desk",
          detail:
            `Policy or card number${policy.policyNumber ? ` (${policy.policyNumber})` : ""}, a government photo ID for the patient, and the treating doctor's admission note. Ask the desk for a copy of the pre-authorisation request they send — you will want it if the claim is queried later.`,
          kind: "document",
          citation: null,
        },
        {
          title: policy.reimbursement.outOfNetworkAllowed
            ? "Check empanelment before you settle in"
            : "Empanelment is not optional here",
          detail: policy.reimbursement.notes,
          kind: "watch",
          citation: policy.reimbursement.citation,
        },
      ],
    },
    investigation: {
      headline: "Tests done before admission can still be claimed — keep every receipt.",
      items: [
        {
          title: `Tests from the last ${policy.preHospitalizationDays ?? 30} days count`,
          detail: `Investigations done in the ${policy.preHospitalizationDays ?? 30} days before admission are claimable once the hospitalisation claim is admitted. Collect the original bills and reports now, while people still remember where they are.`,
          kind: "document",
          citation: null,
        },
        {
          title: "Ask what is inside the package",
          detail:
            "Ask the billing desk which investigations are inside the approved amount and which will be billed separately. Separately-billed diagnostics are the most common reason a final bill overshoots the pre-authorisation.",
          kind: "cost",
          citation: null,
        },
        {
          title: re.proportionateDeduction
            ? "Room choice is still shaping these bills"
            : "Room choice does not affect these bills",
          detail: re.proportionateDeduction
            ? `Because proportionate deduction applies, investigations billed during the stay are scaled in the same ratio as the room. If the room is over ${cap ? inr(cap) : "the limit"}, so is every scan.`
            : "Your policy does not scale associated charges to the room rate, so investigations are assessed on their own merits.",
          kind: re.proportionateDeduction ? "watch" : "cost",
          citation: re.citation,
        },
        {
          title: "Non-payable items are already accumulating",
          detail:
            policy.exclusions.find((e) => /consumable|non-medical/i.test(e.item))?.detail ??
            "Consumables and non-medical items are typically not payable. Ask for them to be itemised separately so you can see them at discharge.",
          kind: "cost",
          citation:
            policy.exclusions.find((e) => /consumable|non-medical/i.test(e.item))?.citation ??
            null,
        },
      ],
    },
    procedure: {
      headline: "Get the estimate enhanced before the procedure, not after.",
      items: [
        {
          title: "Ask for an enhancement if the estimate rises",
          detail:
            "A pre-authorisation approves an estimated amount. If the treating team revises the plan upwards, the hospital must send an enhancement request. An unapproved overrun is settled at discharge, in cash, by you.",
          kind: "action",
          citation: null,
        },
        {
          title: "Check the sub-limit for this procedure",
          detail:
            relevantSubLimit(policy, ctx.condition) ??
            `This policy caps several procedures. ${policy.subLimits[0]?.item ?? "Check the sub-limit list"} is limited to ${policy.subLimits[0]?.limit ?? "a fixed amount"} — confirm whether tonight's procedure appears on that list.`,
          kind: "cost",
          citation:
            relevantSubLimitCitation(policy, ctx.condition) ??
            policy.subLimits[0]?.citation ??
            null,
        },
        {
          title: "Implants are where estimates move",
          detail:
            "Ask for the implant make, model and price in writing before consent, and ask whether the quoted sub-limit includes it. Implant cost is the single largest driver of a bill exceeding its approval.",
          kind: "watch",
          citation: null,
        },
        {
          title: policy.coPay ? `A ${policy.coPay.percent}% co-pay applies` : "No co-payment applies",
          detail: policy.coPay
            ? `${policy.coPay.appliesTo}. ${coPayIsConditional(policy.coPay.appliesTo) ? "It is conditional, so check whether it applies to this patient before budgeting for it." : "Budget for it — it comes off every admissible claim."}`
            : "This cover has no co-payment, so the admissible amount is not reduced by a patient share.",
          kind: "cost",
          citation: policy.coPay?.citation ?? null,
        },
      ],
    },
    recovery: {
      headline: "Read the final bill line by line before you sign the discharge.",
      items: [
        {
          title: "Ask for the itemised bill, not the summary",
          detail:
            "Request a fully itemised bill and check it against the excluded items list. Discharge is the last moment you have any leverage to question a line.",
          kind: "action",
          citation: null,
        },
        {
          title: `Post-discharge costs are covered for ${policy.postHospitalizationDays ?? 60} days`,
          detail: `Medicines, follow-up consultations and tests for ${policy.postHospitalizationDays ?? 60} days after discharge form part of the same claim. Keep prescriptions and receipts together and submit them as one set.`,
          kind: "document",
          citation: null,
        },
        {
          title: policy.reimbursement.claimWindowDays
            ? `Claim papers are due within ${policy.reimbursement.claimWindowDays} days`
            : "Submit claim papers promptly",
          detail: policy.reimbursement.claimWindowDays
            ? `If this is a reimbursement claim, everything must reach the insurer within ${policy.reimbursement.claimWindowDays} days of discharge. Missing that window is the most common avoidable rejection.`
            : "This document does not state a submission deadline — ask the insurer for it in writing.",
          kind: "watch",
          citation: policy.reimbursement.citation,
        },
        {
          title: "Take the discharge summary before you leave",
          detail:
            "You need the discharge summary, the itemised bill, all original investigation reports and the payment receipts. Getting them re-issued after you have left is slow and sometimes impossible.",
          kind: "document",
          citation: null,
        },
      ],
    },
  };

  const chosen = byStage[stage];
  return { stage, headline: chosen.headline, items: chosen.items };
}

function relevantSubLimit(policy: NormalizedPolicy, condition: string): string | null {
  const s = findSubLimit(policy, condition);
  return s ? `${s.item} is limited to ${s.limit} under this policy. Anything above that is yours to pay, even inside the sum insured.` : null;
}

function relevantSubLimitCitation(policy: NormalizedPolicy, condition: string) {
  return findSubLimit(policy, condition)?.citation ?? null;
}



/** A written comparison composed from the ranking, used when no key is set. */
export function demoComparison(
  policy: NormalizedPolicy,
  matches: HospitalMatch[],
): string {
  const [first, second] = matches;
  if (!first) return "No hospitals matched this search.";

  const oop = first.estimate ? inr(first.estimate.patientPays) : "an unknown amount";
  const pays = first.estimate ? inr(first.estimate.policyPays) : "an unknown amount";

  const p1 = `On the numbers, ${first.hospital.name} in ${first.hospital.area} comes out ahead. It is ${first.distanceKm} km from you, ${first.inNetwork ? (first.cashless ? "empanelled with cashless settlement" : "empanelled, reimbursement only") : "not empanelled with your insurer"}, and a ${first.bestRoom?.room.category ?? "bed"} there runs ${first.bestRoom ? inr(first.bestRoom.room.ratePerDay) : "an unlisted rate"} a day. Over ${first.estimate?.days ?? "the expected"} days the policy would be expected to bear about ${pays}, leaving roughly ${oop} with you.`;

  const p2 = second
    ? `The nearest alternative is ${second.hospital.name} in ${second.hospital.area}, ${second.distanceKm} km away. ${second.inNetwork ? "It is also empanelled" : "It is not empanelled, so you would pay first and claim back"}, and the estimated amount out of your pocket there is ${second.estimate ? inr(second.estimate.patientPays) : "not calculable"}. ${second.tradeOffs.find((t) => t.kind === "minus")?.text ?? ""}`
    : "There is no comparable second option in this list.";

  const p3 = `This ordering would change if the room category you want has no bed free, if the stay runs longer than ${first.estimate?.days ?? "expected"} days, or if the hospital's tariff has been revised since this list was built. It weighs cost and coverage only — it is not a comparison of clinical quality, and where that matters the treating doctor's view should decide. Confirm empanelment and today's room rate with the hospital's insurance desk${policy.insurer ? ` and with ${policy.insurer}` : ""} before admission.`;

  return `${p1}\n\n${p2}\n\n${p3}`;
}

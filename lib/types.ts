/**
 * Domain types for Hospitality.
 *
 * Everything the LLM produces about a policy carries a Citation so the UI can
 * trace any statement back to the exact lines of the source document. Nothing
 * user-facing is allowed to make a coverage claim without one.
 */

export type Citation = {
  /** Clause / section label as printed in the document, e.g. "4.2 (b)". */
  clause: string;
  /** Verbatim excerpt from the policy that supports the claim. */
  quote: string;
  /** 1-indexed line numbers in the normalized document text. */
  lineStart: number;
  lineEnd: number;
  /**
   * Set by the server after checking the quote against the source text.
   * "exact" — quote found verbatim. "fuzzy" — found with whitespace/case
   * normalization or a high-similarity match. "unverified" — not found; the UI
   * flags these so users know not to rely on them.
   */
  verification?: "exact" | "fuzzy" | "unverified";
  /** Line numbers we actually located the quote at, when they differ. */
  resolvedLineStart?: number;
  resolvedLineEnd?: number;
};

export type Money = number; // INR, whole rupees

export type RoomCapMode =
  | "percent_of_sum_insured_per_day"
  | "absolute_per_day"
  | "category_capped"
  | "no_limit";

export type RoomCategory =
  | "General Ward"
  | "Twin Sharing"
  | "Single Private"
  | "Deluxe"
  | "Suite"
  | "ICU"
  | "HDU";

export type PolicyKind = "government" | "private" | "employer" | "topup";

export type CoverageItem = {
  label: string;
  value: string;
  citation: Citation;
};

export type SubLimit = {
  item: string;
  /** Human-readable cap, e.g. "₹40,000 per eye" or "1% of SI per day". */
  limit: string;
  amount?: Money;
  citation: Citation;
};

export type Exclusion = {
  item: string;
  detail: string;
  /** "permanent" | "waiting_period" — waiting periods lapse, exclusions don't. */
  kind: "permanent" | "waiting_period";
  waitingMonths?: number;
  citation: Citation;
};

export type NetworkHospitalRef = {
  name: string;
  city: string;
  cashless: boolean;
};

export type NormalizedPolicy = {
  insurer: string;
  insurerId: string;
  planName: string;
  policyNumber: string | null;
  kind: PolicyKind;
  policyHolder: string | null;
  validFrom: string | null;
  validTo: string | null;

  sumInsured: {
    amount: Money;
    basis: string; // e.g. "per family, per policy year (floater)"
    citation: Citation;
  };

  roomEligibility: {
    /** Highest room category the policy will fund without penalty. */
    eligibleCategory: RoomCategory;
    capMode: RoomCapMode;
    /** Percent (when percent mode) or rupees per day (when absolute). */
    capValue: number | null;
    /** Resolved rupee cap per day, computed against sum insured. */
    resolvedDailyCap: Money | null;
    icuCapMode: RoomCapMode;
    icuCapValue: number | null;
    resolvedIcuDailyCap: Money | null;
    /**
     * If true, choosing a costlier room scales down EVERY associated charge
     * (surgeon, OT, nursing), not just the room rent. This is the single
     * biggest source of surprise bills in the Indian market.
     */
    proportionateDeduction: boolean;
    notes: string;
    citation: Citation;
  };

  coPay: {
    percent: number;
    appliesTo: string;
    citation: Citation;
  } | null;

  deductible: {
    amount: Money;
    appliesTo: string;
    citation: Citation;
  } | null;

  preAuthorization: {
    required: boolean;
    plannedNoticeHours: number | null;
    emergencyNoticeHours: number | null;
    notes: string;
    citation: Citation;
  };

  reimbursement: {
    outOfNetworkAllowed: boolean;
    /** Percentage of the admissible amount payable out of network. */
    payablePercent: number | null;
    claimWindowDays: number | null;
    notes: string;
    citation: Citation;
  };

  preHospitalizationDays: number | null;
  postHospitalizationDays: number | null;

  subLimits: SubLimit[];
  exclusions: Exclusion[];
  networkHospitals: NetworkHospitalRef[];
  /** Government scheme tags this policy participates in, e.g. PM-JAY, ESI. */
  schemes: string[];

  /** Anything the model could not find or was unsure about. */
  gaps: string[];
  /** Model's own confidence in the extraction. */
  confidence: "high" | "medium" | "low";
};

export type PolicySummaryPoint = {
  heading: string;
  body: string;
  tone: "good" | "watch" | "limit";
};

/* ---------- Hospitals ---------- */

export type Room = {
  category: RoomCategory;
  ratePerDay: Money;
  amenities: string[];
  bedsAvailable: number;
};

export type ProcedurePackage = {
  procedure: string;
  /** Indicative all-in package cost at this hospital. */
  estCost: Money;
  /** PM-JAY / scheme reference rate where one exists. */
  schemeRate?: Money;
};

export type Empanelment = {
  inNetwork: boolean;
  cashless: boolean;
  /** Negotiated discount off list tariff for this insurer, in percent. */
  tariffDiscountPct: number;
};

export type Hospital = {
  id: string;
  name: string;
  type: "multi_specialty" | "super_specialty" | "government" | "trust";
  area: string;
  city: string;
  coords: { lat: number; lng: number };
  phone: string;
  accreditation: string[];
  specialties: string[];
  emergency24x7: boolean;
  icuBeds: number;
  totalBeds: number;
  rating: number;
  /** Median hours from admission request to bed allotment. */
  admissionWaitHours: number;
  schemes: string[];
  /** Keyed by insurerId. */
  empanelment: Record<string, Empanelment>;
  rooms: Room[];
  packages: ProcedurePackage[];
};

export type Locality = {
  id: string;
  label: string;
  coords: { lat: number; lng: number };
};

/* ---------- Matching ---------- */

export type RoomFit = {
  room: Room;
  /** covered = within the policy cap; partial = over cap; excluded = ineligible. */
  status: "covered" | "partial" | "excluded";
  /** Rupees per day the policy will bear for this room. */
  policyPaysPerDay: Money;
  /** Rupees per day the patient bears for the room itself. */
  patientPaysPerDay: Money;
  /**
   * Effective proportion of associated charges the policy will bear once
   * proportionate deduction is applied (1 = full).
   */
  associatedChargeFactor: number;
  note: string;
};

export type CostEstimate = {
  days: number;
  roomTotal: Money;
  associatedTotal: Money;
  /** Amount the policy is expected to admit before co-pay / deductible. */
  admissible: Money;
  coPayAmount: Money;
  deductibleAmount: Money;
  overCapRoomAmount: Money;
  /** Consumables and non-medical items the policy never admits. */
  nonPayableItems: Money;
  /** Amount struck off because a procedure-specific sub-limit is lower. */
  subLimitShortfall: Money;
  proportionateShortfall: Money;
  /** Reimbursement haircut when the hospital is out of network. */
  outOfNetworkShortfall: Money;
  policyPays: Money;
  patientPays: Money;
  /** Bumps against the sum insured. */
  exceedsSumInsured: boolean;
};

export type TradeOff = {
  kind: "plus" | "minus";
  text: string;
};

export type HospitalMatch = {
  hospital: Hospital;
  score: number;
  distanceKm: number;
  inNetwork: boolean;
  cashless: boolean;
  specialtyMatch: boolean;
  bestRoom: RoomFit | null;
  roomFits: RoomFit[];
  estimate: CostEstimate | null;
  tradeOffs: TradeOff[];
  /** Deterministic reasons feeding the score — shown in the UI for auditability. */
  scoreBreakdown: { label: string; points: number }[];
};

/* ---------- Care journey ---------- */

export type JourneyStage =
  | "admission"
  | "investigation"
  | "procedure"
  | "recovery";

export type GuidanceItem = {
  title: string;
  detail: string;
  /** "action" = do this; "cost" = money implication; "watch" = risk to avoid. */
  kind: "action" | "cost" | "watch" | "document";
  citation: Citation | null;
};

export type StageGuidance = {
  stage: JourneyStage;
  headline: string;
  items: GuidanceItem[];
};

/* ---------- Session state ---------- */

export type CaseContext = {
  condition: string;
  localityId: string;
  expectedDays: number;
  procedureCost: Money;
  urgency: "emergency" | "planned";
};

export type SourceDoc = {
  /** Original text, line-numbered for citations. */
  text: string;
  name: string;
  origin: "sample" | "paste" | "pdf";
};

export type StreamEvent =
  | { type: "status"; label: string; step: number; of: number }
  | { type: "policy"; policy: NormalizedPolicy }
  | { type: "summary_start" }
  | { type: "delta"; text: string }
  | { type: "points"; points: PolicySummaryPoint[] }
  | { type: "guidance"; guidance: StageGuidance }
  | { type: "matches"; matches: HospitalMatch[] }
  | { type: "error"; message: string }
  | { type: "done"; demo: boolean };

import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type {
  Citation,
  NormalizedPolicy,
  PolicySummaryPoint,
} from "@/lib/types";
import {
  EFFORT,
  MODEL,
  SAFETY_PREAMBLE,
  getClient,
  indexDocument,
  verifyQuote,
  withLineNumbers,
} from "./anthropic";

/**
 * Policy Understanding Agent.
 *
 * Takes raw policy text and produces (a) a normalized structure and (b) a
 * plain-language brief. Extraction is done by the model rather than by regex:
 * these documents vary enormously in wording, and the interesting clauses
 * (proportionate deduction, co-pay ordering, scheme exclusivity) are semantic,
 * not lexical. What we do NOT delegate to the model is arithmetic or
 * verification — resolved rupee caps are computed here, and every citation is
 * re-checked against the source text.
 */

const CitationSchema = z.object({
  clause: z
    .string()
    .describe('Clause label exactly as printed, e.g. "1.4" or "Clause 2.2".'),
  quote: z
    .string()
    .describe(
      "Verbatim excerpt from the document supporting this claim. Copy the words exactly. 10-45 words.",
    ),
  lineStart: z.number().int().describe("First line number of the quote."),
  lineEnd: z.number().int().describe("Last line number of the quote."),
});

const RoomCategoryEnum = z.enum([
  "General Ward",
  "Twin Sharing",
  "Single Private",
  "Deluxe",
  "Suite",
  "ICU",
  "HDU",
]);

const CapModeEnum = z.enum([
  "percent_of_sum_insured_per_day",
  "absolute_per_day",
  "category_capped",
  "no_limit",
]);

const PolicyExtraction = z.object({
  insurer: z.string().describe("Name of the insurer or scheme authority."),
  planName: z.string(),
  policyNumber: z.string().nullable(),
  kind: z.enum(["government", "private", "employer", "topup"]),
  policyHolder: z.string().nullable(),
  validFrom: z.string().nullable().describe("ISO date or as printed."),
  validTo: z.string().nullable(),

  sumInsured: z.object({
    amount: z.number().describe("Sum insured in whole rupees, e.g. 500000."),
    basis: z.string().describe("How the sum insured applies, one short line."),
    citation: CitationSchema,
  }),

  roomEligibility: z.object({
    eligibleCategory: RoomCategoryEnum.describe(
      "Highest room category the policy funds without penalty.",
    ),
    capMode: CapModeEnum,
    capValue: z
      .number()
      .nullable()
      .describe(
        "Percent when percent mode (1 for 1%), rupees per day when absolute, null otherwise.",
      ),
    icuCapMode: CapModeEnum,
    icuCapValue: z.number().nullable(),
    proportionateDeduction: z
      .boolean()
      .describe(
        "True only if the document says associated charges are scaled down when room rent exceeds the cap. False if explicitly waived.",
      ),
    notes: z.string().describe("One or two sentences in plain language."),
    citation: CitationSchema,
  }),

  coPay: z
    .object({
      percent: z.number(),
      appliesTo: z.string(),
      citation: CitationSchema,
    })
    .nullable(),

  deductible: z
    .object({
      amount: z.number(),
      appliesTo: z.string(),
      citation: CitationSchema,
    })
    .nullable(),

  preAuthorization: z.object({
    required: z.boolean(),
    plannedNoticeHours: z.number().nullable(),
    emergencyNoticeHours: z.number().nullable(),
    notes: z.string(),
    citation: CitationSchema,
  }),

  reimbursement: z.object({
    outOfNetworkAllowed: z.boolean(),
    payablePercent: z
      .number()
      .nullable()
      .describe("Percent of admissible amount paid out of network. 0 if none."),
    claimWindowDays: z.number().nullable(),
    notes: z.string(),
    citation: CitationSchema,
  }),

  preHospitalizationDays: z.number().nullable(),
  postHospitalizationDays: z.number().nullable(),

  subLimits: z
    .array(
      z.object({
        item: z.string(),
        limit: z.string(),
        amount: z.number().nullable(),
        citation: CitationSchema,
      }),
    )
    .describe("Every capped benefit. Up to 8, most impactful first."),

  exclusions: z
    .array(
      z.object({
        item: z.string(),
        detail: z.string(),
        kind: z.enum(["permanent", "waiting_period"]),
        waitingMonths: z.number().nullable(),
        citation: CitationSchema,
      }),
    )
    .describe("Up to 10. Include waiting periods as kind=waiting_period."),

  networkHospitals: z.array(
    z.object({
      name: z.string(),
      city: z.string(),
      cashless: z.boolean(),
    }),
  ),

  schemes: z
    .array(z.string())
    .describe('Government schemes named, e.g. ["PM-JAY", "ESI"]. Empty if none.'),

  gaps: z
    .array(z.string())
    .describe("Things a patient would want to know that this document does not say."),

  confidence: z.enum(["high", "medium", "low"]),

  summaryPoints: z
    .array(
      z.object({
        heading: z.string().describe("4-7 words."),
        body: z.string().describe("One or two sentences, plain language."),
        tone: z.enum(["good", "watch", "limit"]),
      }),
    )
    .describe(
      "Exactly 4 points a caregiver most needs to know before choosing a hospital.",
    ),
});

export type PolicyExtractionResult = {
  policy: NormalizedPolicy;
  summaryPoints: PolicySummaryPoint[];
};

const EXTRACT_SYSTEM = `${SAFETY_PREAMBLE}

TASK: Read the health insurance document below and extract it into the given structure.

The document is presented with line numbers in the form "  12 | text". The line numbers are NOT part of the document text — never include them in a quote.

RULES FOR EXTRACTION:
- Every field that takes a citation must cite the clause that actually establishes it. Quote verbatim from the document, without the line-number prefix.
- Prefer the clause that states the rule over a clause that merely mentions it.
- Room eligibility: read carefully for proportionate deduction. Some policies apply it, some explicitly waive it, and the difference can be lakhs of rupees. Set proportionateDeduction to false when the document waives it.
- capValue for percent mode is the percent as a number (1 for "1% of sum insured"). For absolute mode it is rupees per day.
- If a scheme restricts the patient to a general ward, eligibleCategory is "General Ward".
- If out-of-network treatment is not payable at all, set outOfNetworkAllowed false and payablePercent 0.
- Amounts are whole rupees: "Rs. 5,00,000" is 500000.
- gaps: list what a patient would reasonably want to know that this document does not answer. Do not speculate about what the answer would be.
- summaryPoints: exactly 4. tone "good" for genuine strengths, "watch" for things that will cost money if ignored, "limit" for hard ceilings. Lead with whatever would most change a decision made tonight.`;

export async function extractPolicy(
  documentText: string,
): Promise<PolicyExtractionResult> {
  const client = getClient();
  const doc = indexDocument(documentText);

  const message = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: EFFORT,
      format: zodOutputFormat(PolicyExtraction),
    },
    system: EXTRACT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Here is the policy document.\n\n<policy_document>\n${withLineNumbers(documentText)}\n</policy_document>`,
      },
    ],
  });

  const raw = message.parsed_output;
  if (!raw) {
    throw new Error("The model did not return a parsable policy structure.");
  }

  const verify = (c: z.infer<typeof CitationSchema>): Citation => ({
    clause: c.clause,
    quote: c.quote,
    lineStart: c.lineStart,
    lineEnd: c.lineEnd,
    ...verifyQuote(doc, c.quote),
  });

  const sumInsured = raw.sumInsured.amount;

  const policy: NormalizedPolicy = {
    insurer: raw.insurer,
    insurerId: inferInsurerId(raw.insurer, raw.planName),
    planName: raw.planName,
    policyNumber: raw.policyNumber,
    kind: raw.kind,
    policyHolder: raw.policyHolder,
    validFrom: raw.validFrom,
    validTo: raw.validTo,
    sumInsured: {
      amount: sumInsured,
      basis: raw.sumInsured.basis,
      citation: verify(raw.sumInsured.citation),
    },
    roomEligibility: {
      eligibleCategory: raw.roomEligibility.eligibleCategory,
      capMode: raw.roomEligibility.capMode,
      capValue: raw.roomEligibility.capValue,
      resolvedDailyCap: resolveCap(
        raw.roomEligibility.capMode,
        raw.roomEligibility.capValue,
        sumInsured,
      ),
      icuCapMode: raw.roomEligibility.icuCapMode,
      icuCapValue: raw.roomEligibility.icuCapValue,
      resolvedIcuDailyCap: resolveCap(
        raw.roomEligibility.icuCapMode,
        raw.roomEligibility.icuCapValue,
        sumInsured,
      ),
      proportionateDeduction: raw.roomEligibility.proportionateDeduction,
      notes: raw.roomEligibility.notes,
      citation: verify(raw.roomEligibility.citation),
    },
    coPay: raw.coPay
      ? {
          percent: raw.coPay.percent,
          appliesTo: raw.coPay.appliesTo,
          citation: verify(raw.coPay.citation),
        }
      : null,
    deductible: raw.deductible
      ? {
          amount: raw.deductible.amount,
          appliesTo: raw.deductible.appliesTo,
          citation: verify(raw.deductible.citation),
        }
      : null,
    preAuthorization: {
      required: raw.preAuthorization.required,
      plannedNoticeHours: raw.preAuthorization.plannedNoticeHours,
      emergencyNoticeHours: raw.preAuthorization.emergencyNoticeHours,
      notes: raw.preAuthorization.notes,
      citation: verify(raw.preAuthorization.citation),
    },
    reimbursement: {
      outOfNetworkAllowed: raw.reimbursement.outOfNetworkAllowed,
      payablePercent: raw.reimbursement.payablePercent,
      claimWindowDays: raw.reimbursement.claimWindowDays,
      notes: raw.reimbursement.notes,
      citation: verify(raw.reimbursement.citation),
    },
    preHospitalizationDays: raw.preHospitalizationDays,
    postHospitalizationDays: raw.postHospitalizationDays,
    subLimits: raw.subLimits.map((s) => ({
      item: s.item,
      limit: s.limit,
      amount: s.amount ?? undefined,
      citation: verify(s.citation),
    })),
    exclusions: raw.exclusions.map((e) => ({
      item: e.item,
      detail: e.detail,
      kind: e.kind,
      waitingMonths: e.waitingMonths ?? undefined,
      citation: verify(e.citation),
    })),
    networkHospitals: raw.networkHospitals,
    schemes: raw.schemes,
    gaps: raw.gaps,
    confidence: raw.confidence,
  };

  return { policy, summaryPoints: raw.summaryPoints };
}

function resolveCap(
  mode: z.infer<typeof CapModeEnum>,
  value: number | null,
  sumInsured: number,
): number | null {
  if (value == null) return null;
  if (mode === "percent_of_sum_insured_per_day") {
    return Math.round((value / 100) * sumInsured);
  }
  if (mode === "absolute_per_day") return Math.round(value);
  return null;
}

/**
 * Maps a free-text insurer name onto the ids used by the hospital dataset.
 * A real deployment would resolve this against an insurer registry.
 */
function inferInsurerId(insurer: string, planName: string): string {
  const hay = `${insurer} ${planName}`.toLowerCase();
  if (hay.includes("meridian")) return "meridian";
  if (hay.includes("ridgeway") || hay.includes("nexora")) return "ridgeway";
  if (
    hay.includes("pm-jay") ||
    hay.includes("pmjay") ||
    hay.includes("ayushman") ||
    hay.includes("national health authority")
  ) {
    return "pmjay";
  }
  return "unknown";
}

/* ---------------- Plain-language brief (streamed) ---------------- */

const BRIEF_SYSTEM = `${SAFETY_PREAMBLE}

TASK: Write a short plain-language brief explaining this person's health cover, based only on the structured extraction you are given.

FORMAT:
- 3 short paragraphs. No headings, no bullet points, no markdown.
- Paragraph 1: what the cover is and what it will do for them, in concrete rupee terms.
- Paragraph 2: the single most important constraint — the thing that will cost them money if they get it wrong tonight. Be specific with numbers.
- Paragraph 3: what to do at the hospital desk, and one sentence saying they should confirm the specifics with the insurer or TPA before relying on this.
- Address the reader as "you". Under 190 words total.
- Do not invent any number that is not in the extraction.`;

export async function streamPolicyBrief(
  policy: NormalizedPolicy,
  onDelta: (text: string) => void,
): Promise<void> {
  const client = getClient();
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    output_config: { effort: "low" },
    system: BRIEF_SYSTEM,
    messages: [
      {
        role: "user",
        content: `<extraction>\n${JSON.stringify(stripCitations(policy), null, 2)}\n</extraction>`,
      },
    ],
  });

  stream.on("text", onDelta);
  await stream.finalMessage();
}

/** Citations are for the UI, not for the summarizer — drop them to save tokens. */
function stripCitations(policy: NormalizedPolicy) {
  return JSON.parse(
    JSON.stringify(policy, (key, value) => (key === "citation" ? undefined : value)),
  );
}

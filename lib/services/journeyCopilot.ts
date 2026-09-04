import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type {
  CaseContext,
  Citation,
  GuidanceItem,
  JourneyStage,
  NormalizedPolicy,
  StageGuidance,
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
 * Care Journey Copilot.
 *
 * A four-stage state machine — admission, investigation, procedure, recovery —
 * where each transition triggers guidance generated against the person's own
 * policy. The point is anticipation: telling someone about the 48-hour
 * pre-authorisation window while they can still act on it, not after.
 */

export const STAGES: JourneyStage[] = [
  "admission",
  "investigation",
  "procedure",
  "recovery",
];

export const STAGE_META: Record<
  JourneyStage,
  { label: string; caption: string; blurb: string }
> = {
  admission: {
    label: "Admission",
    caption: "Getting a bed",
    blurb:
      "Pre-authorisation, room choice and the paperwork the insurance desk will ask for.",
  },
  investigation: {
    label: "Investigation",
    caption: "Tests and diagnosis",
    blurb:
      "Which investigations sit inside the claim, and which are billed separately.",
  },
  procedure: {
    label: "Procedure",
    caption: "Treatment and surgery",
    blurb:
      "Implants, consumables and enhancement requests — where estimates move the most.",
  },
  recovery: {
    label: "Recovery",
    caption: "Discharge and claim",
    blurb:
      "Final bill scrutiny, discharge summary, and the window for post-hospitalisation costs.",
  },
};

const GuidanceCitation = z.object({
  clause: z.string(),
  quote: z.string().describe("Verbatim excerpt from the policy document."),
  lineStart: z.number().int(),
  lineEnd: z.number().int(),
});

const StageGuidanceSchema = z.object({
  headline: z
    .string()
    .describe("One sentence, under 16 words, naming what matters most right now."),
  items: z
    .array(
      z.object({
        title: z.string().describe("4-9 words."),
        detail: z
          .string()
          .describe("Two or three sentences. Concrete, with rupee amounts where the policy gives them."),
        kind: z.enum(["action", "cost", "watch", "document"]),
        citation: GuidanceCitation.nullable().describe(
          "Cite the policy clause when this comes from the document. null when it is general process guidance.",
        ),
      }),
    )
    .describe("Exactly 4 items, ordered by how time-critical they are."),
});

const JOURNEY_SYSTEM = `${SAFETY_PREAMBLE}

TASK: The person is at a specific stage of a hospital stay. Give them the four things that matter for THIS stage, grounded in their policy document.

RULES:
- Everything must be about money, paperwork, authorisation or entitlement. Nothing about their medical care, their prognosis, or what treatment to have.
- Where the policy says something specific, cite it: quote the clause verbatim and give its line numbers. The document is shown with line numbers as "  12 | text" — the numbers are not part of the text.
- Where you are describing general hospital process rather than a policy term, set citation to null. Do not attach a citation that does not actually support the point.
- kind: "action" = do this now; "cost" = money implication; "watch" = a trap to avoid; "document" = paper to collect or keep.
- Be specific to the stage. Do not repeat generic advice that belongs to a different stage.
- If the person has already told you their room choice or hospital, use it.
- Rupee amounts must come from the document. Never estimate one yourself.`;

const STAGE_FOCUS: Record<JourneyStage, string> = {
  admission:
    "They are being admitted now. Focus on pre-authorisation timing, choosing a room within the eligible limit, the identity and policy documents the insurance desk needs, and any deposit the hospital may ask for.",
  investigation:
    "Tests and scans are being ordered. Focus on which investigations fall inside the hospitalisation claim versus being billed separately, the pre-hospitalisation window for tests already done, and keeping every report and receipt.",
  procedure:
    "A procedure or surgery is planned or underway. Focus on implants and consumables, sub-limits that apply to this kind of procedure, enhancement of the pre-authorised amount when the estimate rises, and what the policy excludes from the bill.",
  recovery:
    "The patient is recovering and discharge is approaching. Focus on scrutinising the final bill for non-payable items, getting the discharge summary and itemised bill, the post-hospitalisation expense window, and the deadline for submitting a reimbursement claim.",
};

export async function generateStageGuidance(
  policy: NormalizedPolicy,
  documentText: string,
  stage: JourneyStage,
  ctx: CaseContext,
  chosenHospital?: string,
  chosenRoom?: string,
): Promise<StageGuidance> {
  const client = getClient();
  const doc = indexDocument(documentText);

  const message = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: {
      effort: EFFORT,
      format: zodOutputFormat(StageGuidanceSchema),
    },
    system: JOURNEY_SYSTEM,
    messages: [
      {
        role: "user",
        content: `<stage>${stage} — ${STAGE_META[stage].label}</stage>
<stage_focus>${STAGE_FOCUS[stage]}</stage_focus>

<situation>
reason for admission: ${ctx.condition}
urgency: ${ctx.urgency}
expected stay: ${ctx.expectedDays} days
hospital: ${chosenHospital ?? "not chosen yet"}
room: ${chosenRoom ?? "not chosen yet"}
</situation>

<policy_document>
${withLineNumbers(documentText)}
</policy_document>`,
      },
    ],
  });

  const raw = message.parsed_output;
  if (!raw) throw new Error("The model did not return usable stage guidance.");

  const items: GuidanceItem[] = raw.items.map((item) => {
    let citation: Citation | null = null;
    if (item.citation) {
      citation = {
        clause: item.citation.clause,
        quote: item.citation.quote,
        lineStart: item.citation.lineStart,
        lineEnd: item.citation.lineEnd,
        ...verifyQuote(doc, item.citation.quote),
      };
    }
    return { title: item.title, detail: item.detail, kind: item.kind, citation };
  });

  return { stage, headline: raw.headline, items };
}

/* ---------------- Stage-scoped question answering (streamed) ---------------- */

const ASK_SYSTEM = `${SAFETY_PREAMBLE}

TASK: Answer the person's question about their cover, using only the policy document provided.

RULES:
- Answer in 2-4 short sentences. No markdown, no headings, no bullets.
- Quote the clause you are relying on inline, in double quotes, and name the clause number.
- If the document does not answer the question, say exactly that and say who to ask instead (their insurer's helpline or the hospital's insurance desk). Do not guess.
- If the question is clinical — what is wrong with the patient, what treatment to have, whether something is serious — decline that part in one sentence and say the treating doctor is the right person, then answer any coverage part that remains.
- End with a short sentence reminding them to confirm with the insurer before relying on it.`;

export async function streamStageAnswer(
  documentText: string,
  stage: JourneyStage,
  question: string,
  onDelta: (text: string) => void,
): Promise<void> {
  const client = getClient();
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1500,
    output_config: { effort: "low" },
    system: ASK_SYSTEM,
    messages: [
      {
        role: "user",
        content: `<current_stage>${stage}</current_stage>

<policy_document>
${withLineNumbers(documentText)}
</policy_document>

<question>${question}</question>`,
      },
    ],
  });

  stream.on("text", onDelta);
  await stream.finalMessage();
}

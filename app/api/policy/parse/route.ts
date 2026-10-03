import { NextRequest } from "next/server";
import { MAX_DOCUMENT_CHARS, isDemoMode } from "@/lib/services/anthropic";
import { extractPolicy, streamPolicyBrief } from "@/lib/services/policyAgent";
import { demoBundle, isDemoSupported } from "@/lib/services/demoFixtures";
import { getSamplePolicy } from "@/lib/data/samplePolicies";
import { CONSENT_VERSION } from "@/lib/legal";
import { beat, ndjsonStream } from "@/lib/services/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Policy Understanding Agent endpoint.
 *
 * Streams: status beats -> normalized policy -> summary points -> the
 * plain-language brief, token by token.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    sampleId?: string;
    text?: string;
    name?: string;
    /** CONSENT_VERSION the person agreed to. Required for their own documents. */
    consent?: string;
  };

  const sample = body.sampleId ? getSamplePolicy(body.sampleId) : undefined;
  const documentText = sample?.text ?? body.text ?? "";
  const demo = isDemoMode();

  return ndjsonStream(async (emit, signal) => {
    if (!documentText.trim()) {
      emit({ type: "error", message: "No policy text was provided." });
      return;
    }

    if (documentText.length > MAX_DOCUMENT_CHARS) {
      emit({
        type: "error",
        message:
          "This document is longer than a single health policy usually is. Please upload just the policy schedule and its terms and conditions.",
      });
      return;
    }

    // Someone's own document is personal data; the samples are not. Enforced
    // here rather than only in the UI, which can be skipped.
    if (!sample && body.consent !== CONSENT_VERSION) {
      emit({
        type: "error",
        message:
          "Please go back and confirm you agree to how your document is used before we read it.",
      });
      return;
    }

    if (demo && !isDemoSupported(body.sampleId)) {
      emit({
        type: "error",
        message:
          "This preview can only read the three sample policies for now — reading your own document is not switched on yet. Please try one of the samples.",
      });
      return;
    }

    emit({ type: "status", label: "Reading the document", step: 1, of: 4 });

    if (demo) {
      const { policy, summaryPoints, brief } = demoBundle(body.sampleId!);
      await beat(500);
      emit({ type: "status", label: "Extracting clauses", step: 2, of: 4 });
      await beat(650);
      emit({ type: "status", label: "Verifying citations against source", step: 3, of: 4 });
      await beat(550);
      emit({ type: "policy", policy });
      emit({ type: "points", points: summaryPoints });
      emit({ type: "status", label: "Writing your summary", step: 4, of: 4 });
      emit({ type: "summary_start" });
      // Replay the canned brief at a readable cadence so the UI behaves
      // identically in both modes.
      for (const chunk of brief.match(/\S+\s*/g) ?? []) {
        emit({ type: "delta", text: chunk });
        await beat(14);
      }
      emit({ type: "done", demo: true });
      return;
    }

    emit({ type: "status", label: "Extracting clauses", step: 2, of: 4 });
    const { policy, summaryPoints } = await extractPolicy(documentText, signal);

    emit({ type: "status", label: "Verifying citations against source", step: 3, of: 4 });
    emit({ type: "policy", policy });
    emit({ type: "points", points: summaryPoints });

    emit({ type: "status", label: "Writing your summary", step: 4, of: 4 });
    emit({ type: "summary_start" });
    await streamPolicyBrief(policy, (text) => emit({ type: "delta", text }), signal);
    emit({ type: "done", demo: false });
  });
}

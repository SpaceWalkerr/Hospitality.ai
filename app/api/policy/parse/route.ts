import { NextRequest } from "next/server";
import { isDemoMode } from "@/lib/services/anthropic";
import { extractPolicy, streamPolicyBrief } from "@/lib/services/policyAgent";
import { demoBundle, isDemoSupported } from "@/lib/services/demoFixtures";
import { getSamplePolicy } from "@/lib/data/samplePolicies";
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
  };

  const sample = body.sampleId ? getSamplePolicy(body.sampleId) : undefined;
  const documentText = sample?.text ?? body.text ?? "";
  const demo = isDemoMode();

  return ndjsonStream(async (emit) => {
    if (!documentText.trim()) {
      emit({ type: "error", message: "No policy text was provided." });
      return;
    }

    if (demo && !isDemoSupported(body.sampleId)) {
      emit({
        type: "error",
        message:
          "Demo Mode can only read the three built-in sample policies. To parse your own document, add an ANTHROPIC_API_KEY to .env.local and restart the server.",
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
    const { policy, summaryPoints } = await extractPolicy(documentText);

    emit({ type: "status", label: "Verifying citations against source", step: 3, of: 4 });
    emit({ type: "policy", policy });
    emit({ type: "points", points: summaryPoints });

    emit({ type: "status", label: "Writing your summary", step: 4, of: 4 });
    emit({ type: "summary_start" });
    await streamPolicyBrief(policy, (text) => emit({ type: "delta", text }));
    emit({ type: "done", demo: false });
  });
}

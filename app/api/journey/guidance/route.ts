import { NextRequest } from "next/server";
import type { CaseContext, JourneyStage, NormalizedPolicy } from "@/lib/types";
import { isDemoMode } from "@/lib/services/anthropic";
import { generateStageGuidance } from "@/lib/services/journeyCopilot";
import { demoStageGuidance } from "@/lib/services/demoFixtures";
import { beat, ndjsonStream } from "@/lib/services/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Care Journey Copilot — guidance for one stage, grounded in the policy. */
export async function POST(req: NextRequest) {
  const { policy, documentText, stage, ctx, hospitalName, roomCategory } =
    (await req.json()) as {
      policy: NormalizedPolicy;
      documentText: string;
      stage: JourneyStage;
      ctx: CaseContext;
      hospitalName?: string;
      roomCategory?: string;
    };

  return ndjsonStream(async (emit) => {
    if (!policy?.insurerId) {
      emit({ type: "error", message: "No policy has been loaded yet." });
      return;
    }

    emit({ type: "status", label: "Reading your policy for this stage", step: 1, of: 1 });

    if (isDemoMode()) {
      await beat(700);
      emit({
        type: "guidance",
        guidance: demoStageGuidance(policy, stage, ctx, hospitalName),
      });
      emit({ type: "done", demo: true });
      return;
    }

    const guidance = await generateStageGuidance(
      policy,
      documentText,
      stage,
      ctx,
      hospitalName,
      roomCategory,
    );
    emit({ type: "guidance", guidance });
    emit({ type: "done", demo: false });
  });
}

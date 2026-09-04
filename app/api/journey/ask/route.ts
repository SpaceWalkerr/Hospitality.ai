import { NextRequest } from "next/server";
import type { JourneyStage } from "@/lib/types";
import { isDemoMode } from "@/lib/services/anthropic";
import { streamStageAnswer } from "@/lib/services/journeyCopilot";
import { beat, ndjsonStream } from "@/lib/services/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEMO_ANSWER = `Demo Mode cannot answer free-text questions — that needs a live model call. What it can tell you is where to look: the clause list on your Coverage page is the same text this question would be answered from, and every card there links to the exact lines in your document.

To turn this on, add an ANTHROPIC_API_KEY to .env.local and restart. Either way, confirm anything that affects money with your insurer or the hospital's insurance desk before relying on it.`;

/** Stage-scoped question answering, grounded strictly in the uploaded document. */
export async function POST(req: NextRequest) {
  const { documentText, stage, question } = (await req.json()) as {
    documentText: string;
    stage: JourneyStage;
    question: string;
  };

  return ndjsonStream(async (emit) => {
    if (!question?.trim()) {
      emit({ type: "error", message: "Ask a question first." });
      return;
    }

    emit({ type: "summary_start" });

    if (isDemoMode()) {
      for (const chunk of DEMO_ANSWER.match(/\S+\s*/g) ?? []) {
        emit({ type: "delta", text: chunk });
        await beat(12);
      }
      emit({ type: "done", demo: true });
      return;
    }

    await streamStageAnswer(documentText, stage, question, (text) =>
      emit({ type: "delta", text }),
    );
    emit({ type: "done", demo: false });
  });
}

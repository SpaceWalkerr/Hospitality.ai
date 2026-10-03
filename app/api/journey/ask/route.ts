import { NextRequest } from "next/server";
import type { JourneyStage } from "@/lib/types";
import { MAX_DOCUMENT_CHARS, MAX_QUESTION_CHARS, isDemoMode } from "@/lib/services/anthropic";
import { streamStageAnswer } from "@/lib/services/journeyCopilot";
import { beat, ndjsonStream } from "@/lib/services/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Shown to members of the public on the preview deployment, so it says what the
// person can do — not how to configure the server.
const DEMO_ANSWER = `Free-text questions are not switched on in this preview yet. The answer would come from the same clauses shown on your Coverage page, and every card there links to the exact lines in your document — that is the quickest place to look.

Either way, confirm anything that affects money with your insurer or the hospital's insurance desk before relying on it.`;

/** Stage-scoped question answering, grounded strictly in the uploaded document. */
export async function POST(req: NextRequest) {
  const { documentText, stage, question } = (await req.json()) as {
    documentText: string;
    stage: JourneyStage;
    question: string;
  };

  return ndjsonStream(async (emit, signal) => {
    if (!question?.trim()) {
      emit({ type: "error", message: "Ask a question first." });
      return;
    }

    if (question.length > MAX_QUESTION_CHARS) {
      emit({ type: "error", message: "Please keep your question shorter — a sentence or two works best." });
      return;
    }

    if ((documentText ?? "").length > MAX_DOCUMENT_CHARS) {
      emit({ type: "error", message: "This policy document is too long to use here. Please reload it from the start screen." });
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

    await streamStageAnswer(
      documentText,
      stage,
      question,
      (text) => emit({ type: "delta", text }),
      signal,
    );
    emit({ type: "done", demo: false });
  });
}

import { NextRequest } from "next/server";
import type { CaseContext, NormalizedPolicy } from "@/lib/types";
import { isDemoMode } from "@/lib/services/anthropic";
import { rankHospitals, streamComparison } from "@/lib/services/matchingEngine";
import { demoComparison } from "@/lib/services/demoFixtures";
import { beat, ndjsonStream } from "@/lib/services/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Hospital & Room Matching endpoint.
 *
 * Ranking is computed deterministically and emitted immediately, so the list
 * paints before any model call resolves. The narrative streams in behind it.
 */
export async function POST(req: NextRequest) {
  const { policy, ctx } = (await req.json()) as {
    policy: NormalizedPolicy;
    ctx: CaseContext;
  };

  return ndjsonStream(async (emit) => {
    if (!policy?.insurerId) {
      emit({ type: "error", message: "No policy has been loaded yet." });
      return;
    }

    emit({ type: "status", label: "Cross-referencing your network", step: 1, of: 2 });
    const matches = rankHospitals(policy, ctx);
    emit({ type: "matches", matches });

    emit({ type: "status", label: "Weighing the trade-offs", step: 2, of: 2 });
    emit({ type: "summary_start" });

    if (isDemoMode()) {
      const text = demoComparison(policy, matches);
      for (const chunk of text.match(/\S+\s*/g) ?? []) {
        emit({ type: "delta", text: chunk });
        await beat(13);
      }
      emit({ type: "done", demo: true });
      return;
    }

    await streamComparison(policy, matches, ctx, (text) =>
      emit({ type: "delta", text }),
    );
    emit({ type: "done", demo: false });
  });
}

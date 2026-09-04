import type { StreamEvent } from "@/lib/types";

/**
 * Newline-delimited JSON streaming.
 *
 * The client reads these with a plain `fetch` + ReadableStream, which keeps the
 * transport dependency-free and lets a single response carry both structured
 * payloads (the normalized policy, the ranking) and token deltas.
 */
export function ndjsonStream(
  producer: (emit: (event: StreamEvent) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (event: StreamEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await producer(emit);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong.";
        emit({ type: "error", message });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

/** Small artificial beat so multi-step status updates stay readable. */
export function beat(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

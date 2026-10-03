import type { StreamEvent } from "@/lib/types";
import { toUserMessage } from "./anthropic";

/**
 * Newline-delimited JSON streaming.
 *
 * The client reads these with a plain `fetch` + ReadableStream, which keeps the
 * transport dependency-free and lets a single response carry both structured
 * payloads (the normalized policy, the ranking) and token deltas.
 *
 * The producer gets an AbortSignal that fires when the reader goes away — a
 * closed tab, a navigation, a cancelled fetch. Pass it to the model call: in
 * Live mode an abandoned stream would otherwise keep generating, and billing,
 * until the model finished an answer nobody is reading.
 */
export function ndjsonStream(
  producer: (emit: (event: StreamEvent) => void, signal: AbortSignal) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const abort = new AbortController();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The reader left between our check and the write.
          closed = true;
          abort.abort();
        }
      };

      try {
        await producer(emit, abort.signal);
      } catch (error) {
        // Someone leaving is not a failure, and there is nobody to tell.
        if (!abort.signal.aborted) emit({ type: "error", message: toUserMessage(error) });
      } finally {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            /* already closed by a cancel */
          }
        }
      }
    },
    cancel() {
      closed = true;
      abort.abort();
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

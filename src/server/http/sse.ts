const encoder = new TextEncoder();

/** A stream lives this long, then the browser's EventSource reconnects by itself and gets a fresh snapshot. */
export const SSE_MAX_MS = 55_000;
const HEARTBEAT_MS = 15_000;
const RECONNECT_MS = 500;

export type SseSender = {
  /** Sends one named event. Safe to call after the client has gone; it is ignored. */
  send(event: string, data: unknown): void;
  close(): void;
};

/**
 * A server-sent-events response. `start` receives a sender and returns a cleanup that runs exactly once when
 * the stream ends for any reason (client left, time limit, error). Every stream is time-limited so it never
 * outlives a serverless function's limit, and EventSource reconnects with a fresh snapshot, so nothing is lost.
 */
export function sseResponse(
  request: Request,
  start: (sse: SseSender) => (() => void) | Promise<() => void>,
  maxMs: number = SSE_MAX_MS,
): Response {
  let closed = false;
  let cleanup: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let limit: ReturnType<typeof setTimeout> | undefined;
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined;

  const close = () => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    if (limit) clearTimeout(limit);
    try {
      cleanup?.();
    } catch (error) {
      console.error("SSE cleanup failed", error);
    }
    try {
      controllerRef?.close();
    } catch {
      // Already closed by the client.
    }
  };

  const write = (chunk: string) => {
    if (closed) return;
    try {
      controllerRef?.enqueue(encoder.encode(chunk));
    } catch {
      close();
    }
  };

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controllerRef = controller;
      write(`retry: ${RECONNECT_MS}\n\n`);
      heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS);
      limit = setTimeout(close, maxMs);
      request.signal.addEventListener("abort", close);
      try {
        cleanup = await start({
          send: (event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          close,
        });
        // The client may have left while `start` was still working.
        if (closed) {
          cleanup?.();
          cleanup = undefined;
        }
      } catch (error) {
        console.error("SSE start failed", error);
        write(`event: fatal\ndata: ${JSON.stringify({ message: "The live connection failed." })}\n\n`);
        close();
      }
    },
    cancel: close,
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      Connection: "keep-alive",
      // Stops proxies such as nginx from buffering the stream.
      "X-Accel-Buffering": "no",
    },
  });
}

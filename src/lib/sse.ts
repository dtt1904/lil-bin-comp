import { NextResponse } from "next/server";

export function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function createSseResponse(
  producer: (send: (event: string, data: unknown) => void) => (() => void) | void
): NextResponse {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseFrame(event, data)));
      };

      send("connected", { ok: true, at: new Date().toISOString() });
      const cleanup = producer(send);

      const heartbeat = setInterval(() => {
        send("ping", { t: Date.now() });
      }, 15000);

      return () => {
        clearInterval(heartbeat);
        if (cleanup) cleanup();
      };
    },
    cancel() {
      // noop
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

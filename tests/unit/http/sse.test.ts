import { describe, expect, it, vi } from "vitest";
import { sseResponse } from "@/server/http/sse";

async function readAll(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text;
    text += decoder.decode(value);
  }
}

const request = (signal?: AbortSignal) => new Request("http://localhost/stream", { signal });

describe("sseResponse", () => {
  it("is an event stream that is never cached or buffered", () => {
    const response = sseResponse(request(), () => () => undefined, 5);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    void response.body!.cancel();
  });

  it("sends a reconnect hint, named events and JSON data, then ends at its time limit", async () => {
    const response = sseResponse(request(), ({ send }) => {
      send("chat", { hello: "world" });
      send("chat", { n: 2 });
      return () => undefined;
    }, 30);
    const text = await readAll(response);
    expect(text).toContain("retry: 500");
    expect(text).toContain('event: chat\ndata: {"hello":"world"}\n\n');
    expect(text).toContain('event: chat\ndata: {"n":2}\n\n');
  });

  it("runs the cleanup exactly once, however the stream ends", async () => {
    const cleanup = vi.fn();
    const response = sseResponse(request(), ({ close }) => {
      close();
      close();
      return cleanup;
    }, 1000);
    await readAll(response);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("cleans up when the client goes away", async () => {
    const cleanup = vi.fn();
    const controller = new AbortController();
    const response = sseResponse(request(controller.signal), () => cleanup, 10_000);
    const reader = response.body!.getReader();
    await reader.read();
    controller.abort();
    await vi.waitFor(() => expect(cleanup).toHaveBeenCalledTimes(1));
  });

  it("cleans up when the reader cancels, so a closed tab stops the listeners", async () => {
    const cleanup = vi.fn();
    const response = sseResponse(request(), () => cleanup, 10_000);
    await response.body!.cancel();
    await vi.waitFor(() => expect(cleanup).toHaveBeenCalledTimes(1));
  });

  it("still cleans up when the client left while start was working", async () => {
    const cleanup = vi.fn();
    const controller = new AbortController();
    const response = sseResponse(request(controller.signal), async () => {
      controller.abort();
      await new Promise((resolve) => setTimeout(resolve, 5));
      return cleanup;
    }, 10_000);
    void response.body!.getReader().read();
    await vi.waitFor(() => expect(cleanup).toHaveBeenCalledTimes(1));
  });

  it("reports a failing start as a fatal event instead of hanging", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const text = await readAll(sseResponse(request(), () => { throw new Error("boom"); }, 1000));
    expect(text).toContain("event: fatal");
  });

  it("ignores sends after it has closed", async () => {
    let send: (event: string, data: unknown) => void = () => undefined;
    const response = sseResponse(request(), (sse) => { send = sse.send; return () => undefined; }, 10);
    await readAll(response);
    expect(() => send("chat", {})).not.toThrow();
  });
});

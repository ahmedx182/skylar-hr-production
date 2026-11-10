"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Subscribes to a server-sent-events endpoint and calls `onEvent` for each named event. Returns whether the
 * stream is currently connected, so a caller can fall back to a slow poll while it isn't. The browser reconnects
 * by itself; a stream the server refuses (signed out, no access) stays closed and reports not connected.
 * Pass a stable `events` list (a module-level constant), because it decides when to reconnect.
 */
export function useEventStream(url: string | null, events: readonly string[], onEvent: (event: string, data: unknown) => void): boolean {
  const [connected, setConnected] = useState(false);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!url || typeof EventSource === "undefined") return;
    const source = new EventSource(url);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    for (const name of events) {
      source.addEventListener(name, (event) => {
        try {
          handler.current(name, JSON.parse((event as MessageEvent<string>).data));
        } catch {
          // A malformed event is dropped; the next snapshot replaces it.
        }
      });
    }
    // The server says it can't continue (case purged, access changed): stop instead of reconnecting forever.
    source.addEventListener("gone", () => source.close());
    source.addEventListener("fatal", () => {
      source.close();
      setConnected(false);
    });

    return () => {
      source.close();
      setConnected(false);
    };
  }, [url, events]);

  return connected;
}

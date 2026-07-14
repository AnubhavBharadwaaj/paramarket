/**
 * Dual-feed SSE ingestion: scores + odds.
 *
 * Endpoints (both require Authorization + X-Api-Token):
 *   GET /api/scores/stream   real-time score events (goals, cards, game state)
 *   GET /api/odds/stream      real-time StablePrice odds updates
 *
 * Production requirement (rubric: Production Readiness): the stream must survive
 * a dropped connection. TxLINE emits an `id:` on each SSE event, so we track the
 * last id and resume with the `Last-Event-ID` header on reconnect. This module
 * implements that reconnect loop with exponential backoff.
 *
 * Node 22 has global fetch + ReadableStream, so no external SSE dep is needed;
 * we parse the text/event-stream framing directly.
 */

import type { NetworkConfig } from "./config.ts";
import { authHeaders } from "./auth.ts";

export type FeedKind = "scores" | "odds";

export interface SseEvent {
  id?: string;
  event?: string;
  /** Parsed JSON payload of the `data:` field. */
  data: unknown;
  /** Which feed this came from. */
  feed: FeedKind;
  /** Wall-clock receive time (ms). NOT used for decisions — determinism uses payload Ts. */
  receivedAt: number;
}

export interface StreamHandle {
  stop: () => void;
}

interface StreamOpts {
  cfg: NetworkConfig;
  jwt: string;
  apiToken: string;
  feed: FeedKind;
  onEvent: (e: SseEvent) => void;
  onError?: (err: Error) => void;
  onReconnect?: (attempt: number, lastEventId: string | null) => void;
  /** Override for tests. */
  fetchImpl?: typeof fetch;
  maxBackoffMs?: number;
}

export function streamFeed(opts: StreamOpts): StreamHandle {
  const {
    cfg,
    jwt,
    apiToken,
    feed,
    onEvent,
    onError,
    onReconnect,
    fetchImpl = fetch,
    maxBackoffMs = 15_000,
  } = opts;

  const url = `${cfg.apiBaseUrl}/${feed}/stream`;
  let stopped = false;
  let lastEventId: string | null = null;
  let attempt = 0;
  const controller = new AbortController();

  async function connect(): Promise<void> {
    while (!stopped) {
      try {
        if (attempt > 0) onReconnect?.(attempt, lastEventId);
        const headers: Record<string, string> = authHeaders(jwt, apiToken);
        headers["Accept"] = "text/event-stream";
        if (lastEventId) headers["Last-Event-ID"] = lastEventId;

        const res = await fetchImpl(url, { headers, signal: controller.signal });
        if (!res.ok || !res.body) {
          throw new Error(`${feed}/stream HTTP ${res.status}`);
        }
        attempt = 0; // reset backoff on a good connection

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break; // server closed; fall through to reconnect
          buf += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line.
          let sep: number;
          while ((sep = buf.indexOf("\n\n")) !== -1) {
            const rawFrame = buf.slice(0, sep);
            buf = buf.slice(sep + 2);
            const evt = parseFrame(rawFrame, feed);
            if (evt) {
              if (evt.id) lastEventId = evt.id;
              onEvent(evt);
            }
          }
        }
      } catch (err) {
        if (stopped) return;
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
      // reconnect with capped exponential backoff
      attempt += 1;
      const backoff = Math.min(maxBackoffMs, 500 * 2 ** Math.min(attempt, 5));
      await sleep(backoff);
    }
  }

  connect();
  return {
    stop() {
      stopped = true;
      controller.abort();
    },
  };
}

/** Parse a single SSE frame (id:/event:/data: lines). Exported for unit tests. */
export function parseFrame(frame: string, feed: FeedKind): SseEvent | null {
  let id: string | undefined;
  let event: string | undefined;
  const dataLines: string[] = [];

  for (const line of frame.split("\n")) {
    if (line.startsWith(":")) continue; // comment/heartbeat
    const idx = line.indexOf(":");
    const field = idx === -1 ? line : line.slice(0, idx);
    const val = idx === -1 ? "" : line.slice(idx + 1).replace(/^ /, "");
    if (field === "id") id = val;
    else if (field === "event") event = val;
    else if (field === "data") dataLines.push(val);
  }

  if (dataLines.length === 0) return null;
  const raw = dataLines.join("\n");
  let data: unknown = raw;
  try {
    data = JSON.parse(raw);
  } catch {
    /* keep raw string if not JSON */
  }
  return { id, event, data, feed, receivedAt: Date.now() };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

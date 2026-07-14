/**
 * Unit tests for the SSE frame parser. Pure logic, no network — runnable
 * anywhere with `node --test`. This is a Stage-0 eval gate: the reconnect
 * logic is worthless if frame parsing / last-event-id tracking is wrong.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrame } from "../src/client/stream.ts";

test("parses a standard data+id frame as JSON", () => {
  const frame = 'id: 42\nevent: update\ndata: {"FixtureId":123,"Ts":1000}';
  const e = parseFrame(frame, "scores");
  assert.equal(e?.id, "42");
  assert.equal(e?.event, "update");
  assert.deepEqual(e?.data, { FixtureId: 123, Ts: 1000 });
  assert.equal(e?.feed, "scores");
});

test("handles multi-line data by joining with newline", () => {
  const frame = 'data: {"a":1,\ndata: "b":2}';
  const e = parseFrame(frame, "odds");
  assert.deepEqual(e?.data, { a: 1, b: 2 });
});

test("ignores heartbeat/comment lines", () => {
  const frame = ': keep-alive\ndata: {"ok":true}';
  const e = parseFrame(frame, "scores");
  assert.deepEqual(e?.data, { ok: true });
});

test("returns null for a frame with no data field", () => {
  const frame = "event: ping";
  assert.equal(parseFrame(frame, "scores"), null);
});

test("keeps raw string when data is not JSON", () => {
  const frame = "data: hello-world";
  const e = parseFrame(frame, "odds");
  assert.equal(e?.data, "hello-world");
});

test("strips only the first leading space after colon", () => {
  const frame = "data:  two-spaces";
  const e = parseFrame(frame, "scores");
  assert.equal(e?.data, " two-spaces");
});

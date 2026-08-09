import assert from "node:assert/strict";
import test from "node:test";

import { createProviderProgressHeartbeat } from "./provider-progress.mjs";

test("provider heartbeat reports start, elapsed wait, and completion", () => {
  const events = [];
  let elapsedMs = 0;
  let tick = null;
  let cleared = false;
  let unrefCalled = false;
  const timer = { unref() { unrefCalled = true; } };

  const heartbeat = createProviderProgressHeartbeat({
    progress: (phase, message) => events.push([phase, message]),
    intervalMs: 10_000,
    now: () => elapsedMs,
    setIntervalFn: (callback, intervalMs) => {
      assert.equal(intervalMs, 10_000);
      tick = callback;
      return timer;
    },
    clearIntervalFn: (receivedTimer) => {
      assert.equal(receivedTimer, timer);
      cleared = true;
    },
  });

  heartbeat.report("without_history", "Calling openai/gpt-5.1-2025-11-13");
  assert.deepEqual(events, [
    ["without_history", "Calling openai/gpt-5.1-2025-11-13"],
    ["without_history", "Awaiting provider response · 0s elapsed"],
  ]);
  assert.equal(unrefCalled, true);

  elapsedMs = 10_400;
  tick();
  assert.deepEqual(events.at(-1), [
    "without_history",
    "Awaiting provider response · 10s elapsed",
  ]);

  elapsedMs = 27_900;
  heartbeat.finish();
  assert.equal(cleared, true);
  assert.deepEqual(events.at(-1), [
    "without_history",
    "Provider call completed · 27s elapsed",
  ]);
});

test("starting a new provider call closes the previous heartbeat first", () => {
  const events = [];
  let elapsedMs = 0;
  const timers = [];
  const cleared = [];

  const heartbeat = createProviderProgressHeartbeat({
    progress: (phase, message) => events.push([phase, message]),
    now: () => elapsedMs,
    setIntervalFn: (callback) => {
      const timer = { callback, unref() {} };
      timers.push(timer);
      return timer;
    },
    clearIntervalFn: (timer) => cleared.push(timer),
  });

  heartbeat.report("with_history", "Calling openai/model");
  elapsedMs = 4_900;
  heartbeat.report("without_history", "Calling openai/model");

  assert.equal(cleared.length, 1);
  assert.equal(cleared[0], timers[0]);
  assert.deepEqual(events.slice(-3), [
    ["with_history", "Provider response received · 4s elapsed"],
    ["without_history", "Calling openai/model"],
    ["without_history", "Awaiting provider response · 0s elapsed"],
  ]);
});

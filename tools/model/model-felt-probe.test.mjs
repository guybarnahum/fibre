import assert from "node:assert/strict";
import test from "node:test";
import { feltWith, pairedChange, thinned } from "./model-felt-probe.mjs";

test("a probe adds one felt line to the Body where the job keeps it, and changes nothing else", () => {
  const turn = { thread: { threadId: "thr_a" }, liveInteraction: { spokenSoFar: 2, body: ["Talking has begun to tire you a little."] } };
  const felt = feltWith(turn, "You have had your fill of testing claims for now.");
  assert.deepEqual(felt.liveInteraction.body, ["Talking has begun to tire you a little.", "You have had your fill of testing claims for now."]);
  assert.equal(turn.liveInteraction.body.length, 1, "the recorded request was changed");
  assert.deepEqual(feltWith({ reading: { passage: "…" } }, "x").body, ["x"], "a job without a Body was not given one to feel");
  assert.deepEqual({ ...feltWith({ body: ["a"], glance: {} }, "x"), body: ["a"] }, { body: ["a"], glance: {} }, "more than the Body changed");
});

test("the change is read request by request: a fall shows only when the same requests fall", () => {
  const fell = pairedChange(Array.from({ length: 20 }, (_, i) => [0.8, i % 2 ? 0.3 : 0.4]));
  assert.ok(fell.high < -0.2, "a clear fall was not shown as one");
  const same = pairedChange(Array.from({ length: 20 }, (_, i) => [0.8, i % 2 ? 0.9 : 0.7]));
  assert.ok(same.low < 0 && same.high > 0, "no change was shown as a change");
});

test("thinning what comes to mind keeps one item close to the method in each list, and everything else", () => {
  const input = { thread: { threadId: "thr_a", unresolvedIntentions: ["test the claim", "call my sister"] },
    autobiographicalMemories: [{ gist: "test a claim" }, { gist: "a swim" }, { gist: "test another claim" }], reading: { passage: "test" } };
  const close = (item) => JSON.stringify(item).includes("test");
  const thin = thinned(input, close);
  assert.deepEqual(thin.autobiographicalMemories, [{ gist: "test a claim" }, { gist: "a swim" }]);
  assert.deepEqual(thin.thread.unresolvedIntentions, ["test the claim", "call my sister"]);
  assert.deepEqual(thin.reading, input.reading, "what is faced now was thinned");
  assert.equal(input.autobiographicalMemories.length, 3, "the recorded request was changed");
});

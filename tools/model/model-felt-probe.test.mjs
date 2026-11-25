import assert from "node:assert/strict";
import test from "node:test";
import { feltWith, namedWith, pairedChange, thinned } from "./model-felt-probe.mjs";

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

test("thinning what comes to mind leaves out the method-heavy half of each list but for its first, and nothing else", () => {
  const input = { thread: { threadId: "thr_a", unresolvedIntentions: ["test the claim", "call my sister"] },
    autobiographicalMemories: [{ gist: "a" }, { gist: "b" }, { gist: "c" }, { gist: "d" }], reading: { passage: "test" } };
  const close = { a: 0.75, b: 0.5, c: 0.7, d: 0.66, "test the claim": 0.8, "call my sister": 0.3 };
  const closeness = (item) => close[typeof item === "string" ? item : item.gist] ?? null;
  const thin = thinned(input, closeness);
  assert.deepEqual(thin.autobiographicalMemories, [{ gist: "a" }, { gist: "b" }, { gist: "d" }], "the method-heavy half was not thinned, or the first was lost");
  assert.deepEqual(thin.thread.unresolvedIntentions, ["test the claim", "call my sister"]);
  assert.deepEqual(thin.reading, input.reading, "what is faced now was thinned");
  assert.equal(input.autobiographicalMemories.length, 4, "the recorded request was changed");
  assert.deepEqual(thinned({ memories: [{ gist: "x" }, { gist: "y" }] }, () => 0.5).memories.length, 2, "items far from the method were thinned");
});

test("a named feeling is attached to each thing in front of the Thread, more of the same or something new, and the Body says the same", () => {
  const input = { thread: { threadId: "thr_a" }, body: [], glance: { items: [
    { index: 0, kind: "book", title: "Logic and Proof" }, { index: 1, kind: "book", title: "The Mysterious Island" },
    { index: 2, kind: "person", text: "a woman reading", felt: "at ease" }] } };
  const named = namedWith(input, { method: "weighing claims", full: (item) => item.title === "Logic and Proof" });
  assert.match(named.glance.items[0].felt, /weighing claims, which you have had your fill of/u);
  assert.match(named.glance.items[1].felt, /something new/u);
  assert.equal(named.glance.items[2].felt, "at ease", "how its body takes a person was changed");
  assert.equal(named.body.length, 1);
  assert.equal(input.glance.items[0].felt, undefined, "the recorded request was changed");
});

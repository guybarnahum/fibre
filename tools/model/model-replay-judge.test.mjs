import assert from "node:assert/strict";
import test from "node:test";
import { judgeReplay } from "./model-replay-judge.mjs";

const PROMPT = "encounter.attention@1";
const noticed = { outcome: "noticed" };
const passed = { outcome: "not_noticed" };

// Ten shared events, each seen by two Threads who decide differently, plus
// noise where the current model disagrees with itself one time in ten.
function cases(candidateFor) {
  return Array.from({ length: 20 }, (_, index) => {
    const own = index % 2 === 0 ? noticed : passed;
    const again = index === 3 ? noticed : own;
    return {
      prompt: PROMPT, scope: index % 2 === 0 ? "thread-a" : "thread-b", eventKey: `event-${Math.floor(index / 2)}`,
      baseline: [own, again], candidate: candidateFor(own, index),
    };
  });
}

test("a candidate no more different than the current model is from itself passes", () => {
  const verdict = judgeReplay(cases((own) => own));
  assert.equal(verdict.verdict, "passes", verdict.failures.join("; "));
});

test("a candidate that makes every Thread notice the same way fails", () => {
  const verdict = judgeReplay(cases(() => noticed));
  assert.equal(verdict.verdict, "fails", "a candidate that erased individual difference passed");
  assert.ok(verdict.failures.some((failure) => /different Threads/u.test(failure)),
    "the lost two-Thread difference was not named");
});

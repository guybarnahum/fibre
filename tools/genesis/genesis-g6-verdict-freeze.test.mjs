import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyG6Verdict,
  directPropagationClear,
  stableVeryHighSentimentCoupling,
  verifyG6VerdictFreeze,
} from "./genesis-g6-verdict-freeze.mjs";

test("G6 D3 ceiling-aware direct propagation rule is frozen", () => {
  assert.equal(directPropagationClear(4, 3), true);
  assert.equal(directPropagationClear(3, 4), true);
  assert.equal(directPropagationClear(4, 4), true);
  assert.equal(directPropagationClear(3, 3), false);
  assert.equal(directPropagationClear(4, 2), false);
});

test("G6 D2 only blocks stable very-high positive coupling", () => {
  assert.equal(stableVeryHighSentimentCoupling({
    rho: 0.8,
    leaveOneThreadOutRhos: [0.61, 0.7, 0.68, 0.73, 0.66],
  }), true);
  assert.equal(stableVeryHighSentimentCoupling({
    rho: 0.8,
    leaveOneThreadOutRhos: [0.59, 0.7, 0.68, 0.73, 0.66],
  }), false);
  assert.equal(stableVeryHighSentimentCoupling({
    rho: 0.9,
    leaveOneThreadOutRhos: [0.8],
    analyzable: false,
  }), false);
});

test("G6 verdict keeps bad outcomes as HOLD and protocol failure as REDESIGN", () => {
  const base = {
    d1NormalizedCorrect: 4,
    d3Ordinal3CorrectCoreEdges: 4,
    d3Ordinal6CorrectCoreEdges: 3,
    d2Rho: 0.5,
    d2LeaveOneThreadOutRhos: [0.4, 0.5, 0.45, 0.52, 0.48],
    d5NearTotalSelfExplanationThreads: 2,
  };
  assert.equal(classifyG6Verdict(base), "CLEAR");
  assert.equal(classifyG6Verdict({ ...base, d1NormalizedCorrect: 3 }), "HOLD");
  assert.equal(classifyG6Verdict({ ...base, negativeControlFailureSignal: true }), "HOLD");
  assert.equal(classifyG6Verdict({ ...base, d5NearTotalSelfExplanationThreads: 4 }), "HOLD");
  assert.equal(classifyG6Verdict({ ...base, confirmedProtocolIntegrityViolation: true, d1NormalizedCorrect: 0 }), "REDESIGN");
});

test("G6 frozen packet binds verified G5 and predates final life", () => {
  const result = verifyG6VerdictFreeze();
  assert.equal(result.g5ProtocolDigest, "sha256:4520357cab14bcdc883c6b3966401c98d17a1424e47f26e8c04002728d799ed5");
  assert.equal(result.g5ProtocolBlobSha, "7c6a856d0650b3468bc988a4f5cbd2d96c7551c5");
  assert.equal(result.d1ClearMinimum, 4);
  assert.equal(result.d5HoldMinimum, 4);
});

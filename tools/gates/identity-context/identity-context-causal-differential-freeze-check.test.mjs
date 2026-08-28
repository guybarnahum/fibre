// fibre-test-lifecycle: regression
// fibre-test-scope: tools
// fibre-test-purpose: identity-context-causal-differential-frozen-instrument

import assert from "node:assert/strict";
import test from "node:test";

import {
  FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_V1 as FROZEN,
} from "./frozen-causal-differential-v1.mjs";
import {
  assertFrozenIdentityContextCausalDifferential,
} from "./identity-context-causal-differential-freeze-check.mjs";

function reportFromFreeze() {
  return {
    protocol: {
      id: FROZEN.id,
      callsPerCondition: FROZEN.callsPerCondition,
      rerunAfterSubstantiveResult: FROZEN.rerunAfterSubstantiveResult,
      scenarioSearchAfterProvider: FROZEN.scenarioSearchAfterProvider,
      scoreMovementPermitted: FROZEN.scoreMovementPermitted,
      standingBands: structuredClone(FROZEN.standingBands),
    },
    request: { requestFingerprint: FROZEN.requestFingerprint },
    guardian: { promptHash: FROZEN.guardianPromptHash },
    providerCalls: 0,
    structurallyReady: true,
    pairs: FROZEN.pairs.map((pair) => ({
      ...structuredClone(pair),
      isolation: {
        workerBoundaryExact: true,
        nonMemoryEvidenceHeldConstant: true,
        changedSourceContentRefs: [pair.targetMemoryRef],
      },
    })),
  };
}

test("Slice D freeze pins the five prospective born-Thread pairs before provider use", () => {
  assert.equal(FROZEN.providerCallsAtFreeze, 0);
  assert.equal(FROZEN.frozenFromHead, "7f8ebc8ccf0b76ecd713e1b44c0c0beb3fbfe50c");
  assert.equal(FROZEN.pairs.length, 5);
  assert.deepEqual(
    FROZEN.pairs.map((pair) => pair.fibreIdentityNumber),
    ["8PKH-A4-VH5R", "EBYE-Z1-0434", "NXR7-DH-C885", "QA00-HG-BAJF", "S22Y-SF-MWY5"],
  );
  assert.deepEqual(
    FROZEN.pairs.map((pair) => pair.conditionOrder.join("->")),
    [
      "canonical->counterfactual",
      "counterfactual->canonical",
      "canonical->counterfactual",
      "counterfactual->canonical",
      "canonical->counterfactual",
    ],
  );
  assert.equal(new Set(FROZEN.pairs.map((pair) => pair.targetMemoryRef)).size, 5);
  assert.equal(new Set(FROZEN.pairs.map((pair) => pair.replacementMemoryRef)).size, 5);
  assert.equal(FROZEN.callsPerCondition, 1);
  assert.equal(FROZEN.rerunAfterSubstantiveResult, false);
  assert.equal(FROZEN.scenarioSearchAfterProvider, false);
  assert.equal(FROZEN.scoreMovementPermitted, false);
});

test("Slice D frozen-instrument checker rejects drift in a frozen pair", () => {
  const valid = reportFromFreeze();
  assert.equal(assertFrozenIdentityContextCausalDifferential(valid), true);

  const drifted = reportFromFreeze();
  drifted.pairs[0].canonicalCapsuleDigest = `sha256:${"0".repeat(64)}`;
  assert.throws(
    () => assertFrozenIdentityContextCausalDifferential(drifted),
    /deepStrictEqual|Expected values to be strictly deep-equal/,
  );
});

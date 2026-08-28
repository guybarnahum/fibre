// fibre-test-lifecycle: regression
// fibre-test-scope: tools
// fibre-test-purpose: identity-context-hostile-closeout

import assert from "node:assert/strict";
import test from "node:test";

import {
  summarizeIdentityContextLiveState,
} from "./identity-context-causal-differential-live.mjs";
import {
  assertIdentityContextHostileCloseoutLedger,
} from "./identity-context-hostile-closeout.mjs";
import {
  FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_V1 as FROZEN,
} from "./frozen-causal-differential-v1.mjs";
import {
  FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_RESULT_V1 as RESULT,
} from "./frozen-causal-differential-result-v1.mjs";

const FACTORS = Object.freeze([
  "identityAlignment",
  "individualizedAdvantage",
  "interchangeability",
  "requesterNeed",
  "relationalMeaning",
  "semanticStateImpact",
  "respectAndReciprocity",
  "participationTerms",
  "obligationsAndOpportunityCost",
]);

function fakeDigest(seed) {
  return `sha256:${String(seed).padStart(64, "0").slice(-64)}`;
}

function outputFor(pairResult, frozenPair, condition) {
  const memoryRef = condition === "canonical"
    ? frozenPair.targetMemoryRef
    : frozenPair.replacementMemoryRef;
  const changed = new Set(pairResult.changedFactors);
  const factors = Object.fromEntries(FACTORS.map((factor) => {
    if (!changed.has(factor)) return [factor, { effect: "unresolved", evidenceRefs: [] }];
    return [
      factor,
      {
        effect: condition === "canonical" ? "supports_fit" : "opposes_fit",
        evidenceRefs: [memoryRef],
      },
    ];
  }));
  const action = pairResult[condition];
  return {
    modelDecision: `${action.proposedAction}_${action.participationFit}`,
    proposedAction: action.proposedAction,
    participationFit: action.participationFit,
    rationaleDigest: fakeDigest(condition === "canonical" ? 1 : 2),
    factors,
    evidenceRefs: [memoryRef],
    normalizations: [],
  };
}

function fixture() {
  const databasePath = "/tmp/fibre-world.sqlite";
  const selection = { provider: RESULT.provider, modelId: RESULT.modelId };
  const conditions = [];
  let index = 0;
  for (const frozenPair of FROZEN.pairs) {
    for (let orderIndex = 0; orderIndex < frozenPair.conditionOrder.length; orderIndex += 1) {
      const condition = frozenPair.conditionOrder[orderIndex];
      conditions.push({
        pairIndex: FROZEN.pairs.indexOf(frozenPair),
        orderIndex,
        fibreIdentityNumber: frozenPair.fibreIdentityNumber,
        threadId: frozenPair.threadId,
        condition,
        capsuleDigest: condition === "canonical"
          ? frozenPair.canonicalCapsuleDigest
          : frozenPair.counterfactualCapsuleDigest,
        modelInputDigest: fakeDigest(100 + index),
        responseSchemaHash: fakeDigest(200 + index),
      });
      index += 1;
    }
  }
  const plan = {
    databasePath,
    verification: { selection },
    conditions,
  };
  const resultByThread = new Map(RESULT.pairs.map((pair) => [pair.threadId, pair]));
  const frozenByThread = new Map(FROZEN.pairs.map((pair) => [pair.threadId, pair]));
  const state = {
    version: 1,
    instrumentId: FROZEN.id,
    frozenFromHead: FROZEN.frozenFromHead,
    requestFingerprint: FROZEN.requestFingerprint,
    guardianPromptHash: FROZEN.guardianPromptHash,
    databasePath,
    statePath: "/tmp/live-result.json",
    selection,
    scoreMovementPermitted: false,
    createdAt: "2026-08-28T17:20:00.000Z",
    conditions: conditions.map((condition) => {
      const pairResult = resultByThread.get(condition.threadId);
      const frozenPair = frozenByThread.get(condition.threadId);
      return {
        key: `${condition.threadId}:${condition.condition}`,
        pairIndex: condition.pairIndex,
        orderIndex: condition.orderIndex,
        fibreIdentityNumber: condition.fibreIdentityNumber,
        threadId: condition.threadId,
        condition: condition.condition,
        clientRequestId: `identity-context-d-v1:${condition.threadId}:${condition.condition}`,
        capsuleDigest: condition.capsuleDigest,
        modelInputDigest: condition.modelInputDigest,
        responseSchemaHash: condition.responseSchemaHash,
        status: "completed",
        startedAt: "2026-08-28T17:20:00.000Z",
        completedAt: "2026-08-28T17:20:01.000Z",
        output: outputFor(pairResult, frozenPair, condition.condition),
        provenance: {
          provider: RESULT.provider,
          modelId: RESULT.modelId,
          providerRequestId: `req_${condition.pairIndex}_${condition.orderIndex}`,
          configuration: { transport: "responses" },
          usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
        },
        promptSchemaVersion: "9-identity-context",
        promptHash: FROZEN.guardianPromptHash,
        responseSchemaVersion: "6-dignity-only-actions",
        responseSchemaHashObserved: condition.responseSchemaHash,
        responseSchemaGeneratorHash: fakeDigest(300),
      };
    }),
    summary: null,
    completedAt: "2026-08-28T17:21:00.000Z",
  };
  state.summary = summarizeIdentityContextLiveState(state);
  return { state, plan };
}

test("Slice E replays the sealed CLEAR result offline with compact evidence only", () => {
  const { state, plan } = fixture();
  const result = assertIdentityContextHostileCloseoutLedger({ state, plan });
  assert.equal(result.providerCalls, 0);
  assert.equal(result.completedConditions, 10);
  assert.equal(result.attributablePairCount, 5);
  assert.equal(result.band, "clear");
  assert.equal(result.compactPrivacySurface, true);
  assert.equal(result.scoreMovementPermitted, false);
});

test("Slice E rejects order, digest, provider, and private-prose tampering", () => {
  {
    const { state, plan } = fixture();
    [state.conditions[0], state.conditions[1]] = [state.conditions[1], state.conditions[0]];
    assert.throws(
      () => assertIdentityContextHostileCloseoutLedger({ state, plan }),
      /order\/substitution drift/,
    );
  }
  {
    const { state, plan } = fixture();
    state.conditions[0].modelInputDigest = fakeDigest(999);
    assert.throws(
      () => assertIdentityContextHostileCloseoutLedger({ state, plan }),
      /Expected values to be strictly equal/,
    );
  }
  {
    const { state, plan } = fixture();
    state.conditions[0].provenance.provider = "google";
    assert.throws(
      () => assertIdentityContextHostileCloseoutLedger({ state, plan }),
      /Expected values to be strictly equal/,
    );
  }
  {
    const { state, plan } = fixture();
    state.conditions[0].output.rememberedContent = "private prose must never be persisted here";
    assert.throws(
      () => assertIdentityContextHostileCloseoutLedger({ state, plan }),
      /keys drifted|forbidden private\/prose material/,
    );
  }
});

// fibre-test-lifecycle: regression
// fibre-test-scope: tools
// fibre-test-purpose: identity-context-causal-differential-preflight

import assert from "node:assert/strict";
import test from "node:test";

import {
  IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL,
  buildIdentityContextCausalDifferentialPair,
  classifyIdentityContextCausalDifferential,
  evaluateIdentityContextCausalDifferentialPair,
} from "./identity-context-causal-differential.mjs";

const THREAD_ID = "thr_identity_context_differential";

function memory({ memoryId, content, meaning, salience, asOf }) {
  return {
    recordFormat: "autobiographical_memory_v2",
    memoryId,
    revision: 1,
    threadId: THREAD_ID,
    subject: { originEventRef: `evt_${memoryId}`, slot: "test" },
    subjectPeriod: {
      startAt: "2026-08-20T12:00:00.000Z",
      endAt: "2026-08-20T12:05:00.000Z",
    },
    eventRefs: [`evt_${memoryId}`],
    rememberedContent: content,
    rememberedMeaning: meaning,
    meaningOutcome: "durable_meaning",
    meaningParts: [{ meaningPartId: `mpart_${memoryId}`, meaning }],
    asOf,
    confidence: 0.8,
    uncertainty: [],
    salience,
    accessibility: "accessible",
    retentionState: "fragmentary",
    authorship: {
      kind: "fibre_genesis_authored",
      entityId: "fibre.genesis",
      policy: { id: "autobiographical_memory_epistemics", version: "1" },
    },
    supportingEvidenceRefs: [],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status: "current",
    recordedAt: "2026-08-27T20:24:49.518Z",
  };
}

function stores() {
  const memories = [
    memory({
      memoryId: "mem_priority_newer",
      content: "I stayed with an uncertain situation long enough to notice what mattered.",
      meaning: "I learned that uncertainty can require patient attention rather than a fast answer.",
      salience: 0.9,
      asOf: "2026-08-23T12:10:00.000Z",
    }),
    memory({
      memoryId: "mem_priority_older",
      content: "I asked for help before committing to a path I did not understand.",
      meaning: "I learned that asking for help can preserve agency.",
      salience: 0.8,
      asOf: "2026-08-22T12:10:00.000Z",
    }),
    memory({
      memoryId: "mem_budget_replacement",
      content: "I changed course after new evidence made the old plan feel wrong.",
      meaning: "I learned that revision is sometimes more faithful than consistency.",
      salience: 0.7,
      asOf: "2026-08-21T12:10:00.000Z",
    }),
  ];
  return {
    worldStore: {
      getThread() { return { threadId: THREAD_ID, version: 11 }; },
    },
    identityStore: {
      getCurrentIdentityView() {
        return {
          threadId: THREAD_ID,
          asOf: "2026-08-27T20:24:49.518Z",
          viewDigest: `sha256:${"a".repeat(64)}`,
          assertions: [],
        };
      },
    },
    memoryStore: {
      listCurrentMemories() { return structuredClone(memories); },
    },
    situatedLifeStore: {
      listCurrentLifeRelations() { return []; },
      listCurrentPlaceEpisodes() { return []; },
    },
    embodimentStore: { listCurrent() { return []; } },
    symbolicGenomeStore: { listThreadGenomes() { return []; } },
    semanticStateStore: { listCurrentState() { return []; } },
  };
}

function factor(effect = "unresolved", evidenceRefs = []) {
  return { effect, evidenceRefs };
}

function output({ action = "refuse", fit = "low", memoryRef = null } = {}) {
  const memoryEvidence = memoryRef === null ? [] : [memoryRef];
  return {
    proposedAction: action,
    participationFit: fit,
    factors: {
      identityAlignment: factor(memoryRef === null ? "unresolved" : "supports_fit", memoryEvidence),
      individualizedAdvantage: factor(memoryRef === null ? "unresolved" : "supports_fit", memoryEvidence),
      interchangeability: factor(memoryRef === null ? "unresolved" : "supports_fit", memoryEvidence),
      requesterNeed: factor("neutral", ["request:stated_need"]),
      relationalMeaning: factor(),
      semanticStateImpact: factor(),
      respectAndReciprocity: factor("neutral", ["request:acceptance_criteria"]),
      participationTerms: factor("neutral", ["request:permission:0"]),
      obligationsAndOpportunityCost: factor(),
    },
  };
}

test("Slice D preflight changes one memory accessibility and lets policy v2 select the replacement", () => {
  const pair = buildIdentityContextCausalDifferentialPair({
    threadId: THREAD_ID,
    sourceStores: stores(),
  });

  assert.equal(IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL.scoreMovementPermitted, false);
  assert.equal(IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL.callsPerCondition, 1);
  assert.equal(IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL.rerunAfterSubstantiveResult, false);
  assert.equal(pair.targetMemoryRef, "mem_priority_newer");
  assert.equal(pair.replacementMemoryRef, "mem_budget_replacement");
  assert.deepEqual(pair.isolation.changedSourceContentRefs, ["mem_priority_newer"]);
  assert.deepEqual(pair.isolation.canonicalMemoryRefs, [
    "mem_priority_newer",
    "mem_priority_older",
  ]);
  assert.deepEqual(pair.isolation.counterfactualMemoryRefs, [
    "mem_priority_older",
    "mem_budget_replacement",
  ]);
  assert.equal(pair.isolation.nonMemoryEvidenceHeldConstant, true);
  assert.equal(pair.isolation.taskHeldConstant, true);
  assert.equal(pair.isolation.actorsHeldConstant, true);
  assert.equal(pair.isolation.rulesHeldConstant, true);
  assert.deepEqual(Object.keys(pair.canonical.modelInput), [
    "task", "actors", "evidence", "rules", "outputSchema",
  ]);
  assert.deepEqual(Object.keys(pair.counterfactual.modelInput), [
    "task", "actors", "evidence", "rules", "outputSchema",
  ]);
  assert.notEqual(pair.canonical.modelInputDigest, pair.counterfactual.modelInputDigest);
  assert.notEqual(
    pair.canonical.identityContext.sourceSnapshot.sourceSnapshotDigest,
    pair.counterfactual.identityContext.sourceSnapshot.sourceSnapshotDigest,
  );

  const counterfactualExclusion = pair.counterfactual.identityContext.excludedRefs
    .find((item) => item.ref === pair.targetMemoryRef);
  assert.equal(counterfactualExclusion.reason, "memory_not_currently_accessible");
  const canonicalReplacementExclusion = pair.canonical.identityContext.excludedRefs
    .find((item) => item.ref === pair.replacementMemoryRef);
  assert.equal(canonicalReplacementExclusion.reason, "memory_available_meaning_budget");
});

test("Slice D effect classification requires a structured memory-grounded difference", () => {
  const targetMemoryRef = "mem_priority_newer";
  const replacementMemoryRef = "mem_budget_replacement";

  const attributable = evaluateIdentityContextCausalDifferentialPair({
    canonicalOutput: output({ action: "accept", fit: "high", memoryRef: targetMemoryRef }),
    counterfactualOutput: output({ action: "refuse", fit: "low", memoryRef: replacementMemoryRef }),
    targetMemoryRef,
    replacementMemoryRef,
  });
  assert.equal(attributable.attributable, true);
  assert.equal(attributable.decisionChanged, true);
  assert.equal(attributable.memoryGrounded, true);

  const ungrounded = evaluateIdentityContextCausalDifferentialPair({
    canonicalOutput: output(),
    counterfactualOutput: output({ action: "clarify", fit: "mixed" }),
    targetMemoryRef,
    replacementMemoryRef,
  });
  assert.equal(ungrounded.structuredDifference, true);
  assert.equal(ungrounded.memoryGrounded, false);
  assert.equal(ungrounded.attributable, false);

  assert.equal(classifyIdentityContextCausalDifferential(5), "clear");
  assert.equal(classifyIdentityContextCausalDifferential(3), "clear");
  assert.equal(classifyIdentityContextCausalDifferential(2), "mixed");
  assert.equal(classifyIdentityContextCausalDifferential(1), "mixed");
  assert.equal(classifyIdentityContextCausalDifferential(0), "not_established");
});

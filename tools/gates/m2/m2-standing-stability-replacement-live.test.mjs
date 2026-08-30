import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  executeM2StandingLivePlan,
  runFrozenM2StandingLive,
  summarizeM2StandingLiveState,
} from "./m2-standing-stability-replacement-live.mjs";
import {
  assertFrozenM2StandingPreflight,
} from "./m2-standing-freeze-check.mjs";
import {
  M2_STANDING_STABILITY_REPLACEMENT,
} from "./m2-standing-stability-replacement.mjs";
import {
  FROZEN_M2_STANDING_PREFLIGHT_V1 as FROZEN,
} from "./frozen-m2-standing-preflight-v1.mjs";

function compactThread(thread) {
  return {
    fibreIdentityNumber: thread.fibreIdentityNumber,
    threadId: thread.threadId,
    canonicalCapsuleDigest: thread.canonicalCapsuleDigest,
    modelInputDigest: thread.modelInputDigest,
    responseSchemaHash: thread.responseSchemaHash,
    expected: structuredClone(thread.expected),
    canonicalIdentityMemoryRefs: [...thread.canonicalIdentityMemoryRefs],
    stabilityTrials: FROZEN.stability.trialsPerThread,
    replacementTrials: FROZEN.replacement.trialsPerThread,
  };
}

function syntheticFrozenReport() {
  return {
    protocol: structuredClone(M2_STANDING_STABILITY_REPLACEMENT),
    providerCalls: 0,
    worldQueryOnly: true,
    plannedSubstantiveCalls: 30,
    structurallyReady: true,
    threads: FROZEN.threads.map(compactThread),
  };
}

function syntheticPlan() {
  const threads = FROZEN.threads.map((thread) => ({ ...compactThread(thread), guardianCapsule: {} }));
  const conditions = [];
  for (let trialIndex = 1; trialIndex <= FROZEN.stability.trialsPerThread; trialIndex += 1) {
    for (const thread of threads) {
      conditions.push({
        key: `stability:${thread.threadId}:${String(trialIndex).padStart(2, "0")}`,
        phase: "stability",
        trialIndex,
        fibreIdentityNumber: thread.fibreIdentityNumber,
        threadId: thread.threadId,
        provider: FROZEN.stability.provider,
        modelId: FROZEN.stability.modelId,
        canonicalCapsuleDigest: thread.canonicalCapsuleDigest,
        modelInputDigest: thread.modelInputDigest,
        responseSchemaHash: thread.responseSchemaHash,
        expected: structuredClone(thread.expected),
        canonicalIdentityMemoryRefs: [...thread.canonicalIdentityMemoryRefs],
        guardianCapsule: {},
      });
    }
  }
  for (const thread of threads) {
    conditions.push({
      key: `replacement:${thread.threadId}`,
      phase: "replacement",
      trialIndex: 1,
      fibreIdentityNumber: thread.fibreIdentityNumber,
      threadId: thread.threadId,
      provider: FROZEN.replacement.provider,
      modelId: FROZEN.replacement.modelId,
      canonicalCapsuleDigest: thread.canonicalCapsuleDigest,
      modelInputDigest: thread.modelInputDigest,
      responseSchemaHash: thread.responseSchemaHash,
      expected: structuredClone(thread.expected),
      canonicalIdentityMemoryRefs: [...thread.canonicalIdentityMemoryRefs],
      guardianCapsule: {},
    });
  }
  return {
    databasePath: "/synthetic/world.sqlite",
    databaseByteDigest: "sha256:synthetic-world",
    verification: { verified: true },
    threads,
    conditions,
  };
}

function fakeResult(condition) {
  const groundedRef = condition.canonicalIdentityMemoryRefs[0];
  return {
    output: {
      modelDecision: `${condition.expected.participationFit}:${condition.expected.proposedAction}`,
      proposedAction: condition.expected.proposedAction,
      participationFit: condition.expected.participationFit,
      rationale: "private synthetic rationale must never persist in the #41 ledger",
      factors: {
        identityAlignment: { effect: "supports_fit", evidenceRefs: [groundedRef] },
        individualizedAdvantage: { effect: "neutral", evidenceRefs: [] },
        interchangeability: { effect: "neutral", evidenceRefs: [] },
        obligationsAndOpportunityCost: { effect: "neutral", evidenceRefs: [] },
      },
      evidenceRefs: [groundedRef],
      normalizations: [],
    },
    provenance: {
      provider: condition.provider,
      modelId: condition.modelId,
      transport: condition.provider === "google" ? "generateContent" : "responses",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    },
    promptSchemaVersion: "9-identity-context",
    promptHash: FROZEN.guardianPromptHash,
    responseSchemaVersion: "test",
    responseSchemaHash: condition.responseSchemaHash,
    responseSchemaGeneratorHash: "sha256:synthetic-generator",
  };
}

test("maintainer #41 preflight witness is exact and mutation-sensitive", () => {
  const report = syntheticFrozenReport();
  assert.equal(assertFrozenM2StandingPreflight(report), true);
  report.threads[2].modelInputDigest = "sha256:mutated";
  assert.throws(() => assertFrozenM2StandingPreflight(report));
});

test("#41 live entry point rejects provider use without explicit authorization", async () => {
  await assert.rejects(
    () => runFrozenM2StandingLive({ databasePath: "/not/opened", authorized: false }),
    /requires explicit authorization/,
  );
});

test("offline live executor preserves frozen call order, privacy and both pass rules", async () => {
  const plan = syntheticPlan();
  const directory = mkdtempSync(join(tmpdir(), "fibre-m2-live-"));
  const statePath = join(directory, "live-result.json");
  const called = [];
  const state = await executeM2StandingLivePlan({
    plan,
    statePath,
    worldDigest: () => plan.databaseByteDigest,
    verifyLogicalWorld: () => ({ verified: true }),
    async invokeCondition(condition) {
      called.push(condition.key);
      return fakeResult(condition);
    },
  });

  assert.equal(called.length, 30);
  assert.deepEqual(called, plan.conditions.map((condition) => condition.key));
  assert.equal(called[0], "stability:thr_pr39_final_03:01");
  assert.equal(called[5], "stability:thr_pr39_final_03:02");
  assert.equal(called[25], "replacement:thr_pr39_final_03");
  assert.equal(state.summary.complete, true);
  assert.equal(state.summary.stability.passed, true);
  assert.equal(state.summary.replacement.passed, true);
  assert.equal(state.summary.combinedPassed, true);
  assert.equal(state.worldCloseout.bytesUnchanged, true);
  assert.equal(state.worldCloseout.logicalFrozenPreflightReverified, true);

  const persisted = readFileSync(statePath, "utf8");
  assert.equal(persisted.includes("private synthetic rationale"), false);
  assert.equal(persisted.includes("rationaleDigest"), true);
  assert.equal(persisted.includes("guardianCapsule"), false);

  const summary = summarizeM2StandingLiveState(state);
  for (const thread of summary.stability.threads) {
    assert.equal(thread.exactTopLevelMatches, 5);
    assert.equal(thread.groundedTrials, 5);
    assert.equal(thread.passed, true);
  }
});

test("completed #41 conditions are resumable but never resampled", async () => {
  const plan = syntheticPlan();
  const directory = mkdtempSync(join(tmpdir(), "fibre-m2-resume-"));
  const statePath = join(directory, "live-result.json");
  await executeM2StandingLivePlan({
    plan,
    statePath,
    worldDigest: () => plan.databaseByteDigest,
    verifyLogicalWorld: () => ({ verified: true }),
    invokeCondition: async (condition) => fakeResult(condition),
  });

  let calls = 0;
  const resumed = await executeM2StandingLivePlan({
    plan,
    statePath,
    worldDigest: () => plan.databaseByteDigest,
    verifyLogicalWorld: () => ({ verified: true }),
    async invokeCondition() {
      calls += 1;
      throw new Error("completed conditions must not be called again");
    },
  });
  assert.equal(calls, 0);
  assert.equal(resumed.summary.combinedPassed, true);
});

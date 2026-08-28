// fibre-test-lifecycle: regression
// fibre-test-scope: tools
// fibre-test-purpose: identity-context-causal-differential-live-ledger

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  executeIdentityContextLivePlan,
  summarizeIdentityContextLiveState,
} from "./identity-context-causal-differential-live.mjs";
import {
  FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_V1 as FROZEN,
} from "./frozen-causal-differential-v1.mjs";

const FACTORS = [
  "identityAlignment",
  "individualizedAdvantage",
  "interchangeability",
  "requesterNeed",
  "relationalMeaning",
  "semanticStateImpact",
  "respectAndReciprocity",
  "participationTerms",
  "obligationsAndOpportunityCost",
];

function fakePlan() {
  const conditions = FROZEN.pairs.flatMap((pair, pairIndex) =>
    pair.conditionOrder.map((condition, orderIndex) => ({
      pairIndex,
      orderIndex,
      fibreIdentityNumber: pair.fibreIdentityNumber,
      threadId: pair.threadId,
      condition,
      targetMemoryRef: pair.targetMemoryRef,
      replacementMemoryRef: pair.replacementMemoryRef,
      guardianCapsule: null,
      capsuleDigest: condition === "canonical"
        ? pair.canonicalCapsuleDigest
        : pair.counterfactualCapsuleDigest,
      modelInputDigest: `sha256:${String(pairIndex * 2 + orderIndex).padStart(64, "0")}`,
      responseSchemaHash: `sha256:${String(pairIndex * 2 + orderIndex + 10).padStart(64, "0")}`,
    })),
  );
  return {
    databasePath: "/tmp/frozen-world.sqlite",
    verification: {
      selection: {
        provider: FROZEN.liveModel.provider,
        modelId: FROZEN.liveModel.modelId,
      },
    },
    conditions,
  };
}

function resultFor(condition) {
  const pair = FROZEN.pairs.find((candidate) => candidate.threadId === condition.threadId);
  const memoryRef = condition.condition === "canonical"
    ? pair.targetMemoryRef
    : pair.replacementMemoryRef;
  const canonical = condition.condition === "canonical";
  const factors = Object.fromEntries(FACTORS.map((factor) => [
    factor,
    {
      status: "grounded",
      effect: ["identityAlignment", "individualizedAdvantage", "interchangeability"].includes(factor)
        ? (canonical ? "supports_fit" : "opposes_fit")
        : "neutral",
      summary: "test",
      evidenceRefs: ["identityAlignment", "individualizedAdvantage", "interchangeability"].includes(factor)
        ? [memoryRef]
        : ["request:objective"],
    },
  ]));
  return {
    output: {
      modelDecision: canonical ? "fit_high__accept" : "fit_mixed__clarify",
      proposedAction: canonical ? "accept" : "clarify",
      participationFit: canonical ? "high" : "mixed",
      rationale: "Provider-free live-ledger regression output.",
      factors,
      evidenceRefs: [memoryRef],
      normalizations: [],
    },
    provenance: { provider: "scripted", modelId: "provider-free-test" },
    promptSchemaVersion: "9-identity-context",
    promptHash: FROZEN.guardianPromptHash,
    responseSchemaVersion: "6-dignity-only-actions",
    responseSchemaHash: condition.responseSchemaHash,
    responseSchemaGeneratorHash: `sha256:${"f".repeat(64)}`,
  };
}

test("Slice D live ledger completes ten frozen conditions once and never invokes them again", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-identity-context-live-"));
  const statePath = join(directory, "live.json");
  let invocations = 0;
  try {
    const plan = fakePlan();
    const first = await executeIdentityContextLivePlan({
      plan,
      statePath,
      async invokeCondition(condition) {
        invocations += 1;
        return resultFor(condition);
      },
    });
    assert.equal(invocations, 10);
    assert.equal(first.conditions.filter((item) => item.status === "completed").length, 10);
    const summary = summarizeIdentityContextLiveState(first);
    assert.equal(summary.complete, true);
    assert.equal(summary.attributablePairCount, 5);
    assert.equal(summary.band, "clear");

    const second = await executeIdentityContextLivePlan({
      plan,
      statePath,
      async invokeCondition() {
        invocations += 1;
        throw new Error("completed conditions must never be invoked again");
      },
    });
    assert.equal(invocations, 10);
    assert.equal(second.summary.band, "clear");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Slice D live ledger refuses automatic resampling after a failed condition", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-identity-context-live-failed-"));
  const statePath = join(directory, "live.json");
  let invocations = 0;
  try {
    const plan = fakePlan();
    await assert.rejects(
      executeIdentityContextLivePlan({
        plan,
        statePath,
        async invokeCondition() {
          invocations += 1;
          throw new Error("simulated provider failure");
        },
      }),
      /simulated provider failure/,
    );
    assert.equal(invocations, 1);

    await assert.rejects(
      executeIdentityContextLivePlan({
        plan,
        statePath,
        async invokeCondition() {
          invocations += 1;
          return null;
        },
      }),
      /refuses to resample.*prior status is failed/,
    );
    assert.equal(invocations, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

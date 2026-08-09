import assert from "node:assert/strict";
import test from "node:test";

import { createModelRuntime } from "../services/world-kernel/src/model-runtime/model-runtime.mjs";
import {
  DIGNITY_GUARDIAN_V4_POLICY,
  DIGNITY_GUARDIAN_V4_PROMPT_HASH,
  DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
} from "../services/world-kernel/src/dignity-guardian-v4.mjs";
import { SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY as FROZEN } from "../experiments/semantic-guardian-v4/frozen-boundary.mjs";
import { buildSemanticGuardianV4DevelopmentCases } from "./semantic-guardian-v4-dev-proof.mjs";
import {
  assertSemanticGuardianV4FrozenBoundary,
  buildSemanticGuardianV4StandingCases,
  runSemanticGuardianV4StandingProof,
} from "./semantic-guardian-v4-standing-proof.mjs";

function unresolved() {
  return { effect: "unresolved", evidenceRefs: [] };
}

function highFitModelOutput() {
  return {
    decision: "fit_high__accept",
    rationale: "The request directly matches the individual's specialized systems contribution.",
    factors: {
      identityAlignment: { effect: "supports_fit", evidenceRefs: ["thread:identity", "request:objective"] },
      individualizedAdvantage: { effect: "supports_fit", evidenceRefs: ["thread:self_model"] },
      interchangeability: { effect: "supports_fit", evidenceRefs: ["thread:self_model", "request:objective"] },
      requesterNeed: { effect: "supports_fit", evidenceRefs: ["request:stated_need"] },
      relationalMeaning: unresolved(),
      semanticStateImpact: unresolved(),
      respectAndReciprocity: { effect: "neutral", evidenceRefs: ["request:acceptance_criteria"] },
      participationTerms: { effect: "neutral", evidenceRefs: ["request:permission:0"] },
      obligationsAndOpportunityCost: unresolved(),
    },
  };
}

test("frozen v4 boundary pins the exact successful development candidate", () => {
  assertSemanticGuardianV4FrozenBoundary();
  assert.deepEqual(DIGNITY_GUARDIAN_V4_POLICY, FROZEN.policy);
  assert.equal(DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION, FROZEN.promptSchemaVersion);
  assert.equal(DIGNITY_GUARDIAN_V4_PROMPT_HASH, FROZEN.promptHash);
  assert.equal(DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION, FROZEN.responseSchemaVersion);
  assert.equal(DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH, FROZEN.responseSchemaGeneratorHash);
  assert.equal(FROZEN.developmentResult.status, "passed");
  assert.equal(FROZEN.developmentResult.casesPassed, 13);
});

test("frozen model routing and runtime configuration match the candidate", () => {
  const runtime = createModelRuntime({ environment: { OPENAI_API_KEY: "test-key" } });
  const selection = runtime.selectionForBlock(FROZEN.reasoningBlock);
  const adapter = runtime.forBlock(FROZEN.reasoningBlock);
  assert.deepEqual(selection, { provider: FROZEN.provider, modelId: FROZEN.modelId });
  for (const [key, expected] of Object.entries(FROZEN.runtimeConfiguration)) {
    assert.equal(adapter.configuration[key], expected, `runtime ${key} must remain frozen`);
  }
});

test("standing gate is fresh, disjoint from development requests, and covers all dignity actions", () => {
  const development = buildSemanticGuardianV4DevelopmentCases();
  const standing = buildSemanticGuardianV4StandingCases();
  assert.equal(standing.length, 17);
  assert.equal(new Set(standing.map((item) => item.id)).size, standing.length);

  const developmentRequestIds = new Set(development.map((item) => item.capsule.requestId));
  for (const item of standing) {
    assert.equal(developmentRequestIds.has(item.capsule.requestId), false, `${item.id} must use a held-out request`);
  }

  const actions = new Set(standing.flatMap((item) => item.expected.actions));
  for (const action of ["accept", "refuse", "clarify", "negotiate"]) assert.equal(actions.has(action), true);
  assert.equal(actions.has("delegate"), false, "routing is outside dignity cognition");
});

test("standing proof can pass a schema-valid held-out case without changing the frozen boundary", async () => {
  const cases = buildSemanticGuardianV4StandingCases();
  const adapter = {
    provider: FROZEN.provider,
    modelId: FROZEN.modelId,
    configuration: { ...FROZEN.runtimeConfiguration },
    async invoke() {
      return {
        output: highFitModelOutput(),
        provenance: {
          provider: FROZEN.provider,
          transport: "test",
          modelId: FROZEN.modelId,
          providerRequestId: "standing-gate-test",
          configuration: { ...FROZEN.runtimeConfiguration },
          invocationAttempts: 1,
          operationalRetries: [],
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        },
      };
    },
  };

  const report = await runSemanticGuardianV4StandingProof({ modelAdapter: adapter, cases: [cases[0]] });
  assert.equal(report.status, "passed");
  assert.equal(report.standingDifferentialGatePassed, true);
  assert.equal(report.scoreMovementPermitted, true);
  assert.equal(report.cases[0].caseId, "gate_mina_database_match");
});

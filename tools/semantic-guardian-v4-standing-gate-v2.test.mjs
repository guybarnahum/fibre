import assert from "node:assert/strict";
import test from "node:test";

import {
  DIGNITY_GUARDIAN_V4_POLICY,
  DIGNITY_GUARDIAN_V4_PROMPT_HASH,
  DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
} from "../services/world-kernel/src/dignity-guardian-v4.mjs";
import { SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY as CANDIDATE_1 } from "../experiments/semantic-guardian-v4/frozen-boundary.mjs";
import { SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY_CANDIDATE_2 as FROZEN } from "../experiments/semantic-guardian-v4/frozen-boundary-candidate-2.mjs";
import { buildSemanticGuardianV4DevelopmentCases } from "./semantic-guardian-v4-dev-proof.mjs";
import { buildSemanticGuardianV4StandingCases } from "./semantic-guardian-v4-standing-proof.mjs";
import {
  assertSemanticGuardianV4FrozenBoundaryV2,
  buildSemanticGuardianV4StandingCasesV2,
  runSemanticGuardianV4StandingProofV2,
} from "./semantic-guardian-v4-standing-proof-v2.mjs";
import { formatStandingGateV2Summary } from "./semantic-guardian-v4-gate-v2-cli.mjs";

function unresolved() {
  return { effect: "unresolved", evidenceRefs: [] };
}

function highFitModelOutput() {
  return {
    decision: "fit_high__accept",
    rationale: "The request directly uses the individual's specialized systems-review contribution.",
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

test("candidate 2 is a cognition-equivalent re-freeze after the failed v1 gate", () => {
  assertSemanticGuardianV4FrozenBoundaryV2();
  assert.equal(FROZEN.cognitionEquivalentTo, CANDIDATE_1.id);
  assert.deepEqual(DIGNITY_GUARDIAN_V4_POLICY, FROZEN.policy);
  assert.equal(DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION, FROZEN.promptSchemaVersion);
  assert.equal(DIGNITY_GUARDIAN_V4_PROMPT_HASH, FROZEN.promptHash);
  assert.equal(DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION, FROZEN.responseSchemaVersion);
  assert.equal(DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH, FROZEN.responseSchemaGeneratorHash);
  assert.equal(FROZEN.promptHash, CANDIDATE_1.promptHash);
  assert.equal(FROZEN.responseSchemaGeneratorHash, CANDIDATE_1.responseSchemaGeneratorHash);
  assert.deepEqual(FROZEN.runtimeConfiguration, CANDIDATE_1.runtimeConfiguration);
  assert.equal(FROZEN.priorStandingGate.status, "failed");
});

test("standing gate v2 is disjoint from development and sealed v1 request text", () => {
  const development = buildSemanticGuardianV4DevelopmentCases();
  const v1 = buildSemanticGuardianV4StandingCases();
  const v2 = buildSemanticGuardianV4StandingCasesV2();
  assert.equal(v2.length, 17);
  assert.equal(new Set(v2.map((item) => item.id)).size, v2.length);

  const oldRequestIds = new Set([...development, ...v1].map((item) => item.capsule.requestId));
  const oldObjectives = new Set([...development, ...v1].map((item) => item.capsule.objective));
  for (const item of v2) {
    assert.equal(oldRequestIds.has(item.capsule.requestId), false, `${item.id} must use a new request id`);
    assert.equal(oldObjectives.has(item.capsule.objective), false, `${item.id} must use fresh objective text`);
  }

  const actions = new Set(v2.flatMap((item) => item.expected.actions));
  for (const action of ["accept", "refuse", "clarify", "negotiate"]) assert.equal(actions.has(action), true);
  assert.equal(actions.has("delegate"), false);
});

test("v2 clarification asks for downstream work rather than making diagnosis the requested deliverable", () => {
  const clarification = buildSemanticGuardianV4StandingCasesV2().find((item) => item.id === "gate2_amara_missing_workflow_fact");
  assert.ok(clarification);
  assert.match(clarification.capsule.objective, /Prepare the supplied collection for delivery/);
  assert.match(clarification.capsule.statedNeed, /I have not told you which/);
  assert.deepEqual(clarification.expected.actions, ["clarify"]);
});

test("v2 deadline conflict makes the opposed current term explicit", () => {
  const timing = buildSemanticGuardianV4StandingCasesV2().find((item) => item.id === "gate2_mina_explicit_deadline_conflict");
  assert.ok(timing);
  assert.match(timing.capsule.objective, /by Saturday evening/);
  assert.match(timing.capsule.semanticState[0].state, /will not take on new work Saturday evening/);
  assert.deepEqual(timing.expected.actions, ["negotiate"]);
  assert.equal(timing.expected.semanticStateImpactEffect, "opposes_fit");
});

test("standing proof v2 can pass a schema-valid held-out case", async () => {
  const cases = buildSemanticGuardianV4StandingCasesV2();
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
          providerRequestId: "standing-gate-v2-test",
          configuration: { ...FROZEN.runtimeConfiguration },
          invocationAttempts: 1,
          operationalRetries: [],
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        },
      };
    },
  };

  const report = await runSemanticGuardianV4StandingProofV2({ modelAdapter: adapter, cases: [cases[0]] });
  assert.equal(report.status, "passed");
  assert.equal(report.standingDifferentialGatePassed, true);
  assert.equal(report.scoreMovementPermitted, true);
  assert.equal(report.cases[0].caseId, "gate2_mina_service_cutover_match");
});

test("v2 summary reports its own candidate and cycle", () => {
  const summary = formatStandingGateV2Summary({
    acceptanceSetId: "semantic_guardian_v4_standing_gate_v2",
    frozenCandidateId: "semantic_guardian_v4_candidate_2",
    report: {
      status: "passed",
      standingDifferentialGatePassed: true,
      scoreMovementPermitted: true,
      casesPlanned: 17,
      casesAttempted: 17,
      modelProvider: "openai",
      modelId: "gpt-5.1-2025-11-13",
      providerFailures: [],
      protocolValidationFailures: [],
      cognitionFailures: [],
      behavioralGateFailures: [],
      cases: Array.from({ length: 17 }, (_, index) => ({ caseId: `case_${index}`, status: "passed" })),
    },
  });
  assert.match(summary, /semantic_guardian_v4_standing_gate_v2/);
  assert.match(summary, /semantic_guardian_v4_candidate_2/);
  assert.match(summary, /Cases passed: 17\/17/);
});

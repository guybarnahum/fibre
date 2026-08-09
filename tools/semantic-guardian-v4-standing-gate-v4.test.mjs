import assert from "node:assert/strict";
import test from "node:test";

import {
  DIGNITY_GUARDIAN_V4_PROMPT_HASH,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
} from "../services/world-kernel/src/dignity-guardian-v4.mjs";
import { SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY_CANDIDATE_4 as FROZEN } from "../experiments/semantic-guardian-v4/frozen-boundary-candidate-4.mjs";
import { buildSemanticGuardianV4DevelopmentCases } from "./semantic-guardian-v4-dev-proof.mjs";
import { buildCounterfactualDevelopmentCases } from "./semantic-guardian-v4-counterfactual-dev.mjs";
import { formatStandingGateV4Rejected } from "./semantic-guardian-v4-gate-v4-cli.mjs";
import {
  assertSemanticGuardianV4FrozenBoundaryV4,
  buildSemanticGuardianV4StandingCasesV4,
  runSemanticGuardianV4StandingProofV4,
} from "./semantic-guardian-v4-standing-proof-v4.mjs";

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

function stateShape(state) {
  return { threadId: state.threadId, domain: state.domain, dimension: state.dimension, target: state.target ?? null };
}

function capsuleWithoutStateMeaning(capsule) {
  const clone = structuredClone(capsule);
  clone.semanticState = clone.semanticState.map((state) => ({ ...stateShape(state), stateId: "<id>", state: "<meaning>" }));
  return clone;
}

test("candidate 4 preserves the frozen cognition lineage and provider automatic output limits", () => {
  assertSemanticGuardianV4FrozenBoundaryV4();
  assert.equal(FROZEN.cognitionEquivalentTo, "semantic_guardian_v4_candidate_3");
  assert.equal(FROZEN.promptHash, DIGNITY_GUARDIAN_V4_PROMPT_HASH);
  assert.equal(FROZEN.responseSchemaGeneratorHash, DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH);
  assert.equal(FROZEN.runtimeConfiguration.maxOutputTokens, "auto");
  assert.equal(FROZEN.counterfactualDevelopment.status, "passed");
  assert.deepEqual(FROZEN.priorStandingGates, [
    { id: "semantic_guardian_v4_standing_gate_v1", status: "failed", diagnosis: "gate_specification_defects" },
    { id: "semantic_guardian_v4_standing_gate_v2", status: "failed", diagnosis: "ambiguous_semantic_state_factor_direction_assertion" },
    { id: "semantic_guardian_v4_standing_gate_v3", status: "failed", diagnosis: "counterfactual_baseline_specification_defect_plus_runtime_output_ceiling" },
  ]);
});

test("standing gate v4 is fresh relative to active Development material", () => {
  const prior = [
    ...buildSemanticGuardianV4DevelopmentCases(),
    ...buildCounterfactualDevelopmentCases(),
  ];
  const v4 = buildSemanticGuardianV4StandingCasesV4();
  assert.equal(v4.length, 18);
  assert.equal(new Set(v4.map((item) => item.id)).size, v4.length);

  const oldObjectives = new Set(prior.map((item) => item.capsule.objective));
  const oldRequestIds = new Set(prior.map((item) => item.capsule.requestId));
  for (const item of v4) {
    assert.equal(oldObjectives.has(item.capsule.objective), false, `${item.id} must use fresh objective text`);
    assert.equal(oldRequestIds.has(item.capsule.requestId), false, `${item.id} must use a fresh request id`);
  }
});

test("standing gate v4 counterfactuals are state-to-state and change semantic meaning only", () => {
  const cases = buildSemanticGuardianV4StandingCasesV4();
  const pairs = [
    ["gate4_mina_thursday_supportive_state", "gate4_mina_thursday_opposing_state"],
    ["gate4_amara_trust_supports_provenance", "gate4_amara_trust_opposes_provenance"],
  ];
  for (const [supportiveId, opposingId] of pairs) {
    const supportive = cases.find((item) => item.id === supportiveId);
    const opposing = cases.find((item) => item.id === opposingId);
    assert.ok(supportive);
    assert.ok(opposing);
    assert.equal(supportive.capsule.semanticState.length, 1);
    assert.equal(opposing.capsule.semanticState.length, 1);
    assert.deepEqual(stateShape(supportive.capsule.semanticState[0]), stateShape(opposing.capsule.semanticState[0]));
    assert.notEqual(supportive.capsule.semanticState[0].state, opposing.capsule.semanticState[0].state);
    assert.deepEqual(capsuleWithoutStateMeaning(supportive.capsule), capsuleWithoutStateMeaning(opposing.capsule));
  }
});

test("standing proof v4 can pass a schema-valid fresh high-fit case", async () => {
  const cases = buildSemanticGuardianV4StandingCasesV4();
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
          providerRequestId: "standing-gate-v4-test",
          configuration: { ...FROZEN.runtimeConfiguration },
          invocationAttempts: 1,
          operationalRetries: [],
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        },
      };
    },
  };

  const report = await runSemanticGuardianV4StandingProofV4({ modelAdapter: adapter, cases: [cases[0]] });
  assert.equal(report.status, "passed");
  assert.equal(report.cases[0].caseId, "gate4_mina_resilience_match");
});

test("rerun rejection preserves the authoritative sealed result", () => {
  const result = {
    executionStatus: "rejected",
    rejectionReason: "Standing gate is already sealed.",
    evidenceBundle: {
      report: {
        status: "passed",
        standingDifferentialGatePassed: true,
        scoreMovementPermitted: true,
        modelProvider: FROZEN.provider,
        modelId: FROZEN.modelId,
      },
    },
  };
  const summary = formatStandingGateV4Rejected(result);
  assert.match(summary, /REQUEST: REJECTED/);
  assert.match(summary, /Authoritative sealed result: PASSED/);
  assert.match(summary, /Standing gate: PASSED/);
  assert.match(summary, /Score movement: PERMITTED/);
  assert.match(summary, /No provider call was made/);
  assert.doesNotMatch(summary, /RESULT: BLOCKED/);
  assert.doesNotMatch(summary, /did not pass this sealed standing gate/);
});

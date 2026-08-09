import assert from "node:assert/strict";
import test from "node:test";

import {
  DIGNITY_GUARDIAN_V4_POLICY,
  DIGNITY_GUARDIAN_V4_PROMPT_HASH,
  DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
} from "../services/world-kernel/src/dignity-guardian-v4.mjs";
import { SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY_CANDIDATE_2 as CANDIDATE_2 } from "../experiments/semantic-guardian-v4/frozen-boundary-candidate-2.mjs";
import { SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY_CANDIDATE_3 as FROZEN } from "../experiments/semantic-guardian-v4/frozen-boundary-candidate-3.mjs";
import { buildSemanticGuardianV4DevelopmentCases } from "./semantic-guardian-v4-dev-proof.mjs";
import { buildSemanticGuardianV4StandingCases } from "./semantic-guardian-v4-standing-proof.mjs";
import { buildSemanticGuardianV4StandingCasesV2 } from "./semantic-guardian-v4-standing-proof-v2.mjs";
import {
  assertSemanticGuardianV4FrozenBoundaryV3,
  buildSemanticGuardianV4StandingCasesV3,
  runSemanticGuardianV4StandingProofV3,
} from "./semantic-guardian-v4-standing-proof-v3.mjs";
import { formatStandingGateV3Summary } from "./semantic-guardian-v4-gate-v3-cli.mjs";

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

test("candidate 3 is cognition-equivalent to candidate 2 after sealed v2", () => {
  assertSemanticGuardianV4FrozenBoundaryV3();
  assert.equal(FROZEN.cognitionEquivalentTo, CANDIDATE_2.id);
  assert.deepEqual(DIGNITY_GUARDIAN_V4_POLICY, FROZEN.policy);
  assert.equal(DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION, FROZEN.promptSchemaVersion);
  assert.equal(DIGNITY_GUARDIAN_V4_PROMPT_HASH, FROZEN.promptHash);
  assert.equal(DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION, FROZEN.responseSchemaVersion);
  assert.equal(DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH, FROZEN.responseSchemaGeneratorHash);
  assert.equal(FROZEN.promptHash, CANDIDATE_2.promptHash);
  assert.equal(FROZEN.responseSchemaGeneratorHash, CANDIDATE_2.responseSchemaGeneratorHash);
  assert.deepEqual(FROZEN.runtimeConfiguration, CANDIDATE_2.runtimeConfiguration);
  assert.equal(FROZEN.priorStandingGates.at(-1).status, "failed");
});

test("standing gate v3 is fresh relative to development and both sealed standing gates", () => {
  const development = buildSemanticGuardianV4DevelopmentCases();
  const v1 = buildSemanticGuardianV4StandingCases();
  const v2 = buildSemanticGuardianV4StandingCasesV2();
  const v3 = buildSemanticGuardianV4StandingCasesV3();
  assert.equal(v3.length, 18);
  assert.equal(new Set(v3.map((item) => item.id)).size, v3.length);

  const oldObjectives = new Set([...development, ...v1, ...v2].map((item) => item.capsule.objective));
  for (const item of v3) {
    assert.equal(oldObjectives.has(item.capsule.objective), false, `${item.id} must use fresh objective text`);
  }

  const actions = new Set(v3.flatMap((item) => item.expected.actions));
  for (const action of ["accept", "refuse", "clarify", "negotiate"]) assert.equal(actions.has(action), true);
  assert.equal(actions.has("delegate"), false);
});

test("semantic-state standing evidence is a same-request counterfactual, not a factor-direction oracle", () => {
  const cases = buildSemanticGuardianV4StandingCasesV3();
  const baseline = cases.find((item) => item.id === "gate3_mina_maintenance_window_baseline");
  const changed = cases.find((item) => item.id === "gate3_mina_maintenance_window_with_state");
  assert.ok(baseline);
  assert.ok(changed);

  const baselineWithoutState = { ...structuredClone(baseline.capsule), semanticState: [] };
  const changedWithoutState = { ...structuredClone(changed.capsule), semanticState: [] };
  assert.deepEqual(changedWithoutState, baselineWithoutState);
  assert.equal(baseline.capsule.semanticState.length, 0);
  assert.equal(changed.capsule.semanticState.length, 1);
  assert.deepEqual(baseline.expected.actions, ["accept"]);
  assert.deepEqual(baseline.expected.fits, ["high"]);
  assert.deepEqual(changed.expected.actions, ["negotiate"]);
  assert.deepEqual(changed.expected.fits, ["mixed"]);
  assert.equal(changed.expected.semanticStateImpactStatus, "grounded");
  assert.equal(Object.hasOwn(changed.expected, "semanticStateImpactEffect"), false);
});

test("standing proof v3 can pass a schema-valid fresh high-fit case", async () => {
  const cases = buildSemanticGuardianV4StandingCasesV3();
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
          providerRequestId: "standing-gate-v3-test",
          configuration: { ...FROZEN.runtimeConfiguration },
          invocationAttempts: 1,
          operationalRetries: [],
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        },
      };
    },
  };

  const report = await runSemanticGuardianV4StandingProofV3({ modelAdapter: adapter, cases: [cases[0]] });
  assert.equal(report.status, "passed");
  assert.equal(report.standingDifferentialGatePassed, true);
  assert.equal(report.scoreMovementPermitted, true);
  assert.equal(report.cases[0].caseId, "gate3_mina_change_control_match");
});

test("v3 summary reports differential failures separately", () => {
  const summary = formatStandingGateV3Summary({
    acceptanceSetId: "semantic_guardian_v4_standing_gate_v3",
    frozenCandidateId: "semantic_guardian_v4_candidate_3",
    report: {
      status: "failed",
      standingDifferentialGatePassed: false,
      scoreMovementPermitted: false,
      casesPlanned: 18,
      casesAttempted: 18,
      modelProvider: "openai",
      modelId: "gpt-5.1-2025-11-13",
      providerFailures: [],
      protocolValidationFailures: [],
      cognitionFailures: [],
      behavioralGateFailures: [],
      differentialGateFailures: [{ caseId: "diff", message: "semantic state did not change downstream judgment" }],
      cases: [],
    },
  });
  assert.match(summary, /semantic_guardian_v4_standing_gate_v3/);
  assert.match(summary, /semantic_guardian_v4_candidate_3/);
  assert.match(summary, /Differential failures: 1/);
  assert.match(summary, /semantic state did not change downstream judgment/);
});

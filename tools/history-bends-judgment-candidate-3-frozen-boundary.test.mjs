import assert from "node:assert/strict";
import test from "node:test";

import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_2 } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-2.mjs";
import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_3 } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-3.mjs";
import { SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY_CANDIDATE_4 } from
  "../experiments/semantic-guardian-v4/frozen-boundary-candidate-4.mjs";
import {
  CAUSAL_CONTEXT_POLICY,
  MEMORY_RESOLUTION_POLICY,
} from "../services/world-kernel/src/causal-context.mjs";
import { EPISODE_EVIDENCE_POLICY } from "../services/world-kernel/src/episode-evidence.mjs";
import {
  DIGNITY_GUARDIAN_V4_POLICY,
  DIGNITY_GUARDIAN_V4_PROMPT_HASH,
  DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
} from "../services/world-kernel/src/dignity-guardian-v4.mjs";

const CANDIDATE_2 = HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_2;
const CANDIDATE_3 = HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_3;

function assertGitBlobSha(value) {
  assert.match(value, /^[0-9a-f]{40}$/);
}

test("history candidate 3 is a no-score cognition-equivalent re-freeze", () => {
  assert.equal(CANDIDATE_3.id, "history_bends_judgment_candidate_3");
  assert.equal(CANDIDATE_3.sourceHead, "2fde43a4b417bd86e9c5596cd7f9f6b765c259ec");
  assert.equal(CANDIDATE_3.predecessorCandidateId, CANDIDATE_2.id);
  assert.equal(CANDIDATE_3.cognitionEquivalentToCandidateId, CANDIDATE_2.id);
  assert.equal(CANDIDATE_3.frozenAfterDevelopmentSetId, CANDIDATE_2.frozenAfterDevelopmentSetId);
  assert.equal(CANDIDATE_3.scoreMovementPermitted, false);
  assert.equal(CANDIDATE_3.standingScenarioAuthored, false);

  assert.deepEqual(CANDIDATE_3.guardian, CANDIDATE_2.guardian);
  assert.deepEqual(CANDIDATE_3.modelRuntime, CANDIDATE_2.modelRuntime);
  assert.deepEqual(CANDIDATE_3.episodeMemory, CANDIDATE_2.episodeMemory);
  assert.deepEqual(CANDIDATE_3.retrieval, CANDIDATE_2.retrieval);
  assert.deepEqual(CANDIDATE_3.counterfactual, CANDIDATE_2.counterfactual);
  assert.deepEqual(CANDIDATE_3.sourceBlobs, CANDIDATE_2.sourceBlobs);
  assert.deepEqual(CANDIDATE_3.standingGatePreflight, CANDIDATE_2.standingGatePreflight);
});

test("history candidate 3 preserves both failed sealed predecessor gates", () => {
  assert.equal(CANDIDATE_3.priorStandingGates.length, 2);

  const [v1, v2] = CANDIDATE_3.priorStandingGates;
  assert.equal(v1.id, "history_bends_judgment_standing_gate_v1");
  assert.equal(v1.status, "failed_sealed");
  assert.equal(v1.differentialPassed, false);
  assert.equal(v1.rerunPermitted, false);

  assert.equal(v2.id, "history_bends_judgment_standing_gate_v2");
  assert.equal(v2.status, "failed_sealed");
  assert.equal(v2.failureClass, "standing_gate_evaluator_specification_defect");
  assert.deepEqual(v2.withHistory, { action: "accept", participationFit: "high" });
  assert.deepEqual(v2.withoutHistory, { action: "refuse", participationFit: "mixed" });
  assert.equal(v2.differentialPassed, true);
  assert.equal(v2.scoreMovementPermitted, false);
  assert.equal(v2.rerunPermitted, false);
});

test("candidate 3 evaluator freezes causal loss of high fit without prescribing a repair verb", () => {
  assert.deepEqual(CANDIDATE_3.acceptanceContract.withHistory, {
    action: "accept",
    participationFit: "high",
  });
  assert.deepEqual(
    CANDIDATE_3.acceptanceContract.withoutHistory.allowedParticipationFits,
    ["mixed", "low"],
  );
  assert.deepEqual(
    CANDIDATE_3.acceptanceContract.withoutHistory.allowedActions,
    ["clarify", "negotiate", "refuse"],
  );
  assert.equal(CANDIDATE_3.acceptanceContract.withoutHistory.highFitPermitted, false);
  assert.equal(CANDIDATE_3.acceptanceContract.withoutHistory.acceptPermitted, false);
  assert.equal(CANDIDATE_3.acceptanceContract.withoutHistory.actionVerbPrescribed, false);
  assert.equal(CANDIDATE_3.acceptanceContract.causalLossOfHighIndividualizedFitRequired, true);
  assert.equal(CANDIDATE_3.acceptanceContract.downstreamDifferentialRequired, true);

  assert.equal(CANDIDATE_3.standingMethodology.causalLossOfHighFitRequired, true);
  assert.equal(CANDIDATE_3.standingMethodology.nonAcceptActionVerbMustRemainUnprescribed, true);
  assert.equal(CANDIDATE_3.standingMethodology.causalConclusionMustComeFromRetainedHistory, true);
  assert.equal(CANDIDATE_3.standingMethodology.freshScenarioRequired, true);
  assert.equal(CANDIDATE_3.standingMethodology.authorFreshScenarioAfterFreezeOnly, true);
  assert.equal(CANDIDATE_3.standingMethodology.reuseRetiredStandingMaterialPermitted, false);
});

test("history candidate 3 still pins live Guardian and Fibre-owned memory policies", () => {
  assert.equal(
    CANDIDATE_3.guardian.candidateId,
    SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY_CANDIDATE_4.id,
  );
  assert.deepEqual(CANDIDATE_3.guardian.policy, DIGNITY_GUARDIAN_V4_POLICY);
  assert.equal(CANDIDATE_3.guardian.promptSchemaVersion, DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION);
  assert.equal(CANDIDATE_3.guardian.promptHash, DIGNITY_GUARDIAN_V4_PROMPT_HASH);
  assert.equal(
    CANDIDATE_3.guardian.responseSchemaVersion,
    DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
  );
  assert.equal(
    CANDIDATE_3.guardian.responseSchemaGeneratorHash,
    DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  );
  assert.deepEqual(CANDIDATE_3.episodeMemory.episodeEvidencePolicy, EPISODE_EVIDENCE_POLICY);
  assert.deepEqual(CANDIDATE_3.retrieval.selectionPolicy, CAUSAL_CONTEXT_POLICY);
  assert.deepEqual(CANDIDATE_3.retrieval.memoryResolutionPolicy, MEMORY_RESOLUTION_POLICY);
  for (const sha of Object.values(CANDIDATE_3.sourceBlobs)) assertGitBlobSha(sha);
});

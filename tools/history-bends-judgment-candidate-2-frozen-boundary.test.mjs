import assert from "node:assert/strict";
import test from "node:test";

import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_1 } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-1.mjs";
import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_2 } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-2.mjs";
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

const CANDIDATE_1 = HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_1;
const CANDIDATE_2 = HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_2;

function assertGitBlobSha(value) {
  assert.match(value, /^[0-9a-f]{40}$/);
}

test("history candidate 2 is a no-score cognition-equivalent re-freeze", () => {
  assert.equal(CANDIDATE_2.id, "history_bends_judgment_candidate_2");
  assert.equal(CANDIDATE_2.sourceHead, "c6678e41e81e5b2ffacce0a8c22dcc67a4730189");
  assert.equal(CANDIDATE_2.predecessorCandidateId, CANDIDATE_1.id);
  assert.equal(CANDIDATE_2.cognitionEquivalentToCandidateId, CANDIDATE_1.id);
  assert.equal(CANDIDATE_2.frozenAfterDevelopmentSetId, CANDIDATE_1.frozenAfterDevelopmentSetId);
  assert.equal(CANDIDATE_2.scoreMovementPermitted, false);
  assert.equal(CANDIDATE_2.standingScenarioAuthored, false);

  assert.deepEqual(CANDIDATE_2.guardian, CANDIDATE_1.guardian);
  assert.deepEqual(CANDIDATE_2.modelRuntime, CANDIDATE_1.modelRuntime);
  assert.deepEqual(CANDIDATE_2.episodeMemory, CANDIDATE_1.episodeMemory);
  assert.deepEqual(CANDIDATE_2.retrieval, CANDIDATE_1.retrieval);
  assert.deepEqual(CANDIDATE_2.counterfactual, CANDIDATE_1.counterfactual);
  assert.deepEqual(CANDIDATE_2.acceptanceContract, CANDIDATE_1.acceptanceContract);
  assert.deepEqual(CANDIDATE_2.sourceBlobs, CANDIDATE_1.sourceBlobs);
  assert.deepEqual(CANDIDATE_2.standingGatePreflight, CANDIDATE_1.standingGatePreflight);
});

test("history candidate 2 preserves the sealed standing-gate-v1 failure", () => {
  assert.equal(CANDIDATE_2.priorStandingGate.id, "history_bends_judgment_standing_gate_v1");
  assert.equal(CANDIDATE_2.priorStandingGate.status, "failed_sealed");
  assert.equal(
    CANDIDATE_2.priorStandingGate.failureClass,
    "standing_gate_specification_defect",
  );
  assert.deepEqual(CANDIDATE_2.priorStandingGate.withHistory, {
    action: "accept",
    participationFit: "high",
  });
  assert.deepEqual(CANDIDATE_2.priorStandingGate.withoutHistory, {
    action: "accept",
    participationFit: "high",
  });
  assert.equal(CANDIDATE_2.priorStandingGate.scoreMovementPermitted, false);
  assert.equal(CANDIDATE_2.priorStandingGate.rerunPermitted, false);
  assert.deepEqual(CANDIDATE_2.priorStandingGate.retiredStandingMaterial, [
    "Amara Reed",
    "Meridian Archive",
    "Rowan Collection",
  ]);
});

test("history candidate 2 freezes the anti-leak methodology before v2 scenario authorship", () => {
  assert.equal(
    CANDIDATE_2.standingMethodology.learnedFromStandingGateId,
    CANDIDATE_2.priorStandingGate.id,
  );
  assert.deepEqual(CANDIDATE_2.standingMethodology.prohibitedLaterRequestAssertions, [
    "thread_uniquely_required",
    "generic_substitution_inadequate",
    "prior_episode_creates_individualized_advantage",
  ]);
  assert.equal(CANDIDATE_2.standingMethodology.causalConclusionMustComeFromRetainedHistory, true);
  assert.equal(CANDIDATE_2.standingMethodology.freshScenarioRequired, true);
  assert.equal(CANDIDATE_2.standingMethodology.authorFreshScenarioAfterFreezeOnly, true);
  assert.equal(CANDIDATE_2.standingMethodology.reuseRetiredStandingMaterialPermitted, false);
});

test("history candidate 2 still pins live Guardian and Fibre-owned memory policies", () => {
  assert.equal(
    CANDIDATE_2.guardian.candidateId,
    SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY_CANDIDATE_4.id,
  );
  assert.deepEqual(CANDIDATE_2.guardian.policy, DIGNITY_GUARDIAN_V4_POLICY);
  assert.equal(CANDIDATE_2.guardian.promptSchemaVersion, DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION);
  assert.equal(CANDIDATE_2.guardian.promptHash, DIGNITY_GUARDIAN_V4_PROMPT_HASH);
  assert.equal(
    CANDIDATE_2.guardian.responseSchemaVersion,
    DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
  );
  assert.equal(
    CANDIDATE_2.guardian.responseSchemaGeneratorHash,
    DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  );
  assert.deepEqual(CANDIDATE_2.episodeMemory.episodeEvidencePolicy, EPISODE_EVIDENCE_POLICY);
  assert.deepEqual(CANDIDATE_2.retrieval.selectionPolicy, CAUSAL_CONTEXT_POLICY);
  assert.deepEqual(CANDIDATE_2.retrieval.memoryResolutionPolicy, MEMORY_RESOLUTION_POLICY);
  for (const sha of Object.values(CANDIDATE_2.sourceBlobs)) assertGitBlobSha(sha);
});

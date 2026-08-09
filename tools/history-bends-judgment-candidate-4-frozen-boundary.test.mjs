import assert from "node:assert/strict";
import test from "node:test";

import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_4 } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-4.mjs";
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

const CANDIDATE_4 = HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_4;

function assertGitBlobSha(value) {
  assert.match(value, /^[0-9a-f]{40}$/);
}

test("history candidate 4 preserves its frozen cognition-equivalent predecessor claim", () => {
  assert.equal(CANDIDATE_4.id, "history_bends_judgment_candidate_4");
  assert.equal(CANDIDATE_4.sourceHead, "1f160dd36633462f7e5f01d1d266b43babc8d15a");
  assert.equal(CANDIDATE_4.predecessorCandidateId, "history_bends_judgment_candidate_3");
  assert.equal(CANDIDATE_4.cognitionEquivalentToCandidateId, "history_bends_judgment_candidate_3");
  assert.equal(CANDIDATE_4.frozenAfterDevelopmentSetId, "history_bends_judgment_development_v3");
  assert.equal(CANDIDATE_4.scoreMovementPermitted, false);
  assert.equal(CANDIDATE_4.standingScenarioAuthored, false);
  assert.equal(CANDIDATE_4.standingThreadFixtureAuthored, false);
  assert.equal(CANDIDATE_4.standingDirectionAuthored, false);

  assert.deepEqual(CANDIDATE_4.sourceBlobs, {
    developmentHarness: "e7cdb1c91126530458abd8a9dc2952c3ecbb6150",
    runtimeDomain: "b389d34fafce3c1f0d409e67522882764a8e6ffc",
    episodeEvidence: "e11c4bad1327c82f29bc4eaa068a2dd96ba2fb17",
    causalContext: "33bb3d61f721d1d9a6b99e51619f40165a19ce16",
    guardianCandidate4: "3ae158ede6f91ee10a413e46e58c04e7f65dcc15",
  });
  assert.equal(CANDIDATE_4.standingGatePreflight.verifyFrozenSourceBlobsBeforeFirstProviderCall, true);
  assert.equal(CANDIDATE_4.standingGatePreflight.rejectOnDrift, true);
});

test("history candidate 4 preserves all three failed sealed predecessor gates", () => {
  assert.equal(CANDIDATE_4.priorStandingGates.length, 3);
  const [v1, v2, v3] = CANDIDATE_4.priorStandingGates;

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
  assert.equal(v2.rerunPermitted, false);

  assert.equal(v3.id, "history_bends_judgment_standing_gate_v3");
  assert.equal(v3.status, "failed_sealed");
  assert.equal(v3.failureClass, "standing_scenario_causal_isolation_defect");
  assert.deepEqual(v3.withHistory, { action: "accept", participationFit: "high" });
  assert.deepEqual(v3.withoutHistory, { action: "accept", participationFit: "high" });
  assert.equal(v3.differentialPassed, false);
  assert.match(v3.causalIsolationFailure, /identity\/self-model/i);
  assert.equal(v3.scoreMovementPermitted, false);
  assert.equal(v3.rerunPermitted, false);
});

test("candidate 4 freezes bidirectional history effects without choosing a direction", () => {
  assert.deepEqual(CANDIDATE_4.acceptanceContract.allowedDirections, [
    "history_raises_dignity",
    "history_lowers_dignity",
  ]);
  assert.equal(CANDIDATE_4.acceptanceContract.directionChosenAtFreeze, false);
  assert.equal(
    CANDIDATE_4.acceptanceContract.directionMustBeDeclaredAfterFreshThreadFixtureAndBeforeProvider,
    true,
  );

  assert.deepEqual(CANDIDATE_4.acceptanceContract.highIndividualizedFitShape, {
    action: "accept",
    participationFit: "high",
  });
  assert.deepEqual(
    CANDIDATE_4.acceptanceContract.nonHighIndividualizedFitShape.allowedParticipationFits,
    ["mixed", "low"],
  );
  assert.deepEqual(
    CANDIDATE_4.acceptanceContract.nonHighIndividualizedFitShape.allowedActions,
    ["clarify", "negotiate", "refuse"],
  );
  assert.equal(
    CANDIDATE_4.acceptanceContract.nonHighIndividualizedFitShape.actionVerbPrescribed,
    false,
  );
  assert.deepEqual(CANDIDATE_4.acceptanceContract.directionalShapes.history_raises_dignity, {
    withoutHistory: "nonHighIndividualizedFitShape",
    withHistory: "highIndividualizedFitShape",
  });
  assert.deepEqual(CANDIDATE_4.acceptanceContract.directionalShapes.history_lowers_dignity, {
    withoutHistory: "highIndividualizedFitShape",
    withHistory: "nonHighIndividualizedFitShape",
  });
  assert.equal(
    CANDIDATE_4.acceptanceContract.exactlyOneHighIndividualizedFitConditionRequired,
    true,
  );
  assert.equal(CANDIDATE_4.acceptanceContract.downstreamDifferentialRequired, true);
});

test("candidate 4 freezes staged authorship and non-workflow causal isolation", () => {
  const methodology = CANDIDATE_4.standingMethodology;
  assert.equal(methodology.coreClaim, "history bends judgment; history is not required to raise dignity");
  assert.equal(methodology.twoSidedCausalIsolationRequired, true);
  assert.equal(methodology.bidirectionalHistoryEffectPermitted, true);
  assert.equal(methodology.requestMayAssertHistoryConditionedTarget, false);
  assert.equal(methodology.preExistingThreadStateMayEncodeHistoryConditionedTarget, false);
  assert.equal(methodology.nonAcceptActionVerbMustRemainUnprescribed, true);

  assert.deepEqual(methodology.stagedHeldOutAuthorship, {
    freshThreadFixtureRequired: true,
    threadFixtureAuthoredAfterCandidateFreeze: true,
    threadFixtureCommittedBeforeScenarioFacts: true,
    requesterMayExistAtThreadFixtureCommit: false,
    episodeFactsMayExistAtThreadFixtureCommit: false,
    laterRequestMayExistAtThreadFixtureCommit: false,
    chosenDirectionMayExistAtThreadFixtureCommit: false,
    caseSpecificExpectedRationaleMayExistAtThreadFixtureCommit: false,
  });

  assert.equal(methodology.episodeMustBeSelfContained, true);
  assert.equal(methodology.episodeMayExistToComputeFutureRequestVariable, false);
  assert.equal(methodology.episodeMemoryMayContainProspectiveParticipationInstruction, false);
  assert.equal(methodology.laterRequestMayDeclarePriorWorkflowDependency, false);
  assert.equal(methodology.laterSignificanceMustEmergeFromRetainedHistory, true);
  assert.equal(methodology.freshScenarioRequired, true);
  assert.equal(methodology.authorFreshScenarioAfterFreezeOnly, true);
  assert.equal(methodology.reuseRetiredStandingMaterialPermitted, false);
  assert.equal(methodology.finalScenarioOnlyIteration, true);
  assert.equal(methodology.candidate5ScenarioSearchAfterSubstantiveV4FailurePermitted, false);
});

test("history candidate 4 still pins live Guardian and Fibre-owned memory policies", () => {
  assert.equal(
    CANDIDATE_4.guardian.candidateId,
    SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY_CANDIDATE_4.id,
  );
  assert.deepEqual(CANDIDATE_4.guardian.policy, DIGNITY_GUARDIAN_V4_POLICY);
  assert.equal(CANDIDATE_4.guardian.promptSchemaVersion, DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION);
  assert.equal(CANDIDATE_4.guardian.promptHash, DIGNITY_GUARDIAN_V4_PROMPT_HASH);
  assert.equal(
    CANDIDATE_4.guardian.responseSchemaVersion,
    DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
  );
  assert.equal(
    CANDIDATE_4.guardian.responseSchemaGeneratorHash,
    DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  );
  assert.deepEqual(CANDIDATE_4.episodeMemory.episodeEvidencePolicy, EPISODE_EVIDENCE_POLICY);
  assert.deepEqual(CANDIDATE_4.retrieval.selectionPolicy, CAUSAL_CONTEXT_POLICY);
  assert.deepEqual(CANDIDATE_4.retrieval.memoryResolutionPolicy, MEMORY_RESOLUTION_POLICY);
  for (const sha of Object.values(CANDIDATE_4.sourceBlobs)) assertGitBlobSha(sha);
});

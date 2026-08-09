import assert from "node:assert/strict";
import test from "node:test";

import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_1 } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-1.mjs";
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

const BOUNDARY = HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_1;

function assertGitBlobSha(value) {
  assert.match(value, /^[0-9a-f]{40}$/);
}

test("history candidate 1 pins the accepted Development v3 causal contract", () => {
  assert.equal(BOUNDARY.id, "history_bends_judgment_candidate_1");
  assert.equal(BOUNDARY.sourceHead, "0103654bfa0712eff710512be5b4049ce6e02305");
  assert.equal(BOUNDARY.frozenAfterDevelopmentSetId, "history_bends_judgment_development_v3");
  assert.equal(BOUNDARY.scoreMovementPermitted, false);
  assert.equal(BOUNDARY.standingScenarioAuthored, false);

  assert.equal(BOUNDARY.developmentStability.status, "passed");
  assert.equal(BOUNDARY.developmentStability.consecutiveRealProviderPasses, 2);
  assert.deepEqual(BOUNDARY.developmentStability.withHistory, {
    action: "accept",
    participationFit: "high",
  });
  assert.deepEqual(BOUNDARY.developmentStability.withoutHistory, {
    action: "negotiate",
    participationFit: "mixed",
  });

  assert.deepEqual(BOUNDARY.acceptanceContract.withHistory, {
    action: "accept",
    participationFit: "high",
  });
  assert.equal(BOUNDARY.acceptanceContract.withoutHistory.participationFit, "mixed");
  assert.deepEqual(
    BOUNDARY.acceptanceContract.withoutHistory.allowedActions,
    ["clarify", "negotiate"],
  );
  assert.equal(BOUNDARY.acceptanceContract.downstreamDifferentialRequired, true);
  assert.equal(BOUNDARY.acceptanceContract.sameRequestFingerprintRequired, true);
  assert.equal(BOUNDARY.acceptanceContract.sameThreadStateRequired, true);
  assert.equal(BOUNDARY.acceptanceContract.semanticStateHeldConstantRequired, true);
});

test("history candidate 1 pins Guardian candidate 4 without cognition drift", () => {
  assert.equal(
    BOUNDARY.guardian.candidateId,
    SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY_CANDIDATE_4.id,
  );
  assert.deepEqual(BOUNDARY.guardian.policy, DIGNITY_GUARDIAN_V4_POLICY);
  assert.equal(BOUNDARY.guardian.promptSchemaVersion, DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION);
  assert.equal(BOUNDARY.guardian.promptHash, DIGNITY_GUARDIAN_V4_PROMPT_HASH);
  assert.equal(
    BOUNDARY.guardian.responseSchemaVersion,
    DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
  );
  assert.equal(
    BOUNDARY.guardian.responseSchemaGeneratorHash,
    DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  );
  assert.equal(BOUNDARY.modelRuntime.provider, "openai");
  assert.equal(BOUNDARY.modelRuntime.modelId, "gpt-5.1-2025-11-13");
  assert.equal(BOUNDARY.modelRuntime.standingGateOverridePermitted, false);
});

test("history candidate 1 pins Fibre-owned episode evidence and memory resolution policies", () => {
  assert.deepEqual(BOUNDARY.episodeMemory.episodeEvidencePolicy, EPISODE_EVIDENCE_POLICY);
  assert.deepEqual(BOUNDARY.retrieval.selectionPolicy, CAUSAL_CONTEXT_POLICY);
  assert.deepEqual(BOUNDARY.retrieval.memoryResolutionPolicy, MEMORY_RESOLUTION_POLICY);
  assert.equal(BOUNDARY.retrieval.selectionAuthority, "fibre");
  assert.equal(BOUNDARY.retrieval.unresolvedMemorySemantics, "absence_of_semantic_evidence");
  assert.equal(BOUNDARY.counterfactual.requiredCounterfactualUnresolvedWitness, true);
});

test("history candidate 1 records source identities for standing-gate preflight", () => {
  for (const sha of Object.values(BOUNDARY.sourceBlobs)) assertGitBlobSha(sha);
  assert.equal(
    BOUNDARY.standingGatePreflight.verifyFrozenSourceBlobsBeforeFirstProviderCall,
    true,
  );
  assert.equal(BOUNDARY.standingGatePreflight.rejectOnDrift, true);
  assert.equal(
    BOUNDARY.standingGatePreflight.sealedRerunChecksAuthoritativeEvidenceBeforeSourceDrift,
    true,
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { buildH2Slot4Episode3RecoveryState } from "./genesis-h2-recovery-state.mjs";
import {
  H2_RECOVERY_EXECUTION_AUTHORIZATION_PATH,
  H2_RECOVERY_ORCHESTRATOR_VERSION,
  disallowedRecoveryPostReviewPaths,
  persistRecoveryRepairWitnesses,
  recoveredHistoricalPassAEntry,
  runAuthorizedH2Recovery,
  verifyH2RecoveryOrchestratorPreflight,
} from "./genesis-h2-recovery-orchestrator.mjs";

test("H-v2 recovery orchestrator is fully wired but remains provider-blocked before separate review authorization", () => {
  const preflight = verifyH2RecoveryOrchestratorPreflight();
  assert.equal(preflight.status, "CLEAR_RECOVERY_ORCHESTRATOR_IMPLEMENTED_NOT_AUTHORIZED");
  assert.equal(preflight.orchestratorVersion, H2_RECOVERY_ORCHESTRATOR_VERSION);
  assert.equal(preflight.providerCallsAuthorized, false);
  assert.equal(preflight.executionAuthorizationPath, H2_RECOVERY_EXECUTION_AUTHORIZATION_PATH);
  assert.equal(preflight.executionAttemptVersion, "H-v2");
  assert.equal(preflight.stageCount, 5);
  assert.equal(
    preflight.firstProviderOperation.clientRequestId,
    "pr39-h:slot-04:pass-a:episode-03:record-retry:2",
  );
  assert.equal(preflight.scientificStanding.isReplacementCohort, false);
  assert.equal(preflight.scientificStanding.mayEnterFrozenG5G6, false);
  assert.equal(preflight.scientificStanding.mayReplaceH2Hold, false);
});

test("H-v2 recovery authorization permits only review and authorization witness changes after the reviewed implementation head", () => {
  assert.deepEqual(
    disallowedRecoveryPostReviewPaths([
      "artifacts/validation/m2-pr39/h/recovery/h-v2-recovery-execution-review-v1.json",
      "artifacts/validation/m2-pr39/h/recovery/h-v2-recovery-execution-authorization-v1.json",
    ]),
    [],
  );
  assert.deepEqual(
    disallowedRecoveryPostReviewPaths([
      "tools/genesis/genesis-h2-recovery-sequencer.mjs",
      "services/birth-center/src/runtime.mjs",
      "docs/README.md",
    ]),
    [
      "tools/genesis/genesis-h2-recovery-sequencer.mjs",
      "services/birth-center/src/runtime.mjs",
      "docs/README.md",
    ],
  );
});

test("H-v2 recovered Pass-A entries carry the frozen historical cognition provenance", () => {
  const recovery = buildH2Slot4Episode3RecoveryState();
  const evidence = recovery.acceptedEpisodeEvidence[1];
  const entry = recoveredHistoricalPassAEntry({
    window: { ordinal: 2, windowId: "test-window" },
    seed: "test-seed",
    offeredEntries: [{ structure: { structureId: "test-structure" } }],
    inputDigest: "sha256:test-input",
    evidence,
  });

  assert.equal(entry.ordinal, 2);
  assert.equal(entry.calls.length, 2);
  assert.deepEqual(
    entry.calls.map((call) => call.clientRequestId),
    [
      "pr39-h:slot-04:pass-a:episode-02:initial",
      "pr39-h:slot-04:pass-a:episode-02:repair:1",
    ],
  );
  assert.deepEqual(entry.historicalCalls, entry.calls);
  assert.deepEqual(entry.recoveryCalls, []);
  assert.equal(entry.historicalRepairWitnesses.length, 1);
  assert.equal(entry.historicalRepairWitnesses[0].failedGate, "pass_a_observable_action_bounds");
});

test("H-v2 recovery persists Pass-A and Pass-B repair attempts using the existing Genesis attempt authority", () => {
  const recorded = [];
  const genesisStore = {
    recordGenerationAttempt(candidate) {
      recorded.push(structuredClone(candidate));
      return { idempotent: false };
    },
  };
  const generation = {
    binding: { genesisId: "gen_test", threadId: "thr_test" },
    repairWitnesses: [
      {
        kind: "pass_a_form_repair",
        episodeOrdinal: 2,
        failedGate: "pass_a_observable_action_bounds",
        rejectedContentDigest: "sha256:rejected-a",
        rejectedContent: { episodeId: "epi_test_2" },
        inputDigest: "sha256:input-a",
        outputDigest: "sha256:rejected-a",
        recordedAt: "2026-08-21T04:42:53.175Z",
      },
      {
        kind: "pass_a_record_retry",
        episodeOrdinal: 3,
        failedGate: "pass_a_structure_participation",
        rejectedContentDigest: "sha256:rejected-b",
        rejectedContent: { episodeId: "epi_test_3" },
        inputDigest: "sha256:input-b",
        outputDigest: "sha256:rejected-b",
        recordedAt: "2026-08-21T04:42:53.175Z",
      },
    ],
    passB: [
      {
        callOrdinal: 1,
        calls: [
          { inputDigest: "sha256:pass-b-input", outputDigest: "sha256:pass-b-rejected" },
          { inputDigest: "sha256:pass-b-repair", outputDigest: "sha256:pass-b-admitted" },
        ],
      },
      {
        callOrdinal: 2,
        calls: [{ inputDigest: "sha256:ordinary", outputDigest: "sha256:ordinary-output" }],
      },
    ],
  };

  const count = persistRecoveryRepairWitnesses(genesisStore, generation, "2026-08-22T20:00:00.000Z");
  assert.equal(count, 3);
  assert.equal(recorded.length, 3);
  assert.deepEqual(recorded.map((attempt) => attempt.failedPass), ["A", "A", "B"]);
  assert.deepEqual(
    recorded.map((attempt) => attempt.failedGate),
    ["pass_a_observable_action_bounds", "pass_a_structure_participation", "pass_b_genome_verbatim_ngram"],
  );
  assert.equal(new Set(recorded.map((attempt) => attempt.attemptId)).size, 3);
  assert.equal(recorded[0].recordedAt, "2026-08-21T04:42:53.175Z");
  assert.equal(recorded[2].recordedAt, "2026-08-22T20:00:00.000Z");
});

test("H-v2 recovery orchestrator cannot make a provider call until a separate reviewed authorization witness exists", async () => {
  await assert.rejects(
    () => runAuthorizedH2Recovery(),
    /provider execution remains blocked/,
  );
});

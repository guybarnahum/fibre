import assert from "node:assert/strict";
import test from "node:test";

import { GenesisPassAValidationError } from "../services/world-kernel/src/genesis-pass-a-domain.mjs";
import {
  E2_A0_MAX_CANDIDATE_ATTEMPTS,
  runE2A0ThreadWithCandidateAttempts,
} from "./genesis-rich-life-e2-a0-candidate-driver.mjs";

const WORLD = Object.freeze({
  id: "E2-TEST",
  worldSpec: Object.freeze({ worldSpecId: "world_e2_test" }),
});

test("E2 A0 rejects a structural candidate and restarts the whole candidate with explicit attempt evidence", async () => {
  const clientRequestIds = [];
  const baseAdapter = {
    async invoke(request) {
      clientRequestIds.push(request.clientRequestId);
      return { output: {}, provenance: { provider: "test", model: "test" } };
    },
  };
  let candidateCalls = 0;
  const candidateRunner = async ({ seed, runOrdinal, adapter }) => {
    candidateCalls += 1;
    await adapter.invoke({ clientRequestId: "episode-call" });
    if (candidateCalls === 1) {
      const error = new GenesisPassAValidationError(
        "pass_a_structure_participation",
        "candidate structure lacks an allowed counterpart",
        { record: { episodeId: "rejected_episode" } },
      );
      error.calls = [{ kind: "initial" }];
      error.repairEvidence = [{ failedGate: "pass_a_observable_action_bounds" }];
      throw error;
    }
    return {
      worldId: WORLD.id,
      worldSpecId: WORLD.worldSpec.worldSpecId,
      seed,
      runOrdinal,
      subject: { provisionalThreadId: "thr_test" },
      initialRoster: [],
      episodes: [],
      recordEvidence: [],
      e2Characterization: {},
    };
  };

  const result = await runE2A0ThreadWithCandidateAttempts({
    worldFixture: WORLD,
    provider: "test",
    model: "test",
    seed: "seed_test",
    runOrdinal: 1,
    adapter: baseAdapter,
    candidateRunner,
  });

  assert.equal(E2_A0_MAX_CANDIDATE_ATTEMPTS, 3);
  assert.equal(candidateCalls, 2);
  assert.deepEqual(clientRequestIds, ["episode-call:candidate:1", "episode-call:candidate:2"]);
  assert.equal(result.candidateAttemptNumber, 2);
  assert.equal(result.candidateAttemptsPerThread, 2);
  assert.equal(result.candidateFailures.length, 1);
  assert.equal(result.candidateFailures[0].failedGate, "pass_a_structure_participation");
  assert.equal(result.candidateFailures[0].repairs.length, 1);
  assert.equal(result.rejectionProfile.candidateAttemptFailures, 1);
  assert.deepEqual(result.rejectionProfile.candidateAttemptFailuresByGate, {
    pass_a_structure_participation: 1,
  });
});

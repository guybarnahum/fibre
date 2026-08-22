import assert from "node:assert/strict";
import test from "node:test";

import { serializeGenesisFailureEvidence } from "./genesis-failure-evidence.mjs";

test("Genesis failure evidence preserves repair, retry and budget provenance without mutating the error", () => {
  const error = new Error("rich Pass-A record generation exhausted after 5 generated versions");
  error.name = "GenesisPassAValidationError";
  error.gate = "record_repair_exhausted";
  error.cause = Object.assign(new Error("structure participation failed"), { gate: "pass_a_structure_participation" });
  error.calls = [{ kind: "initial" }, { kind: "record_repair" }, { kind: "record_retry" }];
  error.repairs = [{ repairOrdinal: 1, failedGate: "pass_a_observable_action_bounds" }];
  error.repairEvidence = [{ repairOrdinal: 1, rejectedEpisode: { episodeId: "epi_rejected_1" } }];
  error.recordRetries = [{ recordRetryOrdinal: 1, failedGate: "pass_a_structure_participation" }];
  error.recordRetryEvidence = [{ recordRetryOrdinal: 1, rejectedEpisode: { episodeId: "epi_rejected_2" } }];
  error.record = { episodeId: "epi_terminal" };
  error.generationPolicyVersion = "pr39-g4-pass-a-reliability-amendment-v3";
  error.budgetExhaustion = { allowed: false, reason: "total_generated_version_budget_exhausted" };
  error.budgetState = { generatedVersions: 5, formRepairs: 2, recordRetries: 2 };

  const result = serializeGenesisFailureEvidence(error);

  assert.equal(result.gate, "record_repair_exhausted");
  assert.equal(result.cause.gate, "pass_a_structure_participation");
  assert.deepEqual(result.calls.map((item) => item.kind), ["initial", "record_repair", "record_retry"]);
  assert.equal(result.repairEvidence[0].rejectedEpisode.episodeId, "epi_rejected_1");
  assert.equal(result.recordRetryEvidence[0].rejectedEpisode.episodeId, "epi_rejected_2");
  assert.equal(result.record.episodeId, "epi_terminal");
  assert.equal(result.generationPolicyVersion, "pr39-g4-pass-a-reliability-amendment-v3");
  assert.equal(result.budgetExhaustion.reason, "total_generated_version_budget_exhausted");
  assert.deepEqual(result.budgetState, { generatedVersions: 5, formRepairs: 2, recordRetries: 2 });

  result.calls[0].kind = "changed-copy";
  result.budgetState.generatedVersions = 99;
  assert.equal(error.calls[0].kind, "initial");
  assert.equal(error.budgetState.generatedVersions, 5);
});

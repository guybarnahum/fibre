import assert from "node:assert/strict";
import test from "node:test";

import { serializeGenesisFailureEvidence } from "./genesis-failure-evidence.mjs";

test("Genesis failure evidence preserves repair and retry provenance without mutating the error", () => {
  const error = new Error("rich Pass-A record generation exhausted after 3 generated versions");
  error.name = "GenesisPassAValidationError";
  error.gate = "record_repair_exhausted";
  error.cause = Object.assign(new Error("structure participation failed"), { gate: "pass_a_structure_participation" });
  error.calls = [{ kind: "initial" }, { kind: "record_repair" }, { kind: "record_retry" }];
  error.repairs = [{ repairOrdinal: 1, failedGate: "pass_a_observable_action_bounds" }];
  error.repairEvidence = [{ repairOrdinal: 1, rejectedEpisode: { episodeId: "epi_rejected_1" } }];
  error.recordRetries = [{ recordRetryOrdinal: 1, failedGate: "pass_a_structure_participation" }];
  error.recordRetryEvidence = [{ recordRetryOrdinal: 1, rejectedEpisode: { episodeId: "epi_rejected_2" } }];
  error.record = { episodeId: "epi_terminal" };

  const result = serializeGenesisFailureEvidence(error);

  assert.equal(result.gate, "record_repair_exhausted");
  assert.equal(result.cause.gate, "pass_a_structure_participation");
  assert.deepEqual(result.calls.map((item) => item.kind), ["initial", "record_repair", "record_retry"]);
  assert.equal(result.repairEvidence[0].rejectedEpisode.episodeId, "epi_rejected_1");
  assert.equal(result.recordRetryEvidence[0].rejectedEpisode.episodeId, "epi_rejected_2");
  assert.equal(result.record.episodeId, "epi_terminal");

  result.calls[0].kind = "changed-copy";
  assert.equal(error.calls[0].kind, "initial");
});

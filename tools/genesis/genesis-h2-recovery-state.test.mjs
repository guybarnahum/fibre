import assert from "node:assert/strict";
import test from "node:test";

import { buildH2Slot4Episode3RecoveryState } from "./genesis-h2-recovery-state.mjs";

test("H-v2 slot 4 recovery state preserves every successful historical response and repair witness", () => {
  const recovery = buildH2Slot4Episode3RecoveryState();

  assert.deepEqual(
    recovery.successfulHistoricalCalls.map((call) => call.clientRequestId),
    [
      "pr39-h:slot-04:pass-a:episode-01:initial",
      "pr39-h:slot-04:pass-a:episode-02:initial",
      "pr39-h:slot-04:pass-a:episode-02:repair:1",
      "pr39-h:slot-04:pass-a:episode-03:initial",
      "pr39-h:slot-04:pass-a:episode-03:repair:1",
      "pr39-h:slot-04:pass-a:episode-03:record-retry:1",
    ],
  );
  assert.equal(recovery.acceptedEpisodeEvidence.length, 2);
  assert.deepEqual(
    recovery.acceptedEpisodeEvidence.map((item) => item.historicalCalls.length),
    [1, 2],
  );
  assert.equal(recovery.historicalRepairWitnesses.length, 3);
  assert.deepEqual(
    recovery.historicalRepairWitnesses.map((item) => [item.episodeOrdinal, item.kind, item.failedGate]),
    [
      [2, "pass_a_form_repair", "pass_a_observable_action_bounds"],
      [3, "pass_a_form_repair", "pass_a_observable_action_bounds"],
      [3, "pass_a_record_retry", "pass_a_structure_participation"],
    ],
  );
  assert.ok(recovery.historicalRepairWitnesses.every((item) => item.inputDigest.startsWith("sha256:")));
  assert.ok(recovery.historicalRepairWitnesses.every((item) => item.rejectedContentDigest === item.outputDigest));
  assert.equal(recovery.episode3.inspection.currentGate, "pass_a_structure_participation");
  assert.equal(recovery.episode3.inspection.nextKind, "record_retry");
  assert.equal(recovery.episode3.inspection.nextOrdinal, 2);
});

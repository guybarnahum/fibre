import assert from "node:assert/strict";
import test from "node:test";

import { buildH2RecoveryExecutionPlan } from "./genesis-h2-recovery-plan.mjs";
import { parseH2RecoveryMode } from "./genesis-h2-recovery.mjs";

test("H-v2 recovery execution plan preserves completed development and fixes the first provider operation", () => {
  const plan = buildH2RecoveryExecutionPlan();

  assert.equal(plan.status, "CLEAR_RECOVERY_EXECUTION_PATH_REVIEWABLE_ZERO_CALL");
  assert.equal(plan.providerCallsAuthorized, false);
  assert.equal(plan.scientificStanding.isReplacementCohort, false);
  assert.equal(plan.scientificStanding.mayEnterFrozenG5G6, false);
  assert.equal(plan.firstProviderOperation.clientRequestId, "pr39-h:slot-04:pass-a:episode-03:record-retry:2");
  assert.equal(plan.firstProviderOperation.mode, "historical_continuation");
  assert.equal(plan.firstProviderOperation.nextKind, "record_retry");
  assert.equal(plan.firstProviderOperation.nextOrdinal, 2);

  assert.deepEqual(plan.stages.map((stage) => stage.stage), [
    "reuse_completed_thread_generations",
    "continue_partial_slot_04_pass_a",
    "complete_slot_04_memory_and_meaning",
    "generate_unstarted_slot_05",
    "publish_recovered_world",
  ]);

  const preserved = plan.stages[0];
  assert.equal(preserved.providerCalls, "zero");
  assert.deepEqual(preserved.slots.map((item) => item.slot), [1, 2, 3]);

  const slot4 = plan.stages[1];
  assert.equal(slot4.slot, 4);
  assert.equal(slot4.operations.length, 8);
  assert.deepEqual(slot4.operations.map((item) => item.episodeOrdinal), [3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(slot4.operations[0].mode, "historical_continuation");
  assert.ok(slot4.operations.slice(1).every((item) => item.mode === "ordinary_generation"));
  assert.deepEqual(slot4.historicalBudgetAtResume, { generatedVersions: 3, formRepairs: 1, recordRetries: 1 });

  const slot5 = plan.stages[3];
  assert.equal(slot5.slot, 5);
  assert.equal(slot5.observedHistoricalModelAttempts, 0);
  assert.equal(slot5.passAEpisodes, 10);

  const publish = plan.stages[4];
  assert.equal(publish.providerCalls, "zero");
  assert.deepEqual(publish.slots, [1, 2, 3, 4, 5]);
});

test("H-v2 provider execution remains blocked while the execution plan is under review", () => {
  assert.throws(
    () => parseH2RecoveryMode(["--execute"]),
    /not yet reviewed\/authorized/,
  );
});

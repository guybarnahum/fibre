import assert from "node:assert/strict";
import test from "node:test";

import {
  parseH2RecoveryMode,
  verifyH2RecoveryPreflight,
} from "./genesis-h2-recovery.mjs";

test("H-v2 recovery preflight reports the terminal recovery HOLD without authorizing further execution", () => {
  const result = verifyH2RecoveryPreflight();
  assert.equal(result.status, "HOLD_RECOVERY_RECORD_RETRY_EXHAUSTED");
  assert.equal(result.completedThreads.length, 3);
  assert.deepEqual(result.completedThreads.map((item) => item.slot), [1, 2, 3]);
  assert.equal(result.partialSlot.slot, 4);
  assert.equal(result.partialSlot.acceptedEpisodeCountBeforeFailure, 2);
  assert.equal(result.partialSlot.replayableSuccessfulResponses, 6);
  assert.equal(result.unstartedSlot.slot, 5);
  assert.equal(result.unstartedSlot.observedModelAttempts, 0);
  assert.equal(result.providerCallsAuthorized, false);
  assert.equal(result.furtherExecutionAuthorized, false);
  assert.equal(result.terminalOutcome.execution.firstAndOnlyNewProviderOperationObserved,
    "pr39-h:slot-04:pass-a:episode-03:record-retry:2");
  assert.equal(result.terminalOutcome.execution.successfulProviderResultDurablyJournaled, true);
  assert.equal(result.terminalOutcome.terminalMechanicalFailure.outerGate, "record_repair_exhausted");
  assert.equal(result.terminalOutcome.terminalMechanicalFailure.causeGate, "pass_a_structure_participation");
  assert.deepEqual(result.terminalOutcome.terminalMechanicalFailure.budgetState, {
    generatedVersions: 4,
    formRepairs: 1,
    recordRetries: 2,
  });
  assert.equal(result.terminalOutcome.interpretation.retry3Authorized, false);
  assert.equal(result.scientificStanding.isReplacementCohort, false);
  assert.equal(result.scientificStanding.mayEnterFrozenG5G6, false);
});

test("H-v2 recovery command surface is inspection-only after terminal HOLD", () => {
  assert.equal(parseH2RecoveryMode([]), "preflight");
  assert.equal(parseH2RecoveryMode(["--preflight"]), "preflight");
  assert.throws(
    () => parseH2RecoveryMode(["--execute"]),
    /execution is closed/,
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  parseH2RecoveryMode,
  verifyH2RecoveryPreflight,
} from "./genesis-h2-recovery.mjs";

test("H-v2 recovery preflight accounts for preserved development and pins the exact zero-call resume point", () => {
  const result = verifyH2RecoveryPreflight();
  assert.equal(result.status, "CLEAR_RECOVERY_RESUME_POINT_ZERO_CALL");
  assert.equal(result.completedThreads.length, 3);
  assert.deepEqual(result.completedThreads.map((item) => item.slot), [1, 2, 3]);
  assert.equal(result.partialSlot.slot, 4);
  assert.equal(result.partialSlot.acceptedEpisodeCountBeforeFailure, 2);
  assert.equal(result.partialSlot.replayableSuccessfulResponses, 6);
  assert.equal(result.unstartedSlot.slot, 5);
  assert.equal(result.unstartedSlot.observedModelAttempts, 0);
  assert.equal(result.outputRootExists, false);
  assert.equal(result.providerCallsAuthorized, false);
  assert.equal(result.scientificStanding.isReplacementCohort, false);
  assert.equal(result.scientificStanding.mayEnterFrozenG5G6, false);
});

test("H-v2 recovery execution remains blocked until a separate continuation implementation is reviewed", () => {
  assert.equal(parseH2RecoveryMode([]), "preflight");
  assert.equal(parseH2RecoveryMode(["--preflight"]), "preflight");
  assert.throws(
    () => parseH2RecoveryMode(["--execute"]),
    /not yet reviewed\/authorized/,
  );
});

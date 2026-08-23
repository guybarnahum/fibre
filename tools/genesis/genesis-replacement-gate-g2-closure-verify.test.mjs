import assert from "node:assert/strict";
import test from "node:test";

import { verifyReplacementGateG2Closure } from "./genesis-replacement-gate-g2-closure-verify.mjs";

test("Gate-G(2) HOLD closure verifies B1-B5 without authorizing life", () => {
  const result = verifyReplacementGateG2Closure();
  assert.equal(result.status, "CLEAR_B1_B5_ZERO_CALL");
  assert.equal(result.b1CompleteExecutionPacket, true);
  assert.equal(result.b2ExplicitG4V3, true);
  assert.equal(result.b3FiveEdgeClearRuleClosed, true);
  assert.equal(result.b4AuthoringComparabilityDisclosed, true);
  assert.equal(result.b5AssignmentDisclosureCorrected, true);
  assert.equal(result.rosterGrounding, true);
  assert.equal(result.historicalG4V2PassBPreserved, true);
  assert.equal(result.passBUncertaintyGenomeCopyGuard, false);
  assert.equal(result.passBUncertaintyGenomeCopyGapDisclosed, true);
  assert.equal(result.processRestartDurableAdapterBound, true);
  assert.deepEqual(result.fixedPointSlots, [2, 4, 5]);
  assert.deepEqual(result.effectiveD3, {
    eachOrdinalMinimumCorrectCoreEdges: 4,
    atLeastOneOrdinalCorrectCoreEdges: 5,
    statement: "Both primary ordinals must be at least 4/5 correct on the five fresh-G2-detectable measured edges, and at least one primary ordinal must be 5/5.",
  });
  assert.equal(result.finalLifeCognitionAuthorized, false);
  assert.equal(result.providerCallsMade, 0);
});

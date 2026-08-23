import assert from "node:assert/strict";
import test from "node:test";

import { verifyReplacementGateG2Closure } from "./genesis-replacement-gate-g2-closure-verify.mjs";

test("Gate-G(2) HOLD closure verifies B1-B5+C1 without authorizing life", () => {
  const result = verifyReplacementGateG2Closure();
  assert.equal(result.status, "CLEAR_B1_B5_C1_ZERO_CALL");
  assert.equal(result.b1CompleteExecutionPacket, true);
  assert.equal(result.c1InheritedAuthorityBound, true);
  assert.equal(result.inheritedAuthority.status, "CLEAR_INHERITED_AUTHORITY_BOUND");
  assert.equal(result.inheritedAuthority.coreBlobSha, "81d89fb17eca549106bd51ea0aba2d8329bacb80");
  assert.equal(result.inheritedAuthority.hPassBHelperBlobSha, "0bca252aa20e3af375ad977fc3e2fd22dc76d9f1");
  assert.equal(result.inheritedAuthority.residualIntegrity.uncertaintyPostGenerationScanRequired, true);
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
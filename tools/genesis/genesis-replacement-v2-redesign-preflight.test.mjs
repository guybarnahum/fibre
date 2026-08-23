import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { verifyReplacementV2RedesignPreflight } from "./genesis-replacement-v2-redesign-preflight.mjs";

test("replacement-v2 R1 preflight builds five deterministic envelope plans without authorizing cognition", () => {
  const result = verifyReplacementV2RedesignPreflight();
  assert.equal(result.status, "CLEAR_R1_SUBSTRATE_PRE_REVIEW_ZERO_CALL");
  assert.equal(result.plans.length, 5);
  assert.equal(result.attempt1RecoveryRetired, true);
  assert.equal(result.attempt1HistoryReusable, false);
  assert.equal(result.replacementV2OutputRootAbsent, true);
  assert.equal(result.providerCallsAuthorized, false);
  assert.equal(result.finalLifeCognitionAuthorized, false);
  for (const plan of result.plans) {
    assert.equal(plan.statistics.episodeCount, 14);
    assert.equal(plan.statistics.distinctPlaces >= 4, true);
    assert.equal(plan.statistics.maxPlaceUse <= 4, true);
    assert.equal(plan.statistics.maxStructureUse <= 2, true);
    assert.equal(plan.statistics.worldEmergentCount, 2);
    assert.equal(plan.statistics.externalCounterpartOpportunityCount >= 5, true);
    assert.equal(plan.statistics.externalRoleVariety >= 2, true);
    assert.equal(plan.statistics.maxWeekdayUse <= 3, true);
    assert.equal(plan.statistics.maxDaypartUse <= 4, true);
    assert.match(plan.envelopeDigest, /^sha256:[0-9a-f]{64}$/);
  }
});

test("replacement-v2 R1 has no execution runner or provider-call authorization", () => {
  const protocol = JSON.parse(readFileSync(new URL("../../artifacts/validation/m2-pr39/replacement-v2/protocol/redesign-v1.json", import.meta.url), "utf8"));
  assert.equal(protocol.authorization.providerCallsAuthorized, false);
  assert.equal(protocol.authorization.finalLifeCognitionAuthorized, false);
  assert.equal(protocol.authorization.replacementV2ExecutionAuthorized, false);
  assert.equal(protocol.authorization.noGenerationCommandMayBeAddedUntilR1Green, true);
  assert.equal(protocol.attempt1Standing.sameAttemptRecoveryRetired, true);
  assert.equal(protocol.attempt1Standing.generatedPassAHistoryMayBeReused, false);
});

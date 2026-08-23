// fibre-test-lifecycle: regression
// fibre-test-scope: pr39
// fibre-test-purpose: prevent-young-adult-counterpart-mode-fallback-bias

import assert from "node:assert/strict";
import test from "node:test";

import { GENESIS_YOUNG_ADULT_EVENT_STRUCTURES_V3 } from "../src/genesis-event-structure-pool-v3.mjs";
import {
  GENESIS_RICH_COUNTERPART_POLICY_VERSION,
  richCounterpartMode,
  richCounterpartPolicyWitness,
} from "../src/genesis-rich-participation-policy.mjs";

test("every v3 young-adult structure has reviewed counterpart semantics derived from accessModes", () => {
  assert.equal(GENESIS_RICH_COUNTERPART_POLICY_VERSION, "genesis-rich-counterpart-policy-v2");
  let optional = 0;
  let required = 0;
  for (const entry of GENESIS_YOUNG_ADULT_EVENT_STRUCTURES_V3) {
    const expected = entry.accessModes.includes("self_directed") ? "present_optional" : "present_required";
    assert.equal(richCounterpartMode(entry.structure.structureId), expected, entry.structure.structureId);
    if (expected === "present_optional") optional += 1;
    else required += 1;
  }
  assert.equal(optional, 6);
  assert.equal(required, 6);
});

test("self-directed young-adult examples no longer fall through to present-required", () => {
  assert.equal(richCounterpartMode("ges_v3_independent_local_trip"), "present_optional");
  assert.equal(richCounterpartMode("ges_v3_independent_schedule_commitment"), "present_optional");
  assert.equal(richCounterpartMode("ges_v3_claim_checked_against_source"), "present_optional");
  assert.equal(richCounterpartMode("ges_v3_peer_plan_disagreement"), "present_required");
  assert.equal(richCounterpartMode("ges_v3_optional_path_from_mentor"), "present_required");
  assert.match(richCounterpartPolicyWitness().digest, /^sha256:[0-9a-f]{64}$/);
});

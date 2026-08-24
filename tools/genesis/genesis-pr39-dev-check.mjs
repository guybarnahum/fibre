// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: fast development readiness check for rich childhood generation
// fibre-tool-disposition: retire or fold into permanent Genesis checks after PR39

import assert from "node:assert/strict";

import {
  GENESIS_PASS_A_RELIABILITY_POLICY_V3,
} from "../../services/world-kernel/src/genesis-pass-a-reliability-v3.mjs";
import {
  richPassAGenerationDecision,
} from "../../services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import {
  buildReplacementV2ExecutionPlans,
} from "./genesis-replacement-v2-plan.mjs";

const plans = buildReplacementV2ExecutionPlans();
assert.equal(plans.slots.length, 5, "PR39 must have five development Threads");

let totalEpisodes = 0;
for (const slot of plans.slots) {
  assert.equal(slot.windows.length, 14, `slot ${slot.slot} must have fourteen life windows`);
  assert.equal(slot.envelopePlan.envelopes.length, 14, `slot ${slot.slot} must have fourteen envelopes`);
  const worldPlaces = new Set(slot.worldSpec.places.map((place) => place.placeId));
  const envelopePlaces = new Set();
  let socialWindows = 0;
  for (const envelope of slot.envelopePlan.envelopes) {
    assert.ok(worldPlaces.has(envelope.placeRef), `slot ${slot.slot} envelope place must belong to its World`);
    envelopePlaces.add(envelope.placeRef);
    if (envelope.counterpart !== null) socialWindows += 1;
  }
  totalEpisodes += slot.windows.length;
  console.log(
    `slot ${slot.slot}: 14 episodes · ${envelopePlaces.size} places · ${socialWindows} pre-grounded social windows · ${slot.worldSpec.worldSpecId}`,
  );
}

assert.equal(totalEpisodes, 70);
assert.deepEqual(
  {
    formRepairs: GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxFormRepairsPerRecord,
    recordRetries: GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxRecordRetriesPerRecord,
    totalVersions: GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxTotalGeneratedVersionsPerRecord,
  },
  { formRepairs: 2, recordRetries: 2, totalVersions: 5 },
);

const recordFallback = richPassAGenerationDecision({
  generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
  generatedVersions: 3,
  formRepairs: 2,
  recordRetries: 0,
  nextKind: "record_retry",
});
assert.equal(recordFallback.allowed, true, "record retry must remain available after two failed form repairs");

console.log("\nPR39 DEVELOPMENT CHECK: READY");
console.log("5 Threads · 70 planned life episodes · deterministic place/time/event skeletons");
console.log("Pass A can use 2 local form repairs and then 2 fresh retries, capped at 5 generated versions");
console.log("This check makes zero provider calls and grants no publication authority");

// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: fast development readiness check for rich childhood generation
// fibre-tool-disposition: retire or fold into permanent Genesis checks after PR39

import assert from "node:assert/strict";

import {
  GENESIS_PASS_A_RELIABILITY_POLICY_V3,
} from "#services/world-kernel/src/genesis-pass-a-reliability-v3.mjs";
import {
  constrainPassAContextToHistoricalEnvelope,
} from "#services/world-kernel/src/genesis-historical-envelope-v1.mjs";
import {
  materializeHistoricalEnvelopeEpisode,
} from "#services/world-kernel/src/genesis-historical-realization-v1.mjs";
import {
  buildRichLifePassAInput,
  syntheticLineageWitnessFromRecombinedGenome,
} from "#services/world-kernel/src/genesis-rich-life-domain.mjs";
import {
  GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT,
  GENESIS_LIFE_PASS_A_PROMPT,
  GENESIS_LIFE_PASS_A_RETRY_PROMPT,
} from "#services/world-kernel/src/genesis-life-pass-a.mjs";
import {
  richPassAGenerationDecision,
} from "#services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import { buildGenesisDevelopmentPlans } from "./genesis-life-plan.mjs";

const plans = buildGenesisDevelopmentPlans();
assert.equal(plans.slots.length, 5, "PR39 must have five development Threads");
assert.equal(plans.sampling.creativeTemperature, 0.3, "creative Genesis temperature must be 0.3 in current development policy");
assert.equal(plans.sampling.mechanicalRepairTemperature, 0, "mechanical repair must remain temperature 0");

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
assert.match(GENESIS_LIFE_PASS_A_PROMPT, /Avoid naming the weekday, daypart, clock time, or location label/iu);
assert.match(GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT, /pass_a_local_civil_time_narration/iu);
assert.match(GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT, /remove explicit weekday, daypart, or clock-time wording/iu);
assert.match(GENESIS_LIFE_PASS_A_RETRY_PROMPT, /retryOrdinal/iu);
assert.match(GENESIS_LIFE_PASS_A_RETRY_PROMPT, /fresh alternative realization/iu);

const socialSlot = plans.slots.find((slot) => slot.envelopePlan.envelopes.some((item) => item.counterpart?.introducedHere === true));
assert.ok(socialSlot, "development cohort must contain an introduced counterpart window");
const envelopeIndex = socialSlot.envelopePlan.envelopes.findIndex((item) => item.counterpart?.introducedHere === true);
const envelope = socialSlot.envelopePlan.envelopes[envelopeIndex];
const constrained = constrainPassAContextToHistoricalEnvelope({ worldSpec: socialSlot.worldSpec, envelope });
const lineageWitness = socialSlot.originMode === "synthetic_lineage"
  ? syntheticLineageWitnessFromRecombinedGenome(socialSlot.genome)
  : null;
const passAInput = buildRichLifePassAInput({
  originMode: socialSlot.originMode,
  syntheticLineageWitness: lineageWitness,
  worldSpec: constrained.worldSpec,
  subject: { provisionalThreadId: socialSlot.threadId, bornAt: socialSlot.bornAt },
  developmentalWindow: constrained.developmentalWindow,
  chronologyEndsAt: constrained.chronologyEndsAt,
  initialRoster: socialSlot.roster.participants,
  priorEpisodes: [],
  previouslyIntroducedParticipants: [],
  offeredEntries: socialSlot.offersByWindow.get(socialSlot.windows[envelopeIndex].windowId),
});
const normalizedEpisode = materializeHistoricalEnvelopeEpisode({
  modelOutput: {
    observableAction: "The subject and the other participant exchange a notebook and point to the same marked page.",
    additionalParticipantRefs: [],
    additionalIntroductions: [{
      provisionalPersonId: envelope.counterpart.participantId,
      roleRef: envelope.counterpart.roleRef,
    }],
    intellectualEncounter: null,
  },
  envelope,
  passAInput,
});
assert.equal(
  normalizedEpisode.introducedParticipants.filter((item) => item.provisionalPersonId === envelope.counterpart.participantId).length,
  1,
  "frozen counterpart must be introduced exactly once",
);

console.log("\nPR39 DEVELOPMENT CHECK: READY");
console.log("5 development Threads · 70 planned life episodes · deterministic place/time/event skeletons");
console.log("Creative A/B/C + record retries: temperature 0.3 · mechanical form repair: temperature 0");
console.log("Pass A can use 2 local form repairs and then 2 mechanically distinct fresh retries, capped at 5 generated versions");
console.log("Pass A avoids unnecessary civil-time narration and repairs conflicting weekday/daypart wording locally before a fresh retry");
console.log("Redundant model re-declaration of the frozen counterpart is normalized without a retry");
console.log("Development Worlds are burned for the final PR39 closure cohort");
console.log("This check makes zero provider calls and grants no publication authority");

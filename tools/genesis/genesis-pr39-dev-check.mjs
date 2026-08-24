// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: fast development readiness check for rich childhood generation
// fibre-tool-disposition: retire or fold into permanent Genesis checks after PR39

import assert from "node:assert/strict";

import {
  GENESIS_PASS_A_RELIABILITY_POLICY_V3,
} from "../../services/world-kernel/src/genesis-pass-a-reliability-v3.mjs";
import {
  constrainPassAContextToHistoricalEnvelope,
} from "../../services/world-kernel/src/genesis-historical-envelope-v1.mjs";
import {
  materializeHistoricalEnvelopeEpisode,
} from "../../services/world-kernel/src/genesis-historical-realization-v1.mjs";
import {
  buildRichLifePassAInput,
  syntheticLineageWitnessFromRecombinedGenome,
} from "../../services/world-kernel/src/genesis-rich-life-domain.mjs";
import {
  GENESIS_REPLACEMENT_PASS_A_PROMPT,
  GENESIS_REPLACEMENT_PASS_A_RETRY_PROMPT,
} from "../../services/world-kernel/src/genesis-replacement-pass-a.mjs";
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
assert.match(GENESIS_REPLACEMENT_PASS_A_PROMPT, /Avoid naming the weekday, daypart, clock time, or location label/iu);
assert.match(GENESIS_REPLACEMENT_PASS_A_RETRY_PROMPT, /retryOrdinal/iu);
assert.match(GENESIS_REPLACEMENT_PASS_A_RETRY_PROMPT, /fresh alternative realization/iu);

// Exercise the real boundary that blocked an earlier development run. When the
// model redundantly returns the exact frozen counterpart introduction, Fibre
// should normalize it rather than burn a retry. Conflicting roles still fail in
// the domain implementation.
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
console.log("5 Threads · 70 planned life episodes · deterministic place/time/event skeletons");
console.log("Pass A can use 2 local form repairs and then 2 mechanically distinct fresh retries, capped at 5 generated versions");
console.log("Pass A avoids unnecessary daypart/location narration that can conflict with Fibre-owned history");
console.log("Redundant model re-declaration of the frozen counterpart is normalized without a retry");
console.log("This check makes zero provider calls and grants no publication authority");

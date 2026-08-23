import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_HISTORICAL_ENVELOPE_POLICY,
  GENESIS_SPARSE_HISTORY_NOTICE,
  assertHistoricalEnvelopeRealized,
  buildHistoricalEnvelopePlan,
  constrainPassAContextToHistoricalEnvelope,
} from "../src/genesis-historical-envelope-v1.mjs";

function world() {
  return {
    worldSpecId: "world_test_envelope",
    timeFrame: { startAt: "2000-01-01T00:00:00.000Z", endAt: "2030-01-01T00:00:00.000Z" },
    places: Array.from({ length: 5 }, (_, index) => ({ placeId: `place_test_${index + 1}`, description: `Place ${index + 1}` })),
    householdShape: "A household.",
    familyRelations: [],
    languages: ["English"],
    materialCircumstances: "Stable.",
    mobilityPattern: "Mixed.",
    schoolingOrCommunityContext: "School and community.",
    culturalContext: "A concrete test locality.",
    availableInstitutions: ["school", "library"],
    intellectualEnvironment: "Books and conversations.",
    affordedRoles: ["caregiver", "sibling", "peer", "teacher", "librarian", "mentor", "neighbor"],
    worldAuthorship: {
      authorId: "test_author",
      sourcesConsulted: [],
      abstractionMethod: "test",
      relocationWitness: "test",
      familiarityProbe: null,
      createdAt: "2000-01-01T00:00:00.000Z",
    },
    createdAt: "2000-01-01T00:00:00.000Z",
  };
}

function windows() {
  return Array.from({ length: 14 }, (_, index) => {
    const start = new Date(Date.UTC(2010 + index, 0, 1));
    const end = new Date(Date.UTC(2010 + index, 11, 31, 23, 59, 59, 999));
    return {
      ordinal: index + 1,
      windowId: `window_${String(index + 1).padStart(2, "0")}`,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      minAge: 10 + index,
      maxAge: 10.999 + index,
    };
  });
}

const STRUCTURES = [
  ["ges_test_peer_1", ["peer"]],
  ["ges_test_peer_2", ["peer"]],
  ["ges_test_teacher_1", ["teacher"]],
  ["ges_test_teacher_2", ["teacher"]],
  ["ges_test_librarian", ["librarian"]],
  ["ges_test_neighbor", ["neighbor"]],
  ["ges_test_household_1", ["caregiver"]],
  ["ges_test_household_2", ["sibling"]],
  ["ges_test_mixed", ["caregiver", "peer"]],
];

function offersByWindow() {
  const map = new Map();
  for (const window of windows()) {
    map.set(window.windowId, STRUCTURES.map(([structureId, participatingRoles]) => ({
      structure: {
        structureId,
        abstractSituation: `Situation ${structureId}`,
        participatingRoles,
        developmentalRange: { minAge: 0, maxAge: 30 },
        consequenceClass: "low",
      },
      contextKinds: ["ordinary_practical"],
      accessModes: ["peer_mediated"],
    })));
  }
  return map;
}

function args() {
  return {
    subject: { provisionalThreadId: "thr_test_envelope", bornAt: "2000-01-01T00:00:00.000Z" },
    worldSpec: world(),
    windows: windows(),
    offersByWindow: offersByWindow(),
    initialRoster: [
      { participantId: "thr_test_envelope", factualRoles: ["subject"], relationshipFacts: [] },
      { participantId: "person_test_caregiver", factualRoles: ["caregiver"], relationshipFacts: [] },
      { participantId: "person_test_sibling", factualRoles: ["sibling"], relationshipFacts: [] },
    ],
    timeZone: "America/New_York",
    seedDomain: "test-envelope-seed-v1",
  };
}

test("historical envelope is deterministic and satisfies bounded coverage", () => {
  const first = buildHistoricalEnvelopePlan(args());
  const second = buildHistoricalEnvelopePlan(args());
  assert.deepEqual(first, second);
  assert.equal(first.envelopes.length, 14);
  assert.equal(first.statistics.distinctPlaces >= GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumDistinctPlaces, true);
  assert.equal(first.statistics.maxPlaceUse <= GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerPlace, true);
  assert.equal(first.statistics.maxStructureUse <= GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerStructure, true);
  assert.equal(first.statistics.worldEmergentCount, GENESIS_HISTORICAL_ENVELOPE_POLICY.worldEmergentEpisodes);
  assert.equal(first.statistics.externalCounterpartOpportunityCount >= GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumExternalCounterpartOpportunities, true);
  assert.equal(first.statistics.externalRoleVariety >= GENESIS_HISTORICAL_ENVELOPE_POLICY.minimumExternalRoleVariety, true);
  assert.equal(first.statistics.maxWeekdayUse <= GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerWeekday, true);
  assert.equal(first.statistics.maxDaypartUse <= GENESIS_HISTORICAL_ENVELOPE_POLICY.maxEpisodesPerDaypart, true);
  assert.match(first.sparseHistoryNotice, /not a frequency sample/i);
  assert.equal(GENESIS_SPARSE_HISTORY_NOTICE, first.sparseHistoryNotice);
});

test("historical envelope constrains Pass A to one exact place and instant", () => {
  const plan = buildHistoricalEnvelopePlan(args());
  const envelope = plan.envelopes[0];
  const constrained = constrainPassAContextToHistoricalEnvelope({ worldSpec: world(), envelope });
  assert.equal(constrained.worldSpec.places.length, 1);
  assert.equal(constrained.worldSpec.places[0].placeId, envelope.placeRef);
  assert.equal(constrained.developmentalWindow.startAt, envelope.occurredAt);
  assert.equal(constrained.developmentalWindow.endAt, envelope.occurredAt);
  assert.equal(constrained.chronologyEndsAt, envelope.occurredAt);
  assert.deepEqual(constrained.selectedOpportunity, {
    selectionKind: envelope.selectionKind,
    structureRef: envelope.structureRef,
  });
  assert.match(constrained.worldSpec.culturalContext, new RegExp(envelope.timeZone.replace("/", "\\/")));
  assert.match(constrained.worldSpec.culturalContext, new RegExp(envelope.localWeekday));
});

test("historical envelope rejects model narration that contradicts local civil time", () => {
  const plan = buildHistoricalEnvelopePlan(args());
  const envelope = plan.envelopes.find((item) => item.selectionKind === "offered_structure");
  const base = {
    episodeId: "episode_test_1",
    occurredAt: envelope.occurredAt,
    ageAtEvent: envelope.ageAtEvent,
    placeRef: envelope.placeRef,
    participantRefs: ["thr_test_envelope"],
    observableAction: "The subject sorted two books on the table.",
    structureRef: envelope.structureRef,
    introducedParticipants: [],
  };
  assert.equal(assertHistoricalEnvelopeRealized(base, envelope), base);
  const wrongWeekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].find((item) => item !== envelope.localWeekday);
  assert.throws(() => assertHistoricalEnvelopeRealized({ ...base, observableAction: `On ${wrongWeekday}, the subject sorted two books.` }, envelope), /weekday inconsistent/i);
  const wrongDaypart = envelope.daypart.includes("morning") ? "afternoon" : "morning";
  assert.throws(() => assertHistoricalEnvelopeRealized({ ...base, observableAction: `In the ${wrongDaypart}, the subject sorted two books.` }, envelope), /daypart inconsistent/i);
});

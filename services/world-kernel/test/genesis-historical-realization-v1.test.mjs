import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA,
  historicalEnvelopeEpisodeId,
  materializeHistoricalEnvelopeEpisode,
  normalizeHistoricalRealizationModelOutput,
} from "../src/genesis-historical-realization-v1.mjs";

function passAInput() {
  const offeredStructures = Array.from({ length: 8 }, (_, index) => ({
    structureId: `ges_test_${index + 1}`,
    abstractSituation: index === 0 ? "a peer and the subject handle one concrete shared task" : `ordinary test situation ${index + 1}`,
    participatingRoles: index === 0 ? ["peer"] : [],
    developmentalRange: { minAge: 10, maxAge: 12 },
    consequenceClass: "low",
  }));
  return {
    inputVersion: "genesis-pass-a-input-v1",
    subject: { provisionalThreadId: "thr_test_realization", bornAt: "2000-01-01T00:00:00.000Z" },
    world: {
      worldSpecId: "world_test_realization",
      timeFrame: { startAt: "2000-01-01T00:00:00.000Z", endAt: "2030-01-01T00:00:00.000Z" },
      places: [{ placeId: "place_test_school", description: "A school." }],
      householdShape: "A household.",
      familyRelations: [],
      languages: ["English"],
      materialCircumstances: "Stable.",
      mobilityPattern: "Walking.",
      schoolingOrCommunityContext: "School.",
      culturalContext: "A concrete locality.",
      availableInstitutions: ["school"],
      intellectualEnvironment: "Books and discussion.",
      affordedRoles: ["caregiver", "peer", "teacher"],
    },
    developmentalWindow: {
      windowId: "window_test_realization",
      startAt: "2011-05-02T13:15:00.000Z",
      endAt: "2011-05-02T13:15:00.000Z",
      minAge: 11.331,
      maxAge: 11.331,
    },
    chronologyEndsAt: "2011-05-02T13:15:00.000Z",
    initialRoster: [
      { participantId: "thr_test_realization", factualRoles: ["subject"], relationshipFacts: [] },
      { participantId: "person_test_caregiver", factualRoles: ["caregiver"], relationshipFacts: ["Lives with subject."] },
    ],
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    offeredStructures,
    policyWitness: {
      policyVersion: "genesis-pass-a-policy-v1+genesis-rich-counterpart-policy-v1",
      eventStructurePoolDigest: `sha256:${"1".repeat(64)}`,
      offerSelectionDigest: `sha256:${"2".repeat(64)}`,
    },
  };
}

function envelope() {
  return {
    envelopeVersion: "genesis-historical-envelope-v1",
    ordinal: 1,
    windowId: "window_test_realization",
    occurredAt: "2011-05-02T13:15:00.000Z",
    ageAtEvent: 11.331,
    timeZone: "America/New_York",
    localDate: "2011-05-02",
    localTime: "09:15",
    localWeekday: "Monday",
    daypart: "morning",
    placeRef: "place_test_school",
    placeKind: "school",
    selectionKind: "offered_structure",
    structureRef: "ges_test_1",
    counterpartMode: "present_required",
    counterpart: {
      participantId: "person_env_test_peer",
      roleRef: "peer",
      origin: "historical_envelope",
      introducedHere: true,
    },
    externalCounterpartRequired: true,
  };
}

const modelOutput = {
  observableAction: "The subject and the peer compared two labels on a classroom materials box and corrected one mismatch.",
  additionalParticipantRefs: [],
  additionalIntroductions: [],
  intellectualEncounter: null,
};

test("historical realization schema exposes no historical-skeleton fields to model output", () => {
  assert.deepEqual(Object.keys(GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA.properties).sort(), [
    "additionalIntroductions",
    "additionalParticipantRefs",
    "intellectualEncounter",
    "observableAction",
  ]);
  for (const forbidden of ["episodeId", "occurredAt", "ageAtEvent", "placeRef", "structureRef", "introducedAt"]) {
    assert.equal(Object.hasOwn(GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA.properties, forbidden), false);
  }
  assert.throws(
    () => normalizeHistoricalRealizationModelOutput({ ...modelOutput, occurredAt: envelope().occurredAt }),
    /not allowed|exact keys|unexpected|keys/i,
  );
});

test("historical realization stamps identity, time, place, structure and counterpart mechanically", () => {
  const episode = materializeHistoricalEnvelopeEpisode({ modelOutput, envelope: envelope(), passAInput: passAInput() });
  assert.equal(episode.episodeId, historicalEnvelopeEpisodeId({ threadId: "thr_test_realization", envelope: envelope() }));
  assert.equal(episode.occurredAt, envelope().occurredAt);
  assert.equal(episode.ageAtEvent, envelope().ageAtEvent);
  assert.equal(episode.placeRef, envelope().placeRef);
  assert.equal(episode.structureRef, envelope().structureRef);
  assert.deepEqual(episode.participantRefs, ["thr_test_realization", "person_env_test_peer"]);
  assert.deepEqual(episode.introducedParticipants, [{
    provisionalPersonId: "person_env_test_peer",
    roleRef: "peer",
    introducedAt: envelope().occurredAt,
  }]);
});

test("historical realization stamps optional extra introduction time but still validates role and participant use", () => {
  const output = {
    ...modelOutput,
    additionalIntroductions: [{ provisionalPersonId: "person_extra_teacher", roleRef: "teacher" }],
  };
  const episode = materializeHistoricalEnvelopeEpisode({ modelOutput: output, envelope: envelope(), passAInput: passAInput() });
  assert.equal(episode.participantRefs.includes("person_extra_teacher"), true);
  assert.deepEqual(episode.introducedParticipants.find((item) => item.provisionalPersonId === "person_extra_teacher"), {
    provisionalPersonId: "person_extra_teacher",
    roleRef: "teacher",
    introducedAt: envelope().occurredAt,
  });
});

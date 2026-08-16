import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPassAInput,
  sampleEventStructures,
} from "../src/genesis-pass-a-domain.mjs";
import {
  assertPassAHistoryConsistency,
  validateConsistentPassAEpisode,
} from "../src/genesis-pass-a-consistency.mjs";
import { GENESIS_EVENT_STRUCTURE_POOL_V1 } from "../src/genesis-event-structure-pool-v1.mjs";

const subject = Object.freeze({ provisionalThreadId: "thr_slice_c_consistency", bornAt: "1992-05-14T00:00:00Z" });
const window = Object.freeze({
  windowId: "middle_childhood",
  startAt: "1998-05-14T00:00:00Z",
  endAt: "2004-05-13T23:59:59Z",
  minAge: 6,
  maxAge: 11.999,
});
const world = Object.freeze({
  worldSpecId: "world_slice_c_consistency",
  timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2008-12-31T23:59:59Z" },
  places: [
    { placeId: "place_home", description: "Apartment block." },
    { placeId: "place_school", description: "Public school." },
  ],
  householdShape: "Two caregivers and two children.",
  familyRelations: ["One younger sibling."],
  languages: ["English"],
  materialCircumstances: "Stable rent and ordinary household expenses.",
  mobilityPattern: "Walking and public transit.",
  schoolingOrCommunityContext: "Public school and neighborhood activity.",
  culturalContext: "Extended-family visits and neighborhood routines.",
  availableInstitutions: ["public_school", "public_transit", "local_commerce"],
  intellectualEnvironment: "School books and public library materials.",
  affordedRoles: ["household_member", "responsible_adult", "peer", "school_teacher"],
  worldAuthorship: {
    authorId: "fibre_test",
    sourcesConsulted: [],
    abstractionMethod: "Synthetic fixture.",
    relocationWitness: "Portable fixture.",
    familiarityProbe: null,
    createdAt: "2026-08-16T01:00:00Z",
  },
  createdAt: "2026-08-16T01:00:00Z",
});
const roster = Object.freeze([
  { participantId: subject.provisionalThreadId, factualRoles: ["subject"], relationshipFacts: ["Provisional Thread."] },
  { participantId: "person_caregiver", factualRoles: ["household_member", "responsible_adult"], relationshipFacts: ["Lives in household."] },
]);
const offered = sampleEventStructures(GENESIS_EVENT_STRUCTURE_POOL_V1, window, { seed: "slice-c-consistency-offer" });

function priorEpisode(overrides = {}) {
  return {
    episodeId: "ep_prior_001",
    occurredAt: "1999-02-03T17:10:00Z",
    ageAtEvent: 6.726,
    placeRef: "place_school",
    participantRefs: [subject.provisionalThreadId, "person_teacher_1"],
    observableAction: "A teacher handed out replacement worksheets after a box was delivered to the wrong classroom.",
    structureRef: null,
    introducedParticipants: [
      { provisionalPersonId: "person_teacher_1", roleRef: "school_teacher", introducedAt: "1999-02-03T17:10:00Z" },
    ],
    ...overrides,
  };
}

function makeInput({ episodes = [], introduced = [] } = {}) {
  return buildPassAInput({
    worldSpec: world,
    subject,
    developmentalWindow: window,
    chronologyEndsAt: window.endAt,
    initialRoster: roster,
    priorEpisodes: episodes,
    previouslyIntroducedParticipants: introduced,
    eventStructurePool: GENESIS_EVENT_STRUCTURE_POOL_V1,
    offeredStructures: offered,
  });
}

test("Pass A accepts only participant history derived from prior episode introductions", () => {
  const episode = priorEpisode();
  const exact = makeInput({ episodes: [episode], introduced: episode.introducedParticipants });
  assert.doesNotThrow(() => assertPassAHistoryConsistency(exact));

  const smuggled = makeInput({
    episodes: [episode],
    introduced: [
      ...episode.introducedParticipants,
      { provisionalPersonId: "person_never_met", roleRef: "peer", introducedAt: "1999-02-04T00:00:00Z" },
    ],
  });
  assert.throws(
    () => assertPassAHistoryConsistency(smuggled),
    (error) => error?.gate === "pass_a_participant_history",
  );
});

test("Pass A rejects age witnesses inconsistent with bornAt and occurredAt", () => {
  const bad = priorEpisode({ ageAtEvent: 9.4 });
  const input = makeInput({ episodes: [bad], introduced: bad.introducedParticipants });
  assert.throws(
    () => assertPassAHistoryConsistency(input),
    (error) => error?.gate === "pass_a_age_witness",
  );

  const clean = makeInput();
  const candidate = {
    episodeId: "ep_candidate_001",
    occurredAt: "2000-02-03T17:10:00Z",
    ageAtEvent: 11,
    placeRef: "place_home",
    participantRefs: [subject.provisionalThreadId, "person_caregiver"],
    observableAction: "They moved a small table away from a leaking window and placed a towel along the sill.",
    structureRef: null,
    introducedParticipants: [],
  };
  assert.throws(
    () => validateConsistentPassAEpisode(candidate, clean),
    (error) => error?.gate === "pass_a_age_witness",
  );
});

test("Pass A requires every episode to involve the provisional Thread and prevents episode-ID reuse", () => {
  const clean = makeInput();
  const ambient = {
    episodeId: "ep_candidate_ambient",
    occurredAt: "1999-02-03T17:10:00Z",
    ageAtEvent: 6.726,
    placeRef: "place_home",
    participantRefs: ["person_caregiver"],
    observableAction: "The caregiver moved a delivery box inside before rain reached the stairwell.",
    structureRef: null,
    introducedParticipants: [],
  };
  assert.throws(
    () => validateConsistentPassAEpisode(ambient, clean),
    (error) => error?.gate === "pass_a_subject_participation",
  );

  const prior = priorEpisode({ introducedParticipants: [], participantRefs: [subject.provisionalThreadId, "person_caregiver"] });
  const withPrior = makeInput({ episodes: [prior], introduced: [] });
  const duplicate = {
    ...prior,
    occurredAt: "2000-02-03T17:10:00Z",
    ageAtEvent: 7.726,
  };
  assert.throws(
    () => validateConsistentPassAEpisode(duplicate, withPrior),
    (error) => error?.gate === "pass_a_episode_identity",
  );
});

test("Pass A rejects offered structure roles not afforded by the world", () => {
  const narrowWorld = {
    ...world,
    affordedRoles: ["household_member", "responsible_adult", "school_teacher"],
  };
  const input = buildPassAInput({
    worldSpec: narrowWorld,
    subject,
    developmentalWindow: window,
    chronologyEndsAt: window.endAt,
    initialRoster: roster,
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    eventStructurePool: GENESIS_EVENT_STRUCTURE_POOL_V1,
    offeredStructures: offered,
  });
  assert.throws(
    () => assertPassAHistoryConsistency(input),
    (error) => error?.gate === "pass_a_structure_affordance",
  );
});

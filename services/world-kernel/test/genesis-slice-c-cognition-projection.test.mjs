import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPassAInput,
  sampleEventStructures,
} from "../src/genesis-pass-a-domain.mjs";
import { GENESIS_EVENT_STRUCTURE_POOL_V1 } from "../src/genesis-event-structure-pool-v1.mjs";
import {
  GENESIS_PASS_A_COGNITION_INPUT_VERSION,
  projectPassAInputForCognition,
} from "../src/genesis-pass-a-cognition.mjs";
import { generatePassAEpisode } from "../src/genesis-pass-a-runner.mjs";

const subject = Object.freeze({ provisionalThreadId: "thr_slice_c_projection", bornAt: "1992-05-14T00:00:00Z" });
const window = Object.freeze({
  windowId: "middle_childhood_probe",
  startAt: "2000-01-01T00:00:00Z",
  endAt: "2000-12-31T23:59:59Z",
  minAge: 7.6,
  maxAge: 8.7,
});
const world = Object.freeze({
  worldSpecId: "world_slice_c_projection",
  timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2008-12-31T23:59:59Z" },
  places: [
    { placeId: "place_home", description: "A rented apartment on a residential block." },
    { placeId: "place_school", description: "A neighborhood public school." },
  ],
  householdShape: "Two caregivers and two children share a rented apartment.",
  familyRelations: ["One younger sibling lives in the household."],
  languages: ["English"],
  materialCircumstances: "Ordinary bills are reliable with little discretionary money.",
  mobilityPattern: "Walking and public transit are normal.",
  schoolingOrCommunityContext: "Public school, local shops, and neighborhood activity are available.",
  culturalContext: "Extended-family visits and ordinary neighborhood routines occur.",
  availableInstitutions: ["public_school", "public_library", "local_commerce", "public_transit"],
  intellectualEnvironment: "School books, library materials, radio news, and repair manuals are accessible.",
  affordedRoles: ["household_member", "responsible_adult", "peer", "school_teacher", "librarian", "shopkeeper", "neighbor"],
  worldAuthorship: {
    authorId: "fibre_test",
    sourcesConsulted: [],
    abstractionMethod: "Synthetic fixture.",
    relocationWitness: "Portable fixture.",
    familiarityProbe: null,
    createdAt: "2026-08-16T15:40:00Z",
  },
  createdAt: "2026-08-16T15:40:00Z",
});
const roster = Object.freeze([
  { participantId: subject.provisionalThreadId, factualRoles: ["subject"], relationshipFacts: ["Provisional Thread."] },
  { participantId: "person_caregiver", factualRoles: ["household_member", "responsible_adult"], relationshipFacts: ["Lives in household."] },
]);

function priorEpisode() {
  return {
    episodeId: "ep_slice_c_projection_prior",
    occurredAt: "2000-02-01T16:00:00Z",
    ageAtEvent: 7.72,
    placeRef: "place_home",
    participantRefs: [subject.provisionalThreadId, "person_caregiver"],
    observableAction: "The child carries a small parcel downstairs while the caregiver closes the apartment door.",
    structureRef: "ges_small_help_request",
    introducedParticipants: [],
  };
}

function fullInput() {
  const offered = sampleEventStructures(GENESIS_EVENT_STRUCTURE_POOL_V1, window, { seed: "slice-c-projection-offer" })
    .filter(({ structureId }) => structureId !== "ges_small_help_request");
  if (offered.length < 8) {
    const replacement = GENESIS_EVENT_STRUCTURE_POOL_V1.find(({ structureId }) =>
      structureId !== "ges_small_help_request" && !offered.some((candidate) => candidate.structureId === structureId));
    offered.push(replacement);
  }
  return buildPassAInput({
    worldSpec: world,
    subject,
    developmentalWindow: window,
    chronologyEndsAt: window.endAt,
    initialRoster: roster,
    priorEpisodes: [priorEpisode()],
    previouslyIntroducedParticipants: [],
    eventStructurePool: GENESIS_EVENT_STRUCTURE_POOL_V1,
    offeredStructures: offered.slice(0, 9),
  });
}

test("Pass A cognition sees historical facts but not prior structure provenance or offer policy labels", () => {
  const internal = fullInput();
  assert.equal(internal.priorEpisodes[0].structureRef, "ges_small_help_request");
  assert.ok(internal.offeredStructures.every((structure) => Object.hasOwn(structure, "consequenceClass")));

  const cognition = projectPassAInputForCognition(internal);
  assert.equal(cognition.inputVersion, GENESIS_PASS_A_COGNITION_INPUT_VERSION);
  assert.equal(Object.hasOwn(cognition.priorEpisodes[0], "structureRef"), false);
  assert.equal(cognition.priorEpisodes[0].observableAction, internal.priorEpisodes[0].observableAction);
  assert.ok(cognition.offeredStructures.every((structure) =>
    Object.keys(structure).sort().join(",") === "abstractSituation,participatingRoles,structureId"));
  assert.equal(JSON.stringify(cognition).includes("formative_capable"), false);
  assert.equal(JSON.stringify(cognition).includes("consequenceClass"), false);
  assert.equal(JSON.stringify(cognition).includes("developmentalRange"), false);
});

test("initial and repair cognition both receive the projected boundary while validation retains full authority", async () => {
  const internal = fullInput();
  const allowedStructure = internal.offeredStructures.find(({ participatingRoles }) => participatingRoles.length === 0)?.structureId ?? null;
  const requests = [];
  const baseEpisode = {
    episodeId: "ep_slice_c_projection_new",
    occurredAt: "2000-08-01T12:00:00Z",
    ageAtEvent: 8.22,
    placeRef: "place_home",
    participantRefs: [subject.provisionalThreadId, "person_caregiver"],
    structureRef: allowedStructure,
    introducedParticipants: [],
  };
  const adapter = {
    async invoke(request) {
      requests.push(structuredClone(request));
      return {
        output: {
          episode: {
            ...baseEpisode,
            observableAction: requests.length === 1
              ? `${"x".repeat(1300)}`
              : "The child and caregiver pause beside the apartment entrance while a delivery cart passes, then continue inside.",
          },
        },
        provenance: { provider: "mock", modelId: "slice-c-projection" },
      };
    },
  };

  const result = await generatePassAEpisode({
    adapter,
    input: internal,
    clientRequestId: "slice-c-projection-runner",
  });

  assert.equal(result.repairs.length, 1);
  assert.equal(requests.length, 2);
  assert.equal(Object.hasOwn(requests[0].input.priorEpisodes[0], "structureRef"), false);
  assert.equal(Object.hasOwn(requests[0].input.offeredStructures[0], "consequenceClass"), false);
  assert.equal(Object.hasOwn(requests[1].input.passAInput.priorEpisodes[0], "structureRef"), false);
  assert.equal(Object.hasOwn(requests[1].input.passAInput.offeredStructures[0], "consequenceClass"), false);
  assert.equal(internal.priorEpisodes[0].structureRef, "ges_small_help_request");
});

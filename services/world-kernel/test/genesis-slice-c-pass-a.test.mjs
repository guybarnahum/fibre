import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_PASS_A_RESPONSE_SCHEMA,
  GenesisPassAValidationError,
  assertPassAInputBoundary,
  buildPassAInput,
  eventStructurePoolDigest,
  passAFunnelMetrics,
  passAInputDigest,
  projectEventStructureForPassA,
  sampleEventStructures,
  validatePassAEpisode,
} from "../src/genesis-pass-a-domain.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V1,
  GENESIS_EVENT_STRUCTURE_POOL_V1_DIGEST,
} from "../src/genesis-event-structure-pool-v1.mjs";
import { generatePassAEpisode } from "../src/genesis-pass-a-runner.mjs";

function worldSpec(overrides = {}) {
  return {
    worldSpecId: "world_slice_c_dev_burned_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2008-12-31T23:59:59Z" },
    places: [
      { placeId: "place_home_block", description: "A compact residential block near ordinary local commerce." },
      { placeId: "place_public_school", description: "A neighborhood public school serving several nearby blocks." },
      { placeId: "place_library", description: "A small public library reached by bus." },
    ],
    householdShape: "Two caregivers, the child, and one younger sibling share a rented apartment.",
    familyRelations: ["A grandparent lives elsewhere in the city.", "The younger sibling is three years younger."],
    languages: ["English", "Spanish"],
    materialCircumstances: "Rent and ordinary bills are reliable, with little discretionary money.",
    mobilityPattern: "The household remains in the same district during this developmental window.",
    schoolingOrCommunityContext: "Neighborhood public school, public library, local shops, and informal courtyard play.",
    culturalContext: "Household routines combine extended-family visits, neighborhood events, and bilingual conversation.",
    availableInstitutions: ["public_school", "public_library", "local_commerce", "public_transit"],
    intellectualEnvironment: "Library books, school assignments, radio news, and ordinary disagreement among adults are accessible.",
    affordedRoles: ["household_member", "responsible_adult", "peer", "school_teacher", "librarian", "shopkeeper", "neighbor"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Synthetic development world authored without a named source person, work, plot, or future role.",
      relocationWitness: "The circumstances can be relocated without retaining source characters or scenes.",
      familiarityProbe: null,
      createdAt: "2026-08-16T01:10:00Z",
    },
    createdAt: "2026-08-16T01:10:00Z",
    ...overrides,
  };
}

const subject = Object.freeze({ provisionalThreadId: "thr_slice_c_dev_001", bornAt: "1992-05-14T00:00:00Z" });
const developmentalWindow = Object.freeze({
  windowId: "middle_childhood",
  startAt: "1998-05-14T00:00:00Z",
  endAt: "2004-05-13T23:59:59Z",
  minAge: 6,
  maxAge: 11.999,
});
const initialRoster = Object.freeze([
  { participantId: subject.provisionalThreadId, factualRoles: ["subject"], relationshipFacts: ["This is the provisional Thread whose life is being generated."] },
  { participantId: "person_caregiver_1", factualRoles: ["household_member", "responsible_adult"], relationshipFacts: ["Lives in the subject household."] },
  { participantId: "person_caregiver_2", factualRoles: ["household_member", "responsible_adult"], relationshipFacts: ["Lives in the subject household."] },
  { participantId: "person_sibling", factualRoles: ["household_member"], relationshipFacts: ["Younger sibling in the subject household."] },
]);

function offered(seed = "slice-c-test-offer") {
  return sampleEventStructures(GENESIS_EVENT_STRUCTURE_POOL_V1, developmentalWindow, { seed });
}

function input(overrides = {}) {
  return buildPassAInput({
    worldSpec: worldSpec(),
    subject,
    developmentalWindow,
    chronologyEndsAt: developmentalWindow.endAt,
    initialRoster,
    priorEpisodes: [],
    previouslyIntroducedParticipants: [],
    eventStructurePool: GENESIS_EVENT_STRUCTURE_POOL_V1,
    offeredStructures: offered(),
    ...overrides,
  });
}

function episode(overrides = {}) {
  return {
    episodeId: "ep_slice_c_001",
    occurredAt: "1999-02-03T17:10:00Z",
    ageAtEvent: 6.72,
    placeRef: "place_home_block",
    participantRefs: [subject.provisionalThreadId, "person_caregiver_1"],
    observableAction: "A cupboard hinge pulled loose while the two were putting away dishes, and they moved the heavier plates to a lower shelf before tightening the screws.",
    structureRef: null,
    introducedParticipants: [],
    ...overrides,
  };
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
    return keys;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      keys.push(key);
      collectKeys(item, keys);
    }
  }
  return keys;
}

test("EventStructurePool has portable provenance but Pass A receives affordances only", () => {
  assert.equal(eventStructurePoolDigest(GENESIS_EVENT_STRUCTURE_POOL_V1), GENESIS_EVENT_STRUCTURE_POOL_V1_DIGEST);
  for (const structure of GENESIS_EVENT_STRUCTURE_POOL_V1) {
    assert.equal(structure.instantiationWitnesses.length, 3);
    assert.equal(new Set(structure.instantiationWitnesses.map((item) => item.era)).size, 3);
    assert.equal(new Set(structure.instantiationWitnesses.map((item) => item.economy)).size, 3);
    assert.equal(new Set(structure.instantiationWitnesses.map((item) => item.culture)).size, 3);
    const visible = projectEventStructureForPassA(structure);
    assert.equal(Object.hasOwn(visible, "instantiationWitnesses"), false);
    assert.equal(Object.hasOwn(visible, "sourceDerivation"), false);
    assert.equal(Object.hasOwn(visible, "digest"), false);
  }
  const first = offered("deterministic-offer");
  const second = offered("deterministic-offer");
  assert.deepEqual(first.map(({ structureId }) => structureId), second.map(({ structureId }) => structureId));
  assert.equal(first.length, 9);
  assert.equal(first.filter(({ consequenceClass }) => consequenceClass === "low").length >= 4, true);
});

test("actual Pass-A input is exact, digest-stable, genome-blind, future-blind, and source-instance-blind", () => {
  const built = input();
  assert.doesNotThrow(() => assertPassAInputBoundary(built));
  assert.match(passAInputDigest(built), /^sha256:[0-9a-f]{64}$/);
  assert.equal(passAInputDigest(built), passAInputDigest(structuredClone(built)));
  assert.equal(Object.hasOwn(built.world, "worldAuthorship"), false);
  const keys = new Set(collectKeys(built));
  for (const forbidden of [
    "genome", "genomeRef", "loci", "parentLoci", "ancestorLoci", "rememberedMeaning",
    "futureRole", "futureProfession", "futureRequest", "benchmark", "sourceBundleRefs",
    "sourceInstanceIdentity", "sourcesConsulted", "instantiationWitnesses", "sourceDerivation",
  ]) assert.equal(keys.has(forbidden), false, `${forbidden} leaked into Pass A`);

  assert.throws(
    () => assertPassAInputBoundary({ ...built, genome: ["takes promises literally"] }),
    (error) => error?.gate === "pass_a_forbidden_input" || /genome/.test(error.message),
  );
  assert.throws(
    () => assertPassAInputBoundary({ ...built, world: { ...built.world, personality: "independent" } }),
    /personality is not allowed/,
  );
});

test("Pass-A schema has observable episode fields only and admits world-emergent episodes", () => {
  const props = GENESIS_PASS_A_RESPONSE_SCHEMA.properties.episode.properties;
  for (const forbidden of ["meaning", "significance", "lesson", "trait", "impact", "innerState", "rememberedMeaning", "futurePolicy"]) {
    assert.equal(Object.hasOwn(props, forbidden), false);
  }
  const built = input();
  const admitted = validatePassAEpisode(episode(), built);
  assert.equal(admitted.structureRef, null);
  assert.deepEqual(passAFunnelMetrics([admitted], built.offeredStructures), {
    historicalEvents: 1,
    structuresOffered: 9,
    structuresInstantiated: 0,
    episodesStructureGrounded: 0,
    episodesWorldEmergent: 1,
  });
});

test("Pass A enforces chronology, offered structures, participant grounding, and afforded-role introduction", () => {
  const built = input();
  assert.throws(
    () => validatePassAEpisode(episode({ occurredAt: "2005-01-01T00:00:00Z", ageAtEvent: 12.6 }), built),
    (error) => error?.gate === "pass_a_chronology",
  );
  assert.throws(
    () => validatePassAEpisode(episode({ structureRef: "ges_not_offered" }), built),
    (error) => error?.gate === "pass_a_structure_ref",
  );
  assert.throws(
    () => validatePassAEpisode(episode({ participantRefs: [subject.provisionalThreadId, "person_unknown"] }), built),
    (error) => error?.gate === "pass_a_participant_ref",
  );
  assert.throws(
    () => validatePassAEpisode(episode({
      participantRefs: [subject.provisionalThreadId, "person_new"],
      introducedParticipants: [{ provisionalPersonId: "person_new", roleRef: "astronaut", introducedAt: "1999-02-03T17:10:00Z" }],
    }), built),
    (error) => error?.gate === "pass_a_participant_introduction",
  );
  const introduced = validatePassAEpisode(episode({
    participantRefs: [subject.provisionalThreadId, "person_new_teacher"],
    placeRef: "place_public_school",
    introducedParticipants: [{ provisionalPersonId: "person_new_teacher", roleRef: "school_teacher", introducedAt: "1999-02-03T17:10:00Z" }],
  }), built);
  assert.equal(introduced.introducedParticipants[0].roleRef, "school_teacher");
});

test("narrow Pass-A interiority form triggers record-only repair and repair cannot rewrite event facts", async () => {
  const built = input();
  const bad = episode({ observableAction: "They fixed the loose hinge, and the child learned that preparation matters more than speed." });
  const repaired = episode({ observableAction: "They fixed the loose hinge, moved the heavy plates to the lower shelf, and put the screwdriver back in the kitchen drawer." });
  const invocations = [];
  const repairs = [];
  const adapter = {
    async invoke(request) {
      invocations.push(request);
      return {
        output: { episode: invocations.length === 1 ? bad : repaired },
        provenance: { provider: "mock", modelId: "slice-c-mock" },
      };
    },
  };
  const result = await generatePassAEpisode({
    adapter,
    input: built,
    clientRequestId: "slice-c-test-record",
    onRecordRepair: (repair) => repairs.push(repair),
  });
  assert.equal(invocations.length, 2);
  assert.equal(result.repairs.length, 1);
  assert.equal(result.repairs[0].failedGate, "pass_a_interiority_form");
  assert.equal(repairs.length, 1);
  assert.equal(result.episode.observableAction, repaired.observableAction);
  assert.deepEqual(
    { ...result.episode, observableAction: null },
    { ...repaired, observableAction: null },
  );

  let changedCall = 0;
  const changedFacts = { ...repaired, occurredAt: "1999-02-04T17:10:00Z" };
  const changingAdapter = {
    async invoke() {
      changedCall += 1;
      return {
        output: { episode: changedCall === 1 ? bad : changedFacts },
        provenance: { provider: "mock", modelId: "slice-c-mock" },
      };
    },
  };
  await assert.rejects(
    generatePassAEpisode({ adapter: changingAdapter, input: built, clientRequestId: "slice-c-test-changing-repair" }),
    (error) => error instanceof GenesisPassAValidationError && error.gate === "pass_a_record_repair_changed_facts",
  );
});

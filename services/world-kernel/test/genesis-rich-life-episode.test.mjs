import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  eventStructurePoolV2Digest,
  normalizeEventStructurePoolV2,
  sampleEventStructuresV2,
} from "../src/genesis-event-structure-pool-v2.mjs";
import {
  GENESIS_INTELLECTUAL_ENCOUNTER_KINDS,
  genesisIntellectualSubjectRef,
  sharedIntellectualSourceRefs,
} from "../src/genesis-intellectual-encounter.mjs";
import {
  GENESIS_RICH_PASS_A_RESPONSE_SCHEMA,
  assertRichRepairPreservesEpisodeFacts,
  normalizeRichPassAEpisode,
  validateRichPassAEpisode,
} from "../src/genesis-rich-life-episode.mjs";
import {
  assertRichLifeCompilerMode,
  buildRichLifePassAInput,
  projectRichLifePassAInputForCognition,
} from "../src/genesis-rich-life-domain.mjs";
import {
  THREAD_LIFE_EPISODE_RECORDED,
  applyGenesisLifeEpisodeEventToThread,
  genesisLifeEpisodeEventId,
  normalizePublishedGenesisEpisode,
} from "../src/genesis-life-episode.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function worldSpec() {
  return {
    worldSpecId: "world_slice_e_rich_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-18T23:59:59Z" },
    places: [
      { placeId: "place_home", description: "A compact family home near schools, transit, shops and a public library." },
      { placeId: "place_school", description: "A public school with classrooms, a library room and ordinary clubs." },
      { placeId: "place_library", description: "A neighborhood public library with open shelves and community talks." },
    ],
    householdShape: "Two caregivers and siblings share a stable household.",
    familyRelations: ["Caregivers and siblings share ordinary household responsibilities."],
    languages: ["English", "Korean"],
    materialCircumstances: "Stable housing with ordinary budget constraints and access to public institutions.",
    mobilityPattern: "Daily movement is mostly walking, cycling and public transit.",
    schoolingOrCommunityContext: "Public schools, library access, neighborhood shops and community activities are available.",
    culturalContext: "A multilingual urban neighborhood with mixed family and peer traditions.",
    availableInstitutions: ["public_school", "public_library", "community_center", "local_commerce"],
    intellectualEnvironment: "Books, art, science demonstrations, conversation and optional public talks are available without assigning conclusions.",
    affordedRoles: ["caregiver", "sibling", "peer", "teacher", "neighbor", "librarian", "mentor", "shopkeeper"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Ordinary portable conditions authored without access to a cohort genome.",
      relocationWitness: "No named source scene, character or target adult outcome is retained.",
      familiarityProbe: null,
      createdAt: "2026-08-18T23:00:00Z",
    },
    createdAt: "2026-08-18T23:00:00Z",
  };
}

function subject() {
  return { provisionalThreadId: "thr_slice_e_rich_001", bornAt: "1997-01-01T00:00:00Z" };
}

function roster() {
  return [
    { participantId: "thr_slice_e_rich_001", factualRoles: ["subject"], relationshipFacts: [] },
    { participantId: "person_caregiver", factualRoles: ["caregiver"], relationshipFacts: ["caregiver of subject"] },
    { participantId: "person_teacher", factualRoles: ["teacher"], relationshipFacts: ["teacher at subject school"] },
    { participantId: "person_peer", factualRoles: ["peer"], relationshipFacts: ["school peer"] },
  ];
}

function window(minAge = 11, maxAge = 13) {
  return {
    windowId: `window_${minAge}_${maxAge}`,
    startAt: `${1997 + minAge}-01-01T00:00:00Z`,
    endAt: `${1997 + maxAge}-12-31T23:59:59Z`,
    minAge,
    maxAge,
  };
}

function offered(minAge = 11, maxAge = 13, seed = "slice-e-offer-001") {
  return sampleEventStructuresV2(
    GENESIS_EVENT_STRUCTURE_POOL_V2,
    { minAge, maxAge },
    { seed, count: 9 },
  );
}

function buildInput({ originMode = "de_novo", syntheticLineageWitness = null, priorEpisodes = [], previouslyIntroducedParticipants = [] } = {}) {
  return buildRichLifePassAInput({
    originMode,
    syntheticLineageWitness,
    worldSpec: worldSpec(),
    subject: subject(),
    developmentalWindow: window(),
    chronologyEndsAt: "2010-12-31T23:59:59Z",
    initialRoster: roster(),
    priorEpisodes,
    previouslyIntroducedParticipants,
    eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    offeredEntries: offered(),
  });
}

function richEpisode(overrides = {}) {
  return {
    episodeId: "ep_slice_e_book_001",
    occurredAt: "2009-05-12T16:00:00Z",
    ageAtEvent: 12.36,
    placeRef: "place_library",
    participantRefs: ["thr_slice_e_rich_001", "person_teacher"],
    observableAction: "The student follows a teacher's shelf suggestion, opens a short astronomy book, and compares two diagrams before returning it to the table.",
    structureRef: null,
    introducedParticipants: [],
    intellectualEncounter: {
      kind: "book",
      subjectKind: "work",
      subjectLabel: "An introductory astronomy book from the public library",
      participantRef: null,
      accessMode: "institution_mediated",
    },
    ...overrides,
  };
}

test("EventStructurePool v2 uses varied developmental ranges and offers only full-stratum affordances", () => {
  const pool = normalizeEventStructurePoolV2(GENESIS_EVENT_STRUCTURE_POOL_V2);
  assert.ok(pool.length >= 24);
  const ranges = new Set(pool.map(({ structure }) => `${structure.developmentalRange.minAge}-${structure.developmentalRange.maxAge}`));
  assert.ok(ranges.size >= 8);
  assert.equal([...ranges].every((range) => range !== "5-18"), true);
  assert.match(eventStructurePoolV2Digest(pool), /^sha256:[0-9a-f]{64}$/);

  for (const range of [
    { minAge: 6, maxAge: 7 },
    { minAge: 8, maxAge: 9 },
    { minAge: 11, maxAge: 12 },
    { minAge: 14, maxAge: 15 },
  ]) {
    const sample = sampleEventStructuresV2(pool, range, { seed: `range-${range.minAge}`, count: 9 });
    assert.equal(sample.length, 9);
    assert.ok(sample.filter(({ structure }) => structure.consequenceClass === "low").length >= 4);
    assert.equal(new Set(sample.map(({ structure }) => structure.structureId)).size, 9);
    assert.equal(sample.every(({ structure }) =>
      structure.developmentalRange.minAge <= range.minAge &&
      structure.developmentalRange.maxAge >= range.maxAge), true);
  }
});

test("EventStructurePool v2 includes ordinary social, caregiver-mediated and increasingly self-directed intellectual access", () => {
  const pool = normalizeEventStructurePoolV2(GENESIS_EVENT_STRUCTURE_POOL_V2);
  const has = (predicate) => pool.some(predicate);
  assert.equal(has((entry) => entry.contextKinds.includes("social_conversation")), true);
  assert.equal(has((entry) => entry.contextKinds.includes("intellectual_encounter") && entry.accessModes.includes("caregiver_mediated") && entry.structure.developmentalRange.minAge <= 6), true);
  assert.equal(has((entry) => entry.contextKinds.includes("intellectual_encounter") && entry.accessModes.includes("peer_mediated")), true);
  assert.equal(has((entry) => entry.contextKinds.includes("intellectual_encounter") && entry.accessModes.includes("self_directed") && entry.structure.developmentalRange.maxAge >= 16), true);
});

test("de_novo and synthetic_lineage use the same Pass-A cognition boundary and the genome witness never enters it", () => {
  const deNovo = buildInput();
  const synthetic = buildInput({
    originMode: "synthetic_lineage",
    syntheticLineageWitness: {
      genomeRef: "genome_slice_e_child",
      parentOrAncestorRefs: ["ancestor_e_a", "ancestor_e_b"],
      recombinationWitnessRef: "recomb_slice_e_001",
    },
  });
  const deNovoCognition = projectRichLifePassAInputForCognition(deNovo);
  const syntheticCognition = projectRichLifePassAInputForCognition(synthetic);
  assert.deepEqual(syntheticCognition, deNovoCognition);
  const serialized = JSON.stringify(syntheticCognition);
  for (const forbidden of ["genome_slice_e_child", "ancestor_e_a", "ancestor_e_b", "recomb_slice_e_001", "synthetic_lineage"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("prior intellectual source identity stays out of later Pass-A cognition while the observable history remains", () => {
  const prior = richEpisode({
    episodeId: "ep_slice_e_prior_source",
    occurredAt: "2008-06-01T16:00:00Z",
    ageAtEvent: 11.42,
    observableAction: "The student opens a library astronomy book, compares two diagrams, and returns it before leaving.",
  });
  const input = buildInput({ priorEpisodes: [prior] });
  const cognition = projectRichLifePassAInputForCognition(input);
  assert.equal(cognition.priorEpisodes.length, 1);
  assert.match(cognition.priorEpisodes[0].observableAction, /astronomy book/);
  const serialized = JSON.stringify(cognition.priorEpisodes[0]);
  assert.equal(serialized.includes("intellectualEncounter"), false);
  assert.equal(serialized.includes("isrc_"), false);
});

test("Slice E compiler modes are narrow and synthetic lineage requires its policy-side inheritance witness", () => {
  assert.deepEqual(assertRichLifeCompilerMode({ originMode: "de_novo" }), { originMode: "de_novo", syntheticLineageWitness: null });
  assert.throws(() => assertRichLifeCompilerMode({ originMode: "synthetic_lineage" }), /requires a policy-side lineage witness/);
  assert.throws(() => assertRichLifeCompilerMode({ originMode: "echo" }), /supports only de_novo or synthetic_lineage/);
  assert.throws(() => assertRichLifeCompilerMode({ originMode: "de_novo", syntheticLineageWitness: {
    genomeRef: "genome_x",
    parentOrAncestorRefs: ["a", "b"],
    recombinationWitnessRef: "recomb_x",
  } }), /cannot carry a lineage witness/);
});

test("intellectual encounters are structured history facts, not meaning fields", () => {
  const input = buildInput();
  const episode = validateRichPassAEpisode(richEpisode(), input);
  assert.equal(episode.intellectualEncounter.kind, "book");
  assert.equal(episode.intellectualEncounter.subjectKind, "work");
  assert.match(episode.intellectualEncounter.subjectRef, /^isrc_[0-9a-f]{64}$/);
  assert.equal(Object.hasOwn(episode.intellectualEncounter, "meaning"), false);
  assert.equal(Object.hasOwn(episode.intellectualEncounter, "lesson"), false);

  assert.throws(() => validateRichPassAEpisode(richEpisode({
    intellectualEncounter: {
      ...richEpisode().intellectualEncounter,
      meaning: "This made the child value science forever.",
    },
  }), input), /not allowed|unsupported field set/);
});

test("person intellectual encounters reuse a grounded participant identity rather than minting a source identity", () => {
  const input = buildInput();
  const episode = validateRichPassAEpisode(richEpisode({
    intellectualEncounter: {
      kind: "teacher_or_mentor",
      subjectKind: "person",
      subjectLabel: "The subject's classroom science teacher",
      participantRef: "person_teacher",
      accessMode: "institution_mediated",
    },
  }), input);
  assert.equal(episode.intellectualEncounter.subjectRef, "person_teacher");

  assert.throws(() => validateRichPassAEpisode(richEpisode({
    intellectualEncounter: {
      kind: "teacher_or_mentor",
      subjectKind: "person",
      subjectLabel: "An ungrounded mentor",
      participantRef: "person_not_in_episode",
      accessMode: "institution_mediated",
    },
  }), input), /participantRef must be a participant in the episode/);
});

test("the required intellectual encounter categories are first-class and no encounter is required-but-nullable", () => {
  for (const kind of [
    "book",
    "teacher_or_mentor",
    "argument",
    "conversation",
    "overheard_discussion",
    "art",
    "scientific_idea",
    "religious_or_philosophical_text",
    "other_intellectual_source",
  ]) assert.equal(GENESIS_INTELLECTUAL_ENCOUNTER_KINDS.includes(kind), true);
  const episodeSchema = GENESIS_RICH_PASS_A_RESPONSE_SCHEMA.properties.episode;
  const encounterSchema = episodeSchema.properties.intellectualEncounter;
  assert.equal(episodeSchema.required.includes("intellectualEncounter"), true);
  assert.deepEqual(encounterSchema.type, ["object", "null"]);
  assert.deepEqual(encounterSchema.properties.kind.enum, GENESIS_INTELLECTUAL_ENCOUNTER_KINDS);
});

test("record repair may rewrite observable form but cannot alter an encounter witness", () => {
  const original = normalizeRichPassAEpisode(richEpisode());
  const repaired = { ...structuredClone(original), observableAction: "The student opens the astronomy book, compares two diagrams, and returns the book to the table." };
  assert.doesNotThrow(() => assertRichRepairPreservesEpisodeFacts(original, repaired));
  assert.throws(() => assertRichRepairPreservesEpisodeFacts(original, {
    ...structuredClone(repaired),
    intellectualEncounter: { ...repaired.intellectualEncounter, accessMode: "self_directed" },
  }), /changed event or intellectual-encounter facts/);
});

test("same intellectual-source relation is mechanically derivable from authoritative encounter refs", () => {
  const first = normalizeRichPassAEpisode(richEpisode());
  const second = normalizeRichPassAEpisode(richEpisode({
    episodeId: "ep_slice_e_book_002",
    occurredAt: "2015-05-12T16:00:00Z",
    ageAtEvent: 18.36,
    observableAction: "Years later the student finds another copy of the same astronomy book and checks the diagram that had caught their attention before.",
  }));
  assert.deepEqual(sharedIntellectualSourceRefs(first, second), [first.intellectualEncounter.subjectRef]);
  const different = normalizeRichPassAEpisode(richEpisode({
    episodeId: "ep_slice_e_book_003",
    intellectualEncounter: {
      ...richEpisode().intellectualEncounter,
      subjectLabel: "A field guide to desert insects",
    },
  }));
  assert.deepEqual(sharedIntellectualSourceRefs(first, different), []);
});

test("rich encounter metadata is bound into the authoritative life-event payload and content address", () => {
  const episode = normalizeRichPassAEpisode(richEpisode());
  const normalized = normalizePublishedGenesisEpisode(episode);
  assert.equal(normalized.payload.intellectualEncounter.subjectRef, episode.intellectualEncounter.subjectRef);

  const thread = structuredClone(mina);
  thread.threadId = "thr_slice_e_rich_001";
  thread.memoryRefs = [];
  thread.relationshipRefs = [];
  thread.provenance = {
    ...thread.provenance,
    createdAt: "2026-08-18T23:10:00Z",
    createdBy: "fibre.genesis",
    lastEventId: "evt_slice_e_seed",
  };
  const genesisId = "gen_slice_e_rich_001";
  const eventId = genesisLifeEpisodeEventId({ threadId: thread.threadId, genesisId, episode });
  const event = {
    eventId,
    threadId: thread.threadId,
    sequence: 2,
    expectedVersion: thread.version,
    resultingVersion: thread.version + 1,
    eventType: THREAD_LIFE_EPISODE_RECORDED,
    commandId: null,
    commandDigest: null,
    payload: normalized.payload,
    actor: { entityId: "fibre.genesis", kind: "other", displayName: "fibre.genesis" },
    occurredAt: episode.occurredAt,
    stateHash: "sha256:" + "0".repeat(64),
    authorizationId: null,
    causationId: "evt_slice_e_seed",
    correlationId: genesisId,
    payloadSchemaVersion: 1,
    provenance: {
      source: "genesis_birth",
      genesisId,
      worldSpecRef: "world_slice_e_rich_001",
      episodeId: episode.episodeId,
      pass: "A",
    },
  };
  assert.doesNotThrow(() => applyGenesisLifeEpisodeEventToThread(thread, event));

  const tampered = structuredClone(event);
  tampered.payload.intellectualEncounter.subjectLabel = "A different astronomy book";
  tampered.payload.intellectualEncounter.subjectRef = genesisIntellectualSubjectRef(tampered.payload.intellectualEncounter);
  assert.throws(() => applyGenesisLifeEpisodeEventToThread(thread, tampered), /does not match its Genesis episode content/);
});

test("Slice E additions do not change the live publication-validator witness or claim causal standing", () => {
  const witness = publicationValidatorSetWitness();
  assert.equal(typeof witness.digest, "string");
  assert.equal(Object.hasOwn(witness, "richLifeCausalStanding"), false);
  assert.equal(Object.hasOwn(witness, "intellectualMeaningAuthority"), false);
});

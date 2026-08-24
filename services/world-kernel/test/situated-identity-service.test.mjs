import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { GenesisStore } from "../src/genesis-store.mjs";
import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { IDENTITY_DOMAIN_REGISTRY_VERSION } from "../src/identity-domain-registry.mjs";
import { lifeRelationId, placeEpisodeId } from "../src/situated-life-domain.mjs";
import { openSituatedLifeStore } from "../src/situated-life-store.mjs";
import { SituatedIdentityService } from "../src/situated-identity-service.mjs";

const fixture = JSON.parse(readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));
const sha = (char) => `sha256:${char.repeat(64)}`;

function withDb(run) {
  const dir = mkdtempSync(join(tmpdir(), "fibre-situated-identity-"));
  const path = join(dir, "world.sqlite");
  try { return run(path); } finally { rmSync(dir, { recursive: true, force: true }); }
}

function cognition() {
  const surface = (char) => ({
    provider: "fixture",
    modelId: "fixture-model-v1",
    promptHash: sha(char),
    schemaHash: sha(char === "a" ? "b" : char),
    sampling: { temperature: 0, seed: 39 },
  });
  return {
    passA: surface("a"),
    passB: surface("c"),
    passC: surface("d"),
    recordRepair: surface("e"),
    policyVersion: "genesis-v1",
    eventStructurePoolDigest: sha("f"),
    publicationValidatorSetWitness: publicationValidatorSetWitness(),
  };
}

function publishLivedThread(databasePath) {
  const worldSpec = {
    worldSpecId: "world_situated_identity_001",
    timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2026-08-13T16:10:00Z" },
    places: [{ placeId: "place_home", description: "A family home used for ordinary household routines." }],
    householdShape: "A family household.",
    familyRelations: ["Family members share ordinary household routines."],
    languages: ["Korean", "English"],
    materialCircumstances: "Stable housing.",
    mobilityPattern: "Ordinary neighborhood travel.",
    schoolingOrCommunityContext: "Public school and neighborhood routines.",
    culturalContext: "Bilingual household life.",
    availableInstitutions: ["public_school"],
    intellectualEnvironment: "Books and ordinary family discussion are available.",
    affordedRoles: ["caregiver", "sibling", "peer"],
    worldAuthorship: {
      authorId: "fixture_author",
      sourcesConsulted: [],
      abstractionMethod: "Test fixture.",
      relocationWitness: "No source character or plot is retained.",
      familiarityProbe: null,
      createdAt: "2026-08-13T15:58:00Z",
    },
    createdAt: "2026-08-13T15:58:00Z",
  };
  const thread = structuredClone(fixture);
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-08-13T15:59:00Z",
    createdBy: "fibre.genesis",
    lastEventId: "evt_situated_identity_seed",
  };
  const episodes = [{
    episodeId: "ep_situated_identity_home_001",
    occurredAt: "2020-01-25T11:00:00Z",
    ageAtEvent: 13.8,
    placeRef: "place_home",
    participantRefs: [thread.threadId],
    observableAction: "At home, the child answers a caregiver in Korean while putting away dishes after lunch.",
    structureRef: null,
    introducedParticipants: [],
  }];
  const manifest = {
    genesisId: "gen_situated_identity_001",
    threadId: thread.threadId,
    originMode: "de_novo",
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: "2026-08-13T16:00:00Z",
      justification: "The fixture admits one bounded lived episode before entry.",
      policyRef: "entry-policy-v1",
    },
    worldSpecRef: worldSpec.worldSpecId,
    sourceBundleRefs: [],
    parentOrAncestorRefs: [],
    genomeRef: null,
    cognition: cognition(),
    publication: {
      status: "published",
      publishedAt: "2026-08-13T16:01:00Z",
      resultingThreadVersion: thread.version + episodes.length,
    },
    createdAt: "2026-08-13T15:58:30Z",
  };

  const genesis = new GenesisStore(databasePath);
  genesis.recordWorldSpec(worldSpec);
  genesis.publishBirth({ manifest, thread, episodes });
  genesis.close();

  const world = openWorldStore(databasePath);
  const events = world.listEvents(thread.threadId);
  world.close();
  return {
    threadId: thread.threadId,
    seedEventId: events.find((event) => event.eventType === "THREAD_SEEDED").eventId,
    livedEventId: events.find((event) => event.eventType === "THREAD_LIFE_EPISODE_RECORDED").eventId,
  };
}

test("cultural formation requires Fibre-resolved lived evidence and remains context-only", () =>
  withDb((databasePath) => {
    const published = publishLivedThread(databasePath);

    const situated = openSituatedLifeStore(databasePath);
    const relationId = lifeRelationId({ child: published.threadId, parent: "synthetic_mother" });
    situated.recordLifeRelation({
      relationId, revision: 1, threadId: published.threadId,
      relatedParty: { partyId: "ancestor.synthetic.mother", kind: "synthetic_ancestor", displayName: "Ji-eun Park" },
      relationKind: "biological_parent", geneticContributionRole: "parent_genome_source",
      sourceReferences: [published.seedEventId], validFrom: null, validTo: null,
      visibility: "private", provenance: "genesis_created", recordedAt: "2026-08-13T16:02:00Z",
    });
    const episodeId = placeEpisodeId({ thread: published.threadId, place: "seoul" });
    situated.recordPlaceEpisode({
      episodeId, revision: 1, threadId: published.threadId, episodeKind: "residence",
      place: { placeId: "place.kr.seoul", displayName: "Seoul", countryCode: "KR", region: null, locality: "Seoul", precision: "locality" },
      startAt: "2018-01-01T00:00:00Z", endAt: "2025-01-01T00:00:00Z",
      sourceReferences: [published.seedEventId], visibility: "private", provenance: "genesis_created", recordedAt: "2026-08-13T16:02:00Z",
    });
    situated.close();

    const service = new SituatedIdentityService(databasePath);
    assert.throws(() => service.recordCulturalFormation({
      threadId: published.threadId, kind: "household_language",
      claimPredicate: { subject: "self", predicate: "used_language_at_home", object: "Korean" },
      meaning: "Mina used Korean at home during childhood.", eventReferences: ["evt_invented"],
      relationWitnesses: [{ relationId, revision: 1 }], placeWitnesses: [{ episodeId, revision: 1 }],
      recordedAt: "2026-08-13T16:03:00Z",
    }), /does not exist/);

    assert.throws(() => service.recordCulturalFormation({
      threadId: published.threadId, kind: "household_language",
      claimPredicate: { subject: "self", predicate: "used_language_at_home", object: "Korean" },
      meaning: "Mina used Korean at home during childhood.", eventReferences: [published.seedEventId],
      relationWitnesses: [{ relationId, revision: 1 }], placeWitnesses: [{ episodeId, revision: 1 }],
      recordedAt: "2026-08-13T16:03:00Z",
    }), /lived Thread-event witness/i);

    const stored = service.recordCulturalFormation({
      threadId: published.threadId, kind: "household_language",
      claimPredicate: { subject: "self", predicate: "used_language_at_home", object: "Korean" },
      meaning: "Mina used Korean at home during childhood.", eventReferences: [published.livedEventId],
      relationWitnesses: [{ relationId, revision: 1 }], placeWitnesses: [{ episodeId, revision: 1 }],
      recordedAt: "2026-08-13T16:03:00Z",
    });
    assert.equal(stored.assertion.domain, "cultural_formation");
    assert.equal(stored.assertion.behavioralStatus, "context_only");
    assert.equal(stored.registryVersion, IDENTITY_DOMAIN_REGISTRY_VERSION);
  }));

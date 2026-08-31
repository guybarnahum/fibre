import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
// fibre-test-lifecycle: permanent
// fibre-test-scope: genesis-birth
// fibre-test-purpose: authoritative-place-and-narrated-scene-must-agree-at-publication

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import { deriveGenesisLifeContinuity } from "../src/genesis-life-continuity-v1.mjs";
import { GenesisStore } from "../src/genesis-store.mjs";
import { attachTestCivilRegistration } from "./support/civil-registration-fixture.mjs";
import { buildTestHistoricalEnvelopePlan } from "./support/historical-envelope-fixture.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const THREAD_ID = "thr_genesis_place_authority";
const GENESIS_ID = "gen_genesis_place_authority";
const WORLD_ID = "world_genesis_place_authority";
const PUBLISHED_AT = "2026-08-25T18:00:00Z";
const sha = (character) => `sha256:${character.repeat(64)}`;

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-place-authority-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function worldSpec() {
  return {
    worldSpecId: WORLD_ID,
    timeFrame: { startAt: "2000-01-01T00:00:00Z", endAt: "2026-08-25T17:59:00Z" },
    places: [{
      placeId: "place_neighborhood_library",
      description: "A neighborhood public library with a reading room, return desk, and study tables.",
    }],
    householdShape: "One caregiver and one child share a stable apartment.",
    familyRelations: ["The caregiver and child share ordinary household responsibilities."],
    languages: ["English"],
    materialCircumstances: "Stable housing with ordinary budget constraints.",
    mobilityPattern: "Daily life is walkable and transit-accessible.",
    schoolingOrCommunityContext: "Public school and neighborhood library are regularly available.",
    culturalContext: "Ordinary neighborhood routines and mixed peer groups.",
    availableInstitutions: ["public_school", "public_library"],
    intellectualEnvironment: "Books, newspapers, and ordinary discussion are available.",
    affordedRoles: ["caregiver", "librarian", "peer"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Synthetic publication-boundary fixture using ordinary structural conditions.",
      relocationWitness: "No source character or plot is retained.",
      familiarityProbe: null,
      createdAt: "2026-08-25T17:00:00Z",
    },
    createdAt: "2026-08-25T17:00:00Z",
  };
}

function thread() {
  const value = structuredClone(mina);
  value.threadId = THREAD_ID;
  value.relationshipRefs = [];
  value.memoryRefs = [];
  value.provenance = {
    createdAt: "2026-08-25T17:01:00Z",
    createdBy: "fibre.genesis",
    lastEventId: "evt_genesis_place_authority_seed",
  };
  return value;
}

function cognition() {
  const surface = (character) => ({
    provider: "fixture",
    modelId: "fixture-model-v1",
    promptHash: sha(character),
    schemaHash: sha(character === "a" ? "b" : character),
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

function goodEpisode() {
  return {
    episodeId: "ep_genesis_place_authority_001",
    occurredAt: "2012-06-09T11:30:00Z",
    ageAtEvent: 8.4,
    placeRef: "place_neighborhood_library",
    participantRefs: [THREAD_ID],
    observableAction: "At the library, the child compares two return slips before carrying one book to the reading table.",
    structureRef: null,
    introducedParticipants: [],
  };
}

function manifest(seedThread) {
  return {
    genesisId: GENESIS_ID,
    threadId: THREAD_ID,
    originMode: "de_novo",
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: "2026-08-25T17:59:00Z",
      justification: "The fixture exercises the authoritative publication-place boundary.",
      policyRef: "entry-policy-v1",
    },
    worldSpecRef: WORLD_ID,
    sourceBundleRefs: [],
    parentOrAncestorRefs: [],
    genomeRef: null,
    cognition: cognition(),
    publication: {
      status: "published",
      publishedAt: PUBLISHED_AT,
      resultingThreadVersion: seedThread.version + 1,
    },
    createdAt: "2026-08-25T17:00:30Z",
  };
}

function birth({ tamperNarration = false, omitEnvelope = false } = {}) {
  const seedThread = thread();
  const world = worldSpec();
  const authoritativeEpisode = goodEpisode();
  const publishedEpisode = tamperNarration
    ? {
        ...authoritativeEpisode,
        observableAction: "At the beach, the child compares two return slips before carrying one book toward a shaded table.",
      }
    : authoritativeEpisode;
  const roster = [{
    participantId: THREAD_ID,
    factualRoles: ["subject"],
    relationshipFacts: [],
  }];
  const historicalEnvelopePlan = buildTestHistoricalEnvelopePlan({
    threadId: THREAD_ID,
    worldSpec: world,
    episodes: [authoritativeEpisode],
  });
  return {
    world,
    bundle: attachTestCivilRegistration({
      manifest: manifest(seedThread),
      thread: seedThread,
      episodes: [publishedEpisode],
      initialRoster: roster,
      lifeContinuity: deriveGenesisLifeContinuity({
        threadId: THREAD_ID,
        worldSpec: world,
        initialRoster: roster,
        episodes: [publishedEpisode],
      }),
      ...(omitEnvelope ? {} : { historicalEnvelopePlan }),
    }),
  };
}

function assertNothingPublished(databasePath) {
  const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
  for (const [table, column, value] of [
    ["threads", "thread_id", THREAD_ID],
    ["thread_events", "thread_id", THREAD_ID],
    ["genesis_historical_envelope_plans", "genesis_id", GENESIS_ID],
    ["genesis_manifests", "genesis_id", GENESIS_ID],
    ["fibre_civil_registrations", "thread_id", THREAD_ID],
  ]) {
    assert.equal(database.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${column}=?`).get(value).count, 0);
  }
  database.close();
}

test("publishBirth refuses prior life without its authoritative historical-envelope plan", () =>
  withDatabase((databasePath) => {
    const { world, bundle } = birth({ omitEnvelope: true });
    const genesis = new GenesisStore(localWorldStateStorage(databasePath));
    genesis.recordWorldSpec(world);
    assert.throws(
      () => genesis.publishBirth(bundle),
      /prior-life birth requires its authoritative historicalEnvelopePlan/u,
    );
    genesis.close();
    assertNothingPublished(databasePath);
  }));

test("publishBirth rejects narrated beach against authoritative library place and commits nothing", () =>
  withDatabase((databasePath) => {
    const { world, bundle } = birth({ tamperNarration: true });
    const genesis = new GenesisStore(localWorldStateStorage(databasePath));
    genesis.recordWorldSpec(world);
    assert.throws(
      () => genesis.publishBirth(bundle),
      /observableAction narrates an explicit scene setting incompatible with authoritative placeRef/u,
    );
    genesis.close();
    assertNothingPublished(databasePath);
  }));

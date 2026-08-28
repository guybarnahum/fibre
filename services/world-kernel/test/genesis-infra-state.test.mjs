import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "@fibre/infra/sqlite-state";
import { CivilRegistryStore } from "../src/civil-registry-store.mjs";
import {
  GenesisStore,
} from "../src/genesis-store.mjs";
import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { attachTestCivilRegistration } from "./support/civil-registration-fixture.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

const sha = (char) => `sha256:${char.repeat(64)}`;

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-genesis-infra-state-"));
  const databasePath = join(directory, "world.sqlite");
  const infra = createSqliteStateInfraDriver({ scopes: { world: databasePath } });
  try { return run({ databasePath, infra }); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function worldSpec() {
  return {
    worldSpecId: "world_infra_birth_001",
    timeFrame: {
      startAt: "2000-01-01T00:00:00Z",
      endAt: "2026-08-26T20:00:00Z",
    },
    places: [
      { placeId: "place_infra_harbor", description: "A multilingual coastal city with public transit and neighborhood schools." },
    ],
    householdShape: "Two caregivers, one older sibling, and a grandparent living nearby.",
    familyRelations: ["The grandparent visits twice a week.", "The siblings share a bedroom during early childhood."],
    languages: ["English", "Korean"],
    materialCircumstances: "Stable rent, limited discretionary money, and reliable access to public services.",
    mobilityPattern: "One move within the same city during primary school.",
    schoolingOrCommunityContext: "Public neighborhood schools, local library, and after-school music program.",
    culturalContext: "Family rituals, bilingual conversation, neighborhood holidays, and mixed peer groups.",
    availableInstitutions: ["public_school", "public_library", "music_program", "local_commerce"],
    intellectualEnvironment: "Books are common at home and adults disagree openly about civic and scientific questions.",
    affordedRoles: ["school_teacher", "librarian", "shopkeeper", "peer", "extended_family"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Authored from ordinary structural conditions without importing a named character or plot.",
      relocationWitness: "No source coordinates or source characters are retained.",
      familiarityProbe: null,
      createdAt: "2026-08-26T20:00:00Z",
    },
    createdAt: "2026-08-26T20:00:00Z",
  };
}

function cognition() {
  const surface = (char) => ({
    provider: "fixture",
    modelId: "fixture-model-v1",
    promptHash: sha(char),
    schemaHash: sha(char === "a" ? "b" : char),
    sampling: { temperature: 0.4, seed: 39 },
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

function birthBundle() {
  const thread = structuredClone(mina);
  thread.threadId = "thr_genesis_infra_state";
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-08-26T20:01:00Z",
    createdBy: "fibre.genesis",
    lastEventId: "evt_infra_birth_seed",
  };
  const manifest = {
    genesisId: "gen_infra_state_001",
    threadId: thread.threadId,
    originMode: "de_novo",
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: "2026-08-26T19:59:00Z",
      justification: "Infra state proof preserves the existing young-adult entry boundary.",
      policyRef: "entry-policy-v1",
    },
    worldSpecRef: "world_infra_birth_001",
    sourceBundleRefs: [],
    parentOrAncestorRefs: [],
    genomeRef: null,
    cognition: cognition(),
    publication: {
      status: "published",
      publishedAt: "2026-08-26T20:02:00Z",
      resultingThreadVersion: thread.version,
    },
    createdAt: "2026-08-26T20:00:30Z",
  };
  return attachTestCivilRegistration({ manifest, thread });
}

function openInfraGenesis(infra, options = {}) {
  return new GenesisStore({ infraDriver: infra, stateScopeId: "world" }, options);
}

test("Genesis birth publishes Thread, manifest, and Civil Registry through one Infra state scope", () =>
  withDatabase(({ databasePath, infra }) => {
    const genesis = openInfraGenesis(infra);
    genesis.recordWorldSpec(worldSpec());
    const birth = birthBundle();
    const publication = genesis.publishBirth(birth);
    assert.equal(publication.thread.threadId, birth.thread.threadId);
    genesis.close();

    const reopened = openInfraGenesis(infra, { readOnly: true });
    assert.equal(reopened.queryOnly(), true);
    assert.equal(reopened.getManifest(birth.manifest.genesisId).manifest.threadId, birth.thread.threadId);
    reopened.close();

    const world = openWorldStore(databasePath);
    assert.equal(world.getThread(birth.thread.threadId).threadId, birth.thread.threadId);
    assert.equal(world.listEvents(birth.thread.threadId).length, 1);
    world.close();

    const registry = new CivilRegistryStore(databasePath);
    const registration = registry.getCivilRegistrationByThreadId(birth.thread.threadId);
    assert.equal(registration.registrationId, birth.manifest.publication.civilRegistration.registrationId);
    assert.equal(registration.birthEventRef, birth.manifest.publication.civilRegistration.birthEventRef);
    registry.close();
  }));

test("Genesis birth failure rolls back the Infra state transaction without a live Thread or registration", () =>
  withDatabase(({ databasePath, infra }) => {
    const genesis = openInfraGenesis(infra);
    genesis.recordWorldSpec(worldSpec());
    const birth = birthBundle();
    assert.throws(
      () => genesis.publishBirth(birth, { failAfterSeedForTest: true }),
      /simulated Slice-A publication failure/,
    );
    assert.equal(genesis.getManifest(birth.manifest.genesisId, { required: false }), null);
    genesis.close();

    const reopened = openInfraGenesis(infra, { readOnly: true });
    assert.equal(reopened.inspectGenesis(birth.manifest.genesisId).threadPublished, false);
    reopened.close();

    const world = openWorldStore(databasePath);
    assert.equal(world.getThread(birth.thread.threadId, { required: false }), null);
    world.close();

    const registry = new CivilRegistryStore(databasePath);
    assert.equal(registry.getCivilRegistrationByThreadId(birth.thread.threadId, { required: false }), null);
    registry.close();
  }));

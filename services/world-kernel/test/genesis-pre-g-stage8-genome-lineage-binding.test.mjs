import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  buildRecombinedSymbolicGenome,
  buildSyntheticAncestorSymbolicGenome,
} from "../src/symbolic-genome-domain.mjs";
import { SymbolicGenomeStore } from "../src/symbolic-genome-store.mjs";
import { lifeRelationId } from "../src/situated-life-domain.mjs";
import { openSituatedLifeInspectionStore } from "../src/situated-life-store.mjs";
import { normalizeSeedSnapshot } from "../src/persistence-domain.mjs";
import {
  GenesisStore,
} from "../src/genesis-store.mjs";
import { publicationValidatorSetWitness } from "../src/genesis-domain.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

const sha = (char) => `sha256:${char.repeat(64)}`;
const PUBLISHED_AT = "2026-08-20T16:58:00Z";
const CREATED_AT = "2026-08-20T16:57:00Z";
const CHILD_ID = "thr_pre_g_stage8_lineage_child";
const GENESIS_ID = "gen_pre_g_stage8_lineage_child";
const ANCESTOR_A = "ancestor.pre_g.stage8.a";
const ANCESTOR_B = "ancestor.pre_g.stage8.b";

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-pre-g-stage8-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function worldSpec() {
  return {
    worldSpecId: "world_pre_g_stage8_001",
    timeFrame: {
      startAt: "2000-01-01T00:00:00Z",
      endAt: "2026-08-20T16:50:00Z",
    },
    places: [{
      placeId: "place_pre_g_stage8",
      description: "A multilingual regional city with ordinary schools, transit, libraries, and local commerce.",
    }],
    householdShape: "Two caregivers and one older sibling in a stable rented home.",
    familyRelations: ["The household remains in regular contact with extended family."],
    languages: ["English", "Korean"],
    materialCircumstances: "Stable essentials with limited discretionary money.",
    mobilityPattern: "One move within the same region during childhood.",
    schoolingOrCommunityContext: "Public schools, neighborhood library, and mixed-age community activities.",
    culturalContext: "Bilingual family routines and mixed local peer groups.",
    availableInstitutions: ["public_school", "public_library", "local_commerce"],
    intellectualEnvironment: "Books, practical projects, and ordinary disagreement are common at home.",
    affordedRoles: ["teacher", "librarian", "peer", "extended_family"],
    worldAuthorship: {
      authorId: "human_guy",
      sourcesConsulted: [],
      abstractionMethod: "Ordinary structural conditions without importing a named person or plot.",
      relocationWitness: "No source coordinates or source characters are retained.",
      familiarityProbe: null,
      createdAt: CREATED_AT,
    },
    createdAt: CREATED_AT,
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

function childThread() {
  const thread = structuredClone(mina);
  thread.threadId = CHILD_ID;
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: CREATED_AT,
    createdBy: "fibre.genesis",
  };
  return thread;
}

function ancestorGenome(ancestorId, genesisId, values) {
  return buildSyntheticAncestorSymbolicGenome({
    ancestorId,
    genesisId,
    values,
    createdAt: "2026-08-20T16:55:00Z",
  });
}

function genomeSet({ childId = CHILD_ID, genesisId = GENESIS_ID } = {}) {
  const a = ancestorGenome(ANCESTOR_A, "gen_pre_g_stage8_ancestor_a", [
    "Returns to unresolved details after other people have moved on.",
    "Shows affection through practical help more often than through declarations.",
    "Can stay engaged in disagreement without demanding immediate agreement.",
    "Notices when official rules and everyday practice diverge.",
  ]);
  const b = ancestorGenome(ANCESTOR_B, "gen_pre_g_stage8_ancestor_b", [
    "Enjoys repairing ordinary objects to understand how they failed.",
    "Makes room for quieter people when a group is deciding something.",
    "Prefers evidence that can be inspected over confident status claims.",
    "Can revise an interpretation without pretending the earlier one never existed.",
  ]);
  const child = buildRecombinedSymbolicGenome({
    threadId: childId,
    genesisId,
    sourceGenomes: [a, b],
    selectionSeed: "pre-g-stage8-lineage-selection-v1",
    createdAt: "2026-08-20T16:56:00Z",
  });
  return { a, b, child };
}

function recordGenomes(databasePath, set, { includeChild = true } = {}) {
  const store = new SymbolicGenomeStore(databasePath);
  store.recordGenome(set.a);
  store.recordGenome(set.b);
  if (includeChild) store.recordGenome(set.child);
  store.close();
}

function manifest(genomeRef, overrides = {}) {
  return {
    genesisId: GENESIS_ID,
    threadId: CHILD_ID,
    originMode: "synthetic_lineage",
    entry: {
      stage: "young_adult",
      ageAtEntry: 22,
      chronologyEndsAt: "2026-08-20T16:50:00Z",
      justification: "Stage-8 fixture exercises the synthetic-lineage publication boundary only.",
      policyRef: "entry-policy-v1",
    },
    worldSpecRef: "world_pre_g_stage8_001",
    sourceBundleRefs: [],
    parentOrAncestorRefs: [ANCESTOR_A, ANCESTOR_B],
    genomeRef,
    cognition: cognition(),
    publication: {
      status: "published",
      publishedAt: PUBLISHED_AT,
      resultingThreadVersion: childThread().version,
    },
    createdAt: "2026-08-20T16:56:30Z",
    ...overrides,
  };
}

function parentRelation(thread, ancestorId, displayName) {
  const seedEventId = normalizeSeedSnapshot(thread).provenance.lastEventId;
  return {
    relationId: lifeRelationId({ child: thread.threadId, parent: ancestorId }),
    revision: 1,
    threadId: thread.threadId,
    relatedParty: {
      partyId: ancestorId,
      kind: "synthetic_ancestor",
      displayName,
    },
    relationKind: "biological_parent",
    geneticContributionRole: "parent_genome_source",
    sourceReferences: [seedEventId],
    validFrom: null,
    validTo: null,
    visibility: "private",
    provenance: "genesis_created",
    recordedAt: PUBLISHED_AT,
  };
}

function relations(thread = childThread()) {
  return [
    parentRelation(thread, ANCESTOR_A, "Synthetic parent A"),
    parentRelation(thread, ANCESTOR_B, "Synthetic parent B"),
  ];
}

function setupGenesis(databasePath) {
  const genesis = new GenesisStore(databasePath);
  genesis.recordWorldSpec(worldSpec());
  return genesis;
}

function assertNoPublishedChild(databasePath) {
  const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
  assert.equal(Number(database.prepare(
    "SELECT COUNT(*) AS count FROM threads WHERE thread_id=?",
  ).get(CHILD_ID).count), 0);
  assert.equal(Number(database.prepare(
    "SELECT COUNT(*) AS count FROM life_relation_records WHERE thread_id=?",
  ).get(CHILD_ID).count), 0);
  assert.equal(Number(database.prepare(
    "SELECT COUNT(*) AS count FROM genesis_manifests WHERE thread_id=?",
  ).get(CHILD_ID).count), 0);
  database.close();
}

test("Stage 8 atomically binds persisted child genome to admitted #38 synthetic-parent lineage", () =>
  withDatabase((databasePath) => {
    const set = genomeSet();
    recordGenomes(databasePath, set);
    const genesis = setupGenesis(databasePath);
    const thread = childThread();
    const canonicalSeedEventId = normalizeSeedSnapshot(thread).provenance.lastEventId;
    const result = genesis.publishBirth({
      manifest: manifest(set.child.header.genomeId),
      thread,
      lifeRelations: relations(thread),
    });
    assert.equal(result.thread.threadId, CHILD_ID);
    genesis.close();

    const situated = openSituatedLifeInspectionStore(databasePath);
    const current = situated.listCurrentLifeRelations(CHILD_ID);
    assert.equal(current.length, 2);
    assert.deepEqual(
      current.map((relation) => relation.relatedParty.partyId).toSorted(),
      [ANCESTOR_A, ANCESTOR_B].toSorted(),
    );
    assert.equal(current.every(
      (relation) => relation.relationKind === "biological_parent" &&
        relation.geneticContributionRole === "parent_genome_source" &&
        relation.provenance === "genesis_created",
    ), true);
    assert.equal(current.every(
      (relation) => relation.sourceReferences.includes(canonicalSeedEventId),
    ), true);
    situated.close();
  }));

test("Stage 8 rejects a manifest genomeRef that does not resolve and leaves no live child", () =>
  withDatabase((databasePath) => {
    const set = genomeSet();
    recordGenomes(databasePath, set, { includeChild: false });
    const genesis = setupGenesis(databasePath);
    const thread = childThread();
    assert.throws(
      () => genesis.publishBirth({
        manifest: manifest(set.child.header.genomeId),
        thread,
        lifeRelations: relations(thread),
      }),
      /symbolic genome .* was not found/,
    );
    genesis.close();
    assertNoPublishedChild(databasePath);
  }));

test("Stage 8 rejects a genome owned by another Thread and leaves no live child", () =>
  withDatabase((databasePath) => {
    const set = genomeSet({ childId: "thr_pre_g_stage8_other_child" });
    recordGenomes(databasePath, set);
    const genesis = setupGenesis(databasePath);
    const thread = childThread();
    assert.throws(
      () => genesis.publishBirth({
        manifest: manifest(set.child.header.genomeId),
        thread,
        lifeRelations: relations(thread),
      }),
      /does not belong to the child Thread/,
    );
    genesis.close();
    assertNoPublishedChild(databasePath);
  }));

test("Stage 8 rejects a genome from another Genesis and leaves no live child", () =>
  withDatabase((databasePath) => {
    const set = genomeSet({ genesisId: "gen_pre_g_stage8_other_genesis" });
    recordGenomes(databasePath, set);
    const genesis = setupGenesis(databasePath);
    const thread = childThread();
    assert.throws(
      () => genesis.publishBirth({
        manifest: manifest(set.child.header.genomeId),
        thread,
        lifeRelations: relations(thread),
      }),
      /belongs to another genesisId/,
    );
    genesis.close();
    assertNoPublishedChild(databasePath);
  }));

test("Stage 8 rejects manifest or #38 relation source-owner substitution", () =>
  withDatabase((databasePath) => {
    const set = genomeSet();
    recordGenomes(databasePath, set);
    const genesis = setupGenesis(databasePath);
    const thread = childThread();
    assert.throws(
      () => genesis.publishBirth({
        manifest: manifest(set.child.header.genomeId, {
          parentOrAncestorRefs: [ANCESTOR_B, ANCESTOR_A],
        }),
        thread,
        lifeRelations: relations(thread),
      }),
      /parentOrAncestorRefs do not exactly match/,
    );
    assertNoPublishedChild(databasePath);

    const forgedRelations = relations(thread);
    forgedRelations[0].relatedParty.partyId = "ancestor.pre_g.stage8.substitute";
    assert.throws(
      () => genesis.publishBirth({
        manifest: manifest(set.child.header.genomeId),
        thread,
        lifeRelations: forgedRelations,
      }),
      /does not match the symbolic-genome source owner/,
    );
    genesis.close();
    assertNoPublishedChild(databasePath);
  }));

test("Stage 8 requires both parent-genome-source relations and rolls them back with the birth", () =>
  withDatabase((databasePath) => {
    const set = genomeSet();
    recordGenomes(databasePath, set);
    const genesis = setupGenesis(databasePath);
    const thread = childThread();
    assert.throws(
      () => genesis.publishBirth({
        manifest: manifest(set.child.header.genomeId),
        thread,
        lifeRelations: relations(thread).slice(0, 1),
      }),
      /requires exactly 2 parent-genome-source life relations/,
    );
    assertNoPublishedChild(databasePath);

    assert.throws(
      () => genesis.publishBirth(
        {
          manifest: manifest(set.child.header.genomeId),
          thread,
          lifeRelations: relations(thread),
        },
        { failAfterLineageForTest: true },
      ),
      /simulated Stage-8 lineage publication failure/,
    );
    genesis.close();
    assertNoPublishedChild(databasePath);

    const genomeStore = new SymbolicGenomeStore(databasePath, { readOnly: true });
    assert.equal(genomeStore.getGenome(set.child.header.genomeId).header.owner.ownerId, CHILD_ID);
    genomeStore.close();
  }));

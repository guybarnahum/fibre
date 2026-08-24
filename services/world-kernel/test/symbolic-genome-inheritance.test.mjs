import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import {
  assertAtomicGenomeLocus,
  buildDeNovoSymbolicGenome,
  buildRecombinedSymbolicGenome,
  buildSyntheticAncestorSymbolicGenome,
  symbolicGenomeDigest,
} from "../src/symbolic-genome-domain.mjs";
import { SymbolicGenomeStore } from "../src/symbolic-genome-store.mjs";

const mina = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

const parentAValues = [
  "changes tactics after a failed attempt instead of repeating it unchanged",
  "shows affection by noticing practical burdens before being asked",
  "becomes curious when two trusted accounts disagree about the same event",
  "asks for evidence when authority relies mainly on rank or reputation",
  "recovers from embarrassment by preparing more carefully the next time",
  "seeks company after long periods of concentrated solitary work",
];

const parentBValues = [
  "keeps small promises even when nobody else is likely to notice",
  "uses humor to lower tension when a group becomes excessively formal",
  "hesitates to ask for favors when another person already seems overloaded",
  "prefers to confront a conflict early rather than let resentment accumulate",
  "takes unfamiliar routes when routine has made attention feel automatic",
  "becomes more persistent when another person is depending on the outcome",
];

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-symbolic-genome-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

function parentThread(threadId, name) {
  const thread = structuredClone(mina);
  thread.threadId = threadId;
  thread.identity.name = name;
  thread.identity.selfDescription = `${name} is a synthetic development parent used only to ground a source genome.`;
  thread.relationshipRefs = [];
  thread.memoryRefs = [];
  thread.provenance = {
    createdAt: "2026-08-15T18:00:00Z",
    createdBy: "genome-slice-b-fixture",
  };
  return thread;
}

function seedParents(databasePath) {
  const world = openWorldStore(databasePath);
  const parentA = parentThread("thr_genome_parent_a", "Parent A");
  const parentB = parentThread("thr_genome_parent_b", "Parent B");
  world.seedThread(parentA);
  world.seedThread(parentB);
  world.close();
  return { parentA, parentB };
}

function sourceBundles(store) {
  const sourceA = buildDeNovoSymbolicGenome({
    threadId: "thr_genome_parent_a",
    genesisId: "gen_parent_a",
    values: parentAValues,
    createdAt: "2026-08-15T18:05:00Z",
  });
  const sourceB = buildDeNovoSymbolicGenome({
    threadId: "thr_genome_parent_b",
    genesisId: "gen_parent_b",
    values: parentBValues,
    createdAt: "2026-08-15T18:06:00Z",
  });
  store.recordGenome(sourceA);
  store.recordGenome(sourceB);
  return { sourceA, sourceB };
}

test("locus gate protects atomic textual form without pretending to judge specificity", () => {
  assert.doesNotThrow(() => assertAtomicGenomeLocus("values honesty"));
  assert.throws(
    () => assertAtomicGenomeLocus("keeps promises; dislikes asking for help"),
    /one textual proposition/,
  );
  assert.throws(
    () => assertAtomicGenomeLocus("Keeps promises. Dislikes asking for help."),
    /multiple sentences/,
  );
});

test("deterministic crossover preserves exact source loci and explicit mutation witnesses", () =>
  withDatabase((databasePath) => {
    seedParents(databasePath);
    const store = new SymbolicGenomeStore(databasePath);
    const { sourceA, sourceB } = sourceBundles(store);
    const child = buildRecombinedSymbolicGenome({
      threadId: "thr_genome_child",
      genesisId: "gen_child",
      sourceGenomes: [sourceA, sourceB],
      selectionSeed: "slice-b-fixed-crossover-seed",
      createdAt: "2026-08-15T18:10:00Z",
      mutations: [{
        ordinal: 3,
        replacementValue: "becomes intensely curious when two trusted people remember the same event differently",
      }],
    });
    const replay = buildRecombinedSymbolicGenome({
      threadId: "thr_genome_child",
      genesisId: "gen_child",
      sourceGenomes: [sourceA, sourceB],
      selectionSeed: "slice-b-fixed-crossover-seed",
      createdAt: "2026-08-15T18:10:00Z",
      mutations: [{
        ordinal: 3,
        replacementValue: "becomes intensely curious when two trusted people remember the same event differently",
      }],
    });
    assert.deepEqual(replay, child);
    assert.deepEqual(child.header.owner, { kind: "thread", ownerId: "thr_genome_child" });
    assert.equal(child.loci[0].provenance.sourceGenomeRef, sourceA.header.genomeId);
    assert.equal(child.loci.at(-1).provenance.sourceGenomeRef, sourceB.header.genomeId);
    assert.equal(child.loci[2].provenance.kind, "mutated");
    assert.equal(child.mutations.length, 1);
    for (const locus of child.loci.filter((item) => item.provenance.kind === "inherited")) {
      const source = locus.provenance.sourceGenomeRef === sourceA.header.genomeId ? sourceA : sourceB;
      assert.equal(locus.value, source.loci[locus.ordinal - 1].value);
    }

    const stored = store.recordGenome(child);
    assert.equal(stored.idempotent, false);
    assert.equal(store.recordGenome(child).idempotent, true);
    const inspected = store.inspectGenome(child.header.genomeId);
    assert.equal(inspected.sources.length, 2);
    assert.deepEqual(inspected.sources[0].owner, sourceA.header.owner);
    assert.equal(inspected.genome.genomeDigest, child.genomeDigest);
    assert.deepEqual(inspected.genome.loci, child.loci);
    store.close();

    const reader = new SymbolicGenomeStore(databasePath, { readOnly: true });
    assert.equal(reader.queryOnly(), true);
    assert.deepEqual(reader.getGenome(child.header.genomeId), child);
    reader.close();
  }));

test("Thread-owned source genomes require the exact persisted source owner and a live source Thread", () =>
  withDatabase((databasePath) => {
    seedParents(databasePath);
    const store = new SymbolicGenomeStore(databasePath);
    const { sourceA, sourceB } = sourceBundles(store);
    const child = buildRecombinedSymbolicGenome({
      threadId: "thr_genome_child_eligibility",
      genesisId: "gen_child_eligibility",
      sourceGenomes: [sourceA, sourceB],
      selectionSeed: "eligibility-seed",
      createdAt: "2026-08-15T18:20:00Z",
    });
    const wrongOwner = structuredClone(child);
    wrongOwner.header.sourceEligibility.sourceOwners[0] = { kind: "thread", ownerId: "thr_not_the_source" };
    wrongOwner.genomeDigest = symbolicGenomeDigest(wrongOwner);
    assert.throws(() => store.recordGenome(wrongOwner), /does not belong to its declared source owner/);

    const orphanSource = buildDeNovoSymbolicGenome({
      threadId: "thr_not_live",
      genesisId: "gen_orphan_source",
      values: parentAValues,
      createdAt: "2026-08-15T18:21:00Z",
    });
    store.recordGenome(orphanSource);
    const orphanChild = buildRecombinedSymbolicGenome({
      threadId: "thr_genome_child_orphan",
      genesisId: "gen_child_orphan",
      sourceGenomes: [orphanSource, sourceB],
      selectionSeed: "orphan-seed",
      createdAt: "2026-08-15T18:22:00Z",
    });
    assert.throws(() => store.recordGenome(orphanChild), /is not live and cannot contribute through the Thread-owner path/);
    store.close();
  }));

test("synthetic-lineage source genomes belong to synthetic ancestors without minting fake parent Threads", () =>
  withDatabase((databasePath) => {
    const world = openWorldStore(databasePath);
    world.close();
    const store = new SymbolicGenomeStore(databasePath);
    const mother = buildSyntheticAncestorSymbolicGenome({
      ancestorId: "ancestor.synthetic.mother",
      genesisId: "gen_synthetic_lineage_sources",
      values: parentAValues,
      createdAt: "2026-08-15T18:25:00Z",
    });
    const father = buildSyntheticAncestorSymbolicGenome({
      ancestorId: "ancestor.synthetic.father",
      genesisId: "gen_synthetic_lineage_sources",
      values: parentBValues,
      createdAt: "2026-08-15T18:26:00Z",
    });
    store.recordGenome(mother);
    store.recordGenome(father);
    const child = buildRecombinedSymbolicGenome({
      threadId: "thr_synthetic_lineage_child",
      genesisId: "gen_synthetic_lineage_child",
      sourceGenomes: [mother, father],
      selectionSeed: "synthetic-lineage-seed",
      createdAt: "2026-08-15T18:27:00Z",
    });
    assert.doesNotThrow(() => store.recordGenome(child));
    assert.deepEqual(child.header.sourceEligibility.sourceOwners, [
      { kind: "synthetic_ancestor", ownerId: "ancestor.synthetic.mother" },
      { kind: "synthetic_ancestor", ownerId: "ancestor.synthetic.father" },
    ]);
    assert.equal(store.listThreadGenomes("thr_synthetic_lineage_child").length, 1);
    assert.equal(store.listOwnerGenomes({ kind: "synthetic_ancestor", ownerId: "ancestor.synthetic.mother" }).length, 1);
    store.close();
  }));

test("inherited text cannot change without an explicit mutation witness", () =>
  withDatabase((databasePath) => {
    seedParents(databasePath);
    const store = new SymbolicGenomeStore(databasePath);
    const { sourceA, sourceB } = sourceBundles(store);
    const child = buildRecombinedSymbolicGenome({
      threadId: "thr_genome_child_tamper",
      genesisId: "gen_child_tamper",
      sourceGenomes: [sourceA, sourceB],
      selectionSeed: "tamper-seed",
      createdAt: "2026-08-15T18:30:00Z",
    });
    child.loci[1].value = "quietly replaces the inherited text without admitting a mutation";
    child.genomeDigest = symbolicGenomeDigest(child);
    assert.throws(() => store.recordGenome(child), /changed source text without a mutation witness/);
    store.close();
  }));

test("symbolic genotype is immutable after persistence", () =>
  withDatabase((databasePath) => {
    const world = openWorldStore(databasePath);
    world.close();
    const store = new SymbolicGenomeStore(databasePath);
    const genome = buildDeNovoSymbolicGenome({
      threadId: "thr_future_genome_owner",
      genesisId: "gen_future_genome_owner",
      values: parentAValues,
      createdAt: "2026-08-15T18:40:00Z",
    });
    store.recordGenome(genome);
    store.close();

    const raw = new DatabaseSync(databasePath);
    assert.throws(
      () => raw.prepare("UPDATE symbolic_genome_loci SET value='changed' WHERE genome_id=? AND ordinal=1").run(genome.header.genomeId),
      /immutable/,
    );
    assert.throws(
      () => raw.prepare("DELETE FROM symbolic_genomes WHERE genome_id=?").run(genome.header.genomeId),
      /immutable/,
    );
    raw.close();
  }));

test("read-only genome inspection is empty on worlds that never enabled symbolic genomes", () =>
  withDatabase((databasePath) => {
    const world = openWorldStore(databasePath);
    world.close();
    const reader = new SymbolicGenomeStore(databasePath, { readOnly: true });
    assert.deepEqual(reader.inspectGenome("genome_none"), {
      genomeId: "genome_none",
      genome: null,
      sources: [],
    });
    reader.close();
  }));

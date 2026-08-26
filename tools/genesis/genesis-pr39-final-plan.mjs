// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: frozen final-cohort plans for the one-pass PR39 closure run
// fibre-tool-disposition: retire after PR39; retain the scientific result in milestone history

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { repoFile } from "#repo-root";
import { normalizeGenesisWorldSpec } from "#services/world-kernel/src/genesis-domain.mjs";
import { GENESIS_EVENT_STRUCTURE_POOL_V3, sampleEventStructuresV3 } from "#services/world-kernel/src/genesis-event-structure-pool-v3.mjs";
import { buildHistoricalEnvelopePlan } from "#services/world-kernel/src/genesis-historical-envelope-v1.mjs";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import { symbolicGenomeDigest } from "#services/world-kernel/src/symbolic-genome-domain.mjs";

export const PR39_FINAL_COHORT_PATH = "fixtures/genesis/pr39/final-cohort-v1.json";
const DEVELOPMENT_COHORT_PATH = "fixtures/genesis/pr39/development-cohort-v1.json";
const PARENT_INDEX_PATH = "fixtures/genesis/pr39/genomes/parent-genome-index.json";
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function fail(message) { throw new Error(message); }
function readBytes(path) { return readFileSync(repoFile(path)); }
function readJson(path) { return JSON.parse(readBytes(path).toString("utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function gitBlobSha(bytes) { return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"); }
function assertBlob(path, expected) {
  const bytes = readBytes(path);
  const actual = gitBlobSha(bytes);
  if (actual !== expected) fail(`${path} blob binding drift: ${actual}`);
  return JSON.parse(bytes.toString("utf8"));
}
function pad(value) { return String(value).padStart(2, "0"); }
function shiftTimestamp(value) { return new Date(Date.parse(value) + FIVE_DAYS_MS).toISOString(); }
function finalWindows() {
  const development = readJson(DEVELOPMENT_COHORT_PATH);
  return development.historicalPlan.windows.map((window) => ({ ...window, startAt: shiftTimestamp(window.startAt), endAt: shiftTimestamp(window.endAt) }));
}
function loadParentGenomes(genome) {
  if (genome.header.originKind !== "recombined") return [];
  const index = readJson(PARENT_INDEX_PATH);
  const refs = genome.header.sourceEligibility.sourceGenomeRefs;
  const witnessDigests = genome.header.recombinationWitness.sourceGenomeDigests;
  return refs.map((genomeId, ordinal) => {
    const path = index.genomes?.[genomeId];
    if (typeof path !== "string") fail(`final parent genome ${genomeId} has no fixture`);
    const bundle = readJson(path);
    const computed = symbolicGenomeDigest({ header: bundle.header, loci: bundle.loci, mutations: bundle.mutations ?? [] });
    if (bundle.header.genomeId !== genomeId || computed !== bundle.genomeDigest || computed !== witnessDigests[ordinal]) fail(`final parent genome ${genomeId} witness drift`);
    return Object.freeze({ path, bundle });
  });
}

export function assertPr39MechanicalGenomeRemint({ template, genome, slot = "unknown" } = {}) {
  if (template === null || typeof template !== "object" || genome === null || typeof genome !== "object") {
    fail(`final slot ${slot} requires template and final genomes`);
  }
  if (template.header?.originKind !== genome.header?.originKind) {
    fail(`final slot ${slot} genome origin no longer matches its mechanically assigned template`);
  }
  const templateLoci = (template.loci ?? []).map((item) => ({ value: item.value, provenance: item.provenance }));
  const finalLoci = (genome.loci ?? []).map((item) => ({ value: item.value, provenance: item.provenance }));
  if (canonicalJson(templateLoci) !== canonicalJson(finalLoci)) {
    fail(`final slot ${slot} genome semantic/provenance remint drift`);
  }
  if (
    canonicalJson(template.header?.sourceEligibility ?? null) !== canonicalJson(genome.header?.sourceEligibility ?? null) ||
    canonicalJson(template.header?.recombinationWitness ?? null) !== canonicalJson(genome.header?.recombinationWitness ?? null)
  ) {
    fail(`final slot ${slot} inherited-source witness drift`);
  }
  return genome;
}

export function buildPr39FinalClosurePlans({ fixturePath = PR39_FINAL_COHORT_PATH } = {}) {
  const fixture = readJson(fixturePath);
  if (fixture.fixtureVersion !== "pr39-final-cohort-v1" || fixture.status !== "FROZEN_BEFORE_GENERATION") fail("unexpected final-cohort fixture status");
  if (fixture.assignment?.policy !== "slot_index_template_remint_v1" || fixture.assignment?.contentIndependentOfWorld !== true || fixture.assignment?.worldsFrozenBeforeAssignment !== true) fail("final genome assignment policy drift");
  const worldSet = assertBlob(fixture.worldSetPath, fixture.worldSetBlobSha);
  if (worldSet.status !== "FROZEN_BEFORE_FINAL_GENOME_ASSIGNMENT" || worldSet.genomeAssignmentStatus !== "UNASSIGNED") fail("World-before-genome witness drift");
  if (!Array.isArray(fixture.slots) || fixture.slots.length !== 5 || !Array.isArray(worldSet.slots) || worldSet.slots.length !== 5) fail("final cohort must contain five slots");
  const windows = finalWindows();
  const slots = fixture.slots.map((slot, index) => {
    const worldSlot = worldSet.slots[index];
    if (slot.slot !== index + 1 || worldSlot.slot !== slot.slot || worldSlot.threadId !== slot.threadId || worldSlot.genesisId !== slot.genesisId || worldSlot.worldSpecPath !== slot.worldSpecPath) fail(`final slot ${index + 1} World binding drift`);
    const worldSpec = normalizeGenesisWorldSpec(assertBlob(slot.worldSpecPath, slot.worldBlobSha));
    const worldSpecDigest = digest(worldSpec);
    const genome = assertBlob(slot.genomePath, slot.genomeBlobSha);
    const computedGenomeDigest = symbolicGenomeDigest({ header: genome.header, loci: genome.loci, mutations: genome.mutations ?? [] });
    if (computedGenomeDigest !== slot.genomeDigest || genome.genomeDigest !== slot.genomeDigest) fail(`final slot ${slot.slot} genome digest drift`);
    if (genome.header.owner.ownerId !== slot.threadId || genome.header.genesisId !== slot.genesisId) fail(`final slot ${slot.slot} genome identity drift`);
    const expectedOrigin = slot.originMode === "synthetic_lineage" ? "recombined" : "de_novo";
    if (genome.header.originKind !== expectedOrigin) fail(`final slot ${slot.slot} genome origin drift`);
    const template = readJson(slot.templateGenomePath);
    assertPr39MechanicalGenomeRemint({ template, genome, slot: slot.slot });
    const offersByWindow = new Map();
    for (const window of windows) {
      const seed = `${fixture.generation.eventOfferSeedDomain}:slot:${pad(slot.slot)}:structures:${window.windowId}`;
      offersByWindow.set(window.windowId, sampleEventStructuresV3(GENESIS_EVENT_STRUCTURE_POOL_V3, window, { seed, count: fixture.generation.structuresPerWindow }));
    }
    const roster = Object.freeze({ slot: slot.slot, worldSpecId: worldSpec.worldSpecId, threadId: slot.threadId, participants: structuredClone(worldSlot.participants) });
    const envelopePlan = buildHistoricalEnvelopePlan({
      subject: { provisionalThreadId: slot.threadId, bornAt: fixture.entry.bornAt }, worldSpec, windows, offersByWindow,
      initialRoster: roster.participants, placeAffordances: worldSlot.placeAffordances, timeZone: worldSlot.timeZone,
      seedDomain: `${fixture.generation.historicalEnvelopeSeedDomain}:slot:${pad(slot.slot)}`,
    });
    return Object.freeze({
      slot: slot.slot, label: slot.label, threadId: slot.threadId, genesisId: slot.genesisId, originMode: slot.originMode,
      worldSpec, worldSpecPath: slot.worldSpecPath, worldSpecDigest, worldBlobSha: slot.worldBlobSha,
      genome, genomePath: slot.genomePath, genomeDigest: slot.genomeDigest, parentGenomes: Object.freeze(loadParentGenomes(genome)),
      roster, windows: structuredClone(windows), offersByWindow, envelopePlan,
      freshModelRequestDomain: fixture.generation.modelRequestDomain, bornAt: fixture.entry.bornAt,
      chronologyEndsAt: fixture.entry.chronologyEndsAt, timeZone: worldSlot.timeZone,
    });
  });
  return Object.freeze({ fixture, worldSet, slots: Object.freeze(slots), sampling: Object.freeze({
    creativeTemperature: fixture.generation.creativeTemperature,
    mechanicalRepairTemperature: fixture.generation.mechanicalRepairTemperature,
    topP: fixture.generation.topP,
    reasoningEffort: fixture.generation.reasoningEffort,
  }) });
}

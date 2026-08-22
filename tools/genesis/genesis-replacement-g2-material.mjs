#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildDeNovoSymbolicGenome,
  buildRecombinedSymbolicGenome,
  buildSyntheticAncestorSymbolicGenome,
} from "../../services/world-kernel/src/symbolic-genome-domain.mjs";
import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";

export const REPLACEMENT_G2_MATERIAL_VERSION = "pr39-replacement-g2-material-v1";
export const REPLACEMENT_ATTEMPT_VERSION = "pr39-replacement-cohort-v1";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const G1_RESULT_PATH = "artifacts/validation/m2-pr39/replacement-v1/results/rg1-world-familiarity-v1.json";
const OLD_G2_PROTOCOL_PATH = "artifacts/validation/m2-pr39/g/protocol/g2-cohort-genome-freeze-v2.json";
const G2_PROTOCOL_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/rg2-cohort-genome-freeze-v1.json";
const GENOME_ROOT = "artifacts/validation/m2-pr39/replacement-v1/genomes";
const CREATED_AT = "2026-08-22T22:00:00Z";
const ASSIGNMENT_SEED = "pr39-replacement-g2-world-genome-assignment-v1";

const WORLD_ORIGINS = Object.freeze([
  Object.freeze({ slot: 1, originMode: "de_novo" }),
  Object.freeze({ slot: 2, originMode: "synthetic_lineage" }),
  Object.freeze({ slot: 3, originMode: "de_novo" }),
  Object.freeze({ slot: 4, originMode: "de_novo" }),
  Object.freeze({ slot: 5, originMode: "synthetic_lineage" }),
]);

export const FRESH_DE_NOVO_LOCI = Object.freeze({
  1: Object.freeze([
    "checks an unfamiliar claim against a second source before repeating it",
    "keeps working through confusion by changing the representation rather than repeating the same step",
    "joins a group conversation by asking one concrete question before offering an opinion",
    "prefers to repair a small mistake immediately rather than hide it until later",
    "notices when a routine has become inefficient and experiments with a simpler sequence",
    "after sustained social activity, seeks a period of solitary focused work",
  ]),
  3: Object.freeze([
    "when instructions conflict, asks which constraint has priority before proceeding",
    "forms tentative explanations from observed patterns and revises them when a counterexample appears",
    "responds to another person's frustration by first making room for them to explain the problem",
    "chooses a familiar method under time pressure unless a clear failure signal appears",
    "recovers from an unsuccessful attempt by comparing what changed between tries",
    "often turns idle time into making, sorting, or investigating something at hand",
  ]),
  4: Object.freeze([
    "tests a surprising assertion by looking for a concrete case that would make it false",
    "persists longer when a difficult task has a visible intermediate milestone",
    "in a disagreement, restates the other person's position before defending a different view",
    "prefers to commit to a plan once enough information is available rather than continue collecting indefinitely",
    "treats a public correction as useful information even when it is embarrassing",
    "after repeated solitary work, looks for a shared activity or conversation",
  ]),
});

export const FRESH_SYNTHETIC_PARENT_LOCI = Object.freeze({
  2: Object.freeze({
    a: Object.freeze([
      "keeps a provisional answer open when evidence is incomplete",
      "looks for recurring causes when the same practical problem appears twice",
      "offers companionship before advice when someone seems discouraged",
      "prefers decisions that can be reversed when stakes are unclear",
      "after making an error, records what to check next time",
      "enjoys alternating between shared activity and independent work",
    ]),
    b: Object.freeze([
      "asks what observation would distinguish two competing explanations",
      "learns procedures by trying them in small pieces and inspecting the result",
      "enters unfamiliar groups by listening for the local rhythm before speaking",
      "favors clear commitments when delay itself creates costs",
      "responds to criticism by separating the useful detail from the tone",
      "sustains attention by moving between quiet concentration and brief physical activity",
    ]),
  }),
  5: Object.freeze({
    a: Object.freeze([
      "when a plan fails unexpectedly, checks the assumptions before changing the goal",
      "notices small differences between repeated situations before generalizing from them",
      "helps another person by taking on one bounded task rather than taking over the whole problem",
      "prefers to gather a little direct experience before relying on a confident description",
      "after conflict, returns to unfinished practical cooperation even if agreement remains incomplete",
      "protects uninterrupted time when a project requires sustained concentration",
    ]),
    b: Object.freeze([
      "asks for an example when an abstract rule remains ambiguous",
      "keeps useful routines stable until there is evidence that a change improves them",
      "responds to an unfamiliar person with reserved courtesy before deciding how much to engage",
      "accepts short-term inconvenience when it preserves more options later",
      "uses a failed attempt as information about the next trial rather than as a verdict on ability",
      "seeks conversation after long periods of working alone",
    ]),
  }),
});

const SYNTHETIC_SELECTION_SEEDS = Object.freeze({
  2: "pr39-replacement-g2-slot2-lineage-v1",
  5: "pr39-replacement-g2-slot5-lineage-v1",
});

const absolute = (path) => resolve(ROOT, path);
const readJson = (path) => JSON.parse(readFileSync(absolute(path), "utf8"));
const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;
const fail = (message) => { throw new Error(message); };

function writeJsonOnceOrVerify(path, value) {
  const target = absolute(path);
  if (existsSync(target)) {
    const existing = JSON.parse(readFileSync(target, "utf8"));
    if (canonicalJson(existing) !== canonicalJson(value)) fail(`existing material differs: ${path}`);
    return false;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return true;
}

function allAuthoredLocusValues() {
  return [
    ...Object.values(FRESH_DE_NOVO_LOCI).flat(),
    ...Object.values(FRESH_SYNTHETIC_PARENT_LOCI).flatMap((pair) => [...pair.a, ...pair.b]),
  ];
}

export function verifyFreshAuthoredLoci() {
  const values = allAuthoredLocusValues();
  if (values.length !== 42) fail("replacement G2 must freeze exactly 42 authored source-locus values");
  if (new Set(values).size !== values.length) fail("replacement G2 authored source loci must be unique");
  for (const value of values) {
    if (typeof value !== "string" || value.trim() === "") fail("replacement G2 locus is empty");
    if (/\r|\n|;/.test(value)) fail(`replacement G2 locus is not atomic: ${value}`);
    if (/tbilisi|georgia|kaohsiung|taiwan|recife|brazil|f[eè]s|morocco|hobart|tasmania|australia/i.test(value)) {
      fail(`replacement G2 locus leaks World geography: ${value}`);
    }
  }
  return Object.freeze({ valueCount: values.length, uniqueCount: new Set(values).size });
}

function verifyG1Finalization() {
  if (!existsSync(absolute(G1_RESULT_PATH))) fail(`replacement G1 result is absent: ${G1_RESULT_PATH}`);
  const result = readJson(G1_RESULT_PATH);
  if (result.evidenceVersion !== "pr39-slice-g1-world-familiarity-result-v1" ||
      result.protocolVersion !== "pr39-slice-g1-world-familiarity-v1" ||
      result.provider !== "openai" ||
      result.model !== "gpt-5.1-2025-11-13" ||
      result.allAccepted !== true ||
      !Array.isArray(result.results) || result.results.length !== 5 ||
      !Array.isArray(result.finalWorlds) || result.finalWorlds.length !== 5) {
    fail("replacement G1 finalization evidence drift");
  }
  const worlds = [];
  for (const expected of result.finalWorlds) {
    if (!existsSync(absolute(expected.path))) fail(`replacement final World is absent: ${expected.path}`);
    const world = readJson(expected.path);
    if (world.worldSpecId !== expected.worldSpecId || digest(world) !== expected.finalDigest) {
      fail(`replacement final World digest drift: ${expected.worldSpecId}`);
    }
    if (world.worldAuthorship?.familiarityProbe?.model !== "openai/gpt-5.1-2025-11-13" ||
        world.worldAuthorship?.familiarityProbe?.densityScore !== 4) {
      fail(`replacement final World familiarity witness drift: ${expected.worldSpecId}`);
    }
    worlds.push(Object.freeze({ ...expected, world }));
  }
  return Object.freeze({ result, worlds: Object.freeze(worlds) });
}

function sourceIdentity(sourceSlot) {
  return Object.freeze({
    threadId: `thr_pr39_rg2_${String(sourceSlot).padStart(2, "0")}`,
    genesisId: `genesis_pr39_rg2_${String(sourceSlot).padStart(2, "0")}`,
  });
}

function genomePath(sourceSlot) {
  return `${GENOME_ROOT}/genome-rg2-${String(sourceSlot).padStart(2, "0")}.json`;
}

function parentPath(sourceSlot, letter) {
  return `${GENOME_ROOT}/genome-rg2-${String(sourceSlot).padStart(2, "0")}-parent-${letter}.json`;
}

function buildSyntheticSource(sourceSlot) {
  const identity = sourceIdentity(sourceSlot);
  const values = FRESH_SYNTHETIC_PARENT_LOCI[sourceSlot];
  const parentA = buildSyntheticAncestorSymbolicGenome({
    ancestorId: `ancestor_pr39_rg2_${String(sourceSlot).padStart(2, "0")}_a`,
    genesisId: `genesis_pr39_rg2_${String(sourceSlot).padStart(2, "0")}_parent_a`,
    values: values.a,
    createdAt: CREATED_AT,
  });
  const parentB = buildSyntheticAncestorSymbolicGenome({
    ancestorId: `ancestor_pr39_rg2_${String(sourceSlot).padStart(2, "0")}_b`,
    genesisId: `genesis_pr39_rg2_${String(sourceSlot).padStart(2, "0")}_parent_b`,
    values: values.b,
    createdAt: CREATED_AT,
  });
  const child = buildRecombinedSymbolicGenome({
    threadId: identity.threadId,
    genesisId: identity.genesisId,
    sourceGenomes: [parentA, parentB],
    selectionSeed: SYNTHETIC_SELECTION_SEEDS[sourceSlot],
    createdAt: CREATED_AT,
    mutations: [],
  });
  const parentGenomeIds = [parentA.header.genomeId, parentB.header.genomeId];
  const contributionCounts = parentGenomeIds.map((id) => child.loci.filter((locus) => locus.provenance.sourceGenomeRef === id).length);
  return Object.freeze({
    sourceSlot,
    originMode: "synthetic_lineage",
    ...identity,
    bundle: child,
    path: genomePath(sourceSlot),
    parents: Object.freeze([
      Object.freeze({ letter: "a", bundle: parentA, path: parentPath(sourceSlot, "a") }),
      Object.freeze({ letter: "b", bundle: parentB, path: parentPath(sourceSlot, "b") }),
    ]),
    selectionSeed: SYNTHETIC_SELECTION_SEEDS[sourceSlot],
    contributionCounts: Object.freeze(contributionCounts),
  });
}

export function buildFreshGenomeSources() {
  verifyFreshAuthoredLoci();
  const sources = [];
  for (const sourceSlot of [1, 2, 3, 4, 5]) {
    if (sourceSlot === 2 || sourceSlot === 5) {
      sources.push(buildSyntheticSource(sourceSlot));
      continue;
    }
    const identity = sourceIdentity(sourceSlot);
    const bundle = buildDeNovoSymbolicGenome({
      threadId: identity.threadId,
      genesisId: identity.genesisId,
      values: FRESH_DE_NOVO_LOCI[sourceSlot],
      createdAt: CREATED_AT,
    });
    sources.push(Object.freeze({
      sourceSlot,
      originMode: "de_novo",
      ...identity,
      bundle,
      path: genomePath(sourceSlot),
      parents: Object.freeze([]),
      selectionSeed: null,
      contributionCounts: null,
    }));
  }
  return Object.freeze(sources);
}

function assignmentRankKey({ seed, kind, itemDigest }) {
  return sha256(canonicalJson({ seed, kind, digest: itemDigest }));
}

function assignWorldsToGenomes(worlds, sources) {
  const mapping = [];
  for (const originMode of ["de_novo", "synthetic_lineage"]) {
    const worldGroup = WORLD_ORIGINS
      .filter((item) => item.originMode === originMode)
      .map((item) => ({ ...item, world: worlds.find(({ slot }) => slot === item.slot) }));
    const sourceGroup = sources.filter((source) => source.originMode === originMode);
    const worldRank = [...worldGroup].sort((a, b) => {
      const ka = assignmentRankKey({ seed: ASSIGNMENT_SEED, kind: "world", itemDigest: a.world.finalDigest });
      const kb = assignmentRankKey({ seed: ASSIGNMENT_SEED, kind: "world", itemDigest: b.world.finalDigest });
      return ka.localeCompare(kb) || a.slot - b.slot;
    });
    const genomeRank = [...sourceGroup].sort((a, b) => {
      const ka = assignmentRankKey({ seed: ASSIGNMENT_SEED, kind: "genome", itemDigest: a.bundle.genomeDigest });
      const kb = assignmentRankKey({ seed: ASSIGNMENT_SEED, kind: "genome", itemDigest: b.bundle.genomeDigest });
      return ka.localeCompare(kb) || a.sourceSlot - b.sourceSlot;
    });
    for (let index = 0; index < worldRank.length; index += 1) {
      mapping.push(Object.freeze({
        cohortSlot: worldRank[index].slot,
        genomeSourceSlot: genomeRank[(index + 1) % genomeRank.length].sourceSlot,
      }));
    }
  }
  return Object.freeze(mapping.sort((a, b) => a.cohortSlot - b.cohortSlot));
}

export function buildReplacementG2Material() {
  const g1 = verifyG1Finalization();
  const sources = buildFreshGenomeSources();
  const mapping = assignWorldsToGenomes(g1.worlds, sources);
  const oldG2 = readJson(OLD_G2_PROTOCOL_PATH);

  const worldBindings = mapping.map(({ cohortSlot, genomeSourceSlot }) => {
    const world = g1.worlds.find(({ slot }) => slot === cohortSlot);
    const source = sources.find((item) => item.sourceSlot === genomeSourceSlot);
    const originMode = WORLD_ORIGINS.find(({ slot }) => slot === cohortSlot).originMode;
    if (source.originMode !== originMode) fail(`replacement assignment crossed origin class at slot ${cohortSlot}`);
    return Object.freeze({
      slot: cohortSlot,
      genomeSourceSlot,
      threadId: source.threadId,
      genesisId: source.genesisId,
      originMode,
      worldSpecId: world.worldSpecId,
      worldSpecPath: world.path,
      worldSpecDigest: world.finalDigest,
      genomePath: source.path,
      genomeId: source.bundle.header.genomeId,
      genomeDigest: source.bundle.genomeDigest,
    });
  });

  const syntheticLineages = worldBindings
    .filter(({ originMode }) => originMode === "synthetic_lineage")
    .map((binding) => {
      const source = sources.find((item) => item.sourceSlot === binding.genomeSourceSlot);
      return Object.freeze({
        slot: binding.slot,
        genomeSourceSlot: source.sourceSlot,
        childGenomePath: source.path,
        parentGenomePaths: source.parents.map(({ path }) => path),
        selectionSeed: source.selectionSeed,
        mutations: [],
        expectedParentContributionCounts: [...source.contributionCounts],
        parentGenomeIds: source.parents.map(({ bundle }) => bundle.header.genomeId),
        parentGenomeDigests: source.parents.map(({ bundle }) => bundle.genomeDigest),
      });
    });

  const pairSchedule = [
    [1, 2], [2, 3], [3, 4], [4, 5], [5, 1],
  ].map(([genomeASlot, genomeBSlot], index) => {
    const pairId = `p${String(index + 1).padStart(2, "0")}`;
    return Object.freeze({
      pairId,
      genomeASlot,
      genomeBSlot,
      seed: `pr39-replacement-g2-ceiling-${pairId}-v1`,
      resultPath: `artifacts/validation/m2-pr39/replacement-v1/results/rg2-genome-ceiling-${pairId}-v1.json`,
    });
  });

  const assignmentPolicy = {
    version: "pr39-g2-world-genome-assignment-v2",
    seed: ASSIGNMENT_SEED,
    originClassPreserved: true,
    algorithm: "Within each origin class, hash-rank frozen Worlds by sha256(canonicalJson({seed,kind:'world',digest:worldSpecDigest})) and frozen genomes by sha256(canonicalJson({seed,kind:'genome',digest:genomeDigest})); assign each ranked World the next ranked genome cyclically (offset +1).",
    cyclicOffset: 1,
    purpose: "Break authoring-time World/genome association for the fresh replacement material while preserving the frozen 3 de_novo + 2 synthetic_lineage composition. The rule uses only digests, origin class and a fixed seed; it does not inspect locus or World semantics.",
    mapping: mapping.map((item) => ({ ...item })),
  };
  assignmentPolicy.mappingDigest = digest(assignmentPolicy.mapping);

  const protocol = {
    protocolVersion: "pr39-slice-g2-cohort-genome-freeze-v2",
    replacementAttemptVersion: REPLACEMENT_ATTEMPT_VERSION,
    materialVersion: REPLACEMENT_G2_MATERIAL_VERSION,
    status: "frozen_pre_control",
    frozenAt: CREATED_AT,
    preconditions: {
      g1Status: "COMPLETE_CLEAR",
      g1ResultPath: G1_RESULT_PATH,
      finalCohortLifeExists: false,
      g2CeilingOutputExistedBeforeThisFreeze: false,
    },
    authorshipBoundary: {
      method: "fresh_human_authored_atomic_text_loci_plus_deterministic_v1_crossover",
      worldContextAvailableToProtocolAuthorAtLocusAuthoring: true,
      worldContentUsedAsLocusGenerationOrSelectionInput: false,
      oldCohortGenomeValuesUsedAsLocusGenerationOrSelectionInput: false,
      hOrRecoverySemanticOutputUsedAsLocusGenerationOrSelectionInput: false,
      finalLifeOutputVisible: false,
      hDiagnosticOutputVisible: false,
      adultRoleOrBenchmarkTargetVisible: false,
      demographicOrGeographicShortcutIntoLoci: false,
      note: "The replacement Worlds were already frozen and visible when these loci were authored. The loci are fresh non-geographic conditional propositions and were not derived from World semantics, old genome content, H-v2 semantic output, recovery semantic output, target personality, future role or expected diagnostic performance. Pairing discretion is removed mechanically by the frozen within-origin digest derangement.",
    },
    inheritedAuthority: {
      sourceG2ProtocolPath: OLD_G2_PROTOCOL_PATH,
      sourceG2ProtocolDigest: digest(oldG2),
      symbolicGenomePolicyUnchanged: true,
      recombinationPolicyUnchanged: true,
      mutationPolicyUnchanged: true,
      genomeSpecificityInstrumentUnchanged: true,
      empiricalOldG2PairResultsInherited: false,
    },
    assignmentPolicy,
    policies: structuredClone(oldG2.policies),
    worldBindings,
    syntheticLineages,
    control: {
      instrumentVersion: oldG2.control.instrumentVersion,
      instrumentPath: oldG2.control.instrumentPath,
      trialCountPerPair: oldG2.control.trialCountPerPair,
      modelCallsPerPair: oldG2.control.modelCallsPerPair,
      generator: structuredClone(oldG2.control.generator),
      rater: structuredClone(oldG2.control.rater),
      pairSchedulePolicy: oldG2.control.pairSchedulePolicy,
      pairSchedule,
      aggregateResultPath: "artifacts/validation/m2-pr39/replacement-v1/results/rg2-cohort-genome-specificity-ceiling-v1.json",
      predeclaredReading: structuredClone(oldG2.control.predeclaredReading),
    },
    downstreamBoundary: {
      finalLifeCognitionAuthorized: false,
      firstAllowedAfter: "Gate-G(2) CLEAR",
      oldEmpiricalPairDetectabilityMayBeAppliedToReplacementGenomes: false,
      freshG2CeilingRequiredBeforeGateG2: true,
      g5G6PairSpecificSemanticsRequireExplicitPreLifeReconciliation: true,
    },
  };

  return Object.freeze({
    g1,
    sources,
    mapping,
    worldBindings: Object.freeze(worldBindings),
    syntheticLineages: Object.freeze(syntheticLineages),
    protocol: Object.freeze(protocol),
  });
}

export function materializeReplacementG2() {
  const material = buildReplacementG2Material();
  let created = 0;
  for (const source of material.sources) {
    for (const parent of source.parents) if (writeJsonOnceOrVerify(parent.path, parent.bundle)) created += 1;
    if (writeJsonOnceOrVerify(source.path, source.bundle)) created += 1;
  }
  if (writeJsonOnceOrVerify(G2_PROTOCOL_PATH, material.protocol)) created += 1;
  return Object.freeze({ ...material, createdFiles: created, protocolPath: G2_PROTOCOL_PATH });
}

function printPreflight(material) {
  process.stdout.write("PR39 REPLACEMENT G2 MATERIAL PREFLIGHT: CLEAR — ZERO CALL\n\n");
  process.stdout.write(`Version: ${REPLACEMENT_G2_MATERIAL_VERSION}\n`);
  process.stdout.write(`Replacement attempt: ${REPLACEMENT_ATTEMPT_VERSION}\n`);
  process.stdout.write("G1 final Worlds verified: 5\n");
  process.stdout.write("Fresh genome source identities: 5\n");
  for (const source of material.sources) {
    process.stdout.write(`${source.sourceSlot}. ${source.threadId} · ${source.originMode} · ${source.bundle.genomeDigest}\n`);
  }
  process.stdout.write(`World↔genome mapping: ${material.mapping.map(({ cohortSlot, genomeSourceSlot }) => `${cohortSlot}<-${genomeSourceSlot}`).join(" ")}\n`);
  process.stdout.write("Synthetic lineages: 2\n");
  for (const lineage of material.syntheticLineages) {
    process.stdout.write(`slot ${lineage.slot} <- source ${lineage.genomeSourceSlot} · parent contribution ${lineage.expectedParentContributionCounts.join("+")}\n`);
  }
  process.stdout.write("Fresh G2 ceiling: required before Gate-G(2).\n");
  process.stdout.write("Final-life cognition: NOT AUTHORIZED.\n");
  process.stdout.write("\nPreflight made zero provider calls.\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || (args.length === 1 && args[0] === "--preflight")) {
    printPreflight(buildReplacementG2Material());
    return;
  }
  if (args.length === 1 && args[0] === "--materialize") {
    const result = materializeReplacementG2();
    process.stdout.write("PR39 REPLACEMENT G2 MATERIAL: FROZEN — ZERO CALL\n\n");
    process.stdout.write(`Created files: ${result.createdFiles}\n`);
    process.stdout.write(`Protocol: ${result.protocolPath}\n`);
    process.stdout.write(`Mapping: ${result.mapping.map(({ cohortSlot, genomeSourceSlot }) => `${cohortSlot}<-${genomeSourceSlot}`).join(" ")}\n`);
    process.stdout.write("Fresh G2 ceiling is next. Final-life cognition remains unauthorized.\n");
    return;
  }
  throw new Error("usage: genesis-replacement-g2-material.mjs [--preflight|--materialize]");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

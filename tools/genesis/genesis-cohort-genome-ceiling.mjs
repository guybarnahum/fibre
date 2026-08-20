#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import {
  replayRecombinationSelection,
  symbolicGenomeDigest,
} from "../services/world-kernel/src/symbolic-genome-domain.mjs";
import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import {
  CONTROL_SITUATIONS,
  GENOME_CONTROL_VERSION,
  PREDECLARED_READING,
  runGenomeSpecificityControl,
} from "../repro/pr39/genome-control/genesis-genome-positive-control.mjs";

export const G2_PROTOCOL_PATH = "artifacts/validation/m2-pr39/g/protocol/g2-cohort-genome-freeze-v2.json";

function fail(message) {
  throw new Error(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function orderedValues(bundle) {
  return [...bundle.loci].sort((a, b) => a.ordinal - b.ordinal).map((locus) => locus.value);
}

function assignmentRankKey({ seed, kind, digest: itemDigest }) {
  return sha256(canonicalJson({ seed, kind, digest: itemDigest }));
}

function verifyAssignmentPolicy(protocol) {
  const policy = protocol.assignmentPolicy;
  if (policy?.version !== "pr39-g2-world-genome-assignment-v2") fail("G2 assignment policy version drift");
  if (policy?.originClassPreserved !== true) fail("G2 assignment must preserve origin class");
  if (policy?.cyclicOffset !== 1) fail("G2 assignment cyclic offset drift");
  if (!Array.isArray(policy?.mapping) || policy.mapping.length !== 5) fail("G2 assignment mapping must contain five slots");
  if (digest(policy.mapping) !== policy.mappingDigest) fail("G2 assignment mapping digest drift");

  const bindingBySlot = new Map(protocol.worldBindings.map((binding) => [binding.slot, binding]));
  for (const entry of policy.mapping) {
    const binding = bindingBySlot.get(entry.cohortSlot);
    if (binding === undefined || binding.genomeSourceSlot !== entry.genomeSourceSlot) {
      fail(`G2 assignment mapping disagrees with binding slot ${entry.cohortSlot}`);
    }
  }

  for (const originMode of ["de_novo", "synthetic_lineage"]) {
    const group = protocol.worldBindings.filter((binding) => binding.originMode === originMode);
    if (group.length === 0) fail(`G2 assignment origin class ${originMode} is empty`);
    const worldRank = [...group].sort((a, b) => {
      const ka = assignmentRankKey({ seed: policy.seed, kind: "world", digest: a.worldSpecDigest });
      const kb = assignmentRankKey({ seed: policy.seed, kind: "world", digest: b.worldSpecDigest });
      return ka.localeCompare(kb) || a.slot - b.slot;
    });
    const genomeRank = [...group].sort((a, b) => {
      const ka = assignmentRankKey({ seed: policy.seed, kind: "genome", digest: a.genomeDigest });
      const kb = assignmentRankKey({ seed: policy.seed, kind: "genome", digest: b.genomeDigest });
      return ka.localeCompare(kb) || a.genomeSourceSlot - b.genomeSourceSlot;
    });
    for (let index = 0; index < worldRank.length; index += 1) {
      const worldBinding = worldRank[index];
      const expectedGenome = genomeRank[(index + policy.cyclicOffset) % genomeRank.length];
      if (worldBinding.genomeSourceSlot !== expectedGenome.genomeSourceSlot) {
        fail(`G2 deterministic assignment replay failed for cohort slot ${worldBinding.slot}`);
      }
      if (worldBinding.originMode !== expectedGenome.originMode) {
        fail(`G2 deterministic assignment crossed origin class at cohort slot ${worldBinding.slot}`);
      }
    }
  }
}

function verifyWorldBinding(binding) {
  const world = readJson(binding.worldSpecPath);
  if (world.worldSpecId !== binding.worldSpecId) fail(`G2 world slot ${binding.slot} ID drift`);
  const actualDigest = digest(world);
  if (actualDigest !== binding.worldSpecDigest) fail(`G2 world slot ${binding.slot} digest drift`);
  return world;
}

function verifyGenomeBinding(binding) {
  const bundle = readJson(binding.genomePath);
  const actualDigest = symbolicGenomeDigest({
    header: bundle.header,
    loci: bundle.loci,
    mutations: bundle.mutations ?? [],
  });
  if (bundle.genomeDigest !== actualDigest) fail(`G2 genome slot ${binding.slot} embedded digest drift`);
  if (binding.genomeDigest !== actualDigest) fail(`G2 genome slot ${binding.slot} protocol digest drift`);
  if (bundle.header.genomeId !== binding.genomeId) fail(`G2 genome slot ${binding.slot} ID drift`);
  if (bundle.header.owner?.kind !== "thread" || bundle.header.owner?.ownerId !== binding.threadId) {
    fail(`G2 genome slot ${binding.slot} owner drift`);
  }
  if (bundle.header.genesisId !== binding.genesisId) fail(`G2 genome slot ${binding.slot} genesis drift`);
  if (bundle.loci.length !== 6) fail(`G2 genome slot ${binding.slot} must contain six loci`);
  if (binding.originMode === "de_novo" && bundle.header.originKind !== "de_novo") fail(`G2 slot ${binding.slot} origin mismatch`);
  if (binding.originMode === "synthetic_lineage" && bundle.header.originKind !== "recombined") fail(`G2 slot ${binding.slot} origin mismatch`);
  return bundle;
}

function verifyParentBundle(path, expectedId, expectedDigest) {
  const bundle = readJson(path);
  const actualDigest = symbolicGenomeDigest({
    header: bundle.header,
    loci: bundle.loci,
    mutations: bundle.mutations ?? [],
  });
  if (bundle.header.owner?.kind !== "synthetic_ancestor") fail(`G2 parent ${path} is not synthetic`);
  if (bundle.header.genomeId !== expectedId) fail(`G2 parent ${path} ID drift`);
  if (bundle.genomeDigest !== actualDigest || expectedDigest !== actualDigest) fail(`G2 parent ${path} digest drift`);
  if (bundle.loci.length !== 6) fail(`G2 parent ${path} must contain six loci`);
  return bundle;
}

function verifyPairSchedule(protocol) {
  const schedule = protocol.control.pairSchedule;
  if (!Array.isArray(schedule) || schedule.length !== 5) fail("G2 pair schedule must contain five pairs");
  const aCounts = new Map();
  const bCounts = new Map();
  const edges = new Set();
  for (const pair of schedule) {
    if (pair.genomeASlot === pair.genomeBSlot) fail(`G2 pair ${pair.pairId} compares a genome with itself`);
    const edge = [pair.genomeASlot, pair.genomeBSlot].sort((a, b) => a - b).join(":");
    if (edges.has(edge)) fail(`G2 pair schedule repeats edge ${edge}`);
    edges.add(edge);
    aCounts.set(pair.genomeASlot, (aCounts.get(pair.genomeASlot) ?? 0) + 1);
    bCounts.set(pair.genomeBSlot, (bCounts.get(pair.genomeBSlot) ?? 0) + 1);
  }
  for (let slot = 1; slot <= 5; slot += 1) {
    if (aCounts.get(slot) !== 1 || bCounts.get(slot) !== 1) {
      fail(`G2 slot ${slot} must appear exactly once as A and once as B`);
    }
  }
}

export function verifyG2GenomeFreeze({ protocolPath = G2_PROTOCOL_PATH } = {}) {
  const protocol = readJson(protocolPath);
  if (protocol.protocolVersion !== "pr39-slice-g2-cohort-genome-freeze-v2") fail("unexpected G2 protocol version");
  if (protocol.status !== "frozen_pre_control") fail("G2 protocol must be frozen before control execution");
  if (protocol.preconditions?.g1Status !== "COMPLETE_CLEAR") fail("G2 requires G1 CLEAR");
  if (protocol.preconditions?.finalCohortLifeExists !== false) fail("G2 protocol cannot begin after final life exists");
  if (protocol.preconditions?.g2CeilingOutputExistedBeforeThisFreeze !== false) fail("G2 v2 correction must predate ceiling output");
  if (protocol.authorshipBoundary?.worldContextAvailableToProtocolAuthorAtLocusAuthoring !== true) fail("G2 v2 must preserve truthful World-context visibility witness");
  if (protocol.authorshipBoundary?.worldContentUsedAsLocusGenerationOrSelectionInput !== false) fail("G2 loci may not be selected from World content");
  if (protocol.control?.instrumentVersion !== GENOME_CONTROL_VERSION) fail("G2 control instrument version drift");
  if (protocol.control?.trialCountPerPair !== CONTROL_SITUATIONS.length) fail("G2 control trial count drift");
  if (protocol.control?.modelCallsPerPair !== CONTROL_SITUATIONS.length * 3) fail("G2 control model-call count drift");

  if (!Array.isArray(protocol.worldBindings) || protocol.worldBindings.length !== 5) fail("G2 requires exactly five world/genome bindings");
  if (new Set(protocol.worldBindings.map((binding) => binding.genomeSourceSlot)).size !== 5) fail("G2 assigned genome source slots must be unique");
  verifyAssignmentPolicy(protocol);

  const bindings = new Map();
  const genomes = new Map();
  for (const binding of protocol.worldBindings) {
    if (bindings.has(binding.slot)) fail(`duplicate G2 slot ${binding.slot}`);
    verifyWorldBinding(binding);
    const bundle = verifyGenomeBinding(binding);
    bindings.set(binding.slot, binding);
    genomes.set(binding.slot, bundle);
  }

  if (!Array.isArray(protocol.syntheticLineages) || protocol.syntheticLineages.length !== 2) fail("G2 requires exactly two synthetic lineages");
  const lineageEvidence = [];
  for (const lineage of protocol.syntheticLineages) {
    const child = genomes.get(lineage.slot);
    if (child === undefined) fail(`G2 lineage slot ${lineage.slot} has no child genome`);
    if (protocol.worldBindings.find((binding) => binding.slot === lineage.slot)?.genomeSourceSlot !== lineage.genomeSourceSlot) {
      fail(`G2 lineage slot ${lineage.slot} source-slot drift`);
    }
    const parents = lineage.parentGenomePaths.map((path, index) => verifyParentBundle(
      path,
      lineage.parentGenomeIds[index],
      lineage.parentGenomeDigests[index],
    ));
    replayRecombinationSelection(child, parents);
    if ((child.mutations ?? []).length !== 0 || lineage.mutations.length !== 0) fail(`G2 lineage slot ${lineage.slot} unexpectedly mutated`);
    const sourceRefs = parents.map((parent) => parent.header.genomeId);
    const contributionCounts = sourceRefs.map((sourceRef) => child.loci.filter((locus) => locus.provenance.sourceGenomeRef === sourceRef).length);
    if (canonicalJson(contributionCounts) !== canonicalJson(lineage.expectedParentContributionCounts)) {
      fail(`G2 lineage slot ${lineage.slot} parent contribution drift`);
    }
    lineageEvidence.push({ slot: lineage.slot, genomeSourceSlot: lineage.genomeSourceSlot, contributionCounts, parentGenomeIds: sourceRefs });
  }

  verifyPairSchedule(protocol);
  return {
    protocol,
    protocolDigest: digest(protocol),
    bindings,
    genomes,
    lineageEvidence,
  };
}

function signalBand(correct) {
  const band = PREDECLARED_READING.bands.find((candidate) => correct >= candidate.correctMin && correct <= candidate.correctMax);
  if (band === undefined) fail(`no v3 signal band for ${correct} correct`);
  return { label: band.label, reading: band.reading };
}

export function summarizeG2Ceiling({ protocol, pairResults }) {
  if (!Array.isArray(pairResults) || pairResults.length !== protocol.control.pairSchedule.length) {
    fail("G2 aggregate requires one result per frozen pair");
  }
  const threshold = protocol.control.predeclaredReading.detectablePairCorrectAtLeast;
  const summaries = pairResults.map(({ pair, raw }) => ({
    pairId: pair.pairId,
    genomeASlot: pair.genomeASlot,
    genomeBSlot: pair.genomeBSlot,
    seed: pair.seed,
    resultPath: pair.resultPath,
    correct: raw.result.correct,
    trials: raw.result.trials,
    accuracy: raw.result.accuracy,
    exactOneSidedBinomialP: raw.result.exactOneSidedBinomialP,
    detectable: raw.result.correct >= threshold,
    band: signalBand(raw.result.correct),
  }));
  const detectable = summaries.filter((item) => item.detectable);
  const coveredSlots = new Set();
  for (const item of detectable) {
    coveredSlots.add(item.genomeASlot);
    coveredSlots.add(item.genomeBSlot);
  }
  const everyGenomeCovered = protocol.worldBindings.every((binding) => coveredSlots.has(binding.slot));
  const usable = detectable.length >= protocol.control.predeclaredReading.minimumDetectablePairs
    && (!protocol.control.predeclaredReading.requireEveryGenomeIncidentToAtLeastOneDetectablePair || everyGenomeCovered);
  const trials = summaries.reduce((sum, item) => sum + item.trials, 0);
  const correct = summaries.reduce((sum, item) => sum + item.correct, 0);
  return {
    usableCeilingForH: usable,
    verdict: usable ? "CLEAR" : "HOLD",
    rule: structuredClone(protocol.control.predeclaredReading),
    pairSummaries: summaries,
    detectablePairCount: detectable.length,
    coveredGenomeSlots: [...coveredSlots].sort((a, b) => a - b),
    everyGenomeCoveredByDetectablePair: everyGenomeCovered,
    aggregate: {
      trials,
      correct,
      accuracy: correct / trials,
      chanceAccuracy: 0.5,
      interpretation: "Descriptive only. The five controls reuse genomes across heterogeneous pairs, so no pooled inferential p-value is claimed. The frozen G2 decision rule is the five-pair vector plus genome-coverage rule.",
    },
  };
}

function createBaseAdapter({ provider, model, environment, fetchImpl, observer }) {
  if (provider === "openai") return createOpenAIModelAdapter({ environment, modelId: model, fetchImpl, observer });
  if (provider === "google") return createGoogleModelAdapter({ environment, modelId: model, fetchImpl, observer });
  throw new TypeError(`unsupported provider ${provider}`);
}

function createProgressAdapterFactory(pairId, { stream = process.stderr, now = () => Date.now() } = {}) {
  let callNumber = 0;
  return ({ provider, model, environment, fetchImpl, observer }) => {
    const base = createBaseAdapter({ provider, model, environment, fetchImpl, observer });
    return Object.freeze({
      ...base,
      async invoke(request) {
        callNumber += 1;
        const prefix = `[G2 ${pairId} · call ${String(callNumber).padStart(2, "0")}/72] ${provider}/${model}`;
        const startedAt = now();
        stream.write(`${prefix} ...\n`);
        try {
          const result = await base.invoke(request);
          stream.write(`${prefix} ✓ ${now() - startedAt} ms\n`);
          return result;
        } catch (error) {
          stream.write(`${prefix} ✗ ${now() - startedAt} ms · ${error?.code ?? error?.name ?? "ERROR"}\n`);
          throw error;
        }
      },
    });
  };
}

function validateExistingPairResult({ protocol, pair, raw, genomeA, genomeB }) {
  if (raw.controlVersion !== protocol.control.instrumentVersion) fail(`${pair.pairId} result instrument drift`);
  if (raw.seed !== pair.seed) fail(`${pair.pairId} result seed drift`);
  if (raw.generator?.provider !== protocol.control.generator.provider || raw.generator?.model !== protocol.control.generator.model) {
    fail(`${pair.pairId} result generator drift`);
  }
  if (raw.rater?.provider !== protocol.control.rater.provider || raw.rater?.model !== protocol.control.rater.model) {
    fail(`${pair.pairId} result rater drift`);
  }
  if (canonicalJson(raw.genomes?.A) !== canonicalJson(genomeA) || canonicalJson(raw.genomes?.B) !== canonicalJson(genomeB)) {
    fail(`${pair.pairId} result genome bytes drift`);
  }
}

export async function runG2GenomeCeiling({
  protocolPath = G2_PROTOCOL_PATH,
  environment = process.env,
  fetchImpl = globalThis.fetch,
  adapterFactoryForPair = (pairId) => createProgressAdapterFactory(pairId),
  now = () => new Date().toISOString(),
} = {}) {
  const verified = verifyG2GenomeFreeze({ protocolPath });
  const { protocol, protocolDigest, genomes } = verified;
  const aggregatePath = resolve(protocol.control.aggregateResultPath);
  if (existsSync(aggregatePath)) fail(`refusing to overwrite existing G2 aggregate result ${protocol.control.aggregateResultPath}`);

  const pairResults = [];
  for (const pair of protocol.control.pairSchedule) {
    const genomeA = orderedValues(genomes.get(pair.genomeASlot));
    const genomeB = orderedValues(genomes.get(pair.genomeBSlot));
    const pairPath = resolve(pair.resultPath);
    let raw;
    if (existsSync(pairPath)) {
      raw = readJson(pair.resultPath);
      validateExistingPairResult({ protocol, pair, raw, genomeA, genomeB });
      process.stderr.write(`G2 ${pair.pairId}: reusing preserved matching result\n`);
    } else {
      process.stderr.write(`G2 ${pair.pairId}: START · 24 trials · 72 model calls\n`);
      raw = await runGenomeSpecificityControl({
        generatorProvider: protocol.control.generator.provider,
        generatorModel: protocol.control.generator.model,
        raterProvider: protocol.control.rater.provider,
        raterModel: protocol.control.rater.model,
        genomeA,
        genomeB,
        genomeSource: `pr39_g2_frozen_cohort:${pair.pairId}`,
        seed: pair.seed,
        environment,
        fetchImpl,
        adapterFactory: adapterFactoryForPair(pair.pairId),
      });
      mkdirSync(dirname(pairPath), { recursive: true });
      writeFileSync(pairPath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
      process.stderr.write(`G2 ${pair.pairId}: COMPLETE · ${raw.result.correct}/${raw.result.trials}\n`);
    }
    pairResults.push({ pair, raw });
  }

  const summary = summarizeG2Ceiling({ protocol, pairResults });
  const artifact = {
    evidenceVersion: "pr39-slice-g2-cohort-genome-specificity-ceiling-v1",
    protocolVersion: protocol.protocolVersion,
    protocolPath,
    protocolDigest,
    generatedAt: now(),
    generator: structuredClone(protocol.control.generator),
    rater: structuredClone(protocol.control.rater),
    instrumentVersion: protocol.control.instrumentVersion,
    pairSchedulePolicy: protocol.control.pairSchedulePolicy,
    assignmentPolicy: structuredClone(protocol.assignmentPolicy),
    worldGenomeBindings: protocol.worldBindings.map((binding) => ({
      slot: binding.slot,
      genomeSourceSlot: binding.genomeSourceSlot,
      worldSpecId: binding.worldSpecId,
      worldSpecDigest: binding.worldSpecDigest,
      genomeId: binding.genomeId,
      genomeDigest: binding.genomeDigest,
    })),
    ...summary,
  };
  mkdirSync(dirname(aggregatePath), { recursive: true });
  writeFileSync(aggregatePath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return artifact;
}

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(`Usage: npm run genesis:g2-genome-ceiling -- [--protocol ${G2_PROTOCOL_PATH}]\n`);
    return;
  }
  const protocolPath = readArg(argv, "--protocol", G2_PROTOCOL_PATH);
  const result = await runG2GenomeCeiling({ protocolPath });
  process.stdout.write(`G2 COHORT GENOME CEILING: ${result.verdict}\n`);
  for (const pair of result.pairSummaries) {
    process.stdout.write(`${pair.pairId}: ${pair.correct}/${pair.trials} · ${pair.band.label}\n`);
  }
  process.stdout.write(`Detectable pairs: ${result.detectablePairCount}/5\n`);
  process.stdout.write(`Genome coverage: ${result.coveredGenomeSlots.join(",")}\n`);
  process.stdout.write(`Aggregate (descriptive): ${result.aggregate.correct}/${result.aggregate.trials} (${(result.aggregate.accuracy * 100).toFixed(1)}%)\n`);
  process.stdout.write(`Artifact: ${readJson(protocolPath).control.aggregateResultPath}\n`);
  if (!result.usableCeilingForH) process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`G2 COHORT GENOME CEILING: FAILED\n${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

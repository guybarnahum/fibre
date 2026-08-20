#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import { symbolicGenomeDigest } from "../services/world-kernel/src/symbolic-genome-domain.mjs";

export const G3_PROTOCOL_PATH = "artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v1.json";

function fail(message) {
  throw new Error(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function assignmentPayload(assignment) {
  const { assignmentDigest, ...payload } = assignment;
  return payload;
}

export function verifyG3TreatmentFreeze({ protocolPath = G3_PROTOCOL_PATH } = {}) {
  const protocol = readJson(protocolPath);
  if (protocol.protocolVersion !== "pr39-slice-g3-pass-b-treatment-freeze-v1") fail("unexpected G3 protocol version");
  if (protocol.status !== "frozen_pre_life_generation") fail("G3 protocol must be frozen before final-life generation");
  if (protocol.preconditions?.g1Status !== "COMPLETE_CLEAR") fail("G3 requires G1 CLEAR");
  if (protocol.preconditions?.g2Status !== "COMPLETE_CLEAR_FIVE_PAIR_CEILING") fail("G3 requires the bounded five-pair G2 CLEAR result");
  if (protocol.preconditions?.finalCohortLifeExists !== false) fail("G3 must predate final cohort life");

  const g2Protocol = readJson(protocol.preconditions.g2ProtocolPath);
  if (digest(g2Protocol) !== protocol.preconditions.g2ProtocolDigest) fail("G3 G2 protocol digest drift");
  const g2Result = readJson(protocol.preconditions.g2ResultPath);
  if (g2Result.verdict !== "CLEAR" || g2Result.usableCeilingForH !== true) fail("G3 requires G2 CLEAR evidence");
  if (g2Result.protocolDigest !== protocol.preconditions.g2ProtocolDigest) fail("G3 G2 result/protocol binding drift");
  if (!Array.isArray(g2Result.pairSummaries) || g2Result.pairSummaries.length !== 5) fail("G3 requires the frozen five-pair G2 ceiling");

  const cohort = protocol.cohort;
  if (cohort.threadCount !== 5) fail("G3 cohort thread count drift");
  if (cohort.passBCallsPerThread !== 6) fail("G3 Pass-B calls/thread drift");
  if (cohort.eligiblePassBCallCount !== 30) fail("G3 eligible call count drift");
  if (canonicalJson(cohort.historyEpisodeHorizons) !== canonicalJson([4, 5, 6, 7, 8, 10])) fail("G3 history horizon schedule drift");

  const assignment = protocol.assignment;
  if (assignment.version !== "pr39-g3-pass-b-treatment-assignment-v1") fail("G3 assignment version drift");
  if (assignment.contentIndependent !== true || assignment.positionStratified !== true) fail("G3 assignment must be content-independent and position-stratified");
  if (digest(assignmentPayload(assignment)) !== assignment.assignmentDigest) fail("G3 assignment digest drift");
  if (canonicalJson(assignment.callHorizons) !== canonicalJson(cohort.historyEpisodeHorizons)) fail("G3 assignment/cohort horizons disagree");
  if (canonicalJson(assignment.treatmentOrdinals) !== canonicalJson([3, 6])) fail("G3 treatment ordinal drift");
  if (canonicalJson(assignment.cleanControlOrdinals) !== canonicalJson([1, 2])) fail("G3 clean-control ordinal drift");
  if (canonicalJson(assignment.conditionalPropagationOrdinals) !== canonicalJson([4, 5])) fail("G3 propagation ordinal drift");

  const expectedModes = ["life_only", "life_only", "life_plus_genome", "life_only", "life_only", "life_plus_genome"];
  for (let ordinal = 1; ordinal <= 6; ordinal += 1) {
    if (assignment.directModeByOrdinal[String(ordinal)] !== expectedModes[ordinal - 1]) fail(`G3 direct mode drift at ordinal ${ordinal}`);
  }

  const treatmentCalls = cohort.threadCount * assignment.treatmentOrdinals.length;
  const lifeOnlyCalls = cohort.eligiblePassBCallCount - treatmentCalls;
  if (treatmentCalls !== protocol.directTreatmentArithmetic.lifePlusGenomeCalls) fail("G3 treatment call arithmetic drift");
  if (lifeOnlyCalls !== protocol.directTreatmentArithmetic.lifeOnlyCalls) fail("G3 life-only call arithmetic drift");
  const proportion = treatmentCalls / cohort.eligiblePassBCallCount;
  if (Math.abs(proportion - protocol.directTreatmentArithmetic.lifePlusGenomeProportion) > Number.EPSILON) fail("G3 treatment proportion drift");
  if (proportion < protocol.directTreatmentArithmetic.requiredRange.minimum || proportion > protocol.directTreatmentArithmetic.requiredRange.maximum) fail("G3 treatment proportion outside frozen range");

  if (protocol.genomeExposure.kind !== "whole_genome" || protocol.genomeExposure.k !== null || protocol.genomeExposure.locusCount !== 6) fail("G3 exposure must be the whole six-locus frozen genome");
  if (protocol.stratumMechanics.life_only_unexposed.guaranteedCalls !== 10) fail("G3 guaranteed clean-control count drift");
  if (protocol.stratumMechanics.life_only_exposed.conditionalCallsPerThread !== 2) fail("G3 conditional exposed count drift");
  if (protocol.stratumMechanics.life_plus_genome.scheduledCalls !== 10) fail("G3 treatment stratum count drift");
  if (protocol.planningArithmetic.minimumCallLevelAnalyzability.life_only_unexposed !== 10) fail("G3 clean minimum drift");
  if (protocol.planningArithmetic.minimumCallLevelAnalyzability.life_only_exposed !== 6) fail("G3 exposed minimum drift");
  if (protocol.planningArithmetic.minimumCallLevelAnalyzability.life_plus_genome !== 10) fail("G3 treatment minimum drift");

  return Object.freeze({ protocol, protocolDigest: digest(protocol), g2Protocol, g2Result });
}

function assertCohortSlot(protocol, cohortSlot) {
  if (!Number.isSafeInteger(cohortSlot) || cohortSlot < 1 || cohortSlot > protocol.cohort.threadCount) fail("G3 cohortSlot is invalid");
}

function assertCallOrdinal(protocol, callOrdinal) {
  if (!Number.isSafeInteger(callOrdinal) || callOrdinal < 1 || callOrdinal > protocol.cohort.passBCallsPerThread) fail("G3 callOrdinal is invalid");
}

export function deriveG3PassBAssignment({
  cohortSlot,
  callOrdinal,
  priorMemories = [],
  protocolPath = G3_PROTOCOL_PATH,
} = {}) {
  const { protocol } = verifyG3TreatmentFreeze({ protocolPath });
  assertCohortSlot(protocol, cohortSlot);
  assertCallOrdinal(protocol, callOrdinal);
  if (!Array.isArray(priorMemories)) fail("G3 priorMemories must be an array");

  const formationMode = protocol.assignment.directModeByOrdinal[String(callOrdinal)];
  const priorTreatmentMemoryExposure = priorMemories.some((memory) => memory?.formationMode === "life_plus_genome");
  if (protocol.assignment.cleanControlOrdinals.includes(callOrdinal) && priorTreatmentMemoryExposure) {
    fail(`G3 clean-control ordinal ${callOrdinal} cannot have prior treatment-memory exposure`);
  }
  const analysisStratum = formationMode === "life_plus_genome"
    ? "life_plus_genome"
    : priorTreatmentMemoryExposure ? "life_only_exposed" : "life_only_unexposed";

  return Object.freeze({
    assignmentRef: `pr39_g3_slot_${cohortSlot}_pass_b_${callOrdinal}`,
    cohortSlot,
    callOrdinal,
    historyEpisodeHorizon: protocol.cohort.historyEpisodeHorizons[callOrdinal - 1],
    formationMode,
    priorTreatmentMemoryExposure,
    analysisStratum,
    genomeExposurePolicyRef: formationMode === "life_plus_genome" ? protocol.genomeExposure.policyVersion : null,
  });
}

export function buildG3WholeGenomeExposure({ genomeBundle, protocolPath = G3_PROTOCOL_PATH } = {}) {
  const { protocol } = verifyG3TreatmentFreeze({ protocolPath });
  if (genomeBundle === null || typeof genomeBundle !== "object") fail("G3 genomeBundle is required");
  const actualDigest = symbolicGenomeDigest({
    header: genomeBundle.header,
    loci: genomeBundle.loci,
    mutations: genomeBundle.mutations ?? [],
  });
  if (genomeBundle.genomeDigest !== actualDigest) fail("G3 genome embedded digest drift");
  const loci = [...genomeBundle.loci].sort((a, b) => a.ordinal - b.ordinal);
  if (loci.length !== protocol.genomeExposure.locusCount) fail("G3 whole-genome exposure locus count drift");
  loci.forEach((locus, index) => {
    if (locus.ordinal !== index + 1) fail("G3 whole-genome exposure loci must be contiguous ordinal order");
  });
  return Object.freeze({
    policy: Object.freeze({ kind: "whole_genome", k: null }),
    genomeRef: genomeBundle.header.genomeId,
    genomeDigest: actualDigest,
    totalLoci: loci.length,
    loci: Object.freeze(loci.map((locus) => Object.freeze({ locusId: locus.locusId, ordinal: locus.ordinal, value: locus.value }))),
  });
}

export function g3ObservedCallArithmetic({ earlyTreatmentRememberedBySlot, protocolPath = G3_PROTOCOL_PATH } = {}) {
  const { protocol } = verifyG3TreatmentFreeze({ protocolPath });
  if (!Array.isArray(earlyTreatmentRememberedBySlot) || earlyTreatmentRememberedBySlot.length !== protocol.cohort.threadCount) {
    fail("G3 earlyTreatmentRememberedBySlot must contain exactly five booleans");
  }
  for (const value of earlyTreatmentRememberedBySlot) if (typeof value !== "boolean") fail("G3 early treatment outcomes must be booleans");
  const rememberedThreads = earlyTreatmentRememberedBySlot.filter(Boolean).length;
  const exposed = rememberedThreads * protocol.stratumMechanics.life_only_exposed.conditionalCallsPerThread;
  const unexposed = protocol.directTreatmentArithmetic.lifeOnlyCalls - exposed;
  const treatment = protocol.directTreatmentArithmetic.lifePlusGenomeCalls;
  return Object.freeze({
    rememberedEarlyTreatmentThreads: rememberedThreads,
    callCounts: Object.freeze({
      life_only_unexposed: unexposed,
      life_only_exposed: exposed,
      life_plus_genome: treatment,
    }),
    exposedMinimumMet: exposed >= protocol.planningArithmetic.minimumCallLevelAnalyzability.life_only_exposed,
    onFailure: exposed >= protocol.planningArithmetic.minimumCallLevelAnalyzability.life_only_exposed
      ? null
      : protocol.planningArithmetic.onExposedMinimumFailure,
  });
}

function main() {
  const { protocolDigest, protocol } = verifyG3TreatmentFreeze();
  process.stdout.write("G3 PASS-B TREATMENT FREEZE: VERIFIED\n");
  process.stdout.write(`Eligible calls: ${protocol.cohort.eligiblePassBCallCount}\n`);
  process.stdout.write(`Direct treatment: ${protocol.directTreatmentArithmetic.lifePlusGenomeCalls}/${protocol.cohort.eligiblePassBCallCount} (${(protocol.directTreatmentArithmetic.lifePlusGenomeProportion * 100).toFixed(1)}%)\n`);
  process.stdout.write(`Guaranteed clean calls: ${protocol.stratumMechanics.life_only_unexposed.guaranteedCalls}\n`);
  process.stdout.write(`Conditional exposed opportunities: ${protocol.cohort.threadCount * protocol.stratumMechanics.life_only_exposed.conditionalCallsPerThread}\n`);
  process.stdout.write(`Protocol digest: ${protocolDigest}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`G3 PASS-B TREATMENT FREEZE: FAILED\n${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  }
}

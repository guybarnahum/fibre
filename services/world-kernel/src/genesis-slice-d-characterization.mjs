import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertPlainObject,
} from "./persistence-common.mjs";
import { PASS_B_ANALYSIS_STRATA } from "./genesis-pass-b-domain.mjs";

const REINTERPRETATION_OUTCOMES = Object.freeze(["revised", "unchanged", "none"]);

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function assertBoolean(name, value) {
  if (typeof value !== "boolean") throw new TypeError(`${name} must be boolean`);
}

function assertCount(name, value) {
  assertFiniteNumber(name, value, { integer: true, minimum: 0 });
  return value;
}

function countMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function normalizeMemoryFormation(candidate, index) {
  const path = `sliceD.memoryFormations[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, ["outcome", "analysisStratum"]);
  if (!["remembered", "not_remembered"].includes(candidate.outcome)) throw new TypeError(`${path}.outcome is invalid`);
  if (!PASS_B_ANALYSIS_STRATA.includes(candidate.analysisStratum)) throw new TypeError(`${path}.analysisStratum is invalid`);
  return structuredClone(candidate);
}

function normalizeInitialMeaning(candidate, index) {
  const path = `sliceD.initialMeanings[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, ["meaningRef", "outcome", "partCount"]);
  assertId(`${path}.meaningRef`, candidate.meaningRef);
  if (!["durable_meaning", "no_durable_meaning"].includes(candidate.outcome)) throw new TypeError(`${path}.outcome is invalid`);
  assertCount(`${path}.partCount`, candidate.partCount);
  if (candidate.outcome === "no_durable_meaning" && candidate.partCount !== 0) throw new TypeError(`${path}.partCount must be 0 for no_durable_meaning`);
  if (candidate.outcome === "durable_meaning" && candidate.partCount < 1) throw new TypeError(`${path}.partCount must be positive for durable_meaning`);
  return structuredClone(candidate);
}

function normalizeMeaningAnnotation(candidate, index) {
  const path = `sliceD.meaningAnnotations[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, [
    "meaningRef",
    "ambivalent",
    "softPrescriptive",
    "sentimentCoupled",
    "selfAccountOverreach",
  ]);
  assertId(`${path}.meaningRef`, candidate.meaningRef);
  for (const field of ["ambivalent", "softPrescriptive", "sentimentCoupled", "selfAccountOverreach"]) {
    assertBoolean(`${path}.${field}`, candidate[field]);
  }
  return structuredClone(candidate);
}

function normalizeReinterpretationDecision(candidate, index) {
  const path = `sliceD.reinterpretationSchedule[${index}]`;
  assertPlainObject(path, candidate);
  for (const field of ["opportunityId", "threadId"]) assertId(`${path}.${field}`, candidate[field]);
  assertBoolean(`${path}.eligible`, candidate.eligible);
  assertBoolean(`${path}.run`, candidate.run);
  assertBoolean(`${path}.skippedByCap`, candidate.skippedByCap);
  if (!["ineligible", "run", "skipped_by_cap"].includes(candidate.disposition)) throw new TypeError(`${path}.disposition is invalid`);
  if (candidate.run && (!candidate.eligible || candidate.skippedByCap || candidate.disposition !== "run")) throw new TypeError(`${path} has incoherent run disposition`);
  if (candidate.skippedByCap && (!candidate.eligible || candidate.run || candidate.disposition !== "skipped_by_cap")) throw new TypeError(`${path} has incoherent cap disposition`);
  return candidate;
}

function normalizeReinterpretationResult(candidate, index) {
  const path = `sliceD.reinterpretationResults[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, ["opportunityId", "outcome"]);
  assertId(`${path}.opportunityId`, candidate.opportunityId);
  if (!REINTERPRETATION_OUTCOMES.includes(candidate.outcome)) throw new TypeError(`${path}.outcome is invalid`);
  return structuredClone(candidate);
}

function normalizeCountObject(name, candidate) {
  assertPlainObject(name, candidate);
  const normalized = {};
  for (const [key, value] of Object.entries(candidate).sort(([left], [right]) => left.localeCompare(right))) {
    normalized[key] = assertCount(`${name}.${key}`, value);
  }
  return normalized;
}

function normalizeRepairProfile(candidate) {
  assertPlainObject("sliceD.repairProfile", candidate);
  assertExactKeys("sliceD.repairProfile", candidate, [
    "recordsGenerated",
    "recordRepairsByGate",
    "recordRepairExhaustions",
    "candidateAttemptFailuresByGate",
    "candidateAttemptsPerThread",
  ]);
  if (!Array.isArray(candidate.candidateAttemptsPerThread)) throw new TypeError("sliceD.repairProfile.candidateAttemptsPerThread must be an array");
  return {
    recordsGenerated: assertCount("sliceD.repairProfile.recordsGenerated", candidate.recordsGenerated),
    recordRepairsByGate: normalizeCountObject("sliceD.repairProfile.recordRepairsByGate", candidate.recordRepairsByGate),
    recordRepairExhaustions: assertCount("sliceD.repairProfile.recordRepairExhaustions", candidate.recordRepairExhaustions),
    candidateAttemptFailuresByGate: normalizeCountObject("sliceD.repairProfile.candidateAttemptFailuresByGate", candidate.candidateAttemptFailuresByGate),
    candidateAttemptsPerThread: candidate.candidateAttemptsPerThread.map((value, index) =>
      assertCount(`sliceD.repairProfile.candidateAttemptsPerThread[${index}]`, value)),
  };
}

export function characterizeGenesisSliceD(candidate) {
  assertPlainObject("sliceD characterization input", candidate);
  assertExactKeys("sliceD characterization input", candidate, [
    "historicalEventCount",
    "memoryFormations",
    "initialMeanings",
    "meaningAnnotations",
    "reinterpretationSchedule",
    "reinterpretationResults",
    "repairProfile",
  ]);
  const historicalEventCount = assertCount("sliceD.historicalEventCount", candidate.historicalEventCount);
  if (!Array.isArray(candidate.memoryFormations)) throw new TypeError("sliceD.memoryFormations must be an array");
  if (!Array.isArray(candidate.initialMeanings)) throw new TypeError("sliceD.initialMeanings must be an array");
  if (!Array.isArray(candidate.meaningAnnotations)) throw new TypeError("sliceD.meaningAnnotations must be an array");
  if (!Array.isArray(candidate.reinterpretationSchedule)) throw new TypeError("sliceD.reinterpretationSchedule must be an array");
  if (!Array.isArray(candidate.reinterpretationResults)) throw new TypeError("sliceD.reinterpretationResults must be an array");

  const memoryFormations = candidate.memoryFormations.map(normalizeMemoryFormation);
  const initialMeanings = candidate.initialMeanings.map(normalizeInitialMeaning);
  const annotations = candidate.meaningAnnotations.map(normalizeMeaningAnnotation);
  const schedule = candidate.reinterpretationSchedule.map(normalizeReinterpretationDecision);
  const results = candidate.reinterpretationResults.map(normalizeReinterpretationResult);
  const repairProfile = normalizeRepairProfile(candidate.repairProfile);

  const rememberedCount = memoryFormations.filter((item) => item.outcome === "remembered").length;
  if (initialMeanings.length !== rememberedCount) {
    throw new TypeError("Slice-D characterization requires one initial Pass-C outcome for every remembered Pass-B formation");
  }
  const durableMeaningCount = initialMeanings.filter((item) => item.outcome === "durable_meaning").length;
  const multiPartDurableMeaningCount = initialMeanings.filter((item) => item.outcome === "durable_meaning" && item.partCount > 1).length;

  const annotationByMeaning = new Map();
  for (const annotation of annotations) {
    if (annotationByMeaning.has(annotation.meaningRef)) throw new TypeError(`duplicate Slice-D meaning annotation ${annotation.meaningRef}`);
    annotationByMeaning.set(annotation.meaningRef, annotation);
  }
  for (const meaning of initialMeanings) {
    if (!annotationByMeaning.has(meaning.meaningRef)) throw new TypeError(`missing Slice-D meaning annotation ${meaning.meaningRef}`);
  }
  const durableRefs = new Set(initialMeanings.filter((item) => item.outcome === "durable_meaning").map((item) => item.meaningRef));
  const multiPartRefs = new Set(initialMeanings.filter((item) => item.outcome === "durable_meaning" && item.partCount > 1).map((item) => item.meaningRef));

  const stratumCalls = countMap(PASS_B_ANALYSIS_STRATA);
  const stratumRemembered = countMap(PASS_B_ANALYSIS_STRATA);
  for (const formation of memoryFormations) {
    stratumCalls[formation.analysisStratum] += 1;
    if (formation.outcome === "remembered") stratumRemembered[formation.analysisStratum] += 1;
  }

  const eligible = schedule.filter((item) => item.eligible);
  const run = schedule.filter((item) => item.run);
  const skippedByCap = schedule.filter((item) => item.skippedByCap);
  const runIds = new Set(run.map((item) => item.opportunityId));
  const resultIds = new Set();
  const outcomeCounts = countMap(REINTERPRETATION_OUTCOMES);
  for (const result of results) {
    if (!runIds.has(result.opportunityId)) throw new TypeError(`reinterpretation result ${result.opportunityId} was not a scheduled run opportunity`);
    if (resultIds.has(result.opportunityId)) throw new TypeError(`duplicate reinterpretation result ${result.opportunityId}`);
    resultIds.add(result.opportunityId);
    outcomeCounts[result.outcome] += 1;
  }
  if (results.length !== run.length) throw new TypeError("Slice-D characterization requires one result for every run reinterpretation opportunity");

  const countAnnotation = (field, refs = null) => annotations.filter((item) =>
    item[field] && (refs === null || refs.has(item.meaningRef))).length;

  return Object.freeze({
    admissionVerdict: null,
    note: "Characterization only: these measurements must not be used as an admission gate.",
    funnel: Object.freeze({
      historicalEvents: historicalEventCount,
      passBCalls: memoryFormations.length,
      remembered: rememberedCount,
      notRemembered: memoryFormations.length - rememberedCount,
      eventsToRememberedRate: ratio(rememberedCount, historicalEventCount),
      durableMeaning: durableMeaningCount,
      noDurableMeaning: initialMeanings.length - durableMeaningCount,
      rememberedToDurableMeaningRate: ratio(durableMeaningCount, rememberedCount),
      multiPartDurableMeaning: multiPartDurableMeaningCount,
      durableMeaningToMultiPartRate: ratio(multiPartDurableMeaningCount, durableMeaningCount),
    }),
    strata: Object.freeze({ calls: Object.freeze(stratumCalls), remembered: Object.freeze(stratumRemembered) }),
    semanticDiagnostics: Object.freeze({
      ambivalentMeaning: countAnnotation("ambivalent", durableRefs),
      multiPartAmbivalentMeaning: countAnnotation("ambivalent", multiPartRefs),
      softPrescriptiveMeaning: countAnnotation("softPrescriptive", durableRefs),
      sentimentCoupledMeaning: countAnnotation("sentimentCoupled", durableRefs),
      selfAccountOverreachMeaning: countAnnotation("selfAccountOverreach", durableRefs),
    }),
    reinterpretation: Object.freeze({
      eligible: eligible.length,
      run: run.length,
      skippedByCap: skippedByCap.length,
      revised: outcomeCounts.revised,
      unchanged: outcomeCounts.unchanged,
      none: outcomeCounts.none,
      revisedRateOverRun: ratio(outcomeCounts.revised, run.length),
      unchangedRateOverRun: ratio(outcomeCounts.unchanged, run.length),
      noneRateOverRun: ratio(outcomeCounts.none, run.length),
    }),
    repairProfile: Object.freeze(repairProfile),
  });
}

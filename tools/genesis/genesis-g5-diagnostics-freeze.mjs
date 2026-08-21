#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";

export const G3_V2_PATH = "artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v2.json";
export const G4_V2_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v2.json";
export const G5_SURFACES_PATH = "artifacts/validation/m2-pr39/g/protocol/g5-evaluation-surfaces-v1.json";
export const G5_PROTOCOL_PATH = "artifacts/validation/m2-pr39/g/protocol/g5-diagnostics-freeze-v1.json";
export const G5_COHORT_DIR = "artifacts/validation/m2-pr39/g/cohort";

export const G3_V2_DIGEST = "sha256:aef6eea69cf55cc60e730a3529fd0e7d090261cd6535b256df6cbd3734174fae";
export const G4_V2_DIGEST = "sha256:50c2f5bcbb1a3470a685f75257fd004c516ca04a67a3b21b367dbf73e58ade20";
export const G5_SURFACES_DIGEST = "sha256:cedd203dbf45a933d2b3af5227931e7722db1d33ca43849933aac584c02e0712";
export const G5_SURFACES_BLOB_SHA = "320c6bac5a462ffe8cc998514b6024ebaf9f0915";
export const G5_PROTOCOL_DIGEST = "sha256:6beb0ba589ca2940d72e2d0cd88b0343aeb3ef73537be9669fbc36fc81cde11e";

function fail(message) {
  throw new Error(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function gitBlobSha(path) {
  const bytes = readFileSync(resolve(path));
  const prefix = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return createHash("sha1").update(prefix).update(bytes).digest("hex");
}

function binomialTail({ n, p, atLeast }) {
  const choose = (nn, kk) => {
    let result = 1;
    for (let i = 1; i <= kk; i += 1) result = (result * (nn - kk + i)) / i;
    return result;
  };
  let total = 0;
  for (let k = atLeast; k <= n; k += 1) {
    total += choose(n, k) * (p ** k) * ((1 - p) ** (n - k));
  }
  return total;
}

export function deterministicSha256Order(items, { seedDomain, namespace, key }) {
  if (!Array.isArray(items)) throw new TypeError("items must be an array");
  if (typeof seedDomain !== "string" || seedDomain.length === 0) throw new TypeError("seedDomain is required");
  if (typeof namespace !== "string" || namespace.length === 0) throw new TypeError("namespace is required");
  if (typeof key !== "function") throw new TypeError("key must be a function");
  return [...items].sort((a, b) => {
    const da = sha256(`${seedDomain}:${namespace}:${key(a)}`);
    const db = sha256(`${seedDomain}:${namespace}:${key(b)}`);
    return da.localeCompare(db) || String(key(a)).localeCompare(String(key(b)));
  });
}

export function rankPointsFromScores(scores) {
  const labels = ["A", "B", "C", "D", "E"];
  if (scores === null || typeof scores !== "object" || Array.isArray(scores)) throw new TypeError("scores must be an object");
  labels.forEach((label) => {
    if (typeof scores[label] !== "number" || !Number.isFinite(scores[label])) throw new TypeError(`scores.${label} must be finite`);
  });
  const sorted = labels
    .map((label) => ({ label, value: scores[label] }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const points = {};
  let index = 0;
  while (index < sorted.length) {
    let end = index + 1;
    while (end < sorted.length && sorted[end].value === sorted[index].value) end += 1;
    const firstPosition = index + 1;
    const lastPosition = end;
    const averagePosition = (firstPosition + lastPosition) / 2;
    const rankPoints = 6 - averagePosition;
    for (let i = index; i < end; i += 1) points[sorted[i].label] = rankPoints;
    index = end;
  }
  return Object.freeze(points);
}

export function classifyD1(correctCount) {
  if (!Number.isSafeInteger(correctCount) || correctCount < 0 || correctCount > 5) throw new TypeError("D1 correctCount must be 0..5");
  if (correctCount >= 4) return "strong";
  if (correctCount === 3) return "suggestive";
  return "weak_or_inconclusive";
}

export function classifyD3Ordinal(correctCount) {
  if (!Number.isSafeInteger(correctCount) || correctCount < 0 || correctCount > 5) throw new TypeError("D3 correctCount must be 0..5");
  if (correctCount === 5) return "detectable_reference";
  if (correctCount === 4) return "suggestive";
  return "inconclusive";
}

export function classifyCleanNegativeControl(correctCount) {
  if (!Number.isSafeInteger(correctCount) || correctCount < 0 || correctCount > 5) throw new TypeError("negative-control correctCount must be 0..5");
  if (correctCount === 5) return "negative_control_warning";
  if (correctCount === 4) return "negative_control_watch";
  return "no_detectable_negative_control_signal";
}

export function emitsNegativeControlFailureSignal(ordinal1Correct, ordinal2Correct) {
  [ordinal1Correct, ordinal2Correct].forEach((value) => {
    if (!Number.isSafeInteger(value) || value < 0 || value > 5) throw new TypeError("negative-control correctCount must be 0..5");
  });
  return ordinal1Correct === 5 || ordinal2Correct === 5 || (ordinal1Correct >= 4 && ordinal2Correct >= 4);
}

function assertEmptyCohortDir() {
  const path = resolve(G5_COHORT_DIR);
  if (!existsSync(path)) return;
  const entries = readdirSync(path, { recursive: true }).filter((entry) => !String(entry).startsWith("."));
  if (entries.length !== 0) fail("G5 freeze requires the final cohort artifact directory to remain empty");
}

export function verifyG5DiagnosticsFreeze() {
  const g3 = readJson(G3_V2_PATH);
  const g4 = readJson(G4_V2_PATH);
  const surfaces = readJson(G5_SURFACES_PATH);
  const protocol = readJson(G5_PROTOCOL_PATH);

  if (digest(g3) !== G3_V2_DIGEST) fail("G5 binding to G3-v2 drifted");
  if (digest(g4) !== G4_V2_DIGEST) fail("G5 binding to G4-v2 drifted");
  if (digest(surfaces) !== G5_SURFACES_DIGEST) fail("G5 evaluation surface digest drifted");
  if (gitBlobSha(G5_SURFACES_PATH) !== G5_SURFACES_BLOB_SHA) fail("G5 evaluation surface Git blob drifted");
  if (digest(protocol) !== G5_PROTOCOL_DIGEST) fail("G5 diagnostics protocol digest drifted");

  if (protocol.preconditions?.g3ProtocolDigest !== G3_V2_DIGEST) fail("G5 protocol does not bind exact G3-v2");
  if (protocol.preconditions?.g4ProtocolDigest !== G4_V2_DIGEST) fail("G5 protocol does not bind exact G4-v2");
  if (protocol.preconditions?.finalCohortLifeExists !== false) fail("G5 must freeze before final-cohort life generation");
  if (protocol.authorityBoundary?.g5MayGenerateFinalLife !== false) fail("G5 must not authorize life generation");
  if (protocol.authorityBoundary?.g5MayChangeWorldsGenomesCognitionTreatmentRetriesPublication !== false) fail("G5 must be evaluation-only");
  assertEmptyCohortDir();

  if (protocol.evaluationSurfaces?.canonicalDigest !== G5_SURFACES_DIGEST || protocol.evaluationSurfaces?.gitBlobSha !== G5_SURFACES_BLOB_SHA) fail("G5 protocol does not pin exact evaluation surfaces");
  if (protocol.runtime?.normalizer?.provider !== surfaces.normalizer.provider || protocol.runtime?.normalizer?.model !== surfaces.normalizer.model) fail("G5 normalizer runtime drift");
  if (protocol.runtime?.primaryRater?.provider !== surfaces.d1.provider || protocol.runtime?.primaryRater?.model !== surfaces.d1.model) fail("G5 primary rater runtime drift");
  for (const key of ["d1", "d2_event", "d2_meaning", "d3", "d5"]) {
    if (surfaces[key].provider !== protocol.runtime.primaryRater.provider || surfaces[key].model !== protocol.runtime.primaryRater.model) fail(`G5 ${key} rater differs from frozen primary rater`);
  }

  const d1 = protocol.diagnostics.D1_life_attribution;
  if (d1.primaryCondition !== "normalized" || d1.secondaryCondition !== "raw") fail("G5 D1 condition priority drift");
  if (d1.trialCountPerCondition !== 5 || d1.chanceChoiceProbability !== 0.2) fail("G5 D1 trial/chance arithmetic drift");
  const d1p3 = binomialTail({ n: 5, p: 0.2, atLeast: 3 });
  const d1p4 = binomialTail({ n: 5, p: 0.2, atLeast: 4 });
  if (Math.abs(d1.scoring.chanceReference.P_at_least_3_of_5 - d1p3) > 1e-12 || Math.abs(d1.scoring.chanceReference.P_at_least_4_of_5 - d1p4) > 1e-12) fail("G5 D1 chance reference drift");
  if (classifyD1(2) !== "weak_or_inconclusive" || classifyD1(3) !== "suggestive" || classifyD1(4) !== "strong") fail("G5 D1 band implementation drift");

  const d2 = protocol.diagnostics.D2_sentiment_coupling;
  if (d2.minimumAnalyzability?.durableMeaningRecords !== 8 || d2.minimumAnalyzability?.threadsRepresented !== 3) fail("G5 D2 minimum analyzability drift");
  if (d2.aggregation?.cohortStatistic !== "Spearman rank correlation across durable meaning records") fail("G5 D2 statistic drift");

  const d3 = protocol.diagnostics.D3_genome_propagation;
  const primaryOrdinals = d3.primaryTreatmentContrasts.map((item) => item.callOrdinal);
  const primaryHorizons = d3.primaryTreatmentContrasts.map((item) => item.historyHorizon);
  if (canonicalJson(primaryOrdinals) !== canonicalJson(g3.analysisRules.primaryContrastOrdinals)) fail("G5 D3 primary ordinals differ from G3-v2");
  if (canonicalJson(primaryHorizons) !== canonicalJson(g3.analysisRules.primaryContrastHorizons)) fail("G5 D3 primary horizons differ from G3-v2");
  if (g3.analysisRules.primaryContrast !== "between_thread_at_fixed_call_ordinal") fail("G5 cannot proceed without G3-v2 fixed-ordinal primary contrast");
  if (d3.exposedPropagation?.status !== "descriptive_only_horizon_confounded_no_between_stratum_causal_claim") fail("G5 D3 reopened confounded between-stratum causal inference");
  if (canonicalJson(d3.measuredG2Pairs) !== canonicalJson([[1,2],[2,3],[3,4],[4,5],[5,1]])) fail("G5 D3 measured G2 pair scope drift");
  if (d3.g2CeilingConstraint?.normalizationScope !== "measured five pairs only") fail("G5 D3 overstates G2 ceiling scope");
  if (classifyD3Ordinal(5) !== "detectable_reference" || classifyD3Ordinal(4) !== "suggestive" || classifyD3Ordinal(3) !== "inconclusive") fail("G5 D3 band implementation drift");
  if (Math.abs(d3.chanceReferenceOnly.P_5_of_5_if_independent_fair_edges - (0.5 ** 5)) > 1e-12) fail("G5 D3 5/5 chance reference drift");
  if (Math.abs(d3.chanceReferenceOnly.P_at_least_4_of_5_if_independent_fair_edges - binomialTail({ n: 5, p: 0.5, atLeast: 4 })) > 1e-12) fail("G5 D3 4+/5 chance reference drift");
  if (!emitsNegativeControlFailureSignal(5, 0) || !emitsNegativeControlFailureSignal(4, 4) || emitsNegativeControlFailureSignal(4, 3)) fail("G5 D3 negative-control combined warning drift");

  const d4 = protocol.diagnostics.D4_life_funnel;
  if (d4.rater !== null || d4.status !== "characterization_only_no_quota") fail("G5 D4 must remain mechanical characterization");

  const d5 = protocol.diagnostics.D5_self_account_overreach;
  if (d5.trialCount !== 5 || d5.status !== "warning_characterization_until_G6") fail("G5 D5 trial/status drift");
  if (protocol.secondaryCharacterization?.noAdmissionFloors !== true || protocol.secondaryCharacterization?.noHiddenQualityGate !== true) fail("G5 secondary characterization became an admission gate");
  if (protocol.g5Exit?.g6OwnsBlockingVerdictRule !== true) fail("G5 improperly owns the final blocking verdict rule");

  const orderProbe = deterministicSha256Order([1,2,3,4,5], {
    seedDomain: protocol.randomization.seedDomain,
    namespace: "verifier-probe",
    key: String,
  });
  if (new Set(orderProbe).size !== 5) fail("G5 deterministic randomization is not a permutation");

  return Object.freeze({
    protocolDigest: digest(protocol),
    surfacesDigest: digest(surfaces),
    surfacesBlobSha: gitBlobSha(G5_SURFACES_PATH),
    primaryRater: `${protocol.runtime.primaryRater.provider}/${protocol.runtime.primaryRater.model}`,
    primaryD1: d1.primaryCondition,
    d3PrimaryOrdinals: primaryOrdinals,
    d3PrimaryHorizons: primaryHorizons,
    d2MinimumMeanings: d2.minimumAnalyzability.durableMeaningRecords,
  });
}

function main() {
  const result = verifyG5DiagnosticsFreeze();
  process.stdout.write("G5 DIAGNOSTICS FREEZE: VERIFIED\n\n");
  process.stdout.write(`Primary rater: ${result.primaryRater}\n`);
  process.stdout.write(`D1 primary condition: ${result.primaryD1}\n`);
  process.stdout.write(`D3 primary ordinals: ${result.d3PrimaryOrdinals.join(", ")}\n`);
  process.stdout.write(`D3 primary horizons: ${result.d3PrimaryHorizons.join(", ")}\n`);
  process.stdout.write(`D2 minimum durable meanings: ${result.d2MinimumMeanings}\n`);
  process.stdout.write(`Evaluation surfaces digest: ${result.surfacesDigest}\n`);
  process.stdout.write(`G5 protocol digest: ${result.protocolDigest}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}

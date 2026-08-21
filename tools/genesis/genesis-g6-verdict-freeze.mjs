#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";

export const G5_PROTOCOL_PATH = "artifacts/validation/m2-pr39/g/protocol/g5-diagnostics-freeze-v1.json";
export const G6_PROTOCOL_PATH = "artifacts/validation/m2-pr39/g/protocol/g6-verdict-freeze-v1.json";
export const G6_COHORT_DIR = "artifacts/validation/m2-pr39/g/cohort";

export const G5_PROTOCOL_DIGEST = "sha256:4520357cab14bcdc883c6b3966401c98d17a1424e47f26e8c04002728d799ed5";
export const G5_PROTOCOL_BLOB_SHA = "7c6a856d0650b3468bc988a4f5cbd2d96c7551c5";
export const G6_PROTOCOL_BLOB_SHA = "3f66b590eb357b97baa4bb7778a781e5ca82af32";

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

function assertEmptyCohortDir() {
  const path = resolve(G6_COHORT_DIR);
  if (!existsSync(path)) return;
  const entries = readdirSync(path, { recursive: true }).filter((entry) => !String(entry).startsWith("."));
  if (entries.length !== 0) fail("G6 freeze requires the final cohort artifact directory to remain empty");
}

export function directPropagationClear(ordinal3CorrectCoreEdges, ordinal6CorrectCoreEdges) {
  for (const value of [ordinal3CorrectCoreEdges, ordinal6CorrectCoreEdges]) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 4) throw new TypeError("core-edge counts must be integers 0..4");
  }
  return ordinal3CorrectCoreEdges >= 3 && ordinal6CorrectCoreEdges >= 3 && Math.max(ordinal3CorrectCoreEdges, ordinal6CorrectCoreEdges) === 4;
}

export function stableVeryHighSentimentCoupling({ rho, leaveOneThreadOutRhos, analyzable = true }) {
  if (!analyzable) return false;
  if (typeof rho !== "number" || !Number.isFinite(rho)) throw new TypeError("rho must be finite");
  if (!Array.isArray(leaveOneThreadOutRhos) || leaveOneThreadOutRhos.length === 0) throw new TypeError("leaveOneThreadOutRhos must be non-empty");
  leaveOneThreadOutRhos.forEach((value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError("leave-one-Thread-out rho must be finite");
  });
  return rho >= 0.75 && Math.min(...leaveOneThreadOutRhos) >= 0.60;
}

export function classifyG6Verdict({
  confirmedProtocolIntegrityViolation = false,
  operationalHold = false,
  d1NormalizedCorrect,
  d3Ordinal3CorrectCoreEdges,
  d3Ordinal6CorrectCoreEdges,
  negativeControlFailureSignal = false,
  d2Rho = 0,
  d2LeaveOneThreadOutRhos = [0],
  d2Analyzable = true,
  d5NearTotalSelfExplanationThreads = 0,
} = {}) {
  if (confirmedProtocolIntegrityViolation) return "REDESIGN";
  if (!Number.isSafeInteger(d1NormalizedCorrect) || d1NormalizedCorrect < 0 || d1NormalizedCorrect > 5) throw new TypeError("d1NormalizedCorrect must be 0..5");
  if (!Number.isSafeInteger(d5NearTotalSelfExplanationThreads) || d5NearTotalSelfExplanationThreads < 0 || d5NearTotalSelfExplanationThreads > 5) throw new TypeError("d5NearTotalSelfExplanationThreads must be 0..5");

  const directClear = directPropagationClear(d3Ordinal3CorrectCoreEdges, d3Ordinal6CorrectCoreEdges);
  const d2Hold = stableVeryHighSentimentCoupling({ rho: d2Rho, leaveOneThreadOutRhos: d2LeaveOneThreadOutRhos, analyzable: d2Analyzable });

  if (
    operationalHold ||
    d1NormalizedCorrect < 4 ||
    !directClear ||
    negativeControlFailureSignal ||
    d2Hold ||
    d5NearTotalSelfExplanationThreads >= 4
  ) return "HOLD";

  return "CLEAR";
}

export function verifyG6VerdictFreeze() {
  const g5 = readJson(G5_PROTOCOL_PATH);
  const g6 = readJson(G6_PROTOCOL_PATH);

  if (digest(g5) !== G5_PROTOCOL_DIGEST) fail("G6 binding to G5 canonical digest drifted");
  if (gitBlobSha(G5_PROTOCOL_PATH) !== G5_PROTOCOL_BLOB_SHA) fail("G6 binding to G5 exact Git blob drifted");
  if (gitBlobSha(G6_PROTOCOL_PATH) !== G6_PROTOCOL_BLOB_SHA) fail("G6 exact protocol Git blob drifted");
  if (g6.preconditions?.g5ProtocolCanonicalDigest !== G5_PROTOCOL_DIGEST || g6.preconditions?.g5ProtocolGitBlobSha !== G5_PROTOCOL_BLOB_SHA) fail("G6 protocol does not bind exact verified G5 authority");
  if (g6.preconditions?.finalCohortLifeExists !== false) fail("G6 must freeze before final-cohort life generation");
  assertEmptyCohortDir();

  if (canonicalJson(g6.authorityBoundary?.verdictStatuses) !== canonicalJson(["CLEAR", "HOLD", "REDESIGN"])) fail("G6 verdict status set drift");
  if (canonicalJson(g6.authorityBoundary?.verdictPrecedence) !== canonicalJson(["REDESIGN", "HOLD", "CLEAR"])) fail("G6 verdict precedence drift");
  if (g6.authorityBoundary?.badOutcomeMayTriggerRegeneration !== false || g6.authorityBoundary?.badOutcomeMayRewriteFrozenEvidence !== false) fail("G6 reopened quality regeneration/evidence rewriting");
  if (g6.authorityBoundary?.hMayRunOnlyAfterBlockingGateGClear !== true) fail("G6 does not preserve blocking Gate-G sequencing");

  const d1 = g6.diagnosticVerdictRules?.D1_life_attribution;
  if (d1?.blocking !== true || d1.primaryCondition !== "normalized") fail("G6 D1 blocking surface drift");

  const d2 = g6.diagnosticVerdictRules?.D2_sentiment_coupling;
  if (d2?.minimumAnalyzability?.durableMeaningRecords !== 8 || d2.minimumAnalyzability?.threadsRepresented !== 3) fail("G6 D2 analyzability drift");
  if (d2.insufficientAnalyzability !== "INCONCLUSIVE_NONBLOCKING_NO_REGENERATION_NO_MEANING_QUOTA") fail("G6 D2 created a hidden meaning-count gate");
  if (!stableVeryHighSentimentCoupling({ rho: 0.80, leaveOneThreadOutRhos: [0.61,0.72,0.65,0.69,0.70] })) fail("G6 D2 stable-high HOLD implementation drift");
  if (stableVeryHighSentimentCoupling({ rho: 0.80, leaveOneThreadOutRhos: [0.59,0.72,0.65,0.69,0.70] })) fail("G6 D2 unstable-high warning incorrectly blocks");

  const d3 = g6.diagnosticVerdictRules?.D3_genome_propagation;
  if (canonicalJson(d3?.primaryOrdinals) !== canonicalJson([3,6]) || canonicalJson(d3?.primaryHorizons) !== canonicalJson([6,10])) fail("G6 D3 fixed-ordinal primary contrast drift");
  if (canonicalJson(d3.g2DetectableCoreEdges) !== canonicalJson([[1,2],[2,3],[4,5],[5,1]])) fail("G6 D3 detectable G2 core drift");
  if (canonicalJson(d3.g2MeasuredLowNonblockingEdge) !== canonicalJson([3,4])) fail("G6 D3 pair 3-4 limitation drift");
  if (d3.directPropagationClearRequirement?.eachOrdinalMinimumCorrectCoreEdges !== 3 || d3.directPropagationClearRequirement?.atLeastOneOrdinalCorrectCoreEdges !== 4) fail("G6 D3 direct-propagation threshold drift");
  if (!directPropagationClear(4,3) || !directPropagationClear(3,4) || directPropagationClear(3,3) || directPropagationClear(4,2)) fail("G6 D3 direct-propagation classifier drift");
  if (d3.cleanNegativeControl?.confirmedMechanicalLeak?.includes("REDESIGN") !== true) fail("G6 D3 does not distinguish statistical negative-control HOLD from confirmed leak REDESIGN");
  if (d3.lifeOnlyExposed?.status !== "descriptive_only_horizon_confounded" || d3.lifeOnlyExposed?.insufficientCell !== "INCONCLUSIVE_NONBLOCKING_NO_REGENERATION") fail("G6 D3 reopened confounded exposed-stratum inference");

  const d4 = g6.diagnosticVerdictRules?.D4_life_funnel;
  if (d4?.blocking !== false) fail("G6 D4 became a hidden funnel quota");

  const d5 = g6.diagnosticVerdictRules?.D5_self_account_overreach;
  if (d5?.blockingForStrongCohortWarning !== true || d5.insufficientMaterialHistory !== "NONBLOCKING_NO_HISTORY_QUOTA") fail("G6 D5 blocking/no-quota boundary drift");

  const clear = classifyG6Verdict({
    d1NormalizedCorrect: 4,
    d3Ordinal3CorrectCoreEdges: 4,
    d3Ordinal6CorrectCoreEdges: 3,
    d2Rho: 0.5,
    d2LeaveOneThreadOutRhos: [0.4,0.5,0.45,0.52,0.48],
    d5NearTotalSelfExplanationThreads: 2,
  });
  if (clear !== "CLEAR") fail("G6 CLEAR classifier drift");
  if (classifyG6Verdict({
    confirmedProtocolIntegrityViolation: true,
    operationalHold: true,
    d1NormalizedCorrect: 0,
    d3Ordinal3CorrectCoreEdges: 0,
    d3Ordinal6CorrectCoreEdges: 0,
    d5NearTotalSelfExplanationThreads: 5,
  }) !== "REDESIGN") fail("G6 REDESIGN precedence drift");

  if (g6.gateG?.blocking !== true || g6.gateG?.mustOccurBeforeFinalLife !== true) fail("G6 Gate-G is not blocking before life generation");
  if (!Array.isArray(g6.gateG.requiredProofs) || g6.gateG.requiredProofs.length < 10) fail("G6 Gate-G packet is incomplete");
  if (g6.g6Exit?.hAuthorizedOnlyAfter !== "BLOCKING_GATE_G_CLEAR") fail("G6 incorrectly authorizes H before Gate-G CLEAR");

  return Object.freeze({
    g5ProtocolDigest: digest(g5),
    g5ProtocolBlobSha: gitBlobSha(G5_PROTOCOL_PATH),
    g6ProtocolDigest: digest(g6),
    g6ProtocolBlobSha: gitBlobSha(G6_PROTOCOL_PATH),
    d1ClearMinimum: 4,
    d3CoreRule: "both >=3/4; at least one 4/4",
    d2StableHighRule: "rho >= .75 and leave-one-Thread-out minimum >= .60",
    d5HoldMinimum: 4,
  });
}

function main() {
  const result = verifyG6VerdictFreeze();
  process.stdout.write("G6 VERDICT FREEZE: VERIFIED\n\n");
  process.stdout.write(`G5 protocol digest: ${result.g5ProtocolDigest}\n`);
  process.stdout.write(`G5 protocol blob: ${result.g5ProtocolBlobSha}\n`);
  process.stdout.write(`G6 protocol digest: ${result.g6ProtocolDigest}\n`);
  process.stdout.write(`G6 protocol blob: ${result.g6ProtocolBlobSha}\n`);
  process.stdout.write(`D1 CLEAR minimum: ${result.d1ClearMinimum}/5\n`);
  process.stdout.write(`D3 core CLEAR: ${result.d3CoreRule}\n`);
  process.stdout.write(`D2 stable-high HOLD: ${result.d2StableHighRule}\n`);
  process.stdout.write(`D5 HOLD minimum: ${result.d5HoldMinimum}/5 near-total Threads\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}

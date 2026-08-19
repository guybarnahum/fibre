#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import {
  E2_N2_SOURCE_V1_FILE,
  E2_N2_SOURCE_V2_FILE,
  buildN2Preflight,
  runN2,
} from "./genesis-rich-life-e2-n2.mjs";

export const E2_N2_OLD_EPISTEMIC_A0_FILE = "artifacts/validation/m2-pr39/e2/fibre-m2-pr39-slice-e2-n1-a0-v1.json";
export const E2_N2_OLD_EPISTEMIC_A0_FILE_SHA256 = "8b8497fe687dfcb5a728024b83ca65c0f5e88006c645b0fbf5d92524e1adb122";
export const E2_N2_NEAR_TOTAL_RECALL_THRESHOLD = 17;

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

function readJsonWithSha(path) {
  if (!existsSync(path)) throw new Error(`artifact does not exist: ${path}`);
  const text = readFileSync(path, "utf8");
  return Object.freeze({ artifact: JSON.parse(text), fileSha256: sha256(text) });
}

function validateOldInstrument(oldArtifact, oldFileSha256) {
  if (oldFileSha256 !== E2_N2_OLD_EPISTEMIC_A0_FILE_SHA256) throw new TypeError("N2 old epistemic A0 artifact byte SHA-256 mismatch");
  if (oldArtifact?.evidenceVersion !== "pr39-slice-e2-n1-a0-v1" || oldArtifact?.status !== "complete") throw new TypeError("N2 old epistemic A0 artifact version/status mismatch");
  if (!Array.isArray(oldArtifact.completedTrials) || oldArtifact.completedTrials.length !== 9) throw new TypeError("N2 old epistemic A0 artifact must contain nine completed trials");
  const remembered = oldArtifact.completedTrials.filter((trial) => trial.passB?.output?.outcome === "remembered").length;
  if (remembered !== 6) throw new TypeError("N2 old epistemic A0 remembered witness changed from frozen 6/9");
}

function pairKey(trial) {
  return `${trial.pairOrdinal}|${trial.horizon}|${trial.sourceRunOrdinal}`;
}

export function pairedPassBFramingComparison(completedTrials, oldArtifact) {
  validateOldInstrument(oldArtifact, E2_N2_OLD_EPISTEMIC_A0_FILE_SHA256);
  const current = completedTrials.filter((trial) => trial.worldId === "E2-V1");
  if (current.length !== 9) return Object.freeze({
    status: "pending",
    gateUse: false,
    scope: "same frozen E2-V1 A0 lives and horizons under old epistemic versus new constitutive Pass-B framing",
    oldRemembered: 6,
    oldTrials: 9,
    completedNewTrials: current.length,
  });
  const oldByKey = new Map(oldArtifact.completedTrials.map((trial) => [pairKey(trial), trial]));
  const pairs = current.map((trial) => {
    const old = oldByKey.get(pairKey(trial));
    if (old === undefined) throw new TypeError(`N2 paired framing comparison lacks old trial ${pairKey(trial)}`);
    return Object.freeze({
      pairOrdinal: trial.pairOrdinal,
      horizon: trial.horizon,
      sourceRunOrdinal: trial.sourceRunOrdinal,
      oldEpistemicOutcome: old.passB.output.outcome,
      newConstitutiveOutcome: trial.passB.output.outcome,
    });
  });
  const newRemembered = current.filter((trial) => trial.passB.output.outcome === "remembered").length;
  return Object.freeze({
    status: "complete",
    gateUse: false,
    classification: "observational",
    scope: "same frozen E2-V1 A0 lives and horizons under old epistemic versus new constitutive Pass-B framing",
    oldInstrument: "N1_A0_epistemic_detection",
    newInstrument: "N2_constitutive_memory_formation",
    oldRemembered: 6,
    newRemembered,
    trials: 9,
    rememberedDelta: newRemembered - 6,
    interpretationRule: "A rise supports the semantics-correction mechanism; no rise weakens that explanation. This comparison cannot replace either N2 gate criterion.",
    pairs: Object.freeze(pairs),
  });
}

export function n2ReviewPlan() {
  return Object.freeze({
    protocolReview: "PROTOCOL_CLEAR_2026-08-19",
    foldedBeforeFirstE2V2ModelUse: true,
    criteriaChangedByReviewRecommendations: false,
    memoryRateCharacterization: Object.freeze({
      reportRememberedRate: true,
      lowExtreme: "criterion_A_failure_below_10_of_18",
      nearTotalRecallThreshold: E2_N2_NEAR_TOTAL_RECALL_THRESHOLD,
      nearTotalRecallDenominator: 18,
      extremeInterpretation: "Either low recall or near-total recall is an instrument finding for examination; neither substitutes for or modifies the frozen gate criteria.",
    }),
    pairedFramingComparison: Object.freeze({
      gateUse: false,
      oldArtifact: E2_N2_OLD_EPISTEMIC_A0_FILE,
      oldArtifactSha256: E2_N2_OLD_EPISTEMIC_A0_FILE_SHA256,
      oldRemembered: 6,
      oldTrials: 9,
      scope: "same E2-V1 A0 lives, same horizons, old epistemic prompt versus new constitutive prompt",
    }),
    firstValidTestRationale: "N1-v2 used a generator family later retired after fresh-world falsification; N1-on-A0 used the shipping-generator candidate with a Pass-B prompt that contradicted the constitutive memory contract. N2 is the first pairing of corrected A0 with a contract-conformant Pass-B formation instrument.",
  });
}

export function decorateN2Preflight(preflight) {
  return Object.freeze({
    ...structuredClone(preflight),
    preExecutionReview: structuredClone(n2ReviewPlan()),
  });
}

export function decorateN2Snapshot(snapshot, oldArtifact) {
  const decorated = structuredClone(snapshot);
  decorated.preExecutionReview = structuredClone(n2ReviewPlan());
  if (decorated.preflight !== undefined) decorated.preflight = structuredClone(decorateN2Preflight(decorated.preflight));
  if (decorated.status === "complete" && decorated.score !== null) {
    const remembered = decorated.score.memoryFormation.remembered;
    decorated.score.memoryFormation.rememberedRate = remembered / decorated.score.n;
    decorated.score.memoryFormation.characterization = {
      nearTotalRecallThreshold: E2_N2_NEAR_TOTAL_RECALL_THRESHOLD,
      nearTotalRecallObserved: remembered >= E2_N2_NEAR_TOTAL_RECALL_THRESHOLD,
      lowRecallObserved: remembered < decorated.score.memoryFormation.minimumRemembered,
      gateUse: false,
      interpretation: "Memory rate is reported as characterization. Either low recall or near-total recall is examined as an instrument finding; this field does not change Criterion A or B.",
    };
    decorated.pairedPassBFramingComparison = structuredClone(pairedPassBFramingComparison(decorated.completedTrials, oldArtifact));
  }
  return Object.freeze(decorated);
}

function printSummary(result) {
  const score = result.score;
  process.stdout.write(`N2 memory: ${score.memoryFormation.remembered}/${score.n} (${score.memoryFormation.rememberedRate}) · floor=${score.memoryFormation.minimumRemembered} · met=${score.memoryFormation.criterionMet ? "YES" : "NO"}\n`);
  process.stdout.write(`N2 attribution: ${score.conditionalAttribution.correct}/${score.conditionalAttribution.rememberedTrials} · min=${score.conditionalAttribution.minimumCorrectAtObservedM ?? "n/a"} · p_tail=${score.conditionalAttribution.exactBinomialChanceTail} · met=${score.conditionalAttribution.criterionMet ? "YES" : "NO"}\n`);
  const paired = result.pairedPassBFramingComparison;
  process.stdout.write(`N2 paired framing E2-V1: old=${paired.oldRemembered}/${paired.trials} · new=${paired.newRemembered}/${paired.trials} · delta=${paired.rememberedDelta} · gate-use=NO\n`);
  process.stdout.write(`N2 Gate-F downstream fertility: ${score.gateFDownstreamFertilityMet ? "PASS" : "FAIL"}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage:\n  npm run genesis:e2-n2 -- --preflight [--source-v1 <file>] [--source-v2 <file>] [--out <file>]\n  npm run genesis:e2-n2 -- --provider <openai|google> --model <model> [--source-v1 <file>] [--source-v2 <file>] --out <file> [--resume <checkpoint>]\n");
    return;
  }

  const sourceV1Path = readArg(argv, "--source-v1", E2_N2_SOURCE_V1_FILE);
  const sourceV2Path = readArg(argv, "--source-v2", E2_N2_SOURCE_V2_FILE);
  const outputPath = readArg(argv, "--out");
  const oldPath = readArg(argv, "--old-instrument", E2_N2_OLD_EPISTEMIC_A0_FILE);
  const sourceV1Read = readJsonWithSha(sourceV1Path);
  const sourceV2Read = readJsonWithSha(sourceV2Path);
  const oldRead = readJsonWithSha(oldPath);
  validateOldInstrument(oldRead.artifact, oldRead.fileSha256);

  if (argv.includes("--preflight")) {
    const preflight = decorateN2Preflight(buildN2Preflight({
      sourceV1: sourceV1Read.artifact,
      sourceV1FileSha256: sourceV1Read.fileSha256,
      sourceV2: sourceV2Read.artifact,
      sourceV2FileSha256: sourceV2Read.fileSha256,
    }));
    const text = `${JSON.stringify(preflight, null, 2)}\n`;
    if (outputPath === null) process.stdout.write(text);
    else writeFileSync(outputPath, text, "utf8");
    return;
  }

  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const resumePath = readArg(argv, "--resume");
  if (typeof outputPath !== "string" || outputPath.trim() === "") throw new Error("--out is required for checkpoint-safe N2 execution");
  if (existsSync(outputPath) && resumePath === null) throw new Error(`output exists: ${outputPath}; started/completed N2 evidence must not be overwritten`);
  if (resumePath !== null && !existsSync(resumePath)) throw new Error(`resume artifact does not exist: ${resumePath}`);
  const resumeArtifact = resumePath === null ? null : JSON.parse(readFileSync(resumePath, "utf8"));
  const writeCheckpoint = async (snapshot) => writeFileSync(outputPath, `${JSON.stringify(decorateN2Snapshot(snapshot, oldRead.artifact), null, 2)}\n`, "utf8");

  process.stderr.write("E2 N2 reviewed execution: START · protocol-cleared · R1-R4 folded before first model use\n");
  try {
    const result = await runN2({
      provider,
      model,
      sourceV1: sourceV1Read.artifact,
      sourceV1FileSha256: sourceV1Read.fileSha256,
      sourceV2: sourceV2Read.artifact,
      sourceV2FileSha256: sourceV2Read.fileSha256,
      resumeArtifact,
      onCheckpoint: writeCheckpoint,
    });
    const decorated = decorateN2Snapshot(result, oldRead.artifact);
    writeFileSync(outputPath, `${JSON.stringify(decorated, null, 2)}\n`, "utf8");
    printSummary(decorated);
    process.stdout.write(`Artifact: ${outputPath}\n`);
  } catch (error) {
    process.stderr.write(`Failure artifact: ${outputPath}\n`);
    throw error;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`E2 N2 reviewed execution: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

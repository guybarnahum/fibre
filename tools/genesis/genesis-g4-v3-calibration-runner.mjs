#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { GenesisPassAValidationError } from "../../services/world-kernel/src/genesis-pass-a-domain.mjs";
import { GENESIS_PASS_A_RELIABILITY_POLICY_V3 } from "../../services/world-kernel/src/genesis-pass-a-reliability-v3.mjs";
import {
  generateRichPassAEpisode,
  richPassAV3PromptHash,
  richPassAV3RecordRetryPromptHash,
} from "../../services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import { createOpenAIModelAdapter } from "../../services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";
import { serializeGenesisFailureEvidence } from "./genesis-failure-evidence.mjs";
import { verifyCalibrationInputCorpus } from "./genesis-g4-v3-calibration-inputs.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const CORPUS_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-v3-off-cohort-calibration-inputs-v1.json";
const CALIBRATION_PROTOCOL_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-v3-off-cohort-calibration-freeze-v1.json";
const EXECUTION_FREEZE_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-v3-off-cohort-calibration-execution-freeze-v1.json";
const IMPLEMENTATION_WITNESS_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-v3-reliability-implementation-witness-v1.json";
const OUTPUT_ROOT = "artifacts/validation/m2-pr39/g/calibration/g4-v3-off-cohort-v1";
const START_PATH = `${OUTPUT_ROOT}/calibration-attempt-start-v1.json`;
const FINAL_PATH = `${OUTPUT_ROOT}/calibration-result-v1.json`;

export const G4_V3_CALIBRATION_RUNNER_VERSION = "pr39-g4-v3-off-cohort-calibration-runner-v1";
export const G4_V3_CALIBRATION_CORPUS_FREEZE_COMMIT = "8344f0cd987c544d7647386e726a3f07579b5bfa";
export const G4_V3_CALIBRATION_CORPUS_DIGEST = "sha256:098ee9e838d3027aa02cfc97bcc83f028919f993e8f0285d6f1e1a9d9e94b59a";
export const G4_V3_CALIBRATION_MODEL_ID = "gpt-5.1-2025-11-13";
export const G4_V3_CALIBRATION_TRIAL_COUNT = 225;
export const G4_V3_CALIBRATION_INITIAL_COMPLIANCE_REQUIRED = 203;
export const G4_V3_CALIBRATION_FIFTY_EPISODE_MINIMUM = 0.8;
export const G4_V3_CALIBRATION_PASS_A_PROMPT_HASH = "sha256:dbf454d80c0557bd983bcbf6969e09cea576b54fe1afd06d293111106e231ee0";
export const G4_V3_CALIBRATION_RECORD_RETRY_PROMPT_HASH = "sha256:ee179189fec4bd5b97fd3cfd1e9020f481c5b4008c4fe0c3cbd2cb50609d3008";

export const G4_V3_CALIBRATION_RUNNER_POLICY = Object.freeze({
  provider: "openai",
  modelId: G4_V3_CALIBRATION_MODEL_ID,
  temperature: 0,
  topP: 1,
  reasoningEffort: "none",
  retryLimit: 2,
  retryDelayMs: 2000,
  trialCount: G4_V3_CALIBRATION_TRIAL_COUNT,
  executeMechanicalFailuresThroughFullFrozenSample: true,
  passBCallsAllowed: false,
  passCCallsAllowed: false,
  genomeExposureAllowed: false,
  semanticQualityScoringAllowed: false,
});

function absolute(path) { return resolve(ROOT, path); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function pad(value, width = 3) { return String(value).padStart(width, "0"); }
function now() { return new Date().toISOString(); }
function fail(message) { throw new Error(message); }
function writeJson(path, value) {
  const target = absolute(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

function verifyDigestEnvelope(candidate, name) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) fail(`${name} must be an object`);
  const { resultDigest, ...core } = candidate;
  if (typeof resultDigest !== "string" || resultDigest !== digest(core)) fail(`${name} digest mismatch`);
  return candidate;
}

function gitShowFrozenCorpus() {
  try {
    return execFileSync(
      "git",
      ["show", `${G4_V3_CALIBRATION_CORPUS_FREEZE_COMMIT}:${CORPUS_PATH}`],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
  } catch (error) {
    fail(`cannot read corpus from frozen commit ${G4_V3_CALIBRATION_CORPUS_FREEZE_COMMIT}: ${error.message}`);
  }
}

function assertFrozenCorpusCommitIsAncestor() {
  try {
    execFileSync(
      "git",
      ["merge-base", "--is-ancestor", G4_V3_CALIBRATION_CORPUS_FREEZE_COMMIT, "HEAD"],
      { cwd: ROOT, stdio: "ignore" },
    );
  } catch {
    fail(`HEAD does not descend from frozen calibration corpus commit ${G4_V3_CALIBRATION_CORPUS_FREEZE_COMMIT}`);
  }
}

function verifyFrozenCorpus() {
  assertFrozenCorpusCommitIsAncestor();
  const workingBytes = readFileSync(absolute(CORPUS_PATH), "utf8");
  const frozenBytes = gitShowFrozenCorpus();
  if (workingBytes !== frozenBytes) fail("working calibration corpus differs byte-for-byte from the frozen corpus commit");
  const corpus = JSON.parse(workingBytes);
  if (corpus.corpusDigest !== G4_V3_CALIBRATION_CORPUS_DIGEST) fail("calibration corpus digest does not match runner pin");
  const { corpusDigest, ...core } = corpus;
  if (digest(core) !== corpusDigest) fail("calibration corpus self-digest is invalid");
  verifyCalibrationInputCorpus(corpus);
  if (!Array.isArray(corpus.trials) || corpus.trials.length !== G4_V3_CALIBRATION_TRIAL_COUNT) {
    fail(`calibration corpus must contain exactly ${G4_V3_CALIBRATION_TRIAL_COUNT} trials`);
  }
  for (let index = 0; index < corpus.trials.length; index += 1) {
    const trial = corpus.trials[index];
    const expectedOrdinal = index + 1;
    if (trial.trialOrdinal !== expectedOrdinal) fail(`calibration trial order diverges at ordinal ${expectedOrdinal}`);
    if (trial.passAInputDigest !== digest(trial.passAInput)) fail(`trial ${trial.trialId} Pass-A input digest mismatch`);
  }
  return corpus;
}

function verifyFrozenAuthority() {
  const calibration = readJson(CALIBRATION_PROTOCOL_PATH);
  const execution = readJson(EXECUTION_FREEZE_PATH);
  const implementation = readJson(IMPLEMENTATION_WITNESS_PATH);

  if (calibration.sample?.trialCount !== G4_V3_CALIBRATION_TRIAL_COUNT) fail("calibration protocol trial count drift");
  if (calibration.runtime?.provider !== "openai" || calibration.runtime?.modelId !== G4_V3_CALIBRATION_MODEL_ID) {
    fail("calibration provider/model drift");
  }
  if (calibration.acceptance?.mechanicallyAdmittedRecordsRequired !== G4_V3_CALIBRATION_TRIAL_COUNT) fail("mechanical admission threshold drift");
  if (calibration.acceptance?.initialDraftsWithinAuthoritative1200ByteLimitRequired !== G4_V3_CALIBRATION_INITIAL_COMPLIANCE_REQUIRED) fail("initial byte-compliance threshold drift");
  if (calibration.acceptance?.estimatedFiftyEpisodeCompletionMinimum !== G4_V3_CALIBRATION_FIFTY_EPISODE_MINIMUM) fail("fifty-episode threshold drift");

  if (execution.frozenCorpusCommit !== G4_V3_CALIBRATION_CORPUS_FREEZE_COMMIT) fail("execution freeze corpus commit drift");
  if (execution.frozenCorpusDigest !== G4_V3_CALIBRATION_CORPUS_DIGEST) fail("execution freeze corpus digest drift");
  if (execution.execution?.trialCount !== G4_V3_CALIBRATION_TRIAL_COUNT || execution.execution?.continueAfterTerminalMechanicalFailure !== true) {
    fail("execution freeze sample-completion semantics drift");
  }
  if (execution.interruption?.automaticResumeAllowedWhenInterruptedTrialSuccessfulModelResponses !== 0) {
    fail("execution freeze interruption-resume semantics drift");
  }

  if (implementation.status !== "CLEAR") fail("G4-v3 implementation witness is not CLEAR");
  if (implementation.policy?.version !== GENESIS_PASS_A_RELIABILITY_POLICY_V3.version) fail("G4-v3 implementation policy version drift");
  if (implementation.promptHashes?.g4v3PassA !== G4_V3_CALIBRATION_PASS_A_PROMPT_HASH) fail("implementation witness Pass-A prompt hash drift");
  if (implementation.promptHashes?.g4v3RecordRetry !== G4_V3_CALIBRATION_RECORD_RETRY_PROMPT_HASH) fail("implementation witness record-retry prompt hash drift");
  if (richPassAV3PromptHash() !== G4_V3_CALIBRATION_PASS_A_PROMPT_HASH) fail("live G4-v3 Pass-A prompt drift");
  if (richPassAV3RecordRetryPromptHash() !== G4_V3_CALIBRATION_RECORD_RETRY_PROMPT_HASH) fail("live G4-v3 record-retry prompt drift");

  const policy = GENESIS_PASS_A_RELIABILITY_POLICY_V3;
  if (policy.maxFormRepairsPerRecord !== 2 || policy.maxRecordRetriesPerRecord !== 2 || policy.maxTotalGeneratedVersionsPerRecord !== 5) {
    fail("live G4-v3 repair budget drift");
  }
  if (policy.authoritativeObservableActionMaxUtf8Bytes !== 1200 || policy.initialDraftTargetUtf8Bytes !== 800 || policy.initialDraftTargetWords !== 100) {
    fail("live G4-v3 form-control drift");
  }

  return { calibration, execution, implementation };
}

function startAuthority() {
  return {
    runnerVersion: G4_V3_CALIBRATION_RUNNER_VERSION,
    frozenCorpusCommit: G4_V3_CALIBRATION_CORPUS_FREEZE_COMMIT,
    frozenCorpusDigest: G4_V3_CALIBRATION_CORPUS_DIGEST,
    corpusPath: CORPUS_PATH,
    calibrationProtocolPath: CALIBRATION_PROTOCOL_PATH,
    executionFreezePath: EXECUTION_FREEZE_PATH,
    implementationWitnessPath: IMPLEMENTATION_WITNESS_PATH,
    generationPolicyVersion: GENESIS_PASS_A_RELIABILITY_POLICY_V3.version,
    passAPromptHash: G4_V3_CALIBRATION_PASS_A_PROMPT_HASH,
    recordRetryPromptHash: G4_V3_CALIBRATION_RECORD_RETRY_PROMPT_HASH,
    runtime: structuredClone(G4_V3_CALIBRATION_RUNNER_POLICY),
  };
}

function trialResultPath(ordinal) {
  return `${OUTPUT_ROOT}/trial-${pad(ordinal)}-result-v1.json`;
}

function completedTrialResults(corpus) {
  if (!existsSync(absolute(OUTPUT_ROOT))) return [];
  const names = readdirSync(absolute(OUTPUT_ROOT));
  const resultOrdinals = names
    .map((name) => /^trial-(\d{3})-result-v1\.json$/.exec(name))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b);
  const results = [];
  for (let index = 0; index < resultOrdinals.length; index += 1) {
    const ordinal = resultOrdinals[index];
    if (ordinal !== index + 1) fail(`calibration completed-trial evidence is non-contiguous at ${ordinal}`);
    const candidate = verifyDigestEnvelope(readJson(trialResultPath(ordinal)), `trial ${ordinal} result`);
    const frozenTrial = corpus.trials[ordinal - 1];
    if (candidate.trialOrdinal !== ordinal || candidate.trialId !== frozenTrial.trialId) fail(`trial ${ordinal} result identity mismatch`);
    if (candidate.passAInputDigest !== frozenTrial.passAInputDigest) fail(`trial ${ordinal} result input digest mismatch`);
    if (candidate.corpusDigest !== G4_V3_CALIBRATION_CORPUS_DIGEST) fail(`trial ${ordinal} result corpus digest mismatch`);
    if (!["ADMITTED", "MECHANICAL_FAILURE"].includes(candidate.status)) fail(`trial ${ordinal} has invalid terminal mechanical status`);
    results.push(candidate);
  }
  return results;
}

function interruptionRecords() {
  if (!existsSync(absolute(OUTPUT_ROOT))) return [];
  return readdirSync(absolute(OUTPUT_ROOT))
    .map((name) => /^calibration-interruption-(\d{2})-v1\.json$/.exec(name))
    .filter(Boolean)
    .map((match) => ({ ordinal: Number(match[1]), path: `${OUTPUT_ROOT}/calibration-interruption-${match[1]}-v1.json` }))
    .sort((a, b) => a.ordinal - b.ordinal)
    .map(({ path }) => verifyDigestEnvelope(readJson(path), path));
}

function latestRelevantInterruption(nextTrialOrdinal) {
  const interruptions = interruptionRecords();
  for (const interruption of interruptions) {
    if (interruption.trialOrdinal > nextTrialOrdinal) fail("interruption evidence refers to a future trial relative to completed evidence");
  }
  const matches = interruptions.filter((item) => item.trialOrdinal === nextTrialOrdinal);
  return matches.at(-1) ?? null;
}

function verifyAttemptStart() {
  if (!existsSync(absolute(START_PATH))) fail("calibration output root exists without calibration-attempt-start-v1.json");
  const start = readJson(START_PATH);
  if (start.evidenceVersion !== "pr39-g4-v3-calibration-attempt-start-v1") fail("calibration attempt-start version mismatch");
  if (canonicalJson(start.authority) !== canonicalJson(startAuthority())) fail("calibration attempt-start authority differs from frozen runner authority");
  return start;
}

export function initialDraftMechanicalMetric(modelEvents, clientRequestId) {
  const initial = modelEvents.find((event) =>
    event?.type === "model_response" && event.clientRequestId === `${clientRequestId}:initial`);
  const action = initial?.modelOutput?.episode?.observableAction;
  const utf8Bytes = typeof action === "string" ? Buffer.byteLength(action, "utf8") : null;
  return Object.freeze({
    observableActionUtf8Bytes: utf8Bytes,
    withinAuthoritative1200ByteLimit: utf8Bytes !== null && utf8Bytes <= 1200,
  });
}

function gateSequenceFromCalls(calls) {
  if (!Array.isArray(calls)) return [];
  return calls
    .filter((call) => call?.kind === "record_repair" || call?.kind === "record_retry")
    .map((call) => call.failedGate)
    .filter((gate) => typeof gate === "string");
}

function gateCensus(sequence) {
  const counts = {};
  for (const gate of sequence) counts[gate] = (counts[gate] ?? 0) + 1;
  return counts;
}

function tokenUsage(modelEvents) {
  const responses = modelEvents.filter((event) => event?.type === "model_response");
  return responses.reduce((sum, event) => ({
    inputTokens: sum.inputTokens + Number(event.usage?.inputTokens ?? 0),
    outputTokens: sum.outputTokens + Number(event.usage?.outputTokens ?? 0),
    totalTokens: sum.totalTokens + Number(event.usage?.totalTokens ?? 0),
  }), { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
}

function successfulTrialCore({ trial, result, modelEvents, startedAt, completedAt }) {
  const initialDraft = initialDraftMechanicalMetric(modelEvents, trial.trialId);
  const failedGateSequence = gateSequenceFromCalls(result.calls);
  return {
    evidenceVersion: "pr39-g4-v3-calibration-trial-result-v1",
    status: "ADMITTED",
    trialOrdinal: trial.trialOrdinal,
    trialId: trial.trialId,
    corpusDigest: G4_V3_CALIBRATION_CORPUS_DIGEST,
    passAInputDigest: trial.passAInputDigest,
    cognitionInputDigest: trial.cognitionInputDigest,
    startedAt,
    completedAt,
    generationPolicyVersion: result.generationPolicyVersion ?? null,
    mechanical: {
      admitted: true,
      terminalGate: null,
      initialDraft,
      generatedVersionCount: result.calls.length,
      formRepairCount: result.repairs.length,
      recordRetryCount: result.recordRetries.length,
      failedGateSequence,
      failedGateCensus: gateCensus(failedGateSequence),
    },
    calls: structuredClone(result.calls),
    repairs: structuredClone(result.repairs),
    recordRetries: structuredClone(result.recordRetries),
    episodeDigest: result.episodeDigest,
    modelEvents: structuredClone(modelEvents),
    tokenUsage: tokenUsage(modelEvents),
  };
}

function failedTrialCore({ trial, error, modelEvents, startedAt, completedAt }) {
  const evidence = serializeGenesisFailureEvidence(error);
  const initialDraft = initialDraftMechanicalMetric(modelEvents, trial.trialId);
  const failedGateSequence = gateSequenceFromCalls(evidence.calls);
  if (typeof evidence.cause?.gate === "string" && failedGateSequence.at(-1) !== evidence.cause.gate) {
    failedGateSequence.push(evidence.cause.gate);
  }
  return {
    evidenceVersion: "pr39-g4-v3-calibration-trial-result-v1",
    status: "MECHANICAL_FAILURE",
    trialOrdinal: trial.trialOrdinal,
    trialId: trial.trialId,
    corpusDigest: G4_V3_CALIBRATION_CORPUS_DIGEST,
    passAInputDigest: trial.passAInputDigest,
    cognitionInputDigest: trial.cognitionInputDigest,
    startedAt,
    completedAt,
    generationPolicyVersion: evidence.generationPolicyVersion ?? GENESIS_PASS_A_RELIABILITY_POLICY_V3.version,
    mechanical: {
      admitted: false,
      terminalGate: error.gate ?? null,
      causeGate: evidence.cause?.gate ?? null,
      initialDraft,
      generatedVersionCount: Array.isArray(evidence.calls) ? evidence.calls.length : modelEvents.filter((event) => event?.type === "model_response").length,
      formRepairCount: Array.isArray(evidence.repairs) ? evidence.repairs.length : 0,
      recordRetryCount: Array.isArray(evidence.recordRetries) ? evidence.recordRetries.length : 0,
      failedGateSequence,
      failedGateCensus: gateCensus(failedGateSequence),
      budgetExhaustion: evidence.budgetExhaustion ?? null,
      budgetState: evidence.budgetState ?? null,
    },
    failureEvidence: evidence,
    modelEvents: structuredClone(modelEvents),
    tokenUsage: tokenUsage(modelEvents),
  };
}

function withResultDigest(core) {
  return { ...core, resultDigest: digest(core) };
}

export function evaluateCalibrationResults(results) {
  if (!Array.isArray(results) || results.length !== G4_V3_CALIBRATION_TRIAL_COUNT) {
    throw new TypeError(`calibration evaluation requires exactly ${G4_V3_CALIBRATION_TRIAL_COUNT} terminal trial results`);
  }
  const admitted = results.filter((result) => result.status === "ADMITTED").length;
  const terminalMechanicalFailures = results.length - admitted;
  const terminalMechanicalExhaustions = results.filter((result) => result.mechanical?.terminalGate === "record_repair_exhausted").length;
  const initialWithin1200 = results.filter((result) => result.mechanical?.initialDraft?.withinAuthoritative1200ByteLimit === true).length;
  const initialComplianceFraction = initialWithin1200 / G4_V3_CALIBRATION_TRIAL_COUNT;
  const laplaceEpisodeSurvivalEstimate = (admitted + 1) / (G4_V3_CALIBRATION_TRIAL_COUNT + 2);
  const estimatedFiftyEpisodeCompletion = laplaceEpisodeSurvivalEstimate ** 50;
  const checks = {
    mechanicallyAdmittedRecords: admitted === G4_V3_CALIBRATION_TRIAL_COUNT,
    terminalMechanicalExhaustions: terminalMechanicalExhaustions === 0,
    initialDraftCompliance: initialWithin1200 >= G4_V3_CALIBRATION_INITIAL_COMPLIANCE_REQUIRED && initialComplianceFraction >= 0.9,
    estimatedFiftyEpisodeCompletion: estimatedFiftyEpisodeCompletion >= G4_V3_CALIBRATION_FIFTY_EPISODE_MINIMUM,
  };
  return Object.freeze({
    admitted,
    terminalMechanicalFailures,
    terminalMechanicalExhaustions,
    initialWithin1200,
    initialComplianceFraction,
    laplaceEpisodeSurvivalEstimate,
    estimatedFiftyEpisodeCompletion,
    checks,
    allPassed: Object.values(checks).every(Boolean),
  });
}

function aggregateGateCensus(results) {
  const counts = {};
  for (const result of results) {
    for (const [gate, count] of Object.entries(result.mechanical?.failedGateCensus ?? {})) {
      counts[gate] = (counts[gate] ?? 0) + Number(count);
    }
  }
  return counts;
}

function aggregateUsage(results) {
  return results.reduce((sum, result) => ({
    inputTokens: sum.inputTokens + Number(result.tokenUsage?.inputTokens ?? 0),
    outputTokens: sum.outputTokens + Number(result.tokenUsage?.outputTokens ?? 0),
    totalTokens: sum.totalTokens + Number(result.tokenUsage?.totalTokens ?? 0),
  }), { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
}

function finalResult(results, startedAt) {
  const evaluation = evaluateCalibrationResults(results);
  const core = {
    evidenceVersion: "pr39-g4-v3-off-cohort-calibration-result-v1",
    status: evaluation.allPassed ? "CLEAR_MECHANICAL_CALIBRATION" : "HOLD_G4_V3_PRE_LIFE_CALIBRATION",
    startedAt,
    completedAt: now(),
    runnerVersion: G4_V3_CALIBRATION_RUNNER_VERSION,
    frozenCorpusCommit: G4_V3_CALIBRATION_CORPUS_FREEZE_COMMIT,
    frozenCorpusDigest: G4_V3_CALIBRATION_CORPUS_DIGEST,
    runtime: structuredClone(G4_V3_CALIBRATION_RUNNER_POLICY),
    trialCount: results.length,
    evaluation,
    failedGateCensus: aggregateGateCensus(results),
    tokenUsage: aggregateUsage(results),
    trialResultDigests: results.map((result) => ({
      trialOrdinal: result.trialOrdinal,
      trialId: result.trialId,
      resultDigest: result.resultDigest,
    })),
    semanticQualityScoringPerformed: false,
    passBCallsMade: 0,
    passCCallsMade: 0,
    genomeExposurePerformed: false,
    replacementCohortCognitionAuthorized: false,
    nextStep: evaluation.allPassed
      ? "FREEZE_FRESH_REPLACEMENT_MATERIAL_AND_REQUEST_GATE_G_2"
      : "HOLD_G4_V3_PRE_LIFE_CALIBRATION",
  };
  return withResultDigest(core);
}

function preflightState(corpus) {
  const rootExists = existsSync(absolute(OUTPUT_ROOT));
  if (!rootExists) {
    return {
      status: "READY_FIRST_EXECUTION",
      completedTrials: 0,
      nextTrialOrdinal: 1,
      automaticResumeAllowed: true,
      finalExists: false,
    };
  }
  const start = verifyAttemptStart();
  const results = completedTrialResults(corpus);
  const finalExists = existsSync(absolute(FINAL_PATH));
  if (finalExists) {
    const final = verifyDigestEnvelope(readJson(FINAL_PATH), "calibration final result");
    if (results.length !== G4_V3_CALIBRATION_TRIAL_COUNT) fail("final calibration result exists before all 225 terminal trial results");
    return {
      status: "FINAL_RESULT_EXISTS_EXECUTION_BLOCKED",
      completedTrials: results.length,
      nextTrialOrdinal: null,
      automaticResumeAllowed: false,
      finalExists: true,
      finalStatus: final.status,
      startedAt: start.startedAt,
    };
  }
  if (results.length >= G4_V3_CALIBRATION_TRIAL_COUNT) {
    fail("all calibration trials exist without final result; manual integrity review required");
  }
  const nextTrialOrdinal = results.length + 1;
  const interruption = latestRelevantInterruption(nextTrialOrdinal);
  if (interruption !== null && interruption.successfulModelResponses > 0) {
    return {
      status: "PARTIAL_TRIAL_INTERRUPTION_REVIEW_REQUIRED",
      completedTrials: results.length,
      nextTrialOrdinal,
      automaticResumeAllowed: false,
      finalExists: false,
      interruptedTrialId: interruption.trialId,
      successfulModelResponses: interruption.successfulModelResponses,
      startedAt: start.startedAt,
    };
  }
  return {
    status: "READY_EXACT_RESUME",
    completedTrials: results.length,
    nextTrialOrdinal,
    automaticResumeAllowed: true,
    finalExists: false,
    startedAt: start.startedAt,
  };
}

export function calibrationPreflight() {
  verifyFrozenAuthority();
  const corpus = verifyFrozenCorpus();
  const state = preflightState(corpus);
  return Object.freeze({ corpus, state });
}

function printPreflight({ state }) {
  console.log("G4-V3 OFF-COHORT CALIBRATION PREFLIGHT: CLEAR");
  console.log("");
  console.log(`Frozen corpus commit: ${G4_V3_CALIBRATION_CORPUS_FREEZE_COMMIT}`);
  console.log(`Corpus: ${G4_V3_CALIBRATION_CORPUS_DIGEST}`);
  console.log(`Trials: ${G4_V3_CALIBRATION_TRIAL_COUNT}`);
  console.log(`Runtime: openai/${G4_V3_CALIBRATION_MODEL_ID}`);
  console.log("Budgets: initial=1 form=2 record=2 total=5");
  console.log(`Output root: ${OUTPUT_ROOT} [${state.status}]`);
  console.log(`Completed trials: ${state.completedTrials}`);
  if (state.nextTrialOrdinal !== null) console.log(`Next frozen trial: ${pad(state.nextTrialOrdinal)}`);
  if (state.status === "PARTIAL_TRIAL_INTERRUPTION_REVIEW_REQUIRED") {
    console.log(`Automatic resume refused: interrupted trial already has ${state.successfulModelResponses} successful model response(s).`);
  }
  console.log("No provider call was made.");
}

function createStartArtifact() {
  const core = {
    evidenceVersion: "pr39-g4-v3-calibration-attempt-start-v1",
    startedAt: now(),
    authority: startAuthority(),
    trialOrder: "ascending frozen trialOrdinal 1..225",
    providerCallsMadeBeforeArtifact: 0,
  };
  writeJson(START_PATH, core);
  return core;
}

function nextInterruptionPath() {
  const existing = interruptionRecords();
  return `${OUTPUT_ROOT}/calibration-interruption-${String(existing.length + 1).padStart(2, "0")}-v1.json`;
}

function writeInterruption({ trial, error, modelEvents }) {
  const successfulModelResponses = modelEvents.filter((event) => event?.type === "model_response").length;
  const core = {
    evidenceVersion: "pr39-g4-v3-calibration-interruption-v1",
    status: "CALIBRATION_OPERATIONAL_INTERRUPTION",
    interruptedAt: now(),
    trialOrdinal: trial.trialOrdinal,
    trialId: trial.trialId,
    corpusDigest: G4_V3_CALIBRATION_CORPUS_DIGEST,
    passAInputDigest: trial.passAInputDigest,
    successfulModelResponses,
    automaticResumeAllowed: successfulModelResponses === 0,
    reason: successfulModelResponses === 0
      ? "Exact frozen trial may be retried because no successful generated version was observed."
      : "Automatic replay refused because at least one successful generated version exists for this unfinished trial.",
    error: {
      name: error?.name ?? "Error",
      message: error?.message ?? String(error),
      code: error?.code ?? null,
      retryable: error?.retryable ?? null,
      httpStatus: error?.httpStatus ?? null,
      providerErrorCode: error?.providerErrorCode ?? null,
      providerErrorType: error?.providerErrorType ?? null,
      actionHint: error?.actionHint ?? null,
    },
    modelEvents: structuredClone(modelEvents),
    tokenUsage: tokenUsage(modelEvents),
  };
  writeJson(nextInterruptionPath(), withResultDigest(core));
}

async function executeCalibration() {
  const { corpus, state } = calibrationPreflight();
  if (state.status === "FINAL_RESULT_EXISTS_EXECUTION_BLOCKED") fail("calibration already has a final result; execution is permanently blocked");
  if (state.status === "PARTIAL_TRIAL_INTERRUPTION_REVIEW_REQUIRED") {
    fail("automatic calibration resume is blocked because the unfinished trial already has successful generated evidence");
  }

  let start;
  if (state.status === "READY_FIRST_EXECUTION") {
    start = createStartArtifact();
  } else {
    start = verifyAttemptStart();
  }

  const completed = completedTrialResults(corpus);
  const adapterEvents = [];
  const adapter = createOpenAIModelAdapter({
    modelId: G4_V3_CALIBRATION_MODEL_ID,
    observer: (event) => adapterEvents.push(event),
    temperature: 0,
    topP: 1,
    reasoningEffort: "none",
    retryLimit: 2,
    retryDelayMs: 2000,
  });

  console.log("G4-V3 OFF-COHORT CALIBRATION: START");
  console.log(`Frozen corpus: ${G4_V3_CALIBRATION_CORPUS_DIGEST}`);
  console.log(`Starting at trial ${completed.length + 1}/${G4_V3_CALIBRATION_TRIAL_COUNT}`);

  for (let index = completed.length; index < corpus.trials.length; index += 1) {
    const trial = corpus.trials[index];
    const modelEvents = [];
    const startedAt = now();
    console.log(`[${pad(trial.trialOrdinal)}/${G4_V3_CALIBRATION_TRIAL_COUNT}] ${trial.trialId} START`);
    const before = adapterEvents.length;
    try {
      const result = await generateRichPassAEpisode({
        adapter,
        repairAdapter: adapter,
        input: trial.passAInput,
        clientRequestId: trial.trialId,
        generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
      });
      modelEvents.push(...adapterEvents.slice(before));
      const terminal = withResultDigest(successfulTrialCore({
        trial,
        result,
        modelEvents,
        startedAt,
        completedAt: now(),
      }));
      writeJson(trialResultPath(trial.trialOrdinal), terminal);
      completed.push(terminal);
      console.log(`[${pad(trial.trialOrdinal)}/${G4_V3_CALIBRATION_TRIAL_COUNT}] ADMITTED versions=${terminal.mechanical.generatedVersionCount} form=${terminal.mechanical.formRepairCount} record=${terminal.mechanical.recordRetryCount} initialBytes=${terminal.mechanical.initialDraft.observableActionUtf8Bytes ?? "n/a"}`);
    } catch (error) {
      modelEvents.push(...adapterEvents.slice(before));
      if (error instanceof GenesisPassAValidationError) {
        const terminal = withResultDigest(failedTrialCore({
          trial,
          error,
          modelEvents,
          startedAt,
          completedAt: now(),
        }));
        writeJson(trialResultPath(trial.trialOrdinal), terminal);
        completed.push(terminal);
        console.log(`[${pad(trial.trialOrdinal)}/${G4_V3_CALIBRATION_TRIAL_COUNT}] MECHANICAL_FAILURE gate=${terminal.mechanical.terminalGate ?? "unknown"} versions=${terminal.mechanical.generatedVersionCount}`);
        continue;
      }
      writeInterruption({ trial, error, modelEvents });
      console.error(`[${pad(trial.trialOrdinal)}/${G4_V3_CALIBRATION_TRIAL_COUNT}] OPERATIONAL_INTERRUPTION: ${error?.message ?? String(error)}`);
      throw error;
    }
  }

  if (completed.length !== G4_V3_CALIBRATION_TRIAL_COUNT) fail("calibration ended without 225 terminal trial results");
  const final = finalResult(completed, start.startedAt);
  writeJson(FINAL_PATH, final);
  console.log("");
  console.log(`G4-V3 OFF-COHORT CALIBRATION: ${final.status}`);
  console.log(`Admitted: ${final.evaluation.admitted}/${G4_V3_CALIBRATION_TRIAL_COUNT}`);
  console.log(`Mechanical failures: ${final.evaluation.terminalMechanicalFailures}`);
  console.log(`Initial <=1200 bytes: ${final.evaluation.initialWithin1200}/${G4_V3_CALIBRATION_TRIAL_COUNT}`);
  console.log(`Laplace episode survival: ${final.evaluation.laplaceEpisodeSurvivalEstimate}`);
  console.log(`Estimated 50-episode completion: ${final.evaluation.estimatedFiftyEpisodeCompletion}`);
  console.log(`Result: ${FINAL_PATH}`);
  console.log("Replacement-cohort cognition remains unauthorized; Gate-G(2) is still required.");
}

function parseMode(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || (args.length === 1 && args[0] === "--preflight")) return "preflight";
  if (args.length === 1 && args[0] === "--execute") return "execute";
  throw new Error("usage: genesis-g4-v3-calibration-runner.mjs [--preflight|--execute]");
}

async function main() {
  const mode = parseMode(process.argv);
  if (mode === "preflight") {
    printPreflight(calibrationPreflight());
    return;
  }
  await executeCalibration();
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error?.stack ?? error?.message ?? String(error));
    process.exitCode = 1;
  });
}

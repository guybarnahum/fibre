#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { BIRTH_CENTER_RUNTIME_VERSION } from "../../services/birth-center/src/runtime.mjs";
import { DURABLE_MODEL_INVOCATION_JOURNAL_VERSION } from "../../services/world-kernel/src/model-runtime/durable-invocation-journal.mjs";
import { GENESIS_PASS_A_RELIABILITY_V3_VERSION } from "../../services/world-kernel/src/genesis-pass-a-reliability-v3.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const BINDING_PATH = "artifacts/validation/m2-pr39/h/recovery/h-v2-recovery-binding-v1.json";
const CALIBRATION_RESULT_PATH = "artifacts/validation/m2-pr39/g/calibration/g4-v3-off-cohort-v1/calibration-result-v1.json";
const DURABILITY_WITNESS_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-v3-durable-development-verification-v1.json";

function absolute(path) {
  return resolve(ROOT, path);
}

function readJson(path) {
  return JSON.parse(readFileSync(absolute(path), "utf8"));
}

function fail(message) {
  throw new Error(message);
}

function currentBlob(path) {
  try {
    return execFileSync("git", ["rev-parse", `HEAD:${path}`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    fail(`cannot resolve frozen recovery source ${path}: ${error.stderr?.toString?.() ?? error.message}`);
  }
}

function verifyCompletedThreadArtifacts(binding, failure) {
  const failureCompleted = new Map(
    failure.completedThreadGenerations.map((item) => [item.slot, item.threadId]),
  );
  if (failureCompleted.size !== binding.preservedDevelopment.completedThreads.length) {
    fail("H-v2 completed Thread count disagrees with recovery binding");
  }

  return binding.preservedDevelopment.completedThreads.map((expected) => {
    if (failureCompleted.get(expected.slot) !== expected.threadId) {
      fail(`H-v2 completed Thread slot ${expected.slot} identity drift`);
    }
    if (currentBlob(expected.artifactPath) !== expected.artifactBlobSha) {
      fail(`H-v2 completed Thread slot ${expected.slot} artifact blob drift`);
    }
    const artifact = readJson(expected.artifactPath);
    if (artifact.slot !== expected.slot || artifact.binding?.threadId !== expected.threadId) {
      fail(`H-v2 completed Thread slot ${expected.slot} artifact identity mismatch`);
    }
    return Object.freeze({
      slot: expected.slot,
      threadId: expected.threadId,
      artifactPath: expected.artifactPath,
      artifactBlobSha: expected.artifactBlobSha,
    });
  });
}

function verifyPartialSlot(binding, failure) {
  const partial = binding.preservedDevelopment.partialSlot;
  const responses = failure.modelEvents.filter((event) =>
    event?.type === "model_response" &&
    typeof event.clientRequestId === "string" &&
    event.clientRequestId.startsWith(`pr39-h:slot-${String(partial.slot).padStart(2, "0")}:`));
  const observedIds = responses.map((event) => event.clientRequestId);
  const required = partial.requiredSuccessfulResponseRequestIds;
  if (JSON.stringify(observedIds) !== JSON.stringify(required)) {
    fail(`H-v2 slot ${partial.slot} successful response trail drift`);
  }
  for (const event of responses) {
    if (event.modelOutput === undefined || event.providerRequestId === undefined) {
      fail(`H-v2 slot ${partial.slot} response ${event.clientRequestId} lacks replayable model evidence`);
    }
  }
  return Object.freeze({
    slot: partial.slot,
    threadId: partial.threadId,
    acceptedEpisodeCountBeforeFailure: partial.acceptedEpisodeCountBeforeFailure,
    replayableSuccessfulResponses: responses.length,
    requestIds: Object.freeze([...observedIds]),
  });
}

function verifyUnstartedSlot(binding, failure) {
  const unstarted = binding.preservedDevelopment.unstartedSlot;
  const prefix = `pr39-h:slot-${String(unstarted.slot).padStart(2, "0")}:`;
  const attempts = failure.modelEvents.filter((event) =>
    event?.type === "model_attempt" &&
    typeof event.clientRequestId === "string" &&
    event.clientRequestId.startsWith(prefix));
  if (attempts.length !== unstarted.requiredObservedModelAttempts) {
    fail(`H-v2 slot ${unstarted.slot} is not actually unstarted`);
  }
  return Object.freeze({ slot: unstarted.slot, threadId: unstarted.threadId, observedModelAttempts: attempts.length });
}

export function verifyH2RecoveryPreflight() {
  const binding = readJson(BINDING_PATH);
  if (binding.recoveryVersion !== "pr39-h-v2-recovery-continuation-v1") fail("unexpected H-v2 recovery binding version");
  if (binding.status !== "frozen_pre_execution_recovery_boundary") fail("unexpected H-v2 recovery binding status");
  if (binding.authorization?.providerCallsAuthorizedByThisFreeze !== false) fail("recovery binding must authorize zero provider calls");
  if (binding.scientificStanding?.isReplacementCohort !== false || binding.scientificStanding?.mayEnterFrozenG5G6 !== false) {
    fail("H-v2 recovery must remain non-evidentiary for #39");
  }

  if (currentBlob(binding.sourceAttempt.failurePath) !== binding.sourceAttempt.failureBlobSha) {
    fail("frozen H-v2 failure artifact blob drift");
  }
  const failure = readJson(binding.sourceAttempt.failurePath);
  if (failure.status !== binding.sourceAttempt.requiredStatus) fail("frozen H-v2 failure status drift");
  if (failure.error?.gate !== binding.sourceAttempt.requiredFailureGate) fail("frozen H-v2 failure gate drift");

  const completedThreads = verifyCompletedThreadArtifacts(binding, failure);
  const partialSlot = verifyPartialSlot(binding, failure);
  const unstartedSlot = verifyUnstartedSlot(binding, failure);

  const calibration = readJson(CALIBRATION_RESULT_PATH);
  if (calibration.status !== "CLEAR_MECHANICAL_CALIBRATION" || calibration.evaluation?.allPassed !== true) {
    fail("G4-v3 calibration is not CLEAR for recovery machinery");
  }
  const durability = readJson(DURABILITY_WITNESS_PATH);
  if (durability.status !== "CLEAR") fail("Genesis durability verification is not CLEAR");

  if (binding.recoveryMachinery.birthCenterRuntimeVersion !== BIRTH_CENTER_RUNTIME_VERSION) fail("Birth Center runtime version drift");
  if (binding.recoveryMachinery.durableInvocationJournalVersion !== DURABLE_MODEL_INVOCATION_JOURNAL_VERSION) fail("durable invocation journal version drift");
  if (binding.recoveryMachinery.generationPolicyVersion !== GENESIS_PASS_A_RELIABILITY_V3_VERSION) fail("G4-v3 generation policy version drift");
  if (binding.recoveryMachinery.g4V3CalibrationClearFreezeCommit !== "3b401dfb93adc916ed7f3e5e46cade6f36fedbab") fail("calibration freeze commit drift");
  if (binding.recoveryMachinery.durabilityVerifiedHead !== durability.verifiedHead) fail("durability verified-head drift");

  const outputRootExists = existsSync(absolute(binding.output.root));
  if (binding.output.mustBeAbsentBeforeExecution && outputRootExists) {
    fail(`H-v2 recovery output root already exists: ${binding.output.root}`);
  }

  return Object.freeze({
    status: "CLEAR_RECOVERY_SOURCE_ACCOUNTING_ONLY",
    recoveryVersion: binding.recoveryVersion,
    sourceAttempt: Object.freeze({
      status: failure.status,
      failureGate: failure.error.gate,
      failurePath: binding.sourceAttempt.failurePath,
      failureBlobSha: binding.sourceAttempt.failureBlobSha,
    }),
    completedThreads: Object.freeze(completedThreads),
    partialSlot,
    unstartedSlot,
    recoveryMachinery: Object.freeze({
      birthCenterRuntimeVersion: BIRTH_CENTER_RUNTIME_VERSION,
      durableInvocationJournalVersion: DURABLE_MODEL_INVOCATION_JOURNAL_VERSION,
      generationPolicyVersion: GENESIS_PASS_A_RELIABILITY_V3_VERSION,
      calibrationStatus: calibration.status,
      durabilityStatus: durability.status,
    }),
    outputRoot: binding.output.root,
    outputRootExists,
    scientificStanding: Object.freeze({ ...binding.scientificStanding }),
    providerCallsAuthorized: false,
  });
}

export function parseH2RecoveryMode(argv = process.argv.slice(2)) {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "--preflight")) return "preflight";
  if (argv.length === 1 && argv[0] === "--execute") {
    throw new Error("H-v2 recovery execution is not yet reviewed/authorized; preflight only");
  }
  throw new Error("usage: genesis-h2-recovery.mjs [--preflight]");
}

function printPreflight(result) {
  process.stdout.write("H-V2 RECOVERY PREFLIGHT: CLEAR SOURCE ACCOUNTING\n\n");
  process.stdout.write(`Completed Thread generations preserved: ${result.completedThreads.length}\n`);
  process.stdout.write(`Partial slot ${result.partialSlot.slot}: ${result.partialSlot.acceptedEpisodeCountBeforeFailure} accepted episodes; ${result.partialSlot.replayableSuccessfulResponses} successful model responses preserved\n`);
  process.stdout.write(`Unstarted slot ${result.unstartedSlot.slot}: ${result.unstartedSlot.observedModelAttempts} model attempts\n`);
  process.stdout.write(`Recovery machinery: ${result.recoveryMachinery.birthCenterRuntimeVersion} + ${result.recoveryMachinery.generationPolicyVersion}\n`);
  process.stdout.write(`Output root: ${result.outputRoot} [absent]\n`);
  process.stdout.write("Scientific standing: recovery/resilience only; not the #39 replacement cohort.\n");
  process.stdout.write("\nNo provider call was made or authorized.\n");
}

async function main() {
  parseH2RecoveryMode();
  printPreflight(verifyH2RecoveryPreflight());
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

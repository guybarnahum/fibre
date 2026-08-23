import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createBirthCenterRuntime } from "../../services/birth-center/src/runtime.mjs";
import { createOpenAIModelAdapter } from "../../services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";
import {
  GENESIS_REPLACEMENT_CANDIDATE_VERSION,
  generateReplacementThreadCandidate,
} from "./genesis-replacement-candidate.mjs";
import { verifyReplacementR2ExecutionAuthority } from "./genesis-replacement-execution-authority.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const ATTEMPT_START_FILE = "replacement-attempt-start-v1.json";
const RESULT_FILE = "replacement-candidate-cohort-v1.json";
const FAILURE_FILE = "replacement-candidate-failure-v1.json";

function absolute(path) { return resolve(ROOT, path); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function pad(value) { return String(value).padStart(2, "0"); }
function fail(message) { throw new Error(message); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function writeJsonExclusive(path, value) {
  const target = absolute(path);
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

function candidatePath(outputRoot, slot) {
  return `${outputRoot}/slot-${pad(slot)}-candidate-v1.json`;
}

function verifyStoredCandidate(candidate, slotPlan, attemptStartedAt) {
  if (candidate?.candidateVersion !== GENESIS_REPLACEMENT_CANDIDATE_VERSION) fail(`replacement slot ${slotPlan.slot} candidate version drift`);
  if (candidate.slot !== slotPlan.slot || candidate.threadId !== slotPlan.threadId || candidate.genesisId !== slotPlan.genesisId) {
    fail(`replacement slot ${slotPlan.slot} stored candidate identity drift`);
  }
  if (candidate.attemptStartedAt !== attemptStartedAt) fail(`replacement slot ${slotPlan.slot} stored candidate attempt drift`);
  if (candidate.envelopePlanDigest !== slotPlan.envelopePlan.digest) fail(`replacement slot ${slotPlan.slot} stored envelope drift`);
  const { candidateDigest, ...core } = candidate;
  if (candidateDigest !== digest(core)) fail(`replacement slot ${slotPlan.slot} candidate digest mismatch`);
  return candidate;
}

function modelRuntimeOptions(runtime) {
  if (runtime.provider !== "openai") fail("replacement R2 runtime provider must remain openai");
  if (runtime.maxOutputTokens !== "auto") fail("replacement R2 runtime supports only frozen automatic max-output-token policy");
  return {
    modelId: runtime.modelId,
    timeoutMs: runtime.timeoutMs,
    maxOutputTokens: null,
    temperature: runtime.temperature,
    topP: runtime.topP,
    reasoningEffort: runtime.reasoningEffort,
    retryLimit: runtime.operationalRetryLimit,
    retryDelayMs: runtime.operationalRetryDelayMs,
  };
}

function startOrResumeAttempt({ outputRoot, authority, now }) {
  const startPath = `${outputRoot}/${ATTEMPT_START_FILE}`;
  const resultPath = `${outputRoot}/${RESULT_FILE}`;
  const failurePath = `${outputRoot}/${FAILURE_FILE}`;
  if (existsSync(absolute(failurePath))) {
    fail("replacement R2 one-shot attempt is closed by a terminal failure; no regeneration is authorized");
  }
  if (existsSync(absolute(resultPath))) {
    const result = readJson(resultPath);
    if (result.bindingDigest !== authority.bindingDigest || result.status !== "CANDIDATE_COHORT_COMPLETE_PENDING_DIAGNOSTICS") {
      fail("replacement R2 completed result does not match current execution authority");
    }
    return Object.freeze({ completedResult: result, attemptStartedAt: result.attemptStartedAt, startPath, resultPath, failurePath });
  }
  if (existsSync(absolute(startPath))) {
    const start = readJson(startPath);
    if (start.bindingDigest !== authority.bindingDigest || start.reviewCandidateHead !== authority.reviewCandidateHead) {
      fail("replacement R2 in-progress attempt authority drift");
    }
    return Object.freeze({ completedResult: null, attemptStartedAt: start.attemptStartedAt, startPath, resultPath, failurePath });
  }
  const attemptStartedAt = now();
  if (typeof attemptStartedAt !== "string" || !Number.isFinite(Date.parse(attemptStartedAt))) throw new TypeError("replacement runner clock must return an ISO timestamp");
  mkdirSync(absolute(outputRoot), { recursive: true });
  writeJsonExclusive(startPath, {
    version: "pr39-replacement-r2-attempt-start-v1",
    status: "IN_PROGRESS_CANDIDATE_ONLY",
    attemptStartedAt,
    bindingDigest: authority.bindingDigest,
    reviewCandidateHead: authority.reviewCandidateHead,
    wholeCandidateAttemptCap: 1,
    qualityDrivenRegeneration: false,
    publicationAuthorized: false,
  });
  return Object.freeze({ completedResult: null, attemptStartedAt, startPath, resultPath, failurePath });
}

function failureRecord({ error, authority, attemptStartedAt, completedSlots, now }) {
  return {
    version: "pr39-replacement-r2-candidate-failure-v1",
    status: "HOLD_REPLACEMENT_R2_CANDIDATE_ATTEMPT_TERMINAL_NO_REGENERATION",
    failedAt: now(),
    attemptStartedAt,
    bindingDigest: authority.bindingDigest,
    completedSlots: [...completedSlots],
    failure: {
      name: error?.name ?? "Error",
      code: error?.code ?? null,
      gate: error?.gate ?? null,
      message: error?.message ?? String(error),
    },
    providerSubstitutionAuthorized: false,
    modelSubstitutionAuthorized: false,
    regenerationAuthorized: false,
    publicationAuthorized: false,
  };
}

export async function runReplacementCandidateAttempt({
  adapterFactory = createOpenAIModelAdapter,
  environment = process.env,
  now = () => new Date().toISOString(),
  observer = null,
} = {}) {
  // Critical ordering: hostile-review authority is checked before the adapter factory
  // is called, so pre-review code cannot even construct a provider client.
  const authority = verifyReplacementR2ExecutionAuthority({ requireClear: true });
  if (typeof adapterFactory !== "function") throw new TypeError("replacement runner adapterFactory must be a function");
  const runtimeOptions = modelRuntimeOptions(authority.runtime);
  const baseAdapter = adapterFactory({ environment, observer, ...runtimeOptions });

  const outputRoot = authority.outputRoot;
  const attempt = startOrResumeAttempt({ outputRoot, authority, now });
  if (attempt.completedResult !== null) return Object.freeze(structuredClone(attempt.completedResult));

  const birthCenter = createBirthCenterRuntime({ stateRoot: absolute(`${outputRoot}/runtime`) });
  const durableAdapter = birthCenter.durableAdapter(baseAdapter, { observer });
  const completed = [];

  try {
    for (const slotPlan of authority.plans.slots) {
      const path = candidatePath(outputRoot, slotPlan.slot);
      let candidate;
      if (existsSync(absolute(path))) {
        candidate = verifyStoredCandidate(readJson(path), slotPlan, attempt.attemptStartedAt);
      } else {
        candidate = await generateReplacementThreadCandidate({
          slotPlan,
          adapter: durableAdapter,
          repairAdapter: durableAdapter,
          attemptStartedAt: attempt.attemptStartedAt,
        });
        verifyStoredCandidate(candidate, slotPlan, attempt.attemptStartedAt);
        writeJsonExclusive(path, candidate);
      }
      completed.push({
        slot: slotPlan.slot,
        threadId: slotPlan.threadId,
        candidatePath: path,
        candidateDigest: candidate.candidateDigest,
      });
    }

    if (completed.length !== 5) fail("replacement R2 candidate cohort is incomplete");
    const core = {
      version: "pr39-replacement-r2-candidate-cohort-v1",
      status: "CANDIDATE_COHORT_COMPLETE_PENDING_DIAGNOSTICS",
      attemptStartedAt: attempt.attemptStartedAt,
      completedAt: now(),
      bindingDigest: authority.bindingDigest,
      reviewCandidateHead: authority.reviewCandidateHead,
      candidates: completed,
      diagnosticsAuthorizedByGeneration: false,
      publicationAuthorized: false,
      qualityDrivenRegenerationAuthorized: false,
    };
    const result = { ...core, resultDigest: digest(core) };
    writeJsonExclusive(attempt.resultPath, result);
    return Object.freeze(structuredClone(result));
  } catch (error) {
    if (!existsSync(absolute(attempt.failurePath))) {
      writeJsonExclusive(attempt.failurePath, failureRecord({
        error,
        authority,
        attemptStartedAt: attempt.attemptStartedAt,
        completedSlots: completed.map((item) => item.slot),
        now,
      }));
    }
    throw error;
  }
}

// Deliberately no CLI entry point. A reviewed CLEAR witness must exist before any
// caller can reach adapter construction; an executable command is added only after R2 review.

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
const ATTEMPT_GUARD_FILE = "replacement-r2-attempt-guard-v1.json";
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

export function replacementAttemptGuardPath(outputRoot) {
  if (typeof outputRoot !== "string" || outputRoot.trim() === "") throw new TypeError("replacement outputRoot is required");
  const normalized = outputRoot.replace(/\/+$/u, "");
  const splitAt = normalized.lastIndexOf("/");
  if (splitAt <= 0) throw new TypeError("replacement outputRoot must have a parent directory");
  return `${normalized.slice(0, splitAt)}/${ATTEMPT_GUARD_FILE}`;
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

function attemptPaths(outputRoot) {
  return Object.freeze({
    guardPath: replacementAttemptGuardPath(outputRoot),
    startPath: `${outputRoot}/${ATTEMPT_START_FILE}`,
    resultPath: `${outputRoot}/${RESULT_FILE}`,
    failurePath: `${outputRoot}/${FAILURE_FILE}`,
  });
}

function verifyAttemptGuard(guard, { authority, outputRoot }) {
  if (guard?.version !== "pr39-replacement-r2-attempt-guard-v1"
    || guard.status !== "ONE_SHOT_ATTEMPT_CLAIMED"
    || guard.bindingDigest !== authority.bindingDigest
    || guard.reviewCandidateHead !== authority.reviewCandidateHead
    || guard.outputRoot !== outputRoot
    || guard.wholeCandidateAttemptCap !== 1
    || guard.qualityDrivenRegeneration !== false
    || guard.publicationAuthorized !== false
    || typeof guard.attemptStartedAt !== "string"
    || !Number.isFinite(Date.parse(guard.attemptStartedAt))) {
    fail("replacement R2 durable one-shot attempt guard drift");
  }
  return guard;
}

function inspectAttemptBoundary({ outputRoot, authority }) {
  const paths = attemptPaths(outputRoot);
  const rootExists = existsSync(absolute(outputRoot));
  const guardExists = existsSync(absolute(paths.guardPath));
  if (!guardExists) {
    if (rootExists) {
      fail("replacement R2 output root pre-exists without a durable one-shot attempt guard");
    }
    return Object.freeze({ ...paths, fresh: true, guard: null });
  }

  const guard = verifyAttemptGuard(readJson(paths.guardPath), { authority, outputRoot });
  if (!rootExists || !existsSync(absolute(paths.startPath))) {
    fail("replacement R2 one-shot attempt was already claimed but its output-root start witness is missing");
  }
  const start = readJson(paths.startPath);
  if (start.bindingDigest !== authority.bindingDigest
    || start.reviewCandidateHead !== authority.reviewCandidateHead
    || start.attemptStartedAt !== guard.attemptStartedAt) {
    fail("replacement R2 one-shot guard/start witness mismatch");
  }
  return Object.freeze({ ...paths, fresh: false, guard });
}

function startOrResumeAttempt({ outputRoot, authority, now, inspectedBoundary }) {
  const boundary = inspectedBoundary ?? inspectAttemptBoundary({ outputRoot, authority });
  const { guardPath, startPath, resultPath, failurePath } = boundary;
  if (existsSync(absolute(failurePath))) {
    fail("replacement R2 one-shot attempt is closed by a terminal failure; no regeneration is authorized");
  }
  if (existsSync(absolute(resultPath))) {
    const result = readJson(resultPath);
    if (result.bindingDigest !== authority.bindingDigest || result.status !== "CANDIDATE_COHORT_COMPLETE_PENDING_DIAGNOSTICS") {
      fail("replacement R2 completed result does not match current execution authority");
    }
    return Object.freeze({ completedResult: result, attemptStartedAt: result.attemptStartedAt, guardPath, startPath, resultPath, failurePath });
  }
  if (!boundary.fresh) {
    const start = readJson(startPath);
    return Object.freeze({ completedResult: null, attemptStartedAt: start.attemptStartedAt, guardPath, startPath, resultPath, failurePath });
  }

  const attemptStartedAt = now();
  if (typeof attemptStartedAt !== "string" || !Number.isFinite(Date.parse(attemptStartedAt))) throw new TypeError("replacement runner clock must return an ISO timestamp");
  // Claim the scientific attempt outside the deletable output root first. If the
  // process dies after this write, the attempt stays claimed and cannot become a
  // new first attempt by deleting/recreating final-cohort-v1.
  writeJsonExclusive(guardPath, {
    version: "pr39-replacement-r2-attempt-guard-v1",
    status: "ONE_SHOT_ATTEMPT_CLAIMED",
    attemptStartedAt,
    bindingDigest: authority.bindingDigest,
    reviewCandidateHead: authority.reviewCandidateHead,
    outputRoot,
    wholeCandidateAttemptCap: 1,
    qualityDrivenRegeneration: false,
    publicationAuthorized: false,
  });
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
  return Object.freeze({ completedResult: null, attemptStartedAt, guardPath, startPath, resultPath, failurePath });
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
  // Critical ordering: hostile-review authority and the durable one-shot boundary
  // are both checked before adapter construction, so neither a missing CLEAR nor
  // a consumed/deleted attempt can construct a provider client.
  const authority = verifyReplacementR2ExecutionAuthority({ requireClear: true });
  if (typeof adapterFactory !== "function") throw new TypeError("replacement runner adapterFactory must be a function");
  const outputRoot = authority.outputRoot;
  const inspectedBoundary = inspectAttemptBoundary({ outputRoot, authority });
  const runtimeOptions = modelRuntimeOptions(authority.runtime);
  const baseAdapter = adapterFactory({ environment, observer, ...runtimeOptions });

  const attempt = startOrResumeAttempt({ outputRoot, authority, now, inspectedBoundary });
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
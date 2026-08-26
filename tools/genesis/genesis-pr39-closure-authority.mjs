// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: one-pass final-cohort claim and bounded operational resume for PR39 closure
// fibre-tool-disposition: retire after PR39; keep the one-pass/recovery lesson in milestone history

import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

export const PR39_CLOSURE_ATTEMPT_VERSION = "pr39-closure-attempt-v1";
export const PR39_CLOSURE_ATTEMPT_FILENAME = "closure-attempt.json";
export const PR39_CLOSURE_COMPLETION_VERSION = "pr39-closure-completion-v1";
export const PR39_CLOSURE_COMPLETION_FILENAME = "closure-completion.json";

function fail(message) { throw new Error(message); }
function requireText(name, value) {
  if (typeof value !== "string" || value.trim() === "") fail(`${name} is required`);
  return value.trim();
}
function requireDigest(name, value) {
  const normalized = requireText(name, value);
  if (!/^sha256:[0-9a-f]{64}$/u.test(normalized)) fail(`${name} must be a SHA-256 digest`);
  return normalized;
}
function requireTimestamp(name, value) {
  const normalized = requireText(name, value);
  if (!Number.isFinite(Date.parse(normalized))) fail(`${name} must be an ISO timestamp`);
  return normalized;
}
function readJsonOrNull(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
}

export function pr39ClosureAttemptPath(stateRoot) {
  return resolve(requireText("stateRoot", stateRoot), PR39_CLOSURE_ATTEMPT_FILENAME);
}
export function pr39ClosureCompletionPath(stateRoot) {
  return resolve(requireText("stateRoot", stateRoot), PR39_CLOSURE_COMPLETION_FILENAME);
}
export function readPr39ClosureAttempt({ stateRoot } = {}) {
  return readJsonOrNull(pr39ClosureAttemptPath(stateRoot));
}
export function readPr39ClosureCompletion({ stateRoot } = {}) {
  return readJsonOrNull(pr39ClosureCompletionPath(stateRoot));
}

function normalizedClaim({ closureId, codeHead, precommitmentDigest, modelId, claimedAt }) {
  return Object.freeze({
    version: PR39_CLOSURE_ATTEMPT_VERSION,
    closureId: requireText("closureId", closureId),
    codeHead: requireText("codeHead", codeHead),
    precommitmentDigest: requireDigest("precommitmentDigest", precommitmentDigest),
    modelId: requireText("modelId", modelId),
    claimedAt: requireTimestamp("claimedAt", claimedAt),
    status: "CLAIMED_ONE_PASS_CLOSURE_COHORT",
  });
}

export function claimPr39ClosureAttempt(args = {}) {
  const claim = normalizedClaim(args);
  const path = pr39ClosureAttemptPath(args.stateRoot);
  mkdirSync(dirname(path), { recursive: true });
  let descriptor;
  try { descriptor = openSync(path, "wx", 0o600); }
  catch (error) {
    if (error?.code === "EEXIST") {
      const existing = readPr39ClosureAttempt({ stateRoot: args.stateRoot });
      fail(`PR39 closure cohort already claimed by ${existing?.closureId ?? "an existing attempt"}; a second closure generation is forbidden`);
    }
    throw error;
  }
  try { writeFileSync(descriptor, `${JSON.stringify(claim, null, 2)}\n`, "utf8"); }
  finally { closeSync(descriptor); }
  return claim;
}

function sameAttempt(existing, requested) {
  return existing?.version === PR39_CLOSURE_ATTEMPT_VERSION &&
    existing.closureId === requested.closureId &&
    existing.codeHead === requested.codeHead &&
    existing.precommitmentDigest === requested.precommitmentDigest &&
    existing.modelId === requested.modelId;
}

export function openOrResumePr39ClosureAttempt(args = {}) {
  const completion = readPr39ClosureCompletion({ stateRoot: args.stateRoot });
  if (completion !== null) fail(`PR39 closure cohort ${completion.closureId} is already complete; a second closure generation is forbidden`);
  const requested = normalizedClaim(args);
  const existing = readPr39ClosureAttempt({ stateRoot: args.stateRoot });
  if (existing === null) return Object.freeze({ claim: claimPr39ClosureAttempt(args), resumed: false });
  if (!sameAttempt(existing, requested)) {
    fail(`PR39 closure attempt already belongs to a different frozen execution; a second closure generation is forbidden`);
  }
  return Object.freeze({ claim: Object.freeze(structuredClone(existing)), resumed: true });
}

export function completePr39ClosureAttempt({ stateRoot, claim, candidateDigests, completedAt } = {}) {
  if (!sameAttempt(claim, claim)) fail("valid closure claim is required");
  if (!Array.isArray(candidateDigests) || candidateDigests.length !== 5) fail("closure completion requires exactly five candidate digests");
  candidateDigests.forEach((value, index) => requireDigest(`candidateDigests[${index}]`, value));
  if (new Set(candidateDigests).size !== 5) fail("closure completion candidate digests must be unique");
  const completion = Object.freeze({
    version: PR39_CLOSURE_COMPLETION_VERSION,
    closureId: claim.closureId,
    codeHead: claim.codeHead,
    precommitmentDigest: claim.precommitmentDigest,
    modelId: claim.modelId,
    candidateDigests: Object.freeze([...candidateDigests]),
    completedAt: requireTimestamp("completedAt", completedAt),
    status: "COMPLETED_ONE_PASS_CLOSURE_COHORT",
  });
  const path = pr39ClosureCompletionPath(stateRoot);
  mkdirSync(dirname(path), { recursive: true });
  let descriptor;
  try { descriptor = openSync(path, "wx", 0o600); }
  catch (error) { if (error?.code === "EEXIST") fail("PR39 closure completion already exists"); throw error; }
  try { writeFileSync(descriptor, `${JSON.stringify(completion, null, 2)}\n`, "utf8"); }
  finally { closeSync(descriptor); }
  return completion;
}

export async function runClaimedPr39ClosureGeneration({
  stateRoot, closureId, codeHead, precommitmentDigest, modelId, claimedAt, generate,
} = {}) {
  if (typeof generate !== "function") fail("generate callback is required");
  const claim = claimPr39ClosureAttempt({ stateRoot, closureId, codeHead, precommitmentDigest, modelId, claimedAt });
  return generate(claim);
}

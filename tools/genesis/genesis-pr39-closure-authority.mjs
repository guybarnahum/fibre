// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: one-pass final-cohort claim for PR39 closure
// fibre-tool-disposition: retire after PR39; retain the one-pass lesson in milestone history

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

export function pr39ClosureAttemptPath(stateRoot) {
  return resolve(requireText("stateRoot", stateRoot), PR39_CLOSURE_ATTEMPT_FILENAME);
}

export function readPr39ClosureAttempt({ stateRoot } = {}) {
  const path = pr39ClosureAttemptPath(stateRoot);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export function claimPr39ClosureAttempt({
  stateRoot,
  closureId,
  codeHead,
  precommitmentDigest,
  modelId,
  claimedAt,
} = {}) {
  const claim = Object.freeze({
    version: PR39_CLOSURE_ATTEMPT_VERSION,
    closureId: requireText("closureId", closureId),
    codeHead: requireText("codeHead", codeHead),
    precommitmentDigest: requireDigest("precommitmentDigest", precommitmentDigest),
    modelId: requireText("modelId", modelId),
    claimedAt: requireTimestamp("claimedAt", claimedAt),
    status: "CLAIMED_ONE_PASS_CLOSURE_COHORT",
  });
  const path = pr39ClosureAttemptPath(stateRoot);
  mkdirSync(dirname(path), { recursive: true });

  let descriptor;
  try {
    descriptor = openSync(path, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") {
      const existing = readPr39ClosureAttempt({ stateRoot });
      fail(`PR39 closure cohort already claimed by ${existing?.closureId ?? "an existing attempt"}; a second closure generation is forbidden`);
    }
    throw error;
  }

  try {
    writeFileSync(descriptor, `${JSON.stringify(claim, null, 2)}\n`, "utf8");
  } finally {
    closeSync(descriptor);
  }
  return claim;
}

export async function runClaimedPr39ClosureGeneration({
  stateRoot,
  closureId,
  codeHead,
  precommitmentDigest,
  modelId,
  claimedAt,
  generate,
} = {}) {
  if (typeof generate !== "function") fail("generate callback is required");
  const claim = claimPr39ClosureAttempt({
    stateRoot,
    closureId,
    codeHead,
    precommitmentDigest,
    modelId,
    claimedAt,
  });
  return generate(claim);
}

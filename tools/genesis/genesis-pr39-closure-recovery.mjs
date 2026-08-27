// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: bind one explicit recovery execution to the already-claimed PR39 closure cohort
// fibre-tool-disposition: retire after PR39; retain the recovery lesson in milestone history

import { randomUUID } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

export const PR39_CLOSURE_ORIGINAL_CLAIM_HEAD = "6415ba75c95e5a26a634b83a5ea2f6eeb34f337f";
export const PR39_CLOSURE_RECOVERY_VERSION = "pr39-closure-recovery-amendment-v1";
export const PR39_CLOSURE_RECOVERY_FILENAME = "closure-recovery-amendment.json";
export const PR39_CLOSURE_RECOVERY_REASON = "repeated_pass_b_unique_items_mechanical_failure";

function fail(message) { throw new Error(message); }
function requireText(name, value) {
  if (typeof value !== "string" || value.trim() === "") fail(`${name} is required`);
  return value.trim();
}
function readJsonOrNull(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
}
function removeIfPresent(path) {
  try { unlinkSync(path); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}
function writeExclusiveJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  let descriptor;
  try {
    descriptor = openSync(temp, "wx", 0o600);
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    linkSync(temp, path);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    removeIfPresent(temp);
  }
}

export function pr39ClosureRecoveryPath(stateRoot) {
  return resolve(requireText("stateRoot", stateRoot), PR39_CLOSURE_RECOVERY_FILENAME);
}

export function readPr39ClosureRecovery({ stateRoot } = {}) {
  return readJsonOrNull(pr39ClosureRecoveryPath(stateRoot));
}

function assertOriginalClaim(claim) {
  if (claim === null || typeof claim !== "object" || Array.isArray(claim)) fail("PR39 recovery requires the preserved original closure claim");
  if (claim.status !== "CLAIMED_ONE_PASS_CLOSURE_COHORT") fail("PR39 recovery requires the preserved claimed closure cohort");
  if (claim.codeHead !== PR39_CLOSURE_ORIGINAL_CLAIM_HEAD) fail("PR39 recovery original claim HEAD drift");
  requireText("claim.closureId", claim.closureId);
  requireText("claim.precommitmentDigest", claim.precommitmentDigest);
  requireText("claim.modelId", claim.modelId);
  requireText("claim.claimedAt", claim.claimedAt);
  return claim;
}

function assertRecoveryAmendment({ amendment, original, finalizationDigest, modelId }) {
  const recoveryHead = requireText("amendment.recoveryCodeHead", amendment?.recoveryCodeHead);
  if (
    amendment?.version !== PR39_CLOSURE_RECOVERY_VERSION ||
    amendment?.status !== "AUTHORIZED_EXECUTION_RECOVERY" ||
    amendment?.closureId !== original.closureId ||
    amendment?.originalCodeHead !== original.codeHead ||
    recoveryHead === original.codeHead ||
    amendment?.finalizationDigest !== original.precommitmentDigest ||
    amendment?.finalizationDigest !== finalizationDigest ||
    amendment?.modelId !== original.modelId ||
    amendment?.modelId !== modelId ||
    amendment?.reason !== PR39_CLOSURE_RECOVERY_REASON
  ) {
    fail("PR39 closure recovery amendment does not match the preserved frozen execution");
  }
  return amendment;
}

export function authorizePr39ClosureRecovery({
  stateRoot,
  claim,
  recoveryCodeHead,
  finalizationDigest,
  modelId,
  authorizedAt,
} = {}) {
  const original = assertOriginalClaim(claim);
  const recoveryHead = requireText("recoveryCodeHead", recoveryCodeHead);
  if (recoveryHead === original.codeHead) fail("PR39 recovery HEAD must differ from the original claim HEAD");
  if (finalizationDigest !== original.precommitmentDigest) fail("PR39 recovery finalization digest drift");
  if (modelId !== original.modelId) fail("PR39 recovery model drift");
  if (!Number.isFinite(Date.parse(authorizedAt))) fail("PR39 recovery authorizedAt must be an ISO timestamp");

  const amendment = Object.freeze({
    version: PR39_CLOSURE_RECOVERY_VERSION,
    status: "AUTHORIZED_EXECUTION_RECOVERY",
    closureId: original.closureId,
    originalCodeHead: original.codeHead,
    recoveryCodeHead: recoveryHead,
    finalizationDigest,
    modelId,
    originalClaimedAt: original.claimedAt,
    authorizedAt,
    reason: PR39_CLOSURE_RECOVERY_REASON,
    blockingFailure: Object.freeze({
      slot: 2,
      label: "Kochi",
      stage: "pass_b",
      constraint: "uniqueItems",
      path: "$.episodeRefs",
      observedOccurrences: 2,
    }),
    preservedScience: Object.freeze({
      cohortIdentity: true,
      worldsAndGenomes: true,
      assignment: true,
      modelAndSampling: true,
      generationPrompts: true,
      diagnosticsD1ThroughD5: true,
      secondCohortForbidden: true,
    }),
  });

  const path = pr39ClosureRecoveryPath(stateRoot);
  try { writeExclusiveJson(path, amendment); }
  catch (error) {
    if (error?.code === "EEXIST") fail("PR39 closure recovery amendment already exists and cannot be replaced");
    throw error;
  }
  return amendment;
}

// Validate the historical generation-recovery record without requiring the
// repository's current HEAD to remain pinned to the generation execution. This
// is used only after the one-pass cohort has completed, when diagnostic/birth
// tooling may legitimately advance while the generated evidence stays frozen.
export function assertPr39ClosureRecoveryRecord({
  stateRoot,
  claim,
  finalizationDigest,
  modelId,
} = {}) {
  const original = assertOriginalClaim(claim);
  const amendment = readPr39ClosureRecovery({ stateRoot });
  if (amendment === null) return Object.freeze({ mode: "original", amendment: null });
  assertRecoveryAmendment({ amendment, original, finalizationDigest, modelId });
  return Object.freeze({ mode: "recovery", amendment: structuredClone(amendment) });
}

export function assertPr39ClosureRecoveryMatchesExecution({
  stateRoot,
  claim,
  currentCodeHead,
  finalizationDigest,
  modelId,
} = {}) {
  const original = assertOriginalClaim(claim);
  const head = requireText("currentCodeHead", currentCodeHead);
  const recorded = assertPr39ClosureRecoveryRecord({
    stateRoot,
    claim: original,
    finalizationDigest,
    modelId,
  });

  if (recorded.amendment === null) {
    if (head !== original.codeHead) {
      fail("PR39 closure is on a changed HEAD but no recovery amendment is authorized");
    }
    return recorded;
  }
  if (recorded.amendment.recoveryCodeHead !== head) {
    fail("PR39 closure recovery amendment does not match this frozen execution");
  }
  return recorded;
}

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";
import { assertReplacementV2DiagnosticAuthority } from "../../services/world-kernel/src/genesis-replacement-diagnostic-authority.mjs";
import { buildReplacementV2ExecutionPlans } from "./genesis-replacement-v2-plan.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
export const REPLACEMENT_R2_EXECUTION_BINDING_PATH = "artifacts/validation/m2-pr39/replacement-v2/protocol/r2-execution-binding-v1.json";
export const REPLACEMENT_R2_CLEAR_WITNESS_PATH = "artifacts/validation/m2-pr39/replacement-v2/protocol/r2-execution-clear-v1.json";
const EXECUTION_SOURCE_ROOTS = Object.freeze([
  "services/world-kernel/src",
  "services/birth-center/src",
  "tools/genesis",
]);

function absolute(path) { return resolve(ROOT, path); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function fail(message) { throw new Error(message); }

function gitBlobSha(path) {
  try {
    return execFileSync("git", ["hash-object", "--", path], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    fail(`R2 authority cannot hash executable working-tree source ${path}: ${error.stderr?.toString?.().trim() || error.message}`);
  }
}

function changedExecutionSourcePaths(reviewedHead) {
  try {
    // Compare the reviewed candidate directly with the bytes that would execute,
    // including staged and unstaged tracked changes. Commit-to-commit comparison
    // is insufficient for a scientific execution witness.
    const output = execFileSync("git", ["diff", "--name-only", reviewedHead, "--", ...EXECUTION_SOURCE_ROOTS], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return output.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean);
  } catch (error) {
    fail(`R2 authority cannot compare reviewed execution source at ${reviewedHead}: ${error.stderr?.toString?.().trim() || error.message}`);
  }
}

function verifySourceBlobs(binding) {
  if (!Array.isArray(binding.sourceBlobs) || binding.sourceBlobs.length < 8) {
    fail("R2 execution binding has insufficient reviewed source coverage");
  }
  const paths = new Set();
  for (const item of binding.sourceBlobs) {
    if (typeof item?.path !== "string" || item.path.trim() === "" || typeof item.gitBlobSha !== "string") {
      fail("R2 execution binding contains an invalid source-blob entry");
    }
    if (paths.has(item.path)) fail(`R2 execution binding duplicates reviewed source ${item.path}`);
    paths.add(item.path);
    const actual = gitBlobSha(item.path);
    if (actual !== item.gitBlobSha) fail(`R2 reviewed source blob drift: ${item.path}`);
  }
  return [...paths].sort();
}

function verifyArtifactDigests(binding) {
  if (!Array.isArray(binding.authorityArtifacts) || binding.authorityArtifacts.length < 4) {
    fail("R2 execution binding has insufficient authority-artifact coverage");
  }
  const verified = [];
  for (const item of binding.authorityArtifacts) {
    if (typeof item?.path !== "string" || typeof item.digest !== "string") fail("R2 authority artifact entry is invalid");
    const actual = digest(readJson(item.path));
    if (actual !== item.digest) fail(`R2 authority artifact drift: ${item.path}`);
    verified.push({ path: item.path, digest: actual });
  }
  return verified;
}

function verifyClearWitness(binding, bindingDigest, requireClear) {
  if (!existsSync(absolute(REPLACEMENT_R2_CLEAR_WITNESS_PATH))) {
    if (requireClear) fail("R2 CLEAR witness is absent; replacement cognition is not authorized");
    return Object.freeze({ authorized: false, status: "MISSING_R2_CLEAR_WITNESS", witness: null });
  }
  const witness = readJson(REPLACEMENT_R2_CLEAR_WITNESS_PATH);
  if (witness.status !== "CLEAR" || witness.verdict !== "CLEAR") {
    if (requireClear) fail("R2 hostile review has not cleared replacement cognition");
    return Object.freeze({ authorized: false, status: witness.status ?? "INVALID_R2_CLEAR_WITNESS", witness });
  }
  if (witness.reviewedBindingDigest !== bindingDigest) fail("R2 CLEAR witness binding digest drift");
  if (witness.reviewedCandidateHead !== binding.reviewCandidateHead) fail("R2 CLEAR witness reviewed candidate head drift");
  if (witness.authorization?.providerCallsAuthorized !== true || witness.authorization?.candidateGenerationAuthorized !== true) {
    fail("R2 CLEAR witness does not explicitly authorize candidate cognition");
  }
  if (witness.authorization?.publicationAuthorized !== false) fail("R2 CLEAR witness may not authorize publication");
  return Object.freeze({ authorized: true, status: "CLEAR", witness });
}

export function verifyReplacementR2ExecutionAuthority({ requireClear = false } = {}) {
  if (!existsSync(absolute(REPLACEMENT_R2_EXECUTION_BINDING_PATH))) fail("R2 execution binding is absent");
  const binding = readJson(REPLACEMENT_R2_EXECUTION_BINDING_PATH);
  if (binding.contractVersion !== "pr39-replacement-r2-execution-binding-v1") fail("R2 execution binding version drift");
  if (binding.status !== "FROZEN_R2_PRE_REVIEW_NO_COGNITION") fail("R2 execution binding status drift");
  if (binding.authorization?.providerCallsAuthorized !== false || binding.authorization?.candidateGenerationAuthorized !== false) {
    fail("R2 pre-review binding unexpectedly authorizes cognition");
  }
  if (binding.authorization?.publicationAuthorized !== false || binding.oneShot?.qualityDrivenRegeneration !== false || binding.oneShot?.wholeCandidateAttemptCap !== 1) {
    fail("R2 one-shot/publication boundary drift");
  }
  if (binding.clearWitnessPath !== REPLACEMENT_R2_CLEAR_WITNESS_PATH) fail("R2 CLEAR witness path drift");

  const changedSourcePaths = changedExecutionSourcePaths(binding.reviewCandidateHead);
  if (changedSourcePaths.length !== 0) fail(`R2 execution source changed after review candidate: ${changedSourcePaths.join(", ")}`);
  const sourcePaths = verifySourceBlobs(binding);
  const artifactDigests = verifyArtifactDigests(binding);
  const plans = buildReplacementV2ExecutionPlans();
  const actualEnvelopeDigests = plans.slots.map((slot) => slot.envelopePlan.digest);
  if (canonicalJson(actualEnvelopeDigests) !== canonicalJson(binding.reviewedEnvelopeDigests)) fail("R2 reviewed envelope digest set drift");

  const diagnosticReconciliation = readJson(binding.diagnosticAuthority.reconciliationPath);
  const diagnostic = assertReplacementV2DiagnosticAuthority(diagnosticReconciliation);
  if (diagnostic.digest !== binding.diagnosticAuthority.authorityDigest) fail("R2 diagnostic authority digest drift");

  const bindingDigest = digest(binding);
  const clear = verifyClearWitness(binding, bindingDigest, requireClear);
  return Object.freeze({
    status: clear.authorized ? "CLEAR_TO_GENERATE_REPLACEMENT_CANDIDATE" : "CLEAR_R2_PACKET_COGNITION_HOLD",
    executionAuthorized: clear.authorized,
    clearWitnessStatus: clear.status,
    bindingDigest,
    reviewCandidateHead: binding.reviewCandidateHead,
    changedSourcePaths: Object.freeze(changedSourcePaths),
    sourcePaths: Object.freeze(sourcePaths),
    artifactDigests: Object.freeze(artifactDigests),
    reviewedEnvelopeDigests: Object.freeze(actualEnvelopeDigests),
    diagnosticAuthority: diagnostic,
    runtime: structuredClone(binding.runtime),
    oneShot: structuredClone(binding.oneShot),
    outputRoot: binding.outputRoot,
    clearWitness: clear.witness === null ? null : structuredClone(clear.witness),
    plans,
  });
}
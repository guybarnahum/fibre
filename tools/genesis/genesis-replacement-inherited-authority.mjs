import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import { verifyG4CognitionFreeze } from "./genesis-g4-cognition-freeze.mjs";
import { verifyG34ReviewAmendments } from "./genesis-g34-review-amendments.mjs";
import { verifyG4V3ReliabilityImplementation } from "./genesis-g4-v3-reliability-verify.mjs";
import { verifyG5DiagnosticsFreeze } from "./genesis-g5-diagnostics-freeze.mjs";
import { verifyG6VerdictFreeze } from "./genesis-g6-verdict-freeze.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
export const REPLACEMENT_EXECUTION_BINDING_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/replacement-execution-binding-v1.json";
export const REPLACEMENT_WRAPPER_PATH = "tools/genesis/genesis-replacement-final-cohort.mjs";
export const REPLACEMENT_CORE_PATH = "tools/genesis/genesis-replacement-final-cohort-core.mjs";
const EXPECTED_REPLACEMENT_WRAPPER_BLOB_SHA = "5b67674e36b43766f416e0a1aab9a0b8e41dbc36";
const EXPECTED_REPLACEMENT_CORE_BLOB_SHA = "a8acd1b1dd47ef427397056cee2958cea7ae0b7c";
const G4_RELIABILITY_WITNESS_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-v3-reliability-implementation-witness-v1.json";
const EXPECTED_H_PASS_B_HELPER_BLOB_SHA = "0bca252aa20e3af375ad977fc3e2fd22dc76d9f1";
const REQUIRED_PAIR34_BLOCKING_DISCLOSURES = Object.freeze([
  "pair 3-4 D3 null",
  "pair 3-4 D3 error",
  "pair 3-4 D3 tie",
  "any other measured core-edge null, error, tie or unanalyzable result",
]);

function absolute(path) { return resolve(ROOT, path); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function fail(message) { throw new Error(message); }

function gitBlobSha(path) {
  const bytes = readFileSync(absolute(path));
  const prefix = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return createHash("sha1").update(prefix).update(bytes).digest("hex");
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
}

function assertRealStrictAncestor(commit) {
  try {
    execFileSync("git", ["cat-file", "-e", `${commit}^{commit}`], { cwd: ROOT, stdio: "ignore" });
  } catch {
    fail(`Gate-G(2) reviewedHead is not a real commit: ${commit}`);
  }
  const head = currentHead();
  if (commit === head) fail("Gate-G(2) reviewedHead must strictly predate the witness/current HEAD");
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commit, head], { cwd: ROOT, stdio: "ignore" });
  } catch {
    fail(`Gate-G(2) reviewedHead is not an ancestor of current HEAD: ${commit}`);
  }
}

function changedReviewedExecutionPaths(reviewedHead, gateWitnessPath) {
  const paths = [
    "services/world-kernel/src",
    "services/birth-center/src",
    "tools/genesis",
    "artifacts/validation/m2-pr39/g/protocol",
    "artifacts/validation/m2-pr39/replacement-v1/protocol",
  ];
  const output = execFileSync("git", ["diff", "--name-only", reviewedHead, "HEAD", "--", ...paths], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item !== gateWitnessPath);
}

function same(name, actual, expected) {
  if (canonicalJson(actual) !== canonicalJson(expected)) fail(`${name} drift`);
}

function assertG4BindingMatchesBase(g4Binding, g4Base) {
  const inherited = g4Binding.inheritedAuthority;
  const runtime = g4Base.commonRuntime;
  same("replacement G4 provider", runtime.provider, inherited.provider);
  same("replacement G4 model", runtime.modelId, inherited.modelId);
  same("replacement G4 temperature", runtime.temperature, inherited.temperature);
  same("replacement G4 topP", runtime.topP, inherited.topP);
  same("replacement G4 reasoning effort", runtime.reasoningEffort, inherited.reasoningEffort);
  same("replacement G4 episodes per Thread", g4Base.historicalPlan.episodesPerThread, inherited.episodesPerThread);
  same("replacement G4 structures per window", g4Base.eventStructurePool.structuresPerWindow, inherited.structuresPerWindow);
  same("replacement G4 bornAt", g4Base.historicalPlan.entry.bornAt, inherited.bornAt);
  same("replacement G4 entry stage", g4Base.historicalPlan.entry.stage, inherited.entryStage);
  same("replacement G4 entry age", g4Base.historicalPlan.entry.ageAtEntry, inherited.entryAge);
  same("replacement G4 entry chronology", g4Base.historicalPlan.entry.chronologyEndsAt, inherited.entryChronologyEndsAt);
  if (g4Base.historicalPlan.windows.length !== inherited.episodesPerThread || g4Base.historicalPlan.windows.length !== 10) {
    fail("replacement G4 developmental-window count drift");
  }
}

function assertResidualIntegrityObligations(binding) {
  const passBReviewNote = readJson(binding.authorityBoundary.passBGenomeCopyReviewNotePath);
  if (passBReviewNote.status !== "not_applied_preserved_review_note") fail("replacement Pass-B review-note standing drift");
  if (canonicalJson(passBReviewNote.frozenAuthority.scannedFields) !== canonicalJson(["rememberedContent"])) fail("replacement historical Pass-B scan authority drift");
  if (passBReviewNote.consideredChange.appliedToReplacement !== false) fail("replacement uncertainty hardening was silently applied");

  const residual = readJson(binding.authorityBoundary.residualGateG2DisclosurePath);
  const scan = residual.passBUncertaintyGenomeCopyCoverage?.postGenerationPreDiagnosticScan;
  if (scan?.required !== true || scan.readOnly !== true || scan.mayRegenerateOrRepairLife !== false) fail("replacement uncertainty post-generation scan obligation drift");
  if (scan.onConfirmedLeak !== "REDESIGN_AFFECTED_INFERENCE_NO_REGENERATION" || scan.confirmedLeakWouldInvalidateAffectedInference !== true) {
    fail("replacement uncertainty confirmed-leak consequence drift");
  }
  if (typeof scan.algorithmAuthority !== "string" || !scan.algorithmAuthority.includes("findVerbatimGenomeNgram")) fail("replacement uncertainty scan algorithm authority drift");
  return Object.freeze({
    passBGenerationTimeScannedFields: Object.freeze([...passBReviewNote.frozenAuthority.scannedFields]),
    uncertaintyPostGenerationScanRequired: true,
    uncertaintyConfirmedLeakDisposition: scan.onConfirmedLeak,
  });
}

function assertPostClearDriftBoundary(binding) {
  const gatePath = binding.authorityBoundary.gateG2ClearWitnessPath;
  if (!existsSync(absolute(gatePath))) return [];
  const gate = readJson(gatePath);
  if (gate.status !== "CLEAR" || gate.authorization?.replacementFinalLifeGenerationAuthorized !== true) return [];
  if (typeof gate.reviewedHead !== "string" || gate.reviewedHead.length < 7) fail("Gate-G(2) reviewedHead missing");
  assertRealStrictAncestor(gate.reviewedHead);
  const changes = changedReviewedExecutionPaths(gate.reviewedHead, gatePath);
  if (changes.length !== 0) fail(`replacement execution authority changed after Gate-G(2): ${changes.join(", ")}`);
  return changes;
}

export function verifyReplacementInheritedAuthorityBinding() {
  const binding = readJson(REPLACEMENT_EXECUTION_BINDING_PATH);
  if (binding.runner.path !== REPLACEMENT_WRAPPER_PATH) fail("replacement authorized runner path drift");
  const wrapperBlobSha = gitBlobSha(REPLACEMENT_WRAPPER_PATH);
  if (wrapperBlobSha !== EXPECTED_REPLACEMENT_WRAPPER_BLOB_SHA || wrapperBlobSha !== binding.runner.wrapperGitBlobSha) fail("replacement authorized wrapper blob drift");
  if (binding.runner.corePath !== REPLACEMENT_CORE_PATH) fail("replacement generation core path drift");
  const coreBlobSha = gitBlobSha(REPLACEMENT_CORE_PATH);
  if (coreBlobSha !== EXPECTED_REPLACEMENT_CORE_BLOB_SHA || coreBlobSha !== binding.runner.coreGitBlobSha) fail("replacement generation core blob drift");
  if (binding.runner.bindingPathHardcoded !== true || binding.runner.bindingEnvOverrideAllowed !== false) fail("replacement runner binding discipline drift");
  if (binding.publication.atomicPerThreadWorldKernelPublication !== true || binding.publication.cohortLevelAtomicPublication !== false || typeof binding.publication.cohortAtomicityDisclosure !== "string") {
    fail("replacement publication atomicity disclosure drift");
  }

  const g34 = verifyG34ReviewAmendments();
  const g4Verification = verifyG4CognitionFreeze({ protocolPath: binding.authorityBoundary.g4BaseProtocolPath });
  const g4v3 = verifyG4V3ReliabilityImplementation();
  const g5 = verifyG5DiagnosticsFreeze();
  const g6 = verifyG6VerdictFreeze();

  if (g4Verification.protocolDigest !== g34.g4v1Digest) fail("replacement G4-v1 verifier disagreement");
  if (g4v3.protocolPath !== binding.authorityBoundary.g4PassAReliabilityAmendmentPath) fail("replacement G4-v3 authority path drift");
  if (g5.protocolDigest !== digest(readJson(binding.authorityBoundary.g5ProtocolPath))) fail("replacement G5 authority path/digest drift");
  if (g6.g6ProtocolDigest !== digest(readJson(binding.authorityBoundary.g6ProtocolPath))) fail("replacement G6 authority path/digest drift");

  const g3 = readJson(binding.authorityBoundary.g3TreatmentInstancePath);
  const g3Production = readJson(g3.inheritedAuthority.productionProtocolPath);
  const g3Analysis = readJson(g3.inheritedAuthority.analysisProtocolPath);
  if (digest(g3Production) !== g3.inheritedAuthority.productionProtocolDigest || digest(g3Production) !== g34.g3v1Digest) fail("replacement inherited G3 production authority drift");
  if (digest(g3Analysis) !== g3.inheritedAuthority.analysisProtocolDigest || digest(g3Analysis) !== g34.g3v2Digest) fail("replacement inherited G3 analysis authority drift");

  const g4Binding = readJson(binding.authorityBoundary.g4CognitionExecutionBindingPath);
  const g4Base = g4Verification.protocol;
  const g4Entry = readJson(binding.authorityBoundary.g4EntryAmendmentPath);
  if (digest(g4Entry) !== g34.g4v2Digest) fail("replacement G4-v2 entry authority drift");
  if (g4Binding.inheritedAuthority.g4BasePath !== binding.authorityBoundary.g4BaseProtocolPath) fail("replacement G4 base path disagreement");
  if (g4Binding.inheritedAuthority.g4EntryAmendmentPath !== binding.authorityBoundary.g4EntryAmendmentPath) fail("replacement G4 entry path disagreement");
  if (g4Binding.inheritedAuthority.g4PassAReliabilityAmendmentPath !== binding.authorityBoundary.g4PassAReliabilityAmendmentPath) fail("replacement G4 reliability path disagreement");
  assertG4BindingMatchesBase(g4Binding, g4Base);

  const reliabilityWitness = readJson(G4_RELIABILITY_WITNESS_PATH);
  if (reliabilityWitness.status !== "CLEAR" || reliabilityWitness.policy.version !== g4v3.policyVersion) fail("replacement G4-v3 reliability witness drift");
  if (reliabilityWitness.promptHashes.g4v3PassA !== g4v3.v3PromptHash || reliabilityWitness.promptHashes.g4v3RecordRetry !== g4v3.v3RetryPromptHash) {
    fail("replacement G4-v3 live prompt/witness hash drift");
  }

  const hHelperBlobSha = gitBlobSha("tools/genesis/genesis-h-final-cohort.mjs");
  if (hHelperBlobSha !== EXPECTED_H_PASS_B_HELPER_BLOB_SHA) fail("replacement inherited Pass-B input builder source drift");

  const closure = readJson(binding.authorityBoundary.replacementG56ClosureAmendmentPath);
  const forbiddenAsDisclosureOnly = closure.effectiveReplacementClearRule.explicitlyNotAllowedAsMandatoryDisclosureOnly;
  for (const required of REQUIRED_PAIR34_BLOCKING_DISCLOSURES) {
    if (!forbiddenAsDisclosureOnly.includes(required)) fail(`replacement G6 carve-out closure missing: ${required}`);
  }

  const residualIntegrity = assertResidualIntegrityObligations(binding);
  const reviewedSourceChanges = assertPostClearDriftBoundary(binding);
  return Object.freeze({
    status: "CLEAR_INHERITED_AUTHORITY_BOUND",
    wrapperBlobSha,
    coreBlobSha,
    g3ProductionDigest: digest(g3Production),
    g3AnalysisDigest: digest(g3Analysis),
    g4BaseDigest: g4Verification.protocolDigest,
    g4EntryDigest: g34.g4v2Digest,
    g5Digest: g5.protocolDigest,
    g6Digest: g6.g6ProtocolDigest,
    g4v3PolicyVersion: g4v3.policyVersion,
    g4v3PromptHash: g4v3.v3PromptHash,
    hPassBHelperBlobSha: hHelperBlobSha,
    residualIntegrity,
    reviewedSourceChanges,
    providerCallsMade: 0,
  });
}

#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import { verifyG4CognitionFreeze } from "./genesis-g4-cognition-freeze.mjs";
import { verifyG34ReviewAmendments } from "./genesis-g34-review-amendments.mjs";
import { verifyG4V3ReliabilityImplementation } from "./genesis-g4-v3-reliability-verify.mjs";
import { verifyG5DiagnosticsFreeze } from "./genesis-g5-diagnostics-freeze.mjs";
import { verifyG6VerdictFreeze } from "./genesis-g6-verdict-freeze.mjs";
import {
  REPLACEMENT_EXECUTION_BINDING_PATH as CORE_EXECUTION_BINDING_PATH,
  verifyReplacementFinalCohortPreflight as verifyCoreReplacementFinalCohortPreflight,
  runReplacementFinalCohort as runCoreReplacementFinalCohort,
} from "./genesis-replacement-final-cohort-core.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
export const REPLACEMENT_EXECUTION_BINDING_PATH = CORE_EXECUTION_BINDING_PATH;
export const REPLACEMENT_CORE_PATH = "tools/genesis/genesis-replacement-final-cohort-core.mjs";
const EXPECTED_REPLACEMENT_CORE_BLOB_SHA = "81d89fb17eca549106bd51ea0aba2d8329bacb80";
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
  if (binding.runner.path !== "tools/genesis/genesis-replacement-final-cohort.mjs") fail("replacement authorized runner path drift");
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

export function verifyReplacementFinalCohortPreflight(options = {}) {
  const inheritedAuthority = verifyReplacementInheritedAuthorityBinding();
  const core = verifyCoreReplacementFinalCohortPreflight(options);
  return Object.freeze({ ...core, inheritedAuthority });
}

export async function runReplacementFinalCohort() {
  verifyReplacementFinalCohortPreflight({ requireGateClear: true });
  return runCoreReplacementFinalCohort();
}

function printPreflight(result) {
  process.stdout.write(`PR39 REPLACEMENT FINAL COHORT PREFLIGHT: ${result.status}\n\n`);
  process.stdout.write(`Execution binding digest: ${result.executionBindingDigest}\n`);
  process.stdout.write(`Inherited authority: ${result.inheritedAuthority.status} — ZERO CALL\n`);
  process.stdout.write(`Generation core blob: ${result.inheritedAuthority.coreBlobSha}\n`);
  process.stdout.write(`G3 production: ${result.inheritedAuthority.g3ProductionDigest}\n`);
  process.stdout.write(`G3 analysis: ${result.inheritedAuthority.g3AnalysisDigest}\n`);
  process.stdout.write(`G4 base: ${result.inheritedAuthority.g4BaseDigest}\n`);
  process.stdout.write(`G4-v3 prompt: ${result.inheritedAuthority.g4v3PromptHash}\n`);
  process.stdout.write(`G5: ${result.inheritedAuthority.g5Digest}\n`);
  process.stdout.write(`G6: ${result.inheritedAuthority.g6Digest}\n`);
  process.stdout.write(`Pass-B input helper blob: ${result.inheritedAuthority.hPassBHelperBlobSha}\n`);
  process.stdout.write(`Post-generation uncertainty scan required: ${result.inheritedAuthority.residualIntegrity.uncertaintyPostGenerationScanRequired}\n`);
  process.stdout.write(`Gate-G(2): ${result.gateStatus}\n`);
  process.stdout.write(`Final-life cognition: ${result.executionAuthorized ? "AUTHORIZED" : "NOT AUTHORIZED"}\n`);
  process.stdout.write(`Generation policy: ${result.generationPolicyVersion} · form=${result.generationPolicy.maxFormRepairsPerRecord} · record=${result.generationPolicy.maxRecordRetriesPerRecord} · total=${result.generationPolicy.maxTotalGeneratedVersionsPerRecord}\n`);
  process.stdout.write(`Runtime: ${result.runtime.provider}/${result.runtime.modelId}\n`);
  process.stdout.write(`Offer seed domain: ${result.eventStructureSeedDomain}\n`);
  process.stdout.write(`Client request domain: ${result.clientRequestDomain}\n`);
  process.stdout.write(`Output root: ${result.oneShot.outputRoot}${result.outputState.rootExists ? " [exists]" : " [absent]"}\n`);
  process.stdout.write(`Process-restart replay: enabled; host-crash fsync durability claimed: ${result.durability.hostCrashFsyncDurabilityClaimed}\n\n`);
  for (const slot of result.slots) {
    process.stdout.write(`${slot.slot}. ${slot.threadId} · ${slot.originMode} · ${slot.worldSpecId} · genome=${slot.genomeId} · roster=${slot.rosterSize}\n`);
    process.stdout.write(`   Pass A=${slot.passAEpisodes}; Pass B=${slot.passBHorizons.join("/")}; modes=${slot.passBModes.map((mode) => mode === "life_plus_genome" ? "T" : "L").join(" ")}\n`);
  }
  process.stdout.write("\nPreflight made zero provider calls and wrote no replacement life artifacts.\n");
}

function usage() {
  process.stdout.write("Usage: node tools/genesis/genesis-replacement-final-cohort.mjs --preflight\n       node tools/genesis/genesis-replacement-final-cohort.mjs\n\nThe authorized replacement entrypoint binds inherited G3/G4/G5/G6, G4-v3 and residual integrity obligations before delegating to the byte-preserved generation core. --preflight makes zero provider calls and writes nothing. Execution remains blocked until a bound Gate-G(2) CLEAR witness exists.\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) return usage();
  const unknown = args.filter((arg) => arg !== "--preflight");
  if (unknown.length !== 0) fail(`unsupported replacement argument(s): ${unknown.join(", ")}`);
  if (args.includes("--preflight")) {
    printPreflight(verifyReplacementFinalCohortPreflight());
    return;
  }
  const result = await runReplacementFinalCohort();
  process.stdout.write(`\nPR39 REPLACEMENT FINAL COHORT: ${result.status}\n`);
  process.stdout.write(`Result: ${result.preflight.oneShot.resultPath}\n`);
  process.stdout.write(`Database: ${result.databasePath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

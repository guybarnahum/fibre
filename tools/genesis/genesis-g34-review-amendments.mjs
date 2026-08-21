#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  GENESIS_PASS_B_GENOME_COPY_GATE,
  GENESIS_PASS_B_GENOME_COPY_MIN_TOKENS,
  GENESIS_PASS_B_MAX_GENERATED_VERSIONS_PER_CALL,
  passBGenomeCopyRetryPromptHash,
} from "../../services/world-kernel/src/genesis-pass-b-admission.mjs";
import { normalizeGenesisEntry } from "../../services/world-kernel/src/genesis-domain.mjs";
import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";

export const G3_V1_PATH = "artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v1.json";
export const G3_V2_PATH = "artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v2.json";
export const G4_V1_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v1.json";
export const G4_V2_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v2.json";
export const PASS_B_ADMISSION_PATH = "services/world-kernel/src/genesis-pass-b-admission.mjs";

export const G3_V1_DIGEST = "sha256:3d4885d4c8f717622e466e65e7869526193eccd611967609f7809dfb4b1068a6";
export const G3_V2_DIGEST = "sha256:aef6eea69cf55cc60e730a3529fd0e7d090261cd6535b256df6cbd3734174fae";
export const G4_V1_DIGEST = "sha256:1a41d68aa0bf8c689c84843771cfce07ca0afa44a9b7093ad944f058a93c368d";
export const G4_V2_DIGEST = "sha256:50c2f5bcbb1a3470a685f75257fd004c516ca04a67a3b21b367dbf73e58ade20";

function fail(message) {
  throw new Error(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function gitBlobSha(path) {
  const bytes = readFileSync(resolve(path));
  const prefix = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return createHash("sha1").update(prefix).update(bytes).digest("hex");
}

export function verifyG34ReviewAmendments() {
  const g3v1 = readJson(G3_V1_PATH);
  const g3v2 = readJson(G3_V2_PATH);
  const g4v1 = readJson(G4_V1_PATH);
  const g4v2 = readJson(G4_V2_PATH);

  if (digest(g3v1) !== G3_V1_DIGEST) fail("G3-v1 frozen protocol digest drift");
  if (digest(g3v2) !== G3_V2_DIGEST) fail("G3-v2 amendment digest drift");
  if (g3v2.supersedes?.protocolDigest !== G3_V1_DIGEST || g3v2.supersedes?.preserveUnedited !== true) fail("G3-v2 does not preserve exact G3-v1 authority");
  if (g3v2.preconditions?.finalCohortLifeExists !== false || g3v2.preconditions?.g5ArtifactExists !== false) fail("G3-v2 must predate final-life/G5 evidence");

  if (canonicalJson(g3v2.inheritedProductionProtocol.historyEpisodeHorizons) !== canonicalJson(g3v1.cohort.historyEpisodeHorizons)) fail("G3-v2 horizon schedule drift");
  const v1Modes = Object.keys(g3v1.assignment.directModeByOrdinal)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => g3v1.assignment.directModeByOrdinal[key]);
  if (canonicalJson(g3v2.inheritedProductionProtocol.directModes) !== canonicalJson(v1Modes)) fail("G3-v2 treatment schedule drift");
  if (g3v2.inheritedProductionProtocol.eligiblePassBCalls !== g3v1.cohort.eligiblePassBCallCount) fail("G3-v2 eligible-call count drift");
  if (g3v2.inheritedProductionProtocol.lifePlusGenomeCalls !== g3v1.directTreatmentArithmetic.lifePlusGenomeCalls) fail("G3-v2 treatment-count drift");
  if (g3v2.analysisRules?.primaryContrast !== "between_thread_at_fixed_call_ordinal") fail("G3-v2 primary contrast is not frozen");
  if (canonicalJson(g3v2.analysisRules.primaryContrastOrdinals) !== canonicalJson([3, 6])) fail("G3-v2 primary ordinals drift");
  if (canonicalJson(g3v2.analysisRules.primaryContrastHorizons) !== canonicalJson([6, 10])) fail("G3-v2 primary horizons drift");
  if (g3v2.analysisRules.betweenStratumContrastStatus !== "horizon_confounded_descriptive_only") fail("G3-v2 between-stratum confound is not load-bearing");
  if (g3v2.analysisRules.postOutcomeContrastSelectionAllowed !== false || g3v2.analysisRules.g5MustUsePrimaryContrastAsFrozen !== true) fail("G3-v2 leaves post-outcome comparison discretion");

  if (digest(g4v1) !== G4_V1_DIGEST) fail("G4-v1 frozen protocol digest drift");
  if (digest(g4v2) !== G4_V2_DIGEST) fail("G4-v2 amendment digest drift");
  if (g4v2.supersedes?.protocolDigest !== G4_V1_DIGEST || g4v2.supersedes?.preserveUnedited !== true) fail("G4-v2 does not preserve exact G4-v1 authority");
  if (g4v2.preconditions?.g3V2ProtocolDigest !== G3_V2_DIGEST) fail("G4-v2 does not bind exact G3-v2 amendment");
  if (g4v2.preconditions?.finalCohortLifeExists !== false || g4v2.preconditions?.g5ArtifactExists !== false) fail("G4-v2 must predate final-life/G5 evidence");

  const passB = g4v2.passBAdmissionAmendment;
  if (passB?.newMechanicalGate?.gate !== GENESIS_PASS_B_GENOME_COPY_GATE) fail("G4-v2 Pass-B genome-copy gate drift");
  if (passB.newMechanicalGate.minimumContiguousTokens !== GENESIS_PASS_B_GENOME_COPY_MIN_TOKENS) fail("G4-v2 genome-copy n-gram width drift");
  if (passB.mechanicalRetry.maxGeneratedVersionsPerPassBCall !== GENESIS_PASS_B_MAX_GENERATED_VERSIONS_PER_CALL) fail("G4-v2 Pass-B retry cap drift");
  if (passB.mechanicalRetry.maxRetryCount !== 1 || passB.mechanicalRetry.rejectedRecordVisibleToRetry !== false || passB.mechanicalRetry.sameFrozenCognitionInput !== true) fail("G4-v2 Pass-B retry discipline drift");
  if (passB.mechanicalRetry.retryPromptHash !== passBGenomeCopyRetryPromptHash()) fail("G4-v2 Pass-B retry prompt hash drift");
  if (passB.passBModelRepair !== false) fail("G4-v2 must not reopen general Pass-B model repair");
  if (!passB.admissionGatesPassBEffective.includes(GENESIS_PASS_B_GENOME_COPY_GATE)) fail("G4-v2 effective Pass-B gates omit genome-copy boundary");
  if (!existsSync(resolve(PASS_B_ADMISSION_PATH))) fail("G4-v2 Pass-B admission authority missing");
  if (gitBlobSha(PASS_B_ADMISSION_PATH) !== passB.authorityBlobSha) fail("G4-v2 Pass-B admission source pin drift");

  const baseEntry = g4v1.historicalPlan.entry;
  const amendedEntry = g4v2.manifestEntryAmendment;
  if (amendedEntry.justification !== g4v1.historicalPlan.coverageBoundary) fail("G4-v2 entry justification must exactly equal frozen coverage boundary");
  if (amendedEntry.stage !== baseEntry.stage || amendedEntry.ageAtEntry !== baseEntry.ageAtEntry || amendedEntry.chronologyEndsAt !== baseEntry.chronologyEndsAt || amendedEntry.policyRef !== baseEntry.policyRef) fail("G4-v2 entry amendment changed a frozen entry field");
  normalizeGenesisEntry({
    stage: amendedEntry.stage,
    ageAtEntry: amendedEntry.ageAtEntry,
    chronologyEndsAt: amendedEntry.chronologyEndsAt,
    justification: amendedEntry.justification,
    policyRef: amendedEntry.policyRef,
  });

  return Object.freeze({
    g3v1Digest: digest(g3v1),
    g3v2Digest: digest(g3v2),
    g4v1Digest: digest(g4v1),
    g4v2Digest: digest(g4v2),
    passBAdmissionBlobSha: gitBlobSha(PASS_B_ADMISSION_PATH),
    passBRetryPromptHash: passBGenomeCopyRetryPromptHash(),
    primaryContrast: g3v2.analysisRules.primaryContrast,
    entryJustification: amendedEntry.justification,
  });
}

function main() {
  const result = verifyG34ReviewAmendments();
  process.stdout.write("G3/G4 HOSTILE REVIEW AMENDMENTS: VERIFIED\n\n");
  process.stdout.write(`Primary contrast: ${result.primaryContrast}\n`);
  process.stdout.write(`G3-v2 digest: ${result.g3v2Digest}\n`);
  process.stdout.write(`G4-v2 digest: ${result.g4v2Digest}\n`);
  process.stdout.write(`Pass-B admission blob: ${result.passBAdmissionBlobSha}\n`);
  process.stdout.write(`Pass-B retry prompt: ${result.passBRetryPromptHash}\n`);
  process.stdout.write("Entry justification: frozen to G4-v1 coverage boundary\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}

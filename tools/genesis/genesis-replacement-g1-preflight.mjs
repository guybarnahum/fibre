#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { normalizeGenesisWorldSpec } from "../../services/world-kernel/src/genesis-domain.mjs";
import { canonicalJson, sha256 } from "../../services/world-kernel/src/persistence-common.mjs";

export const REPLACEMENT_G1_PREFLIGHT_VERSION = "pr39-replacement-g1-preflight-v1";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const MANIFEST_PATH = "artifacts/validation/m2-pr39/replacement-v1/protocol/rg1-world-candidate-freeze-v1.json";
const OLD_G1_PATH = "artifacts/validation/m2-pr39/g/protocol/g1-world-candidate-freeze-v2.json";
const RECOVERY_OUTCOME_PATH = "artifacts/validation/m2-pr39/h/recovery/h-v2-recovery-execution-outcome-v1.json";
const RESULT_PATH = "artifacts/validation/m2-pr39/replacement-v1/results/rg1-world-familiarity-v1.json";
const GENOME_ROOT = "artifacts/validation/m2-pr39/replacement-v1/genomes";

const absolute = (path) => resolve(ROOT, path);
const readJson = (path) => JSON.parse(readFileSync(absolute(path), "utf8"));
const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;
const fail = (message) => { throw new Error(message); };

export function verifyReplacementG1Preflight() {
  const manifest = readJson(MANIFEST_PATH);
  if (manifest.protocolVersion !== "pr39-slice-g1-world-candidate-freeze-v1" ||
      manifest.replacementAttemptVersion !== "pr39-replacement-cohort-v1" ||
      manifest.status !== "candidate_worlds_frozen_pending_familiarity") {
    fail("replacement G1 manifest version/status drift");
  }

  const recovery = readJson(RECOVERY_OUTCOME_PATH);
  if (recovery.status !== "HOLD_RECOVERY_RECORD_RETRY_EXHAUSTED" ||
      recovery.recoveryStanding?.terminalRecoveryHold !== true ||
      recovery.recoveryStanding?.isReplacementCohort !== false ||
      recovery.recoveryStanding?.mayEnterFrozenG5G6 !== false) {
    fail("terminal H-v2 recovery witness drift");
  }
  if (manifest.precondition?.recoveryStatus !== recovery.status ||
      manifest.precondition?.recoveryMayReplaceH2Hold !== false ||
      manifest.precondition?.replacementThreadIdentityAssigned !== false ||
      manifest.precondition?.replacementGenesisIdentityAssigned !== false ||
      manifest.precondition?.replacementGenomeAuthored !== false ||
      manifest.precondition?.replacementGenomeAssigned !== false ||
      manifest.precondition?.replacementFinalLifeGenerated !== false ||
      manifest.precondition?.replacementProviderCalls !== 0) {
    fail("replacement G1 precondition drift");
  }

  if (!Array.isArray(manifest.candidateWorlds) || manifest.candidateWorlds.length !== 5) {
    fail("replacement G1 requires exactly five candidate Worlds");
  }
  if (!Array.isArray(manifest.originAssignment) || manifest.originAssignment.length !== 5) {
    fail("replacement G1 origin assignment must contain five slots");
  }
  const deNovo = manifest.originAssignment.filter(({ originMode }) => originMode === "de_novo").length;
  const synthetic = manifest.originAssignment.filter(({ originMode }) => originMode === "synthetic_lineage").length;
  if (deNovo !== 3 || synthetic !== 2) fail("replacement G1 origin mix must remain 3 de_novo + 2 synthetic_lineage");

  const oldG1 = readJson(OLD_G1_PATH);
  const oldIds = new Set(oldG1.candidateWorlds.map(({ worldSpecId }) => worldSpecId));
  const ids = new Set();
  const candidates = [];

  for (const candidate of manifest.candidateWorlds) {
    if (ids.has(candidate.worldSpecId)) fail(`duplicate replacement WorldSpec id: ${candidate.worldSpecId}`);
    ids.add(candidate.worldSpecId);
    if (oldIds.has(candidate.worldSpecId)) fail(`replacement World reuses prior final G identity: ${candidate.worldSpecId}`);
    if (!existsSync(absolute(candidate.path))) fail(`missing replacement G1 candidate: ${candidate.path}`);

    const world = normalizeGenesisWorldSpec(readJson(candidate.path));
    if (world.worldSpecId !== candidate.worldSpecId) fail(`candidate identity mismatch for slot ${candidate.slot}`);
    if (digest(world) !== candidate.candidateDigest) fail(`candidate digest mismatch for ${candidate.worldSpecId}`);
    if (world.worldAuthorship.familiarityProbe !== null) fail(`candidate already contains familiarity output: ${candidate.worldSpecId}`);
    if (world.worldAuthorship.authorId !== "fibre_pr39_replacement_world_authoring") fail(`candidate authorship drift: ${candidate.worldSpecId}`);
    if (!Array.isArray(world.worldAuthorship.sourcesConsulted) || world.worldAuthorship.sourcesConsulted.length < 2) {
      fail(`candidate lacks factual source witnesses: ${candidate.worldSpecId}`);
    }
    if (world.timeFrame.startAt !== manifest.entryPolicy.bornAt ||
        world.timeFrame.endAt !== manifest.entryPolicy.chronologyEndsAt) {
      fail(`candidate time-frame drift: ${candidate.worldSpecId}`);
    }
    if (existsSync(absolute(candidate.finalPath))) fail(`final replacement World already exists before familiarity: ${candidate.finalPath}`);

    candidates.push(Object.freeze({
      slot: candidate.slot,
      worldSpecId: candidate.worldSpecId,
      candidateDigest: candidate.candidateDigest,
      path: candidate.path,
    }));
  }

  if (manifest.genomeBoundary?.replacementGenomeAuthored !== false ||
      manifest.genomeBoundary?.replacementGenomeAssigned !== false ||
      manifest.genomeBoundary?.replacementGenomeInspectionAllowedBeforeG1Final !== false ||
      existsSync(absolute(GENOME_ROOT))) {
    fail("replacement genome boundary violated before G1 finalization");
  }
  if (manifest.lifeGenerationBoundary?.replacementFinalCohortLifeGenerationAllowed !== false ||
      manifest.lifeGenerationBoundary?.replacementCognitionCallsAllowed !== false) {
    fail("replacement life cognition boundary drift");
  }
  if (manifest.analysisAuthorityBoundary?.freshGenomeCeilingRequired !== true ||
      manifest.analysisAuthorityBoundary?.oldG5G6MayBeSilentlyReinterpreted !== false) {
    fail("replacement G2 ceiling / G5-G6 reconciliation boundary drift");
  }
  if (existsSync(absolute(RESULT_PATH))) fail(`replacement G1 familiarity result already exists: ${RESULT_PATH}`);

  return Object.freeze({
    status: "CLEAR_REPLACEMENT_G1_CANDIDATES_ZERO_CALL",
    preflightVersion: REPLACEMENT_G1_PREFLIGHT_VERSION,
    replacementAttemptVersion: manifest.replacementAttemptVersion,
    candidateCount: candidates.length,
    candidates: Object.freeze(candidates),
    originMix: Object.freeze({ deNovo, syntheticLineage: synthetic }),
    familiarityProvider: manifest.familiarityPolicy.provider,
    familiarityModel: manifest.familiarityPolicy.model,
    familiarityCallsAuthorizedNext: 5,
    finalLifeCognitionAuthorized: false,
    replacementGenomeAuthored: false,
    replacementIdentitiesAssigned: false,
    resultPath: RESULT_PATH,
  });
}

function print(result) {
  process.stdout.write("PR39 REPLACEMENT G1 PREFLIGHT: CLEAR — ZERO CALL\n\n");
  process.stdout.write(`Version: ${result.preflightVersion}\n`);
  process.stdout.write(`Replacement attempt: ${result.replacementAttemptVersion}\n`);
  process.stdout.write(`Candidate Worlds: ${result.candidateCount}\n`);
  for (const candidate of result.candidates) {
    process.stdout.write(`${candidate.slot}. ${candidate.worldSpecId} · ${candidate.candidateDigest}\n`);
  }
  process.stdout.write(`Origin mix: ${result.originMix.deNovo} de_novo + ${result.originMix.syntheticLineage} synthetic_lineage\n`);
  process.stdout.write("Replacement genomes: absent and unauthorized until G1 finalization.\n");
  process.stdout.write("Replacement Thread/Genesis identities: unassigned.\n");
  process.stdout.write("Final-life cognition: unauthorized until Gate-G(2) CLEAR.\n");
  process.stdout.write(`Cold familiarity next: ${result.familiarityCallsAuthorizedNext} stateless ${result.familiarityProvider}/${result.familiarityModel} calls.\n`);
  process.stdout.write(`Result path: ${result.resultPath} [absent]\n`);
  process.stdout.write("\nPreflight made zero provider calls.\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 0 && !(args.length === 1 && args[0] === "--preflight")) {
    throw new Error("usage: genesis-replacement-g1-preflight.mjs [--preflight]");
  }
  print(verifyReplacementG1Preflight());
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

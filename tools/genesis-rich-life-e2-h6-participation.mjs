#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { richCounterpartPolicyWitness } from "../services/world-kernel/src/genesis-rich-participation-policy.mjs";
import {
  E2_A0_MAX_CANDIDATE_ATTEMPTS,
  runE2A0BaselineWithCandidateAttempts,
} from "./genesis-rich-life-e2-a0-candidate-driver.mjs";
import {
  E2_A0_DEFAULT_SEEDS,
  E2_A0_EPISODES,
  E2_A0_STRUCTURES_PER_WINDOW,
} from "./genesis-rich-life-e2-a0.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";

export const E2_H6_PARTICIPATION_EVIDENCE_VERSION = "pr39-slice-e2-h6-participation-v1";
export const E2_H6_PARTICIPATION_PROTOCOL_VERSION = "pr39-slice-e2-h6-participation-protocol-v1";
export const E2_H6_PARTICIPATION_ARM = "H6_counterpart_participation_correction";

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

export function asE2H6ParticipationEvidence(candidate) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError("H6 participation source evidence must be an object");
  }
  const source = structuredClone(candidate);
  return Object.freeze({
    ...source,
    evidenceVersion: E2_H6_PARTICIPATION_EVIDENCE_VERSION,
    protocolVersion: E2_H6_PARTICIPATION_PROTOCOL_VERSION,
    arm: E2_H6_PARTICIPATION_ARM,
    pairedBaselineArm: "A0_current_pass_a_failed",
    pairedBaselineNote: "A0 is the frozen failed baseline on the same D1/D2 worlds, seeds, 10 developmental strata and 9-offer schedules. It is not rerun after this correction.",
    correction: Object.freeze({
      kind: "mechanical_affordance_truthfulness_and_retry_scope",
      counterpartPolicyWitness: richCounterpartPolicyWitness(),
      recordLocalRetry: Object.freeze({
        maxGeneratedVersionsPerRecord: 3,
        rejectedRecordVisibleToRetryCognition: false,
        qualitySignalVisibleToRetryCognition: false,
        semanticInputPolicy: "same_frozen_pass_a_input_plus_failed_mechanical_gate",
      }),
      explicitlyNotChanged: Object.freeze([
        "WorldSpecs",
        "Fibre seeds",
        "developmental strata",
        "EventStructurePool v2 content",
        "nine-offer schedules",
        "genome blindness",
        "memory/meaning blindness",
        "richness admission policy",
      ]),
    }),
    generator: source.generator === undefined
      ? undefined
      : Object.freeze({
        ...source.generator,
        counterpartPolicyWitness: richCounterpartPolicyWitness(),
      }),
    admissionVerdict: null,
  });
}

export async function runE2H6Participation({ provider, model, onProgress = null } = {}) {
  try {
    const result = await runE2A0BaselineWithCandidateAttempts({
      provider,
      model,
      seeds: E2_A0_DEFAULT_SEEDS,
      worlds: E2_DIAGNOSTIC_WORLDS,
      onProgress,
    });
    return asE2H6ParticipationEvidence(result);
  } catch (error) {
    if (error?.e2A0FailureArtifact !== undefined) {
      error.e2H6ParticipationFailureArtifact = asE2H6ParticipationEvidence(error.e2A0FailureArtifact);
    }
    throw error;
  }
}

function progressPrinter(event) {
  if (event.type === "candidate_attempt_start") {
    process.stderr.write(`[E2 H6 ${event.worldId} run ${event.runOrdinal}/3] candidate attempt ${event.candidateAttemptNumber}/${event.maxCandidateAttempts}\n`);
    return;
  }
  if (event.type === "candidate_attempt_failed") {
    process.stderr.write(`[E2 H6 ${event.worldId} run ${event.runOrdinal}/3] candidate attempt ${event.candidateAttemptNumber} rejected · ${event.failure.failedGate ?? event.failure.code ?? "validation"}: ${event.failure.message}\n`);
    return;
  }
  const prefix = `[E2 H6 ${event.worldId} run ${event.runOrdinal}/3 · attempt ${event.candidateAttemptNumber} · episode ${String(event.ordinal).padStart(2, "0")}/${event.total}]`;
  if (event.type === "episode_start") {
    process.stderr.write(`${prefix} age ${event.developmentalWindow.minAge}-${event.developmentalWindow.maxAge} ... `);
  } else if (event.type === "record_repair") {
    process.stderr.write(`\n  repair ${event.repair.failedGate} ... `);
  } else if (event.type === "record_retry") {
    process.stderr.write(`\n  retry record ${event.recordRetry.failedGate} ... `);
  } else if (event.type === "episode_complete") {
    const encounter = event.episode.intellectualEncounter?.kind ?? "none";
    process.stderr.write(`✓ ${event.elapsedMs} ms · structure=${event.episode.structureRef ?? "world-emergent"} · encounter=${encounter} · repairs=${event.repairs} · retries=${event.recordRetries}\n`);
  }
}

function printSummary(result) {
  if (result.status !== "complete") return;
  for (const world of result.worlds) {
    process.stdout.write(`${world.worldId}:\n`);
    for (const life of world.lives) {
      const c = life.e2Characterization;
      process.stdout.write(`  ${life.seed}: attempts=${life.candidateAttemptsPerThread} · places=${c.uniquePlaces} · structures=${c.uniqueStructures} · intellectual-structures=${c.selectedIntellectualStructureEvents} · encounters=${c.intellectualEncounterEvents} · repairs=${c.repairCount} · retries=${c.recordRetryCount}\n`);
    }
    for (const pair of world.betweenLife.pairs) {
      process.stdout.write(`  pair ${pair.leftSeed}/${pair.rightSeed}: placeJ=${pair.placeRefs?.value ?? "n/a"} · roleJ=${pair.participantRoles?.value ?? "n/a"} · structureJ=${pair.structureRefs?.value ?? "n/a"} · sourceJ=${pair.intellectualSubjectRefs?.value ?? "n/a"}\n`);
    }
  }
  process.stdout.write(`Candidate attempts: ${result.rejectionProfile.candidateAttempts} · rejected attempts: ${result.rejectionProfile.candidateAttemptFailures}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage: npm run genesis:e2-h6-participation -- --provider <openai|google> --model <model> [--out <file>] [--overwrite]\n");
    return;
  }
  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const outputPath = readArg(argv, "--out");
  const overwrite = argv.includes("--overwrite");
  if (!["openai", "google"].includes(provider)) throw new Error("--provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new Error("--model is required");
  if (outputPath !== null && existsSync(outputPath) && !overwrite) throw new Error(`output exists: ${outputPath}; pass --overwrite to replace it`);

  process.stderr.write(`E2 H6 PARTICIPATION: START · ${E2_DIAGNOSTIC_WORLDS.length} worlds · ${E2_A0_DEFAULT_SEEDS.length} lives/world · ${E2_A0_EPISODES} episodes/life · ${E2_A0_STRUCTURES_PER_WINDOW} offers/window · max ${E2_A0_MAX_CANDIDATE_ATTEMPTS} candidate attempts/thread\n`);
  try {
    const result = await runE2H6Participation({ provider, model, onProgress: progressPrinter });
    const text = `${JSON.stringify(result, null, 2)}\n`;
    if (outputPath !== null) writeFileSync(outputPath, text, "utf8");
    else process.stdout.write(text);
    printSummary(result);
    if (outputPath !== null) process.stdout.write(`Artifact: ${outputPath}\n`);
  } catch (error) {
    const artifact = error?.e2H6ParticipationFailureArtifact ?? null;
    if (artifact !== null) {
      const text = `${JSON.stringify(artifact, null, 2)}\n`;
      if (outputPath !== null) {
        writeFileSync(outputPath, text, "utf8");
        process.stderr.write(`Failure artifact: ${outputPath}\n`);
      } else process.stdout.write(text);
    }
    throw error;
  }
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`E2 H6 PARTICIPATION: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

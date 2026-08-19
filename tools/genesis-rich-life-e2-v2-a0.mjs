#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  eventStructurePoolV2Digest,
} from "../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import {
  GENESIS_RICH_PASS_A_RECORD_RETRY_CONSTRAINT_VERSION,
  richPassAPromptHash,
  richPassARecordRetryPromptHash,
  richPassARepairPromptHash,
  richPassASchemaHash,
} from "../services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import { richCounterpartPolicyWitness } from "../services/world-kernel/src/genesis-rich-participation-policy.mjs";
import {
  E2_A0_EPISODES,
  E2_A0_STRUCTURES_PER_WINDOW,
  buildE2A0Plan,
  characterizeE2BetweenLifeParticularity,
} from "./genesis-rich-life-e2-a0.mjs";
import {
  E2_A0_MAX_CANDIDATE_ATTEMPTS,
  runE2A0ThreadWithCandidateAttempts,
} from "./genesis-rich-life-e2-a0-candidate-driver.mjs";
import { E2_V2_WORLD_FIXTURE } from "./genesis-rich-life-e2-v2-world.mjs";

export const E2_V2_A0_EVIDENCE_VERSION = "pr39-slice-e2-v2-a0-fresh-world-v1";
export const E2_V2_A0_PROTOCOL_VERSION = "pr39-slice-e2-v2-a0-source-generation-v1";
export const E2_V2_A0_ARM = "A0_corrected_coupled_chooser_realizer";
export const E2_V2_A0_SEEDS = Object.freeze([
  "slice-e2-v2-seed-01",
  "slice-e2-v2-seed-02",
  "slice-e2-v2-seed-03",
]);

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

function createAdapter({ provider, model, observer }) {
  if (provider === "openai") return createOpenAIModelAdapter({ modelId: model, observer });
  if (provider === "google") return createGoogleModelAdapter({ modelId: model, observer });
  throw new TypeError(`unsupported provider ${provider}`);
}

function pairMean(betweenLife, field) {
  const values = betweenLife.pairs
    .map((pair) => pair[field]?.value ?? null)
    .filter((value) => value !== null);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function generatorWitness() {
  return Object.freeze({
    eventStructurePoolDigest: eventStructurePoolV2Digest(GENESIS_EVENT_STRUCTURE_POOL_V2),
    structuresPerWindow: E2_A0_STRUCTURES_PER_WINDOW,
    episodesPerLife: E2_A0_EPISODES,
    candidateAttemptsPerLife: E2_A0_MAX_CANDIDATE_ATTEMPTS,
    counterpartPolicyWitness: richCounterpartPolicyWitness(),
    schemaHash: richPassASchemaHash(),
    repairPromptHash: richPassARepairPromptHash(),
    recordRetryConstraintVersion: GENESIS_RICH_PASS_A_RECORD_RETRY_CONSTRAINT_VERSION,
    a0PromptHash: richPassAPromptHash(),
    a0RecordRetryPromptHash: richPassARecordRetryPromptHash(),
  });
}

export function buildE2V2A0Preflight() {
  const schedules = E2_V2_A0_SEEDS.map((seed) => {
    const plan = buildE2A0Plan(E2_V2_WORLD_FIXTURE, seed);
    return Object.freeze({
      seed,
      offeredWindows: Object.freeze(plan.map(({ developmentalWindow, offeredEntries }) => Object.freeze({
        windowId: developmentalWindow.windowId,
        offeredStructureIds: Object.freeze(offeredEntries.map((entry) => entry.structure.structureId).sort()),
      }))),
    });
  });
  const witness = Object.freeze({
    protocolVersion: E2_V2_A0_PROTOCOL_VERSION,
    evidenceVersion: E2_V2_A0_EVIDENCE_VERSION,
    worldId: E2_V2_WORLD_FIXTURE.id,
    worldSpecId: E2_V2_WORLD_FIXTURE.worldSpec.worldSpecId,
    worldSpecDigest: digest(E2_V2_WORLD_FIXTURE.worldSpec),
    sourceFree: E2_V2_WORLD_FIXTURE.worldSpec.worldAuthorship.sourcesConsulted.length === 0,
    firstModelUseBurnsWorld: true,
    arm: E2_V2_A0_ARM,
    seeds: E2_V2_A0_SEEDS,
    lives: 3,
    episodesPerLife: E2_A0_EPISODES,
    candidateAttemptsPerLife: E2_A0_MAX_CANDIDATE_ATTEMPTS,
    sourceSelectionAfterGeneration: false,
    allCompletedLivesMustFlowIntoN2: true,
    generatorWitness: generatorWitness(),
    schedules: Object.freeze(schedules),
  });
  return Object.freeze({
    ...witness,
    preflightDigest: digest(witness),
  });
}

function failureSummary(error) {
  return Object.freeze({
    name: error?.name ?? null,
    code: error?.code ?? null,
    gate: error?.gate ?? null,
    message: error?.message ?? String(error),
    worldId: error?.worldId ?? null,
    seed: error?.seed ?? null,
    runOrdinal: error?.runOrdinal ?? null,
    candidateFailures: Array.isArray(error?.candidateFailures) ? structuredClone(error.candidateFailures) : [],
  });
}

export async function runE2V2A0Source({ provider, model, onProgress = null } = {}) {
  if (!["openai", "google"].includes(provider)) throw new TypeError("provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new TypeError("model is required");
  const preflight = buildE2V2A0Preflight();
  const modelEvents = [];
  const adapter = createAdapter({ provider, model, observer: (event) => modelEvents.push(event) });
  const lives = [];
  try {
    for (let index = 0; index < E2_V2_A0_SEEDS.length; index += 1) {
      const seed = E2_V2_A0_SEEDS[index];
      lives.push(await runE2A0ThreadWithCandidateAttempts({
        worldFixture: E2_V2_WORLD_FIXTURE,
        provider,
        model,
        seed,
        runOrdinal: index + 1,
        adapter,
        onProgress,
      }));
    }
  } catch (error) {
    error.e2V2A0FailureArtifact = Object.freeze({
      evidenceVersion: E2_V2_A0_EVIDENCE_VERSION,
      protocolVersion: E2_V2_A0_PROTOCOL_VERSION,
      status: "failed",
      developmentOnly: true,
      burnedForFinalCohort: true,
      generatedAt: new Date().toISOString(),
      provider,
      model,
      arm: E2_V2_A0_ARM,
      preflight,
      completedLives: Object.freeze(structuredClone(lives)),
      modelEvents: Object.freeze(structuredClone(modelEvents)),
      failure: failureSummary(error),
      admissionVerdict: null,
    });
    throw error;
  }
  const betweenLife = characterizeE2BetweenLifeParticularity(lives);
  return Object.freeze({
    evidenceVersion: E2_V2_A0_EVIDENCE_VERSION,
    protocolVersion: E2_V2_A0_PROTOCOL_VERSION,
    status: "complete",
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    provider,
    model,
    arm: E2_V2_A0_ARM,
    worldId: E2_V2_WORLD_FIXTURE.id,
    worldSpecId: E2_V2_WORLD_FIXTURE.worldSpec.worldSpecId,
    preflight,
    lives: Object.freeze(structuredClone(lives)),
    betweenLife,
    meanPairwiseJaccard: Object.freeze({
      placeRefs: pairMean(betweenLife, "placeRefs"),
      participantRoles: pairMean(betweenLife, "participantRoles"),
      structureRefs: pairMean(betweenLife, "structureRefs"),
      intellectualSubjectRefs: pairMean(betweenLife, "intellectualSubjectRefs"),
    }),
    modelEvents: Object.freeze(structuredClone(modelEvents)),
    admissionVerdict: null,
  });
}

function progressPrinter(event) {
  if (event.type === "candidate_attempt_start") {
    process.stderr.write(`[E2-V2 A0 seed=${event.seed}] candidate ${event.candidateAttemptNumber}/${event.maxCandidateAttempts}\n`);
  } else if (event.type === "candidate_attempt_failed") {
    process.stderr.write(`[E2-V2 A0 seed=${event.seed}] candidate ${event.candidateAttemptNumber} rejected · ${event.failure.failedGate ?? event.failure.code ?? "validation"}: ${event.failure.message}\n`);
  } else if (event.type === "episode_start") {
    process.stderr.write(`[E2-V2 A0 seed=${event.seed} episode=${String(event.ordinal).padStart(2, "0")}/${event.total}] ... `);
  } else if (event.type === "record_repair") {
    process.stderr.write(`\n  repair ${event.repair.failedGate} ... `);
  } else if (event.type === "record_retry") {
    process.stderr.write(`\n  retry ${event.recordRetry.failedGate} ... `);
  } else if (event.type === "episode_complete") {
    process.stderr.write(`✓ structure=${event.episode.structureRef ?? "world-emergent"} · encounter=${event.episode.intellectualEncounter?.kind ?? "none"} · repairs=${event.repairs} · retries=${event.recordRetries}\n`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage:\n  npm run genesis:e2-v2-a0 -- --preflight\n  npm run genesis:e2-v2-a0 -- --provider <openai|google> --model <model> --out <file>\n");
    return;
  }
  if (argv.includes("--preflight")) {
    process.stdout.write(`${JSON.stringify(buildE2V2A0Preflight(), null, 2)}\n`);
    return;
  }
  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const outputPath = readArg(argv, "--out");
  if (outputPath === null) throw new TypeError("E2-V2 burned source generation requires --out <file>");
  if (existsSync(outputPath)) throw new Error(`E2-V2 output already exists: ${outputPath}; this fresh world must not be overwritten or rerun`);
  process.stderr.write(`E2-V2 A0: START · fresh world=${E2_V2_WORLD_FIXTURE.id} · 3 lives · ${E2_A0_EPISODES} episodes/life\n`);
  try {
    const result = await runE2V2A0Source({ provider, model, onProgress: progressPrinter });
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    process.stdout.write(`E2-V2 A0: complete · structureJ=${result.meanPairwiseJaccard.structureRefs} · placeJ=${result.meanPairwiseJaccard.placeRefs}\n`);
    process.stdout.write(`Artifact: ${outputPath}\n`);
  } catch (error) {
    if (error.e2V2A0FailureArtifact !== undefined) {
      writeFileSync(outputPath, `${JSON.stringify(error.e2V2A0FailureArtifact, null, 2)}\n`, "utf8");
      process.stderr.write(`Failure artifact: ${outputPath}\n`);
    }
    throw error;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`E2-V2 A0: FAILED\n${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import { GenesisPassAValidationError } from "../services/world-kernel/src/genesis-pass-a-domain.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  eventStructurePoolV2Digest,
} from "../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import {
  richPassAPromptHash,
  richPassARecordRetryPromptHash,
  richPassARepairPromptHash,
  richPassASchemaHash,
} from "../services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import {
  E2_A0_DEFAULT_SEEDS,
  E2_A0_EPISODES,
  E2_A0_PROTOCOL_VERSION,
  E2_A0_STRUCTURES_PER_WINDOW,
  characterizeE2BetweenLifeParticularity,
  runE2A0Life,
} from "./genesis-rich-life-e2-a0.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";

export const E2_A0_CANDIDATE_EVIDENCE_VERSION = "pr39-slice-e2-a0-baseline-v2";
export const E2_A0_MAX_CANDIDATE_ATTEMPTS = 3;

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

function attemptAdapter(adapter, candidateAttemptNumber) {
  return Object.freeze({
    async invoke(request) {
      return adapter.invoke({
        ...request,
        clientRequestId: `${request.clientRequestId}:candidate:${candidateAttemptNumber}`,
      });
    },
  });
}

function candidateFailureEvidence(error, candidateAttemptNumber) {
  return Object.freeze({
    candidateAttemptNumber,
    code: error?.code ?? null,
    failedGate: error?.gate ?? null,
    message: error?.message ?? String(error),
    causeGate: error?.cause?.gate ?? null,
    rejectedRecord: error?.record === undefined || error?.record === null
      ? null
      : structuredClone(error.record),
    calls: Array.isArray(error?.calls) ? structuredClone(error.calls) : [],
    repairs: Array.isArray(error?.repairEvidence) ? structuredClone(error.repairEvidence) : [],
    recordRetries: Array.isArray(error?.recordRetryEvidence) ? structuredClone(error.recordRetryEvidence) : [],
  });
}

function failureCounts(failures) {
  const byGate = {};
  let recordRepairs = 0;
  let recordRetries = 0;
  for (const failure of failures) {
    const gate = failure.failedGate ?? "unknown";
    byGate[gate] = (byGate[gate] ?? 0) + 1;
    recordRepairs += failure.repairs.length;
    recordRetries += failure.recordRetries.length;
  }
  return Object.freeze({
    candidateAttemptFailures: failures.length,
    candidateAttemptFailuresByGate: Object.freeze(byGate),
    rejectedAttemptRecordRepairs: recordRepairs,
    rejectedAttemptRecordRetries: recordRetries,
  });
}

export async function runE2A0ThreadWithCandidateAttempts({
  worldFixture,
  provider,
  model,
  seed,
  runOrdinal,
  adapter,
  candidateRunner = runE2A0Life,
  maxCandidateAttempts = E2_A0_MAX_CANDIDATE_ATTEMPTS,
  onProgress = null,
}) {
  if (!Number.isSafeInteger(maxCandidateAttempts) || maxCandidateAttempts < 1) {
    throw new TypeError("maxCandidateAttempts must be a positive integer");
  }
  const failures = [];
  for (let candidateAttemptNumber = 1; candidateAttemptNumber <= maxCandidateAttempts; candidateAttemptNumber += 1) {
    if (typeof onProgress === "function") onProgress({
      type: "candidate_attempt_start",
      worldId: worldFixture.id,
      seed,
      runOrdinal,
      candidateAttemptNumber,
      maxCandidateAttempts,
    });
    try {
      const life = await candidateRunner({
        worldFixture,
        provider,
        model,
        seed,
        runOrdinal,
        adapter: attemptAdapter(adapter, candidateAttemptNumber),
        onProgress: typeof onProgress === "function"
          ? (event) => onProgress({ ...event, candidateAttemptNumber, maxCandidateAttempts })
          : null,
      });
      const rejectionProfile = failureCounts(failures);
      return Object.freeze({
        ...structuredClone(life),
        candidateAttemptNumber,
        candidateAttemptsPerThread: candidateAttemptNumber,
        candidateFailures: Object.freeze(structuredClone(failures)),
        rejectionProfile,
      });
    } catch (error) {
      if (!(error instanceof GenesisPassAValidationError)) throw error;
      const failure = candidateFailureEvidence(error, candidateAttemptNumber);
      failures.push(failure);
      if (typeof onProgress === "function") onProgress({
        type: "candidate_attempt_failed",
        worldId: worldFixture.id,
        seed,
        runOrdinal,
        candidateAttemptNumber,
        maxCandidateAttempts,
        failure,
      });
      if (candidateAttemptNumber >= maxCandidateAttempts) {
        const exhausted = new GenesisPassAValidationError(
          "candidate_attempts_exhausted",
          `E2 A0 candidate Genesis exhausted after ${maxCandidateAttempts} attempts`,
          { record: failure.rejectedRecord },
        );
        exhausted.cause = error;
        exhausted.candidateFailures = structuredClone(failures);
        exhausted.worldId = worldFixture.id;
        exhausted.seed = seed;
        exhausted.runOrdinal = runOrdinal;
        throw exhausted;
      }
    }
  }
  throw new Error("unreachable E2 A0 candidate-attempt state");
}

function aggregateRejectionProfile(lives) {
  const byGate = {};
  let candidateAttemptFailures = 0;
  let candidateAttempts = 0;
  let rejectedAttemptRecordRepairs = 0;
  let rejectedAttemptRecordRetries = 0;
  for (const life of lives) {
    candidateAttempts += life.candidateAttemptsPerThread;
    candidateAttemptFailures += life.rejectionProfile.candidateAttemptFailures;
    rejectedAttemptRecordRepairs += life.rejectionProfile.rejectedAttemptRecordRepairs;
    rejectedAttemptRecordRetries += life.rejectionProfile.rejectedAttemptRecordRetries;
    for (const [gate, count] of Object.entries(life.rejectionProfile.candidateAttemptFailuresByGate)) {
      byGate[gate] = (byGate[gate] ?? 0) + count;
    }
  }
  return Object.freeze({
    candidateAttempts,
    candidateAttemptFailures,
    candidateAttemptFailuresByGate: Object.freeze(byGate),
    rejectedAttemptRecordRepairs,
    rejectedAttemptRecordRetries,
  });
}

function buildFailureArtifact({ provider, model, seeds, modelEvents, completedLives, error }) {
  return Object.freeze({
    evidenceVersion: E2_A0_CANDIDATE_EVIDENCE_VERSION,
    protocolVersion: E2_A0_PROTOCOL_VERSION,
    status: "failed",
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    arm: "A0_current_pass_a",
    provider,
    model,
    seeds: Object.freeze([...seeds]),
    candidateAttemptPolicy: Object.freeze({ maxCandidateAttemptsPerThread: E2_A0_MAX_CANDIDATE_ATTEMPTS }),
    generator: Object.freeze({
      promptHash: richPassAPromptHash(),
      repairPromptHash: richPassARepairPromptHash(),
      recordRetryPromptHash: richPassARecordRetryPromptHash(),
      schemaHash: richPassASchemaHash(),
      eventStructurePoolDigest: eventStructurePoolV2Digest(GENESIS_EVENT_STRUCTURE_POOL_V2),
      structuresPerWindow: E2_A0_STRUCTURES_PER_WINDOW,
      modelEvents: structuredClone(modelEvents),
    }),
    completedLives: structuredClone(completedLives),
    rejectionProfile: aggregateRejectionProfile(completedLives),
    failure: Object.freeze({
      worldId: error?.worldId ?? null,
      seed: error?.seed ?? null,
      runOrdinal: error?.runOrdinal ?? null,
      code: error?.code ?? null,
      gate: error?.gate ?? null,
      message: error?.message ?? String(error),
      causeGate: error?.cause?.gate ?? null,
      candidateFailures: Array.isArray(error?.candidateFailures) ? structuredClone(error.candidateFailures) : [],
    }),
    admissionVerdict: null,
  });
}

export async function runE2A0BaselineWithCandidateAttempts({
  provider,
  model,
  seeds = E2_A0_DEFAULT_SEEDS,
  worlds = E2_DIAGNOSTIC_WORLDS,
  adapterOverride = null,
  onProgress = null,
} = {}) {
  if (!["openai", "google"].includes(provider) && adapterOverride === null) throw new TypeError("provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new TypeError("model is required");
  if (!Array.isArray(seeds) || seeds.length < 3 || seeds.some((seed) => typeof seed !== "string" || seed.trim() === "")) {
    throw new TypeError("E2 A0 requires at least three non-empty seeds");
  }

  const modelEvents = [];
  const adapter = adapterOverride ?? createAdapter({
    provider,
    model,
    observer: (event) => modelEvents.push(event),
  });
  const lives = [];

  try {
    for (const worldFixture of worlds) {
      for (let index = 0; index < seeds.length; index += 1) {
        lives.push(await runE2A0ThreadWithCandidateAttempts({
          worldFixture,
          provider,
          model,
          seed: seeds[index],
          runOrdinal: index + 1,
          adapter,
          onProgress,
        }));
      }
    }
  } catch (error) {
    if (error instanceof GenesisPassAValidationError) {
      error.e2A0FailureArtifact = buildFailureArtifact({
        provider,
        model,
        seeds,
        modelEvents,
        completedLives: lives,
        error,
      });
    }
    throw error;
  }

  const byWorld = worlds.map((worldFixture) => {
    const worldLives = lives.filter((life) => life.worldId === worldFixture.id);
    return Object.freeze({
      worldId: worldFixture.id,
      worldSpecId: worldFixture.worldSpec.worldSpecId,
      worldSpecDigest: digest(worldFixture.worldSpec),
      lives: Object.freeze(structuredClone(worldLives)),
      betweenLife: characterizeE2BetweenLifeParticularity(worldLives),
    });
  });

  return Object.freeze({
    evidenceVersion: E2_A0_CANDIDATE_EVIDENCE_VERSION,
    protocolVersion: E2_A0_PROTOCOL_VERSION,
    status: "complete",
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    arm: "A0_current_pass_a",
    originMode: "de_novo",
    originModeNote: "Pass A cognition is origin-mode blind; de_novo avoids irrelevant lineage evidence in this E2 mechanism baseline.",
    provider,
    model,
    seeds: Object.freeze([...seeds]),
    candidateAttemptPolicy: Object.freeze({ maxCandidateAttemptsPerThread: E2_A0_MAX_CANDIDATE_ATTEMPTS }),
    generator: Object.freeze({
      promptHash: richPassAPromptHash(),
      repairPromptHash: richPassARepairPromptHash(),
      recordRetryPromptHash: richPassARecordRetryPromptHash(),
      schemaHash: richPassASchemaHash(),
      eventStructurePoolDigest: eventStructurePoolV2Digest(GENESIS_EVENT_STRUCTURE_POOL_V2),
      structuresPerWindow: E2_A0_STRUCTURES_PER_WINDOW,
      modelEvents,
    }),
    worlds: Object.freeze(byWorld),
    rejectionProfile: aggregateRejectionProfile(lives),
    admissionVerdict: null,
  });
}

function progressPrinter(event) {
  if (event.type === "candidate_attempt_start") {
    process.stderr.write(`[E2 A0 ${event.worldId} run ${event.runOrdinal}/3] candidate attempt ${event.candidateAttemptNumber}/${event.maxCandidateAttempts}\n`);
    return;
  }
  if (event.type === "candidate_attempt_failed") {
    process.stderr.write(`[E2 A0 ${event.worldId} run ${event.runOrdinal}/3] candidate attempt ${event.candidateAttemptNumber} rejected · ${event.failure.failedGate ?? event.failure.code ?? "validation"}: ${event.failure.message}\n`);
    return;
  }
  const prefix = `[E2 A0 ${event.worldId} run ${event.runOrdinal}/3 · attempt ${event.candidateAttemptNumber} · episode ${String(event.ordinal).padStart(2, "0")}/${event.total}]`;
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
    process.stdout.write("Usage: npm run genesis:e2-a0 -- --provider <openai|google> --model <model> [--out <file>] [--overwrite]\n");
    return;
  }
  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const outputPath = readArg(argv, "--out");
  const overwrite = argv.includes("--overwrite");
  if (!["openai", "google"].includes(provider)) throw new Error("--provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new Error("--model is required");
  if (outputPath !== null && existsSync(outputPath) && !overwrite) throw new Error(`output exists: ${outputPath}; pass --overwrite to replace it`);

  process.stderr.write(`E2 A0 BASELINE: START · ${E2_DIAGNOSTIC_WORLDS.length} worlds · ${E2_A0_DEFAULT_SEEDS.length} lives/world · ${E2_A0_EPISODES} episodes/life · max ${E2_A0_MAX_CANDIDATE_ATTEMPTS} candidate attempts/thread\n`);
  try {
    const result = await runE2A0BaselineWithCandidateAttempts({ provider, model, onProgress: progressPrinter });
    const text = `${JSON.stringify(result, null, 2)}\n`;
    if (outputPath !== null) writeFileSync(outputPath, text, "utf8");
    else process.stdout.write(text);
    printSummary(result);
    if (outputPath !== null) process.stdout.write(`Artifact: ${outputPath}\n`);
  } catch (error) {
    const artifact = error?.e2A0FailureArtifact ?? null;
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
    process.stderr.write(`E2 A0 BASELINE: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

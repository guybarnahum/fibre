#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
  richPassARepairPromptHash,
  richPassASchemaHash,
  richPassASelectedOpportunityPromptHash,
  richPassASelectedOpportunityRetryPromptHash,
} from "../services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import { richCounterpartPolicyWitness } from "../services/world-kernel/src/genesis-rich-participation-policy.mjs";
import {
  E2_A0_DEFAULT_SEEDS,
  E2_A0_EPISODES,
  E2_A0_STRUCTURES_PER_WINDOW,
  buildE2A0Plan,
  characterizeE2BetweenLifeParticularity,
} from "./genesis-rich-life-e2-a0.mjs";
import {
  E2_A0_MAX_CANDIDATE_ATTEMPTS,
  runE2A0ThreadWithCandidateAttempts,
} from "./genesis-rich-life-e2-a0-candidate-driver.mjs";
import {
  E2_A2B_ARM,
  E2_A2B_EVIDENCE_VERSION,
  E2_A2B_PROTOCOL_VERSION,
  buildE2A2bSelectorInput,
  e2A2bSelectorPromptHash,
  e2A2bSelectorSchemaHash,
  freezeE2A2bSchedule,
  normalizeE2A2bPlausibility,
  plausibleRoutes,
  runE2A2bLife,
  seededUniformRouteDraw,
} from "./genesis-rich-life-e2-a2b.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";

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

export function rehydrateE2A2bSchedule({ worldFixture, seed, scheduleEvidence }) {
  if (scheduleEvidence === null || typeof scheduleEvidence !== "object" || Array.isArray(scheduleEvidence)) {
    throw new TypeError("A2b resume selector schedule must be an object");
  }
  if (scheduleEvidence.worldId !== worldFixture.id || scheduleEvidence.seed !== seed) {
    throw new TypeError("A2b resume selector schedule world/seed mismatch");
  }
  const plan = buildE2A0Plan(worldFixture, seed);
  if (!Array.isArray(scheduleEvidence.evidence) || scheduleEvidence.evidence.length !== plan.length) {
    throw new TypeError("A2b resume selector schedule does not cover the full frozen life");
  }
  const selections = [];
  const evidence = [];
  for (let index = 0; index < plan.length; index += 1) {
    const ordinal = index + 1;
    const { developmentalWindow, offeredEntries } = plan[index];
    const prior = scheduleEvidence.evidence[index];
    if (prior.ordinal !== ordinal) throw new TypeError(`A2b resume selector ordinal mismatch at ${ordinal}`);
    const offeredStructureIds = offeredEntries.map((entry) => entry.structure.structureId).sort();
    if (canonicalJson(prior.offeredStructureIds) !== canonicalJson(offeredStructureIds)) {
      throw new TypeError(`A2b resume offered structures changed at selector ${ordinal}`);
    }
    const selectorInput = buildE2A2bSelectorInput({
      worldFixture,
      developmentalWindow,
      offeredEntries,
      ordinal,
      total: plan.length,
    });
    if (prior.selectorInputDigest !== digest(selectorInput)) {
      throw new TypeError(`A2b resume selector input digest changed at ${ordinal}`);
    }
    const plausibility = normalizeE2A2bPlausibility(prior.plausibility, offeredEntries);
    const routes = plausibleRoutes(plausibility);
    if (canonicalJson(prior.routes) !== canonicalJson(routes)) {
      throw new TypeError(`A2b resume plausible routes changed at selector ${ordinal}`);
    }
    const draw = seededUniformRouteDraw({ worldId: worldFixture.id, seed, ordinal, routes });
    if (canonicalJson(prior.draw) !== canonicalJson(draw)) {
      throw new TypeError(`A2b resume seeded draw changed at selector ${ordinal}`);
    }
    if (canonicalJson(prior.selection) !== canonicalJson(draw.chosenRoute)) {
      throw new TypeError(`A2b resume selected route changed at selector ${ordinal}`);
    }
    selections.push(Object.freeze(structuredClone(draw.chosenRoute)));
    evidence.push(Object.freeze(structuredClone(prior)));
  }
  const scheduleDigest = digest({
    selections,
    evidence: evidence.map(({ plausibility, draw }) => ({ plausibility, draw })),
  });
  if (scheduleEvidence.scheduleDigest !== scheduleDigest) {
    throw new TypeError("A2b resume selector schedule digest mismatch");
  }
  return Object.freeze({
    plan,
    selections: Object.freeze(selections),
    evidence: Object.freeze(evidence),
    scheduleDigest,
  });
}

function validateResumeArtifact(resumeArtifact, { provider, model }) {
  if (resumeArtifact === null) return;
  if (typeof resumeArtifact !== "object" || Array.isArray(resumeArtifact)) throw new TypeError("A2b resume artifact must be an object");
  if (resumeArtifact.arm !== E2_A2B_ARM) throw new TypeError("A2b resume artifact arm mismatch");
  if (resumeArtifact.protocolVersion !== E2_A2B_PROTOCOL_VERSION) throw new TypeError("A2b resume protocol mismatch");
  if (resumeArtifact.status !== "failed") throw new TypeError("A2b resume requires a failed source artifact");
  if (resumeArtifact.provider !== provider || resumeArtifact.model !== model) throw new TypeError("A2b resume provider/model mismatch");
  if (!Array.isArray(resumeArtifact.plausibility?.schedules)) throw new TypeError("A2b resume artifact lacks plausibility schedules");
  if (!Array.isArray(resumeArtifact.completedLives)) throw new TypeError("A2b resume artifact lacks completedLives");
}

function keyMatches(candidate, worldId, seed, runOrdinal) {
  return candidate.worldId === worldId && candidate.seed === seed && candidate.runOrdinal === runOrdinal;
}

function buildResumeWitness(resumeArtifact, reusedCompletedLives, reusedSchedules) {
  if (resumeArtifact === null) return null;
  return Object.freeze({
    sourceEvidenceVersion: resumeArtifact.evidenceVersion ?? null,
    sourceProtocolVersion: resumeArtifact.protocolVersion ?? null,
    sourceGeneratedAt: resumeArtifact.generatedAt ?? null,
    sourceArtifactDigest: digest(resumeArtifact),
    reusedCompletedLives,
    reusedPlausibilitySchedules: reusedSchedules,
  });
}

function generatorEvidence(modelEvents) {
  return Object.freeze({
    selectedOpportunityPromptHash: richPassASelectedOpportunityPromptHash(),
    selectedOpportunityRetryPromptHash: richPassASelectedOpportunityRetryPromptHash(),
    repairPromptHash: richPassARepairPromptHash(),
    schemaHash: richPassASchemaHash(),
    recordRetryConstraintVersion: GENESIS_RICH_PASS_A_RECORD_RETRY_CONSTRAINT_VERSION,
    eventStructurePoolDigest: eventStructurePoolV2Digest(GENESIS_EVENT_STRUCTURE_POOL_V2),
    counterpartPolicyWitness: richCounterpartPolicyWitness(),
    structuresPerWindow: E2_A0_STRUCTURES_PER_WINDOW,
    modelEvents: structuredClone(modelEvents),
  });
}

function buildFailureArtifact({ provider, model, modelEvents, completedLives, schedules, error, resumeWitness }) {
  return Object.freeze({
    evidenceVersion: E2_A2B_EVIDENCE_VERSION,
    protocolVersion: E2_A2B_PROTOCOL_VERSION,
    status: "failed",
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    arm: E2_A2B_ARM,
    provider,
    model,
    seeds: Object.freeze([...E2_A0_DEFAULT_SEEDS]),
    resumedFrom: resumeWitness,
    plausibility: Object.freeze({ promptHash: e2A2bSelectorPromptHash(), schemaHash: e2A2bSelectorSchemaHash(), schedules: structuredClone(schedules) }),
    generator: generatorEvidence(modelEvents),
    completedLives: structuredClone(completedLives),
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

function aggregateRejectionProfile(lives) {
  const byGate = {};
  let candidateAttempts = 0;
  let candidateAttemptFailures = 0;
  let rejectedAttemptRecordRepairs = 0;
  let rejectedAttemptRecordRetries = 0;
  for (const life of lives) {
    candidateAttempts += life.candidateAttemptsPerThread;
    candidateAttemptFailures += life.rejectionProfile.candidateAttemptFailures;
    rejectedAttemptRecordRepairs += life.rejectionProfile.rejectedAttemptRecordRepairs;
    rejectedAttemptRecordRetries += life.rejectionProfile.rejectedAttemptRecordRetries ?? 0;
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

export async function runE2A2bDriver({ provider, model, adapterOverride = null, onProgress = null, resumeArtifact = null } = {}) {
  if (!["openai", "google"].includes(provider) && adapterOverride === null) throw new TypeError("provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new TypeError("model is required");
  validateResumeArtifact(resumeArtifact, { provider, model });

  const modelEvents = structuredClone(resumeArtifact?.generator?.modelEvents ?? []);
  const adapter = adapterOverride ?? createAdapter({ provider, model, observer: (event) => modelEvents.push(event) });
  const lives = structuredClone(resumeArtifact?.completedLives ?? []);
  const schedules = structuredClone(resumeArtifact?.plausibility?.schedules ?? []);
  let reusedCompletedLives = 0;
  let reusedSchedules = 0;

  try {
    for (const worldFixture of E2_DIAGNOSTIC_WORLDS) {
      for (let index = 0; index < E2_A0_DEFAULT_SEEDS.length; index += 1) {
        const seed = E2_A0_DEFAULT_SEEDS[index];
        const runOrdinal = index + 1;
        const completed = lives.find((life) => keyMatches(life, worldFixture.id, seed, runOrdinal));
        if (completed !== undefined) {
          reusedCompletedLives += 1;
          if (typeof onProgress === "function") onProgress({ type: "completed_life_reused", worldId: worldFixture.id, seed, runOrdinal });
          continue;
        }

        const priorSchedules = schedules.filter((schedule) => keyMatches(schedule, worldFixture.id, seed, runOrdinal));
        if (priorSchedules.length > 1) throw new TypeError("A2b resume artifact contains duplicate schedules");
        let frozenSchedule;
        if (priorSchedules.length === 1) {
          frozenSchedule = rehydrateE2A2bSchedule({ worldFixture, seed, scheduleEvidence: priorSchedules[0] });
          reusedSchedules += 1;
          if (typeof onProgress === "function") onProgress({
            type: "selector_schedule_reused", worldId: worldFixture.id, seed, runOrdinal, scheduleDigest: frozenSchedule.scheduleDigest,
          });
        } else {
          frozenSchedule = await freezeE2A2bSchedule({ worldFixture, seed, adapter, onProgress });
          schedules.push(Object.freeze({
            worldId: worldFixture.id,
            seed,
            runOrdinal,
            scheduleDigest: frozenSchedule.scheduleDigest,
            evidence: structuredClone(frozenSchedule.evidence),
          }));
        }

        const life = await runE2A0ThreadWithCandidateAttempts({
          worldFixture,
          provider,
          model,
          seed,
          runOrdinal,
          adapter,
          candidateRunner: (args) => runE2A2bLife({ ...args, frozenSchedule }),
          maxCandidateAttempts: E2_A0_MAX_CANDIDATE_ATTEMPTS,
          onProgress,
        });
        lives.push(life);
      }
    }
  } catch (error) {
    const resumeWitness = buildResumeWitness(resumeArtifact, reusedCompletedLives, reusedSchedules);
    error.e2A2bFailureArtifact = buildFailureArtifact({
      provider, model, modelEvents, completedLives: lives, schedules, error, resumeWitness,
    });
    throw error;
  }

  const worlds = E2_DIAGNOSTIC_WORLDS.map((worldFixture) => {
    const worldLives = lives.filter((life) => life.worldId === worldFixture.id);
    return Object.freeze({
      worldId: worldFixture.id,
      worldSpecId: worldFixture.worldSpec.worldSpecId,
      worldSpecDigest: digest(worldFixture.worldSpec),
      lives: Object.freeze(structuredClone(worldLives)),
      betweenLife: characterizeE2BetweenLifeParticularity(worldLives),
    });
  });
  const resumeWitness = buildResumeWitness(resumeArtifact, reusedCompletedLives, reusedSchedules);
  return Object.freeze({
    evidenceVersion: E2_A2B_EVIDENCE_VERSION,
    protocolVersion: E2_A2B_PROTOCOL_VERSION,
    status: "complete",
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    arm: E2_A2B_ARM,
    pairedControlArm: "H6_counterpart_participation_correction",
    pairedDiagnosticArm: "A2_stateless_opportunity_selection",
    provider,
    model,
    seeds: Object.freeze([...E2_A0_DEFAULT_SEEDS]),
    resumedFrom: resumeWitness,
    plausibility: Object.freeze({
      promptHash: e2A2bSelectorPromptHash(),
      schemaHash: e2A2bSelectorSchemaHash(),
      inputBoundary: Object.freeze({
        subjectVisible: false,
        householdShapeVisible: false,
        familyRelationsVisible: false,
        priorEpisodesVisible: false,
        knownParticipantsVisible: false,
        counterpartModeVisible: false,
        contextKindsVisible: false,
        priorSelectorChoicesVisible: false,
      }),
      seededDraw: "uniform_sha256_rejection_sampling_v1",
      schedules: Object.freeze(structuredClone(schedules)),
    }),
    generator: generatorEvidence(modelEvents),
    worlds: Object.freeze(worlds),
    rejectionProfile: aggregateRejectionProfile(lives),
    admissionVerdict: null,
  });
}

function progressPrinter(event) {
  if (event.type === "selector_start") {
    process.stderr.write(`[E2 A2b ${event.worldId} ${event.seed} · plausibility ${String(event.ordinal).padStart(2, "0")}/${event.total}] ... `);
    return;
  }
  if (event.type === "selector_complete") {
    const routes = event.plausibility.plausibleStructureRefs.length + (event.plausibility.worldEmergentPlausible ? 1 : 0);
    process.stderr.write(`✓ routes=${routes} · draw=${event.selection.structureRef ?? "world-emergent"}\n`);
    return;
  }
  if (event.type === "selector_schedule_reused") {
    process.stderr.write(`[E2 A2b ${event.worldId} ${event.seed}] reuse frozen plausibility/draw schedule ${event.scheduleDigest}\n`);
    return;
  }
  if (event.type === "completed_life_reused") {
    process.stderr.write(`[E2 A2b ${event.worldId} ${event.seed}] reuse completed life from failure artifact\n`);
    return;
  }
  if (event.type === "candidate_attempt_start") {
    process.stderr.write(`[E2 A2b ${event.worldId} run ${event.runOrdinal}/3] candidate attempt ${event.candidateAttemptNumber}/${event.maxCandidateAttempts}\n`);
    return;
  }
  if (event.type === "candidate_attempt_failed") {
    process.stderr.write(`[E2 A2b ${event.worldId} run ${event.runOrdinal}/3] candidate attempt ${event.candidateAttemptNumber} rejected · ${event.failure.failedGate ?? event.failure.code ?? "validation"}: ${event.failure.message}\n`);
    return;
  }
  const prefix = `[E2 A2b ${event.worldId} run ${event.runOrdinal}/3 · attempt ${event.candidateAttemptNumber} · episode ${String(event.ordinal).padStart(2, "0")}/${event.total}]`;
  if (event.type === "episode_start") {
    const pressure = event.selectionPressure.requiresNewCounterpart ? " · new-counterpart-pressure" : "";
    process.stderr.write(`${prefix} selected=${event.selectedOpportunity.structureRef ?? "world-emergent"}${pressure} ... `);
  } else if (event.type === "record_repair") {
    process.stderr.write(`\n  repair ${event.repair.failedGate} ... `);
  } else if (event.type === "record_retry") {
    process.stderr.write(`\n  retry record ${event.recordRetry.failedGate} ... `);
  } else if (event.type === "episode_complete") {
    const encounter = event.episode.intellectualEncounter?.kind ?? "none";
    process.stderr.write(`✓ ${event.elapsedMs} ms · realized=${event.episode.structureRef ?? "world-emergent"} · introduced=${event.episode.introducedParticipants.length} · encounter=${encounter} · repairs=${event.repairs} · retries=${event.recordRetries}\n`);
  }
}

function printSummary(result) {
  for (const world of result.worlds) {
    process.stdout.write(`${world.worldId}:\n`);
    for (const life of world.lives) {
      const c = life.e2Characterization;
      process.stdout.write(`  ${life.seed}: attempts=${life.candidateAttemptsPerThread} · places=${c.uniquePlaces} · structures=${c.uniqueStructures} · introductions=${c.introducedParticipants} · new-pressure=${c.newCounterpartPressureCount} · pressure-realized-with-intro=${c.pressureEpisodesWithIntroductions} · encounters=${c.intellectualEncounterEvents} · mean-routes=${c.meanPlausibleRoutes.toFixed(2)} · singleton=${c.singletonPlausibilityCount} · world-emergent=${c.selectedWorldEmergentCount} · repairs=${c.repairCount} · retries=${c.recordRetryCount}\n`);
    }
    for (const pair of world.betweenLife.pairs) {
      process.stdout.write(`  pair ${pair.leftSeed}/${pair.rightSeed}: placeJ=${pair.placeRefs?.value ?? "n/a"} · roleJ=${pair.participantRoles?.value ?? "n/a"} · structureJ=${pair.structureRefs?.value ?? "n/a"} · sourceJ=${pair.intellectualSubjectRefs?.value ?? "n/a"}\n`);
    }
  }
  process.stdout.write(`Candidate attempts: ${result.rejectionProfile.candidateAttempts} · rejected attempts: ${result.rejectionProfile.candidateAttemptFailures}\n`);
  if (result.resumedFrom !== null) {
    process.stdout.write(`Resumed: schedules=${result.resumedFrom.reusedPlausibilitySchedules} · completed lives=${result.resumedFrom.reusedCompletedLives}\n`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage: npm run genesis:e2-a2b -- --provider <openai|google> --model <model> [--resume <failed-artifact>] [--out <file>] [--overwrite]\n");
    return;
  }
  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const resumePath = readArg(argv, "--resume");
  const outputPath = readArg(argv, "--out");
  const overwrite = argv.includes("--overwrite");
  if (!["openai", "google"].includes(provider)) throw new Error("--provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new Error("--model is required");
  if (resumePath !== null && !existsSync(resumePath)) throw new Error(`resume artifact does not exist: ${resumePath}`);
  if (outputPath !== null && existsSync(outputPath) && !overwrite) throw new Error(`output exists: ${outputPath}; pass --overwrite to replace it`);
  const resumeArtifact = resumePath === null ? null : JSON.parse(readFileSync(resumePath, "utf8"));

  process.stderr.write(`E2 A2b: START · ${E2_DIAGNOSTIC_WORLDS.length} worlds · ${E2_A0_DEFAULT_SEEDS.length} lives/world · ${E2_A0_EPISODES} plausibility+draw+episode slots/life · ${E2_A0_STRUCTURES_PER_WINDOW} offers/window${resumePath === null ? "" : ` · resume=${resumePath}`}\n`);
  try {
    const result = await runE2A2bDriver({ provider, model, resumeArtifact, onProgress: progressPrinter });
    const text = `${JSON.stringify(result, null, 2)}\n`;
    if (outputPath !== null) writeFileSync(outputPath, text, "utf8");
    else process.stdout.write(text);
    printSummary(result);
    if (outputPath !== null) process.stdout.write(`Artifact: ${outputPath}\n`);
  } catch (error) {
    const artifact = error?.e2A2bFailureArtifact ?? null;
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
    process.stderr.write(`E2 A2b: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

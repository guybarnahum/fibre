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
  richPassASelectedOpportunityPromptHash,
  richPassASelectedOpportunityRetryPromptHash,
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
import {
  plausibleRoutes,
  runE2A2bLife,
  seededUniformRouteDraw,
} from "./genesis-rich-life-e2-a2b.mjs";
import { E2_V1_WORLD_FIXTURE } from "./genesis-rich-life-e2-v1-world.mjs";

export const E2_V1_EVIDENCE_VERSION = "pr39-slice-e2-v1-fresh-world-v1";
export const E2_V1_PROTOCOL_VERSION = "pr39-slice-e2-v1-fresh-world-protocol-v1";
export const E2_V1_FROZEN_MECHANISM_VERSION = "pr39-slice-e2-frozen-seeded-contingency-v1";
export const E2_V1_PRIMARY_STRUCTURE_JACCARD_MARGIN = 0.15;
export const E2_V1_SEEDS = Object.freeze([
  "slice-e2-v1-seed-01",
  "slice-e2-v1-seed-02",
  "slice-e2-v1-seed-03",
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

function allMechanicallyEligiblePlausibility(offeredEntries) {
  return Object.freeze({
    plausibleStructureRefs: Object.freeze(
      offeredEntries.map((entry) => entry.structure.structureId).sort(),
    ),
    worldEmergentPlausible: true,
  });
}

export function buildE2V1FrozenSchedule(worldFixture, seed) {
  const plan = buildE2A0Plan(worldFixture, seed);
  const selections = [];
  const evidence = [];

  for (let index = 0; index < plan.length; index += 1) {
    const ordinal = index + 1;
    const { developmentalWindow, offeredEntries } = plan[index];
    const plausibility = allMechanicallyEligiblePlausibility(offeredEntries);
    const routes = plausibleRoutes(plausibility);
    const draw = seededUniformRouteDraw({
      worldId: worldFixture.id,
      seed,
      ordinal,
      routes,
    });
    selections.push(Object.freeze(structuredClone(draw.chosenRoute)));
    evidence.push(Object.freeze({
      ordinal,
      developmentalWindow: structuredClone(developmentalWindow),
      offeredStructureIds: Object.freeze(
        offeredEntries.map((entry) => entry.structure.structureId).sort(),
      ),
      selectionSurface: "all_sampled_mechanically_eligible_offers_plus_world_emergent",
      selectorCognitionUsed: false,
      plausibility,
      routes: structuredClone(routes),
      draw: structuredClone(draw),
      selection: structuredClone(draw.chosenRoute),
    }));
  }

  return Object.freeze({
    mechanismVersion: E2_V1_FROZEN_MECHANISM_VERSION,
    plan,
    selections: Object.freeze(selections),
    evidence: Object.freeze(evidence),
    scheduleDigest: digest({
      mechanismVersion: E2_V1_FROZEN_MECHANISM_VERSION,
      selections,
      evidence: evidence.map(({ plausibility, draw }) => ({ plausibility, draw })),
    }),
  });
}

function pairMean(betweenLife, field) {
  const values = betweenLife.pairs
    .map((pair) => pair[field]?.value ?? null)
    .filter((value) => value !== null);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

function characterizeArm(lives) {
  const betweenLife = characterizeE2BetweenLifeParticularity(lives);
  const episodes = lives.flatMap((life) => life.episodes);
  return Object.freeze({
    lives: Object.freeze(structuredClone(lives)),
    betweenLife,
    meanPairwiseJaccard: Object.freeze({
      placeRefs: pairMean(betweenLife, "placeRefs"),
      participantRoles: pairMean(betweenLife, "participantRoles"),
      structureRefs: pairMean(betweenLife, "structureRefs"),
      intellectualSubjectRefs: pairMean(betweenLife, "intellectualSubjectRefs"),
    }),
    totals: Object.freeze({
      episodes: episodes.length,
      introducedParticipants: episodes.reduce(
        (sum, episode) => sum + episode.introducedParticipants.length,
        0,
      ),
      intellectualEncounters: episodes.filter(
        (episode) => episode.intellectualEncounter !== undefined && episode.intellectualEncounter !== null,
      ).length,
      worldEmergentEpisodes: episodes.filter((episode) => episode.structureRef === null).length,
      recordRepairs: lives.reduce(
        (sum, life) => sum + life.recordEvidence.reduce(
          (lifeSum, record) => lifeSum + record.repairs.length,
          0,
        ),
        0,
      ),
      recordRetries: lives.reduce(
        (sum, life) => sum + life.recordEvidence.reduce(
          (lifeSum, record) => lifeSum + record.recordRetries.length,
          0,
        ),
        0,
      ),
    }),
    rejectionProfile: aggregateRejectionProfile(lives),
  });
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
    frozenSelectedOpportunityPromptHash: richPassASelectedOpportunityPromptHash(),
    frozenSelectedOpportunityRetryPromptHash: richPassASelectedOpportunityRetryPromptHash(),
  });
}

export function buildE2V1Preflight() {
  const schedules = E2_V1_SEEDS.map((seed) => {
    const a0Plan = buildE2A0Plan(E2_V1_WORLD_FIXTURE, seed);
    const frozen = buildE2V1FrozenSchedule(E2_V1_WORLD_FIXTURE, seed);
    return Object.freeze({
      seed,
      a0OfferedWindows: Object.freeze(a0Plan.map(({ developmentalWindow, offeredEntries }) => Object.freeze({
        windowId: developmentalWindow.windowId,
        offeredStructureIds: Object.freeze(
          offeredEntries.map((entry) => entry.structure.structureId).sort(),
        ),
      }))),
      frozenScheduleDigest: frozen.scheduleDigest,
      frozenEvidence: Object.freeze(frozen.evidence.map((item) => Object.freeze({
        ordinal: item.ordinal,
        windowId: item.developmentalWindow.windowId,
        offeredStructureIds: item.offeredStructureIds,
        routeCount: item.routes.length,
        selectedOpportunity: item.selection,
        drawInputDigest: item.draw.drawInputDigest,
      }))),
    });
  });

  return Object.freeze({
    protocolVersion: E2_V1_PROTOCOL_VERSION,
    evidenceVersion: E2_V1_EVIDENCE_VERSION,
    worldId: E2_V1_WORLD_FIXTURE.id,
    worldSpecId: E2_V1_WORLD_FIXTURE.worldSpec.worldSpecId,
    worldSpecDigest: digest(E2_V1_WORLD_FIXTURE.worldSpec),
    sourceFree: E2_V1_WORLD_FIXTURE.worldSpec.worldAuthorship.sourcesConsulted.length === 0,
    firstModelUseBurnsWorld: true,
    seeds: E2_V1_SEEDS,
    armOrderWithinSeed: Object.freeze(["A0", "FROZEN"]),
    comparison: Object.freeze({
      primaryMeasure: "mean_same_world_pairwise_structure_ref_jaccard",
      frozenMustImproveByAtLeast: E2_V1_PRIMARY_STRUCTURE_JACCARD_MARGIN,
      validComparisonRequiresCompleteLivesPerArm: E2_V1_SEEDS.length,
      placeRoleAndIntellectualOverlapAreCharacterizationOnly: true,
      introductionsEncountersAndWorldEmergentCountsAreCharacterizationOnly: true,
      repairAndRejectionRatesAreCharacterizationOnlyUnlessCandidateAttemptsExhaust: true,
      noRichnessScore: true,
    }),
    frozenMechanism: Object.freeze({
      mechanismVersion: E2_V1_FROZEN_MECHANISM_VERSION,
      selectorCognitionUsed: false,
      selectionSurface: "all_sampled_mechanically_eligible_offers_plus_world_emergent",
      draw: "uniform_sha256_rejection_sampling_v1",
      realization: "existing_selected_opportunity_pass_a_realizer",
    }),
    generatorWitness: generatorWitness(),
    schedules: Object.freeze(schedules),
    preflightDigest: digest({
      protocolVersion: E2_V1_PROTOCOL_VERSION,
      worldSpec: E2_V1_WORLD_FIXTURE.worldSpec,
      seeds: E2_V1_SEEDS,
      schedules,
      generatorWitness: generatorWitness(),
    }),
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
    candidateFailures: Array.isArray(error?.candidateFailures)
      ? structuredClone(error.candidateFailures)
      : [],
  });
}

export async function runE2V1FreshWorld({ provider, model, onProgress = null } = {}) {
  if (!["openai", "google"].includes(provider)) throw new TypeError("provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new TypeError("model is required");

  const preflight = buildE2V1Preflight();
  const a0ModelEvents = [];
  const frozenModelEvents = [];
  const a0Adapter = createAdapter({
    provider,
    model,
    observer: (event) => a0ModelEvents.push(event),
  });
  const frozenAdapter = createAdapter({
    provider,
    model,
    observer: (event) => frozenModelEvents.push(event),
  });
  const a0Lives = [];
  const frozenLives = [];
  const frozenSchedules = [];

  try {
    for (let index = 0; index < E2_V1_SEEDS.length; index += 1) {
      const seed = E2_V1_SEEDS[index];
      const runOrdinal = index + 1;

      a0Lives.push(await runE2A0ThreadWithCandidateAttempts({
        worldFixture: E2_V1_WORLD_FIXTURE,
        provider,
        model,
        seed,
        runOrdinal,
        adapter: a0Adapter,
        onProgress: typeof onProgress === "function"
          ? (event) => onProgress({ arm: "A0", ...event })
          : null,
      }));

      const frozenSchedule = buildE2V1FrozenSchedule(E2_V1_WORLD_FIXTURE, seed);
      frozenSchedules.push(Object.freeze({
        seed,
        runOrdinal,
        scheduleDigest: frozenSchedule.scheduleDigest,
        evidence: structuredClone(frozenSchedule.evidence),
      }));
      frozenLives.push(await runE2A0ThreadWithCandidateAttempts({
        worldFixture: E2_V1_WORLD_FIXTURE,
        provider,
        model,
        seed,
        runOrdinal,
        adapter: frozenAdapter,
        candidateRunner: (args) => runE2A2bLife({ ...args, frozenSchedule }),
        maxCandidateAttempts: E2_A0_MAX_CANDIDATE_ATTEMPTS,
        onProgress: typeof onProgress === "function"
          ? (event) => onProgress({ arm: "FROZEN", ...event })
          : null,
      }));
    }
  } catch (error) {
    error.e2V1FailureArtifact = Object.freeze({
      evidenceVersion: E2_V1_EVIDENCE_VERSION,
      protocolVersion: E2_V1_PROTOCOL_VERSION,
      status: "failed",
      developmentOnly: true,
      burnedForFinalCohort: true,
      generatedAt: new Date().toISOString(),
      provider,
      model,
      preflight,
      completed: Object.freeze({
        a0Lives: Object.freeze(structuredClone(a0Lives)),
        frozenLives: Object.freeze(structuredClone(frozenLives)),
        frozenSchedules: Object.freeze(structuredClone(frozenSchedules)),
      }),
      modelEvents: Object.freeze({
        A0: Object.freeze(structuredClone(a0ModelEvents)),
        FROZEN: Object.freeze(structuredClone(frozenModelEvents)),
      }),
      failure: failureSummary(error),
      admissionVerdict: null,
    });
    throw error;
  }

  const A0 = characterizeArm(a0Lives);
  const FROZEN = characterizeArm(frozenLives);
  const a0Structure = A0.meanPairwiseJaccard.structureRefs;
  const frozenStructure = FROZEN.meanPairwiseJaccard.structureRefs;
  const structureImprovement = a0Structure === null || frozenStructure === null
    ? null
    : a0Structure - frozenStructure;

  return Object.freeze({
    evidenceVersion: E2_V1_EVIDENCE_VERSION,
    protocolVersion: E2_V1_PROTOCOL_VERSION,
    status: "complete",
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    provider,
    model,
    preflight,
    callOrder: Object.freeze(
      E2_V1_SEEDS.flatMap((seed) => [`${seed}:A0`, `${seed}:FROZEN`]),
    ),
    arms: Object.freeze({
      A0: Object.freeze({
        arm: "A0_corrected_coupled_chooser_realizer",
        modelEvents: Object.freeze(structuredClone(a0ModelEvents)),
        ...A0,
      }),
      FROZEN: Object.freeze({
        arm: "frozen_seeded_contingency_selected_opportunity",
        mechanismVersion: E2_V1_FROZEN_MECHANISM_VERSION,
        selectorCognitionUsed: false,
        schedules: Object.freeze(structuredClone(frozenSchedules)),
        modelEvents: Object.freeze(structuredClone(frozenModelEvents)),
        ...FROZEN,
      }),
    }),
    comparison: Object.freeze({
      primaryMeasure: "mean_same_world_pairwise_structure_ref_jaccard",
      a0MeanStructureJaccard: a0Structure,
      frozenMeanStructureJaccard: frozenStructure,
      frozenImprovement: structureImprovement,
      requiredImprovement: E2_V1_PRIMARY_STRUCTURE_JACCARD_MARGIN,
      primaryReplicationMet: structureImprovement !== null
        && structureImprovement >= E2_V1_PRIMARY_STRUCTURE_JACCARD_MARGIN,
      interpretationRule: "If primaryReplicationMet is false, do not tune or rerun E2-V1; Gate F remains HOLD pending interpretation. Secondary measures are characterization only.",
    }),
    admissionVerdict: null,
  });
}

function progressPrinter(event) {
  const arm = event.arm ?? "?";
  if (event.type === "candidate_attempt_start") {
    process.stderr.write(`[E2-V1 ${arm} seed=${event.seed}] candidate ${event.candidateAttemptNumber}/${event.maxCandidateAttempts}\n`);
    return;
  }
  if (event.type === "candidate_attempt_failed") {
    process.stderr.write(`[E2-V1 ${arm} seed=${event.seed}] candidate ${event.candidateAttemptNumber} rejected · ${event.failure.failedGate ?? event.failure.code ?? "validation"}: ${event.failure.message}\n`);
    return;
  }
  if (event.type === "episode_start") {
    process.stderr.write(`[E2-V1 ${arm} seed=${event.seed} episode=${String(event.ordinal).padStart(2, "0")}/${event.total}] ... `);
    return;
  }
  if (event.type === "record_repair") {
    process.stderr.write(`\n  repair ${event.repair.failedGate} ... `);
    return;
  }
  if (event.type === "record_retry") {
    process.stderr.write(`\n  retry ${event.recordRetry.failedGate} ... `);
    return;
  }
  if (event.type === "episode_complete") {
    process.stderr.write(`✓ structure=${event.episode.structureRef ?? "world-emergent"} · encounter=${event.episode.intellectualEncounter?.kind ?? "none"} · repairs=${event.repairs} · retries=${event.recordRetries}\n`);
  }
}

function printSummary(result) {
  for (const [name, arm] of Object.entries(result.arms)) {
    process.stdout.write(`${name}: structureJ=${arm.meanPairwiseJaccard.structureRefs} · placeJ=${arm.meanPairwiseJaccard.placeRefs} · roleJ=${arm.meanPairwiseJaccard.participantRoles} · introductions=${arm.totals.introducedParticipants} · encounters=${arm.totals.intellectualEncounters} · world-emergent=${arm.totals.worldEmergentEpisodes} · candidateRejects=${arm.rejectionProfile.candidateAttemptFailures}\n`);
  }
  process.stdout.write(`E2-V1 primary: A0 structureJ=${result.comparison.a0MeanStructureJaccard} · frozen=${result.comparison.frozenMeanStructureJaccard} · improvement=${result.comparison.frozenImprovement} · required=${result.comparison.requiredImprovement} · replication=${result.comparison.primaryReplicationMet ? "YES" : "NO"}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage:\n  npm run genesis:e2-v1 -- --preflight\n  npm run genesis:e2-v1 -- --provider <openai|google> --model <model> --out <file>\n");
    return;
  }

  if (argv.includes("--preflight")) {
    process.stdout.write(`${JSON.stringify(buildE2V1Preflight(), null, 2)}\n`);
    return;
  }

  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const outputPath = readArg(argv, "--out");
  if (outputPath === null) throw new TypeError("E2-V1 burned run requires --out <file>");
  if (existsSync(outputPath)) {
    throw new Error(`E2-V1 output already exists: ${outputPath}; this fresh world must not be overwritten or rerun`);
  }

  process.stderr.write(`E2-V1: START · fresh world=${E2_V1_WORLD_FIXTURE.id} · 2 arms · 3 lives/arm · ${E2_A0_EPISODES} episodes/life · no selector cognition in frozen arm\n`);
  try {
    const result = await runE2V1FreshWorld({ provider, model, onProgress: progressPrinter });
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    printSummary(result);
    process.stdout.write(`Artifact: ${outputPath}\n`);
  } catch (error) {
    if (error.e2V1FailureArtifact !== undefined) {
      writeFileSync(outputPath, `${JSON.stringify(error.e2V1FailureArtifact, null, 2)}\n`, "utf8");
      process.stderr.write(`Failure artifact: ${outputPath}\n`);
    }
    throw error;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`E2-V1: FAILED\n${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

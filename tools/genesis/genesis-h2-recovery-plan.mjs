#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { verifyH2RecoveryPreflight } from "./genesis-h2-recovery.mjs";
import { buildH2Slot4Episode3RecoveryState } from "./genesis-h2-recovery-state.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const G3_PATH = "artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v2.json";
const G4_PATH = "artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v1.json";

export const H2_RECOVERY_EXECUTION_PLAN_VERSION = "pr39-h-v2-recovery-execution-plan-v1";

function readJson(path) {
  return JSON.parse(readFileSync(resolve(ROOT, path), "utf8"));
}

function fail(message) {
  throw new Error(message);
}

function freezeStages(stages) {
  return Object.freeze(stages.map((stage) => Object.freeze(structuredClone(stage))));
}

export function buildH2RecoveryExecutionPlan() {
  const preflight = verifyH2RecoveryPreflight();
  const recovery = buildH2Slot4Episode3RecoveryState();
  const g3 = readJson(G3_PATH);
  const g4 = readJson(G4_PATH);

  if (preflight.status !== "CLEAR_RECOVERY_RESUME_POINT_ZERO_CALL") {
    fail("H-v2 recovery execution plan requires a clear zero-call resume preflight");
  }
  if (preflight.providerCallsAuthorized !== false) {
    fail("H-v2 recovery execution plan must not inherit provider authorization");
  }
  if (recovery.slot !== 4 || recovery.episode3.inspection.nextKind !== "record_retry" || recovery.episode3.inspection.nextOrdinal !== 2) {
    fail("H-v2 recovery execution plan exact resume point drift");
  }
  if (g4.historicalPlan?.episodesPerThread !== 10 || g4.historicalPlan?.windows?.length !== 10) {
    fail("H-v2 recovery execution plan expects the frozen ten-window Pass-A protocol");
  }

  const directModes = g3.inheritedProductionProtocol?.directModes;
  const horizons = g3.inheritedProductionProtocol?.historyEpisodeHorizons;
  if (!Array.isArray(directModes) || !Array.isArray(horizons) || directModes.length !== horizons.length) {
    fail("H-v2 recovery execution plan cannot resolve frozen Pass-B schedule");
  }

  const slot4PassA = g4.historicalPlan.windows
    .filter((window) => window.ordinal >= 3)
    .map((window) => ({
      episodeOrdinal: window.ordinal,
      windowId: window.windowId,
      mode: window.ordinal === 3 ? "historical_continuation" : "ordinary_generation",
      nextKind: window.ordinal === 3 ? "record_retry" : "initial",
      nextOrdinal: window.ordinal === 3 ? 2 : null,
      clientRequestId: window.ordinal === 3
        ? "pr39-h:slot-04:pass-a:episode-03:record-retry:2"
        : `pr39-h:slot-04:pass-a:episode-${String(window.ordinal).padStart(2, "0")}:initial`,
    }));

  const slot4PassB = horizons.map((horizon, index) => ({
    callOrdinal: index + 1,
    horizon,
    formationMode: directModes[index],
    clientRequestId: `pr39-h:slot-04:pass-b:call-${String(index + 1).padStart(2, "0")}:initial`,
    passCCall: "conditional_on_remembered_outcome",
  }));

  const firstProviderOperation = slot4PassA[0];
  if (firstProviderOperation.clientRequestId !== "pr39-h:slot-04:pass-a:episode-03:record-retry:2") {
    fail("H-v2 recovery first provider operation drift");
  }

  const stages = freezeStages([
    {
      ordinal: 1,
      stage: "reuse_completed_thread_generations",
      providerCalls: "zero",
      slots: preflight.completedThreads.map(({ slot, threadId, artifactPath, artifactBlobSha }) => ({ slot, threadId, artifactPath, artifactBlobSha })),
      rule: "Read and verify the frozen generation artifacts for slots 1-3; never regenerate them.",
    },
    {
      ordinal: 2,
      stage: "continue_partial_slot_04_pass_a",
      slot: 4,
      threadId: recovery.threadId,
      acceptedEpisodeIds: recovery.acceptedEpisodes.map((episode) => episode.episodeId),
      firstProviderOperation: structuredClone(firstProviderOperation),
      operations: slot4PassA,
      historicalBudgetAtResume: structuredClone(recovery.episode3.inspection.budgetState),
      rule: "Episode 3 consumes the historical G4-v3 budget and begins at record retry #2; only episodes 4-10 are new ordinary Pass-A records.",
    },
    {
      ordinal: 3,
      stage: "complete_slot_04_memory_and_meaning",
      slot: 4,
      threadId: recovery.threadId,
      passBSchedule: slot4PassB,
      passCInitial: "one call only for each remembered Pass-B outcome",
      reinterpretation: "frozen scheduler and per-Thread cap after initial Pass-C formation",
      rule: "Run the unchanged frozen Pass-B/Pass-C protocol over the completed ten-episode history; do not replay any pre-failure cognition because none existed for slot 4 beyond Pass A episode 3.",
    },
    {
      ordinal: 4,
      stage: "generate_unstarted_slot_05",
      slot: preflight.unstartedSlot.slot,
      threadId: preflight.unstartedSlot.threadId,
      observedHistoricalModelAttempts: preflight.unstartedSlot.observedModelAttempts,
      passAEpisodes: g4.historicalPlan.episodesPerThread,
      passBSchedule: horizons.map((horizon, index) => ({ callOrdinal: index + 1, horizon, formationMode: directModes[index] })),
      passCInitial: "conditional_on_remembered_outcome",
      reinterpretation: "frozen scheduler and per-Thread cap",
      rule: "Slot 5 is genuinely unstarted and therefore begins at its ordinary Pass-A episode 1 only after slot 4 completes.",
    },
    {
      ordinal: 5,
      stage: "publish_recovered_world",
      providerCalls: "zero",
      slots: [1, 2, 3, 4, 5],
      rule: "Publish only after five complete generation records exist; publication must reuse existing Genesis/#37/#38 authority and remain atomic per Thread with integrity verification.",
    },
  ]);

  return Object.freeze({
    planVersion: H2_RECOVERY_EXECUTION_PLAN_VERSION,
    status: "CLEAR_RECOVERY_EXECUTION_PATH_REVIEWABLE_ZERO_CALL",
    recoveryVersion: preflight.recoveryVersion,
    providerCallsAuthorized: false,
    scientificStanding: Object.freeze({ ...preflight.scientificStanding }),
    outputRoot: preflight.outputRoot,
    firstProviderOperation: Object.freeze(structuredClone(firstProviderOperation)),
    stages,
  });
}

function printPlan(plan) {
  process.stdout.write("H-V2 RECOVERY EXECUTION PLAN: CLEAR ZERO-CALL REVIEW BOUNDARY\n\n");
  process.stdout.write(`First provider operation: ${plan.firstProviderOperation.clientRequestId}\n`);
  process.stdout.write("Preserved slots 1-3: reuse only; zero generation calls.\n");
  process.stdout.write("Slot 4: resume episode 3 at record retry #2, then generate episodes 4-10, then frozen Pass B/C.\n");
  process.stdout.write("Slot 5: begin only after slot 4 completes.\n");
  process.stdout.write("Publication: last, zero provider calls.\n");
  process.stdout.write(`Output root: ${plan.outputRoot}\n`);
  process.stdout.write("Scientific standing: recovery/resilience only; never replacement #39 evidence.\n");
  process.stdout.write("\nNo provider call was made or authorized.\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    printPlan(buildH2RecoveryExecutionPlan());
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}

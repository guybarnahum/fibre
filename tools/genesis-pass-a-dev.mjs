#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import {
  buildPassAInput,
  passAFunnelMetrics,
  sampleEventStructures,
} from "../services/world-kernel/src/genesis-pass-a-domain.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V1,
  GENESIS_EVENT_STRUCTURE_POOL_V1_DIGEST,
} from "../services/world-kernel/src/genesis-event-structure-pool-v1.mjs";
import {
  generatePassAEpisode,
  passAPromptHash,
  passARepairPromptHash,
  passASchemaHash,
  summarizePassARepairProfile,
} from "../services/world-kernel/src/genesis-pass-a-runner.mjs";

const DEFAULT_EPISODES = 8;
const DEFAULT_SEED = "slice-c-dev-burned-001";
const EVIDENCE_VERSION = "pr39-slice-c-pass-a-development-v3";

export const SLICE_C_DEV_WORLD = Object.freeze({
  worldSpecId: "world_slice_c_dev_burned_001",
  timeFrame: { startAt: "1990-01-01T00:00:00Z", endAt: "2008-12-31T23:59:59Z" },
  places: [
    { placeId: "place_home_block", description: "A compact residential block near ordinary local commerce and bus stops." },
    { placeId: "place_public_school", description: "A neighborhood public school serving several nearby blocks." },
    { placeId: "place_library", description: "A small public library reached by bus from the residential block." },
    { placeId: "place_market_street", description: "A street of groceries, repair shops, food counters, and other ordinary commerce." },
  ],
  householdShape: "Two caregivers, the child, and one younger sibling share a rented apartment.",
  familyRelations: ["A grandparent lives elsewhere in the city.", "The younger sibling is three years younger."],
  languages: ["English", "Spanish"],
  materialCircumstances: "Rent and ordinary bills are reliable, with little discretionary money and no private car.",
  mobilityPattern: "The household remains in the same district during this developmental window and normally uses buses or walking.",
  schoolingOrCommunityContext: "Neighborhood public school, public library, local shops, bus routes, and informal courtyard play.",
  culturalContext: "Household routines combine extended-family visits, neighborhood events, and bilingual conversation.",
  availableInstitutions: ["public_school", "public_library", "local_commerce", "public_transit"],
  intellectualEnvironment: "Library books, school assignments, radio news, repair manuals, and ordinary disagreement among adults are accessible.",
  affordedRoles: ["household_member", "responsible_adult", "peer", "school_teacher", "librarian", "shopkeeper", "neighbor"],
  worldAuthorship: {
    authorId: "fibre_slice_c_development",
    sourcesConsulted: [],
    abstractionMethod: "Synthetic throwaway development world authored from ordinary structural circumstances without a named source person, work, plot, or future role.",
    relocationWitness: "The world can be relocated without preserving named source characters, scenes, or a known adult outcome.",
    familiarityProbe: null,
    createdAt: "2026-08-16T01:10:00Z",
  },
  createdAt: "2026-08-16T01:10:00Z",
});

export const SLICE_C_DEV_SUBJECT = Object.freeze({
  provisionalThreadId: "thr_slice_c_dev_001",
  bornAt: "1992-05-14T00:00:00Z",
});

// This is the total development span, not a single creative call window.
export const SLICE_C_DEV_WINDOW = Object.freeze({
  windowId: "middle_childhood",
  startAt: "1998-05-14T00:00:00Z",
  endAt: "2004-05-13T23:59:59Z",
  minAge: 6,
  maxAge: 11.999,
});

export const SLICE_C_DEV_ROSTER = Object.freeze([
  { participantId: SLICE_C_DEV_SUBJECT.provisionalThreadId, factualRoles: ["subject"], relationshipFacts: ["This is the provisional Thread whose history is being generated."] },
  { participantId: "person_caregiver_1", factualRoles: ["household_member", "responsible_adult"], relationshipFacts: ["Lives in the subject household."] },
  { participantId: "person_caregiver_2", factualRoles: ["household_member", "responsible_adult"], relationshipFacts: ["Lives in the subject household."] },
  { participantId: "person_sibling", factualRoles: ["household_member"], relationshipFacts: ["Younger sibling in the subject household."] },
]);

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

function printUsage() {
  process.stdout.write(
    "Usage: npm run genesis:pass-a-dev -- --provider <openai|google> --model <model> [--episodes 8] [--seed <seed>] [--world-file <json>] [--out <file>] [--overwrite]\n",
  );
}

function loadWorld(path) {
  if (path === null) return structuredClone(SLICE_C_DEV_WORLD);
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function rounded(value) {
  return Number(value.toFixed(6));
}

export function stratifySliceCDevelopmentWindow(baseWindow = SLICE_C_DEV_WINDOW, episodeCount = DEFAULT_EPISODES) {
  if (!Number.isSafeInteger(episodeCount) || episodeCount < 1) throw new TypeError("episodeCount must be a positive integer");
  const startMs = Date.parse(baseWindow.startAt);
  const endMs = Date.parse(baseWindow.endAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) throw new TypeError("developmental span timestamps are invalid");
  if (!Number.isFinite(baseWindow.minAge) || !Number.isFinite(baseWindow.maxAge) || baseWindow.maxAge < baseWindow.minAge) {
    throw new TypeError("developmental span ages are invalid");
  }

  const inclusiveMillis = endMs - startMs + 1;
  const ageSpan = baseWindow.maxAge - baseWindow.minAge;
  const windows = [];
  for (let index = 0; index < episodeCount; index += 1) {
    const sliceStart = startMs + Math.floor((inclusiveMillis * index) / episodeCount);
    const sliceEnd = startMs + Math.floor((inclusiveMillis * (index + 1)) / episodeCount) - 1;
    windows.push(Object.freeze({
      windowId: `${baseWindow.windowId}_stratum_${String(index + 1).padStart(2, "0")}`,
      startAt: new Date(sliceStart).toISOString(),
      endAt: new Date(sliceEnd).toISOString(),
      minAge: rounded(baseWindow.minAge + (ageSpan * index) / episodeCount),
      maxAge: rounded(baseWindow.minAge + (ageSpan * (index + 1)) / episodeCount),
    }));
  }
  return Object.freeze(windows);
}

export function buildSliceCDevelopmentPlan({ episodeCount = DEFAULT_EPISODES, seed = DEFAULT_SEED } = {}) {
  if (typeof seed !== "string" || seed.trim() === "") throw new TypeError("seed is required");
  const windows = stratifySliceCDevelopmentWindow(SLICE_C_DEV_WINDOW, episodeCount);
  return Object.freeze(windows.map((developmentalWindow) => Object.freeze({
    developmentalWindow,
    offeredStructures: Object.freeze(sampleEventStructures(
      GENESIS_EVENT_STRUCTURE_POOL_V1,
      developmentalWindow,
      { seed: `${seed}:structures:${developmentalWindow.windowId}` },
    )),
  })));
}

function generatorEvidence({ provider, model, events }) {
  return {
    provider,
    model,
    promptHash: passAPromptHash(),
    repairPromptHash: passARepairPromptHash(),
    schemaHash: passASchemaHash(),
    modelEvents: structuredClone(events),
  };
}

function poolEvidence(plan) {
  const uniqueOfferedStructureIds = [
    ...new Set(plan.flatMap(({ offeredStructures }) => offeredStructures.map(({ structureId }) => structureId))),
  ];
  return {
    version: "genesis-event-structure-pool-v1",
    digest: GENESIS_EVENT_STRUCTURE_POOL_V1_DIGEST,
    offerPolicy: "one_deterministic_chronology_stratum_per_generated_episode",
    totalOfferSlots: plan.reduce((sum, item) => sum + item.offeredStructures.length, 0),
    uniqueOfferedStructureIds,
    windows: plan.map(({ developmentalWindow, offeredStructures }) => ({
      ...structuredClone(developmentalWindow),
      offeredStructureIds: offeredStructures.map(({ structureId }) => structureId),
    })),
  };
}

function uniqueOfferedStructures(plan) {
  const byId = new Map();
  for (const { offeredStructures } of plan) {
    for (const structure of offeredStructures) byId.set(structure.structureId, structure);
  }
  return [...byId.values()];
}

function funnelEvidence(episodes, plan) {
  return {
    ...passAFunnelMetrics(episodes, uniqueOfferedStructures(plan)),
    developmentalWindows: plan.length,
    structureOfferSlots: plan.reduce((sum, item) => sum + item.offeredStructures.length, 0),
  };
}

function successfulRecordEvidence(recordResults) {
  return recordResults.map((result) => ({
    inputDigest: result.inputDigest,
    episodeDigest: result.episodeDigest,
    calls: result.calls,
    repairs: result.repairs,
  }));
}

function failureRepairProfile(recordResults, error) {
  const profile = summarizePassARepairProfile(recordResults);
  const repairs = Array.isArray(error?.repairEvidence) ? error.repairEvidence : [];
  const repairsByGate = { ...profile.recordRepairsByGate };
  for (const repair of repairs) repairsByGate[repair.failedGate] = (repairsByGate[repair.failedGate] ?? 0) + 1;
  return {
    ...profile,
    recordsGenerated: profile.recordsGenerated + (Array.isArray(error?.calls) ? error.calls.length : 0),
    recordRepairs: profile.recordRepairs + repairs.length,
    recordRepairsByGate: repairsByGate,
    recordRepairExhaustions: error?.gate === "record_repair_exhausted" ? 1 : 0,
  };
}

export function buildSliceCFailureEvidence({
  provider,
  model,
  seed,
  worldSpec,
  plan,
  events,
  episodes,
  recordResults,
  failedEpisodeOrdinal,
  error,
}) {
  return {
    evidenceVersion: EVIDENCE_VERSION,
    status: "failed",
    generatedAt: new Date().toISOString(),
    developmentOnly: true,
    burnedForFinalCohort: true,
    seed,
    generator: generatorEvidence({ provider, model, events }),
    eventStructurePool: poolEvidence(plan),
    worldSpec: structuredClone(worldSpec),
    subject: structuredClone(SLICE_C_DEV_SUBJECT),
    developmentalSpan: structuredClone(SLICE_C_DEV_WINDOW),
    episodes: structuredClone(episodes),
    recordEvidence: successfulRecordEvidence(recordResults),
    failure: {
      failedEpisodeOrdinal,
      developmentalWindow: structuredClone(plan[failedEpisodeOrdinal - 1]?.developmentalWindow ?? null),
      code: error?.code ?? null,
      gate: error?.gate ?? null,
      message: error?.message ?? String(error),
      causeGate: error?.cause?.gate ?? null,
      rejectedRecord: error?.record === null || error?.record === undefined ? null : structuredClone(error.record),
      calls: Array.isArray(error?.calls) ? structuredClone(error.calls) : [],
      repairs: Array.isArray(error?.repairEvidence) ? structuredClone(error.repairEvidence) : [],
    },
    funnel: funnelEvidence(episodes, plan),
    rejectionRepairProfile: failureRepairProfile(recordResults, error),
    memoryRecords: [],
    meaningRecords: [],
  };
}

export async function runSliceCPassADevelopment({
  provider,
  model,
  episodeCount = DEFAULT_EPISODES,
  seed = DEFAULT_SEED,
  worldSpec = SLICE_C_DEV_WORLD,
  onProgress = null,
  adapterOverride = null,
} = {}) {
  if (!["openai", "google"].includes(provider)) throw new TypeError("provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new TypeError("model is required");
  if (!Number.isSafeInteger(episodeCount) || episodeCount < 1) throw new TypeError("episodeCount must be a positive integer");
  if (typeof seed !== "string" || seed.trim() === "") throw new TypeError("seed is required");
  if (adapterOverride !== null && typeof adapterOverride?.invoke !== "function") throw new TypeError("adapterOverride must expose invoke()");

  const events = [];
  const observer = (event) => {
    events.push(event);
    if (event?.type === "operational_failure" && typeof onProgress === "function") onProgress({ type: "operational_failure", event });
  };
  const adapter = adapterOverride ?? createAdapter({ provider, model, observer });
  const plan = buildSliceCDevelopmentPlan({ episodeCount, seed });
  const episodes = [];
  const previouslyIntroducedParticipants = [];
  const recordResults = [];

  for (let index = 0; index < episodeCount; index += 1) {
    const ordinal = index + 1;
    const { developmentalWindow, offeredStructures } = plan[index];
    const input = buildPassAInput({
      worldSpec,
      subject: SLICE_C_DEV_SUBJECT,
      developmentalWindow,
      chronologyEndsAt: developmentalWindow.endAt,
      initialRoster: SLICE_C_DEV_ROSTER,
      priorEpisodes: episodes,
      previouslyIntroducedParticipants,
      eventStructurePool: GENESIS_EVENT_STRUCTURE_POOL_V1,
      offeredStructures,
    });
    if (typeof onProgress === "function") onProgress({ type: "episode_start", ordinal, total: episodeCount, developmentalWindow });
    const startedAt = Date.now();
    let result;
    try {
      result = await generatePassAEpisode({
        adapter,
        input,
        clientRequestId: `slice-c-dev:${seed}:episode:${String(ordinal).padStart(2, "0")}`,
        onRecordRepair: (repair) => {
          if (typeof onProgress === "function") onProgress({ type: "record_repair", ordinal, total: episodeCount, developmentalWindow, repair });
        },
      });
    } catch (error) {
      error.sliceCDevelopmentEvidence = buildSliceCFailureEvidence({
        provider,
        model,
        seed,
        worldSpec,
        plan,
        events,
        episodes,
        recordResults,
        failedEpisodeOrdinal: ordinal,
        error,
      });
      throw error;
    }
    episodes.push(result.episode);
    previouslyIntroducedParticipants.push(...result.episode.introducedParticipants);
    recordResults.push(result);
    if (typeof onProgress === "function") {
      onProgress({
        type: "episode_complete",
        ordinal,
        total: episodeCount,
        developmentalWindow,
        elapsedMs: Date.now() - startedAt,
        episode: result.episode,
        repairs: result.repairs.length,
      });
    }
  }

  return {
    evidenceVersion: EVIDENCE_VERSION,
    status: "complete",
    generatedAt: new Date().toISOString(),
    developmentOnly: true,
    burnedForFinalCohort: true,
    seed,
    generator: generatorEvidence({ provider, model, events }),
    eventStructurePool: poolEvidence(plan),
    worldSpec: structuredClone(worldSpec),
    subject: structuredClone(SLICE_C_DEV_SUBJECT),
    developmentalSpan: structuredClone(SLICE_C_DEV_WINDOW),
    episodes,
    recordEvidence: successfulRecordEvidence(recordResults),
    funnel: funnelEvidence(episodes, plan),
    rejectionRepairProfile: summarizePassARepairProfile(recordResults),
    memoryRecords: [],
    meaningRecords: [],
  };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    return;
  }
  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const episodeCount = Number(readArg(argv, "--episodes", String(DEFAULT_EPISODES)));
  const seed = readArg(argv, "--seed", DEFAULT_SEED);
  const outputPath = readArg(argv, "--out");
  const worldFile = readArg(argv, "--world-file");
  const overwrite = argv.includes("--overwrite");
  if (outputPath !== null && existsSync(outputPath) && !overwrite) {
    throw new Error(`refusing to overwrite existing Slice-C evidence artifact ${outputPath}; choose a new path or pass --overwrite`);
  }

  process.stderr.write(`GENESIS PASS A DEV: START · ${episodeCount} historical episodes\n`);
  process.stderr.write(`Generator: ${provider}/${model}\n`);
  process.stderr.write(`World: ${worldFile ?? `${SLICE_C_DEV_WORLD.worldSpecId} (built-in, burned)`}\n`);
  process.stderr.write(`Chronology: ${episodeCount} deterministic strata across ${SLICE_C_DEV_WINDOW.minAge}-${SLICE_C_DEV_WINDOW.maxAge}\n`);

  const startedAt = Date.now();
  let result;
  try {
    result = await runSliceCPassADevelopment({
      provider,
      model,
      episodeCount,
      seed,
      worldSpec: loadWorld(worldFile),
      onProgress(event) {
        if (event.type === "episode_start") {
          const window = event.developmentalWindow;
          process.stderr.write(`[episode ${String(event.ordinal).padStart(2, "0")}/${event.total}] generating · age ${window.minAge}-${window.maxAge} ...\n`);
        } else if (event.type === "record_repair") {
          const bytes = event.repair.failedConstraint?.rejectedObservableActionUtf8Bytes;
          const detail = Number.isSafeInteger(bytes) ? ` · ${bytes} bytes` : "";
          process.stderr.write(`[episode ${String(event.ordinal).padStart(2, "0")}/${event.total}] record repair ${event.repair.repairOrdinal} · ${event.repair.failedGate}${detail}\n`);
        } else if (event.type === "episode_complete") {
          const grounding = event.episode.structureRef === null ? "world-emergent" : event.episode.structureRef;
          process.stderr.write(`[episode ${String(event.ordinal).padStart(2, "0")}/${event.total}] ✓ ${event.elapsedMs} ms · age ${event.episode.ageAtEvent} · ${grounding} · repairs ${event.repairs}\n`);
        } else if (event.type === "operational_failure") {
          const failure = event.event.failure ?? {};
          process.stderr.write(`MODEL ${failure.code ?? "ERROR"}: ${failure.message ?? "operational failure"}\n`);
        }
      },
    });
  } catch (error) {
    const evidence = error?.sliceCDevelopmentEvidence ?? null;
    if (evidence !== null) {
      const text = `${JSON.stringify(evidence, null, 2)}\n`;
      if (outputPath !== null) {
        writeFileSync(outputPath, text, "utf8");
        process.stderr.write(`Failure artifact: ${outputPath}\n`);
      } else {
        process.stdout.write(text);
      }
    }
    throw error;
  }

  const text = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath !== null) writeFileSync(outputPath, text, "utf8");
  else process.stdout.write(text);

  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  process.stderr.write(`GENESIS PASS A DEV: COMPLETE\n`);
  process.stderr.write(`Historical events: ${result.funnel.historicalEvents}\n`);
  process.stderr.write(`Chronology strata: ${result.funnel.developmentalWindows}\n`);
  process.stderr.write(`Structures: ${result.funnel.structuresInstantiated}/${result.funnel.structuresOffered} unique instantiated/offered · ${result.funnel.structureOfferSlots} offer slots\n`);
  process.stderr.write(`Grounded/emergent: ${result.funnel.episodesStructureGrounded}/${result.funnel.episodesWorldEmergent}\n`);
  process.stderr.write(`Record repairs: ${result.rejectionRepairProfile.recordRepairs}\n`);
  process.stderr.write(`Memory/meaning records: 0/0\n`);
  process.stderr.write(`Elapsed: ${elapsedSeconds.toFixed(1)} s\n`);
  if (outputPath !== null) process.stderr.write(`Artifact: ${outputPath}\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`GENESIS PASS A DEV: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

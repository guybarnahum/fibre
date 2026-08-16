#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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

export async function runSliceCPassADevelopment({
  provider,
  model,
  episodeCount = DEFAULT_EPISODES,
  seed = DEFAULT_SEED,
  worldSpec = SLICE_C_DEV_WORLD,
  onProgress = null,
} = {}) {
  if (!["openai", "google"].includes(provider)) throw new TypeError("provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new TypeError("model is required");
  if (!Number.isSafeInteger(episodeCount) || episodeCount < 1) throw new TypeError("episodeCount must be a positive integer");
  if (typeof seed !== "string" || seed.trim() === "") throw new TypeError("seed is required");

  const events = [];
  const adapter = createAdapter({
    provider,
    model,
    observer: (event) => {
      events.push(event);
      if (event?.type === "operational_failure" && typeof onProgress === "function") {
        onProgress({ type: "operational_failure", event });
      }
    },
  });
  const offeredStructures = sampleEventStructures(GENESIS_EVENT_STRUCTURE_POOL_V1, SLICE_C_DEV_WINDOW, { seed: `${seed}:structures` });
  const episodes = [];
  const previouslyIntroducedParticipants = [];
  const recordResults = [];

  for (let index = 0; index < episodeCount; index += 1) {
    const input = buildPassAInput({
      worldSpec,
      subject: SLICE_C_DEV_SUBJECT,
      developmentalWindow: SLICE_C_DEV_WINDOW,
      chronologyEndsAt: SLICE_C_DEV_WINDOW.endAt,
      initialRoster: SLICE_C_DEV_ROSTER,
      priorEpisodes: episodes,
      previouslyIntroducedParticipants,
      eventStructurePool: GENESIS_EVENT_STRUCTURE_POOL_V1,
      offeredStructures,
    });
    const ordinal = index + 1;
    if (typeof onProgress === "function") onProgress({ type: "episode_start", ordinal, total: episodeCount });
    const startedAt = Date.now();
    const result = await generatePassAEpisode({
      adapter,
      input,
      clientRequestId: `slice-c-dev:${seed}:episode:${String(ordinal).padStart(2, "0")}`,
      onRecordRepair: (repair) => {
        if (typeof onProgress === "function") onProgress({ type: "record_repair", ordinal, total: episodeCount, repair });
      },
    });
    episodes.push(result.episode);
    previouslyIntroducedParticipants.push(...result.episode.introducedParticipants);
    recordResults.push(result);
    if (typeof onProgress === "function") {
      onProgress({
        type: "episode_complete",
        ordinal,
        total: episodeCount,
        elapsedMs: Date.now() - startedAt,
        episode: result.episode,
        repairs: result.repairs.length,
      });
    }
  }

  return {
    evidenceVersion: "pr39-slice-c-pass-a-development-v1",
    generatedAt: new Date().toISOString(),
    developmentOnly: true,
    burnedForFinalCohort: true,
    seed,
    generator: {
      provider,
      model,
      promptHash: passAPromptHash(),
      repairPromptHash: passARepairPromptHash(),
      schemaHash: passASchemaHash(),
      modelEvents: events,
    },
    eventStructurePool: {
      version: "genesis-event-structure-pool-v1",
      digest: GENESIS_EVENT_STRUCTURE_POOL_V1_DIGEST,
      offeredStructureIds: offeredStructures.map(({ structureId }) => structureId),
    },
    worldSpec: structuredClone(worldSpec),
    subject: structuredClone(SLICE_C_DEV_SUBJECT),
    developmentalWindow: structuredClone(SLICE_C_DEV_WINDOW),
    episodes,
    recordEvidence: recordResults.map((result) => ({
      inputDigest: result.inputDigest,
      episodeDigest: result.episodeDigest,
      calls: result.calls,
      repairs: result.repairs,
    })),
    funnel: passAFunnelMetrics(episodes, offeredStructures),
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

  const startedAt = Date.now();
  const result = await runSliceCPassADevelopment({
    provider,
    model,
    episodeCount,
    seed,
    worldSpec: loadWorld(worldFile),
    onProgress(event) {
      if (event.type === "episode_start") {
        process.stderr.write(`[episode ${String(event.ordinal).padStart(2, "0")}/${event.total}] generating ...\n`);
      } else if (event.type === "record_repair") {
        process.stderr.write(`[episode ${String(event.ordinal).padStart(2, "0")}/${event.total}] record repair ${event.repair.repairOrdinal} · ${event.repair.failedGate}\n`);
      } else if (event.type === "episode_complete") {
        const grounding = event.episode.structureRef === null ? "world-emergent" : event.episode.structureRef;
        process.stderr.write(`[episode ${String(event.ordinal).padStart(2, "0")}/${event.total}] ✓ ${event.elapsedMs} ms · ${grounding} · repairs ${event.repairs}\n`);
      } else if (event.type === "operational_failure") {
        const failure = event.event.failure ?? {};
        process.stderr.write(`MODEL ${failure.code ?? "ERROR"}: ${failure.message ?? "operational failure"}\n`);
      }
    },
  });
  const text = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath !== null) writeFileSync(outputPath, text, "utf8");
  else process.stdout.write(text);

  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  process.stderr.write(`GENESIS PASS A DEV: COMPLETE\n`);
  process.stderr.write(`Historical events: ${result.funnel.historicalEvents}\n`);
  process.stderr.write(`Structures: ${result.funnel.structuresInstantiated}/${result.funnel.structuresOffered} instantiated\n`);
  process.stderr.write(`Grounded/emergent: ${result.funnel.episodesStructureGrounded}/${result.funnel.episodesWorldEmergent}\n`);
  process.stderr.write(`Record repairs: ${result.rejectionRepairProfile.recordRepairs}\n`);
  process.stderr.write(`Memory/meaning records: 0/0\n`);
  process.stderr.write(`Elapsed: ${elapsedSeconds.toFixed(1)} s\n`);
  if (outputPath !== null) process.stderr.write(`Artifact: ${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`GENESIS PASS A DEV: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
  process.exitCode = 1;
});

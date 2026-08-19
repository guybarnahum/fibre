#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  eventStructurePoolV2Digest,
  sampleEventStructuresV2,
} from "../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import {
  buildRichLifePassAInput,
  syntheticLineageWitnessFromRecombinedGenome,
} from "../services/world-kernel/src/genesis-rich-life-domain.mjs";
import {
  generateRichPassAEpisode,
  richPassAPromptHash,
  richPassARepairPromptHash,
  richPassASchemaHash,
} from "../services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import { characterizeSliceERichLife } from "../services/world-kernel/src/genesis-slice-e-characterization.mjs";
import {
  buildRecombinedSymbolicGenome,
  buildSyntheticAncestorSymbolicGenome,
} from "../services/world-kernel/src/symbolic-genome-domain.mjs";

const DEFAULT_EPISODES = 10;
const DEFAULT_SEED = "slice-e-dev-burned-001";
const DEFAULT_ORIGIN_MODE = "synthetic_lineage";
const EVIDENCE_VERSION = "pr39-slice-e-rich-life-development-v1";

export const SLICE_E_DEV_WORLD = Object.freeze({
  worldSpecId: "world_slice_e_dev_burned_001",
  timeFrame: { startAt: "1988-01-01T00:00:00Z", endAt: "2016-12-31T23:59:59Z" },
  places: [
    { placeId: "place_e_home", description: "A rented apartment in a dense mixed-income neighborhood near buses and local shops." },
    { placeId: "place_e_school", description: "A public school with classrooms, practical labs, clubs and a small library room." },
    { placeId: "place_e_library", description: "A public library with open stacks, community talks, newspapers and art displays." },
    { placeId: "place_e_center", description: "A community center used for workshops, performances, meetings and youth activities." },
    { placeId: "place_e_street", description: "A walkable commercial street with groceries, repair shops, food counters and transit stops." },
  ],
  householdShape: "Two caregivers, the subject and one younger sibling share a stable rented apartment.",
  familyRelations: ["A grandparent lives elsewhere in the city.", "The younger sibling is four years younger."],
  languages: ["English", "Korean"],
  materialCircumstances: "Housing and ordinary bills are reliable, discretionary money is limited, and public institutions carry much of the household's cultural and educational access.",
  mobilityPattern: "The household stays in the same district and normally walks, cycles or uses buses.",
  schoolingOrCommunityContext: "Public school, library, community center, local commerce and informal peer activity are all reachable.",
  culturalContext: "A multilingual neighborhood mixes family traditions, public institutions, youth culture and ordinary disagreement among adults.",
  availableInstitutions: ["public_school", "public_library", "community_center", "local_commerce", "public_transit"],
  intellectualEnvironment: "School experiments, library books, newspapers, repair manuals, community art, public talks, religious/philosophical texts and ordinary argument are available unevenly over time; no source or conclusion is mandatory.",
  affordedRoles: ["caregiver", "sibling", "peer", "teacher", "neighbor", "librarian", "mentor", "shopkeeper"],
  worldAuthorship: {
    authorId: "fibre_slice_e_development",
    sourcesConsulted: [],
    abstractionMethod: "Synthetic throwaway development world authored without access to the development genome and without a named source person, plot or target adult role.",
    relocationWitness: "The world can move to another era/city/culture without preserving named source characters, scenes or a desired adult personality.",
    familiarityProbe: null,
    createdAt: "2026-08-18T23:45:00Z",
  },
  createdAt: "2026-08-18T23:45:00Z",
});

export const SLICE_E_DEV_SUBJECT = Object.freeze({
  provisionalThreadId: "thr_slice_e_dev_001",
  bornAt: "1994-04-03T00:00:00Z",
});

export const SLICE_E_DEV_SPAN = Object.freeze({
  windowId: "childhood_through_adolescence",
  startAt: "2000-04-03T00:00:00Z",
  endAt: "2012-04-02T23:59:59Z",
  minAge: 6,
  maxAge: 17.999,
});

export const SLICE_E_DEV_ROSTER = Object.freeze([
  { participantId: SLICE_E_DEV_SUBJECT.provisionalThreadId, factualRoles: ["subject"], relationshipFacts: ["This is the provisional Thread whose prior life is being generated."] },
  { participantId: "person_e_caregiver_1", factualRoles: ["caregiver"], relationshipFacts: ["Lives in the subject household."] },
  { participantId: "person_e_caregiver_2", factualRoles: ["caregiver"], relationshipFacts: ["Lives in the subject household."] },
  { participantId: "person_e_sibling", factualRoles: ["sibling"], relationshipFacts: ["Younger sibling in the subject household."] },
]);

const ANCESTOR_A_VALUES = Object.freeze([
  "Prefers to inspect concrete evidence before accepting a confident explanation.",
  "Enjoys making small practical objects even when the result stays visibly imperfect.",
  "Can stay in a disagreement without needing immediate agreement.",
  "Often notices when a stated rule and observed practice do not line up.",
  "Returns to a difficult text when one unresolved detail remains interesting.",
  "Sometimes protects private time even when a group activity is available.",
]);
const ANCESTOR_B_VALUES = Object.freeze([
  "Tends to include quieter people when a shared choice is being made.",
  "Enjoys ordinary routines that leave room for sustained attention.",
  "Can change an interpretation without pretending the earlier one never existed.",
  "Often asks how a system behaves at its edge cases rather than only at its center.",
  "Likes hearing how another person reached a different conclusion.",
  "Can leave an interesting question unresolved instead of forcing a tidy answer.",
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

function rounded(value) { return Number(value.toFixed(6)); }

export function stratifySliceEDevelopmentSpan(baseWindow = SLICE_E_DEV_SPAN, episodeCount = DEFAULT_EPISODES) {
  if (!Number.isSafeInteger(episodeCount) || episodeCount < 1) throw new TypeError("episodeCount must be a positive integer");
  const startMs = Date.parse(baseWindow.startAt);
  const endMs = Date.parse(baseWindow.endAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) throw new TypeError("developmental span timestamps are invalid");
  const inclusiveMillis = endMs - startMs + 1;
  const ageSpan = baseWindow.maxAge - baseWindow.minAge;
  return Object.freeze(Array.from({ length: episodeCount }, (_, index) => {
    const sliceStart = startMs + Math.floor((inclusiveMillis * index) / episodeCount);
    const sliceEnd = startMs + Math.floor((inclusiveMillis * (index + 1)) / episodeCount) - 1;
    return Object.freeze({
      windowId: `${baseWindow.windowId}_stratum_${String(index + 1).padStart(2, "0")}`,
      startAt: new Date(sliceStart).toISOString(),
      endAt: new Date(sliceEnd).toISOString(),
      minAge: rounded(baseWindow.minAge + (ageSpan * index) / episodeCount),
      maxAge: rounded(baseWindow.minAge + (ageSpan * (index + 1)) / episodeCount),
    });
  }));
}

export function buildSliceEDevelopmentPlan({ episodeCount = DEFAULT_EPISODES, seed = DEFAULT_SEED } = {}) {
  const windows = stratifySliceEDevelopmentSpan(SLICE_E_DEV_SPAN, episodeCount);
  return Object.freeze(windows.map((developmentalWindow) => Object.freeze({
    developmentalWindow,
    offeredEntries: sampleEventStructuresV2(
      GENESIS_EVENT_STRUCTURE_POOL_V2,
      developmentalWindow,
      { seed: `${seed}:structures:${developmentalWindow.windowId}`, count: 9 },
    ),
  })));
}

export function buildSliceESyntheticLineage({ seed = DEFAULT_SEED } = {}) {
  const createdAt = "2026-08-18T23:46:00Z";
  const ancestorA = buildSyntheticAncestorSymbolicGenome({
    ancestorId: "ancestor_slice_e_dev_a",
    genesisId: "gen_slice_e_dev_ancestor_a",
    values: ANCESTOR_A_VALUES,
    createdAt,
  });
  const ancestorB = buildSyntheticAncestorSymbolicGenome({
    ancestorId: "ancestor_slice_e_dev_b",
    genesisId: "gen_slice_e_dev_ancestor_b",
    values: ANCESTOR_B_VALUES,
    createdAt,
  });
  const child = buildRecombinedSymbolicGenome({
    threadId: SLICE_E_DEV_SUBJECT.provisionalThreadId,
    genesisId: "gen_slice_e_dev_child",
    sourceGenomes: [ancestorA, ancestorB],
    selectionSeed: `${seed}:symbolic-crossover`,
    createdAt,
  });
  return Object.freeze({
    witness: syntheticLineageWitnessFromRecombinedGenome(child),
    evidence: Object.freeze({
      genomeRef: child.header.genomeId,
      genomeDigest: child.genomeDigest,
      locusCount: child.loci.length,
      sourceGenomeRefs: Object.freeze([ancestorA.header.genomeId, ancestorB.header.genomeId]),
      sourceAncestorRefs: Object.freeze([ancestorA.header.owner.ownerId, ancestorB.header.owner.ownerId]),
      selectionDigest: child.header.recombinationWitness.selectionDigest,
    }),
  });
}

function uniqueIntroductions(episodes) {
  return episodes.flatMap((episode) => episode.introducedParticipants);
}

export async function runSliceERichLifeDevelopment({
  provider,
  model,
  originMode = DEFAULT_ORIGIN_MODE,
  episodeCount = DEFAULT_EPISODES,
  seed = DEFAULT_SEED,
  worldSpec = SLICE_E_DEV_WORLD,
  onProgress = null,
  adapterOverride = null,
} = {}) {
  if (!["openai", "google"].includes(provider)) throw new TypeError("provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new TypeError("model is required");
  if (!["de_novo", "synthetic_lineage"].includes(originMode)) throw new TypeError("originMode must be de_novo or synthetic_lineage");
  if (adapterOverride !== null && typeof adapterOverride?.invoke !== "function") throw new TypeError("adapterOverride must expose invoke()");

  const modelEvents = [];
  const observer = (event) => {
    modelEvents.push(event);
    if (typeof onProgress === "function" && event?.type === "operational_failure") onProgress({ type: "operational_failure", event });
  };
  const adapter = adapterOverride ?? createAdapter({ provider, model, observer });
  const plan = buildSliceEDevelopmentPlan({ episodeCount, seed });
  const lineage = originMode === "synthetic_lineage" ? buildSliceESyntheticLineage({ seed }) : null;
  const episodes = [];
  const recordEvidence = [];

  for (let index = 0; index < plan.length; index += 1) {
    const ordinal = index + 1;
    const { developmentalWindow, offeredEntries } = plan[index];
    const input = buildRichLifePassAInput({
      originMode,
      syntheticLineageWitness: lineage?.witness ?? null,
      worldSpec,
      subject: SLICE_E_DEV_SUBJECT,
      developmentalWindow,
      chronologyEndsAt: developmentalWindow.endAt,
      initialRoster: SLICE_E_DEV_ROSTER,
      priorEpisodes: episodes,
      previouslyIntroducedParticipants: uniqueIntroductions(episodes),
      eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
      offeredEntries,
    });
    if (typeof onProgress === "function") onProgress({ type: "episode_start", ordinal, total: plan.length, developmentalWindow });
    const startedAt = Date.now();
    const result = await generateRichPassAEpisode({
      adapter,
      input,
      clientRequestId: `slice-e-dev:${seed}:${originMode}:episode:${String(ordinal).padStart(2, "0")}`,
      onRecordRepair: (repair) => {
        if (typeof onProgress === "function") onProgress({ type: "record_repair", ordinal, total: plan.length, repair });
      },
    });
    episodes.push(result.episode);
    recordEvidence.push({
      inputDigest: result.inputDigest,
      episodeDigest: result.episodeDigest,
      calls: result.calls,
      repairs: result.repairs,
    });
    if (typeof onProgress === "function") {
      onProgress({ type: "episode_complete", ordinal, total: plan.length, elapsedMs: Date.now() - startedAt, episode: result.episode, repairs: result.repairs.length });
    }
  }

  return {
    evidenceVersion: EVIDENCE_VERSION,
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    seed,
    originMode,
    generator: {
      provider,
      model,
      promptHash: richPassAPromptHash(),
      repairPromptHash: richPassARepairPromptHash(),
      schemaHash: richPassASchemaHash(),
      modelEvents,
    },
    worldSpec: structuredClone(worldSpec),
    subject: structuredClone(SLICE_E_DEV_SUBJECT),
    developmentalSpan: structuredClone(SLICE_E_DEV_SPAN),
    eventStructurePool: {
      version: "genesis-event-structure-pool-v2",
      digest: eventStructurePoolV2Digest(GENESIS_EVENT_STRUCTURE_POOL_V2),
      windows: plan.map(({ developmentalWindow, offeredEntries }) => ({
        ...structuredClone(developmentalWindow),
        offeredStructureIds: offeredEntries.map((entry) => entry.structure.structureId).sort(),
      })),
    },
    lineage: lineage?.evidence ?? null,
    episodes: structuredClone(episodes),
    recordEvidence,
    characterization: characterizeSliceERichLife({ originMode, episodes, eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2 }),
    admissionVerdict: null,
  };
}

function printUsage() {
  process.stdout.write("Usage: npm run genesis:rich-life-dev -- --provider <openai|google> --model <model> [--origin-mode de_novo|synthetic_lineage] [--episodes 10] [--seed <seed>] [--world-file <json>] [--out <file>] [--overwrite]\n");
}

function progressPrinter(event) {
  if (event.type === "episode_start") {
    process.stdout.write(`[episode ${String(event.ordinal).padStart(2, "0")}/${event.total}] age ${event.developmentalWindow.minAge}-${event.developmentalWindow.maxAge} ... `);
  } else if (event.type === "episode_complete") {
    const encounter = event.episode.intellectualEncounter?.kind ?? "none";
    process.stdout.write(`✓ ${event.elapsedMs} ms · encounter=${encounter} · repairs=${event.repairs}\n`);
  } else if (event.type === "record_repair") {
    process.stdout.write(`\n  repair ${event.repair.failedGate} ... `);
  } else if (event.type === "operational_failure") {
    process.stdout.write(`\n  provider failure: ${event.event?.message ?? "unknown"}\n`);
  }
}

async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) { printUsage(); return; }
  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const originMode = readArg(argv, "--origin-mode", DEFAULT_ORIGIN_MODE);
  const episodeCount = Number(readArg(argv, "--episodes", String(DEFAULT_EPISODES)));
  const seed = readArg(argv, "--seed", DEFAULT_SEED);
  const worldFile = readArg(argv, "--world-file");
  const out = readArg(argv, "--out");
  const overwrite = argv.includes("--overwrite");
  if (provider === null || model === null) { printUsage(); throw new TypeError("--provider and --model are required"); }
  if (!Number.isSafeInteger(episodeCount) || episodeCount < 1) throw new TypeError("--episodes must be a positive integer");
  if (out !== null && existsSync(resolve(out)) && !overwrite) throw new TypeError(`output file ${out} already exists; use --overwrite to replace it`);
  const worldSpec = worldFile === null ? structuredClone(SLICE_E_DEV_WORLD) : JSON.parse(readFileSync(resolve(worldFile), "utf8"));

  process.stdout.write(`GENESIS RICH LIFE DEV: START · ${episodeCount} episodes · ${originMode} · ${provider}/${model}\n`);
  const evidence = await runSliceERichLifeDevelopment({
    provider,
    model,
    originMode,
    episodeCount,
    seed,
    worldSpec,
    onProgress: progressPrinter,
  });
  const output = JSON.stringify(evidence, null, 2) + "\n";
  if (out === null) process.stdout.write(output);
  else {
    writeFileSync(resolve(out), output, "utf8");
    process.stdout.write(`WROTE ${resolve(out)}\n`);
  }
}

const invokedPath = process.argv[1] === undefined ? null : pathToFileURL(resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

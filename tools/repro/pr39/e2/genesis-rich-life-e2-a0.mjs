#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  eventStructurePoolV2Digest,
  eventStructureV2Metadata,
  sampleEventStructuresV2,
} from "../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import { buildRichLifePassAInput } from "../services/world-kernel/src/genesis-rich-life-domain.mjs";
import {
  generateRichPassAEpisode,
  richPassAPromptHash,
  richPassARecordRetryPromptHash,
  richPassARepairPromptHash,
  richPassASchemaHash,
} from "../services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import { characterizeSliceERichLife } from "../services/world-kernel/src/genesis-slice-e-characterization.mjs";
import { stratifySliceEDevelopmentSpan } from "./genesis-rich-life-dev.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";

export const E2_A0_EVIDENCE_VERSION = "pr39-slice-e2-a0-baseline-v1";
export const E2_A0_PROTOCOL_VERSION = "pr39-slice-e2-a0-protocol-v1";
export const E2_A0_EPISODES = 10;
export const E2_A0_STRUCTURES_PER_WINDOW = 9;
export const E2_A0_DEFAULT_SEEDS = Object.freeze([
  "slice-e2-a0-seed-01",
  "slice-e2-a0-seed-02",
  "slice-e2-a0-seed-03",
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

function replaceSubject(worldFixture, runOrdinal) {
  const suffix = String(runOrdinal).padStart(2, "0");
  const oldId = worldFixture.subject.provisionalThreadId;
  const newId = `${oldId}_a0_${suffix}`;
  return Object.freeze({
    subject: Object.freeze({ ...structuredClone(worldFixture.subject), provisionalThreadId: newId }),
    initialRoster: Object.freeze(worldFixture.initialRoster.map((participant) => Object.freeze({
      ...structuredClone(participant),
      participantId: participant.participantId === oldId ? newId : participant.participantId,
    }))),
  });
}

export function buildE2A0Plan(worldFixture, seed) {
  if (typeof seed !== "string" || seed.trim() === "") throw new TypeError("E2 A0 seed is required");
  const windows = stratifySliceEDevelopmentSpan(worldFixture.span, E2_A0_EPISODES);
  return Object.freeze(windows.map((developmentalWindow) => Object.freeze({
    developmentalWindow,
    offeredEntries: sampleEventStructuresV2(
      GENESIS_EVENT_STRUCTURE_POOL_V2,
      developmentalWindow,
      {
        seed: `${seed}:${worldFixture.id}:structures:${developmentalWindow.windowId}`,
        count: E2_A0_STRUCTURES_PER_WINDOW,
      },
    ),
  })));
}

function uniqueIntroductions(episodes) {
  return episodes.flatMap((episode) => episode.introducedParticipants);
}

function roleMap(initialRoster, episodes) {
  const roles = new Map();
  for (const participant of initialRoster) roles.set(participant.participantId, [...participant.factualRoles]);
  for (const episode of episodes) {
    for (const introduced of episode.introducedParticipants) roles.set(introduced.provisionalPersonId, [introduced.roleRef]);
  }
  return roles;
}

function lifeSets(life) {
  const roles = roleMap(life.initialRoster, life.episodes);
  const subjectId = life.subject.provisionalThreadId;
  const participantRoles = new Set();
  for (const episode of life.episodes) {
    for (const participantRef of episode.participantRefs) {
      if (participantRef === subjectId) continue;
      for (const role of roles.get(participantRef) ?? []) participantRoles.add(role);
    }
  }
  return Object.freeze({
    places: new Set(life.episodes.map((episode) => episode.placeRef)),
    participantRoles,
    structures: new Set(life.episodes.map((episode) => episode.structureRef).filter((value) => value !== null)),
    intellectualSubjects: new Set(life.episodes
      .map((episode) => episode.intellectualEncounter?.subjectRef ?? null)
      .filter((value) => value !== null)),
  });
}

function jaccard(leftSet, rightSet) {
  const union = new Set([...leftSet, ...rightSet]);
  if (union.size === 0) return null;
  const intersection = [...leftSet].filter((value) => rightSet.has(value)).sort();
  return Object.freeze({
    value: intersection.length / union.size,
    intersection: Object.freeze(intersection),
    unionSize: union.size,
  });
}

function counts(values) {
  const result = new Map();
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
  return result;
}

function concentration(values) {
  if (values.length === 0) return Object.freeze({ topShare: null, hhi: null });
  const valueCounts = [...counts(values).values()];
  const topShare = Math.max(...valueCounts) / values.length;
  const hhi = valueCounts.reduce((sum, count) => sum + (count / values.length) ** 2, 0);
  return Object.freeze({ topShare, hhi });
}

function characterizeLife(life) {
  const roles = roleMap(life.initialRoster, life.episodes);
  const subjectId = life.subject.provisionalThreadId;
  const participantRoleEvents = [];
  for (const episode of life.episodes) {
    const eventRoles = new Set();
    for (const participantRef of episode.participantRefs) {
      if (participantRef === subjectId) continue;
      for (const role of roles.get(participantRef) ?? []) eventRoles.add(role);
    }
    participantRoleEvents.push(...eventRoles);
  }
  const selectedIntellectualStructures = life.episodes.filter((episode) =>
    episode.structureRef !== null
      && eventStructureV2Metadata(episode.structureRef)?.contextKinds.includes("intellectual_encounter"));
  return Object.freeze({
    placeConcentration: concentration(life.episodes.map((episode) => episode.placeRef)),
    structureConcentration: concentration(life.episodes.map((episode) => episode.structureRef ?? "world_emergent")),
    participantRoleConcentration: concentration(participantRoleEvents),
    uniquePlaces: new Set(life.episodes.map((episode) => episode.placeRef)).size,
    uniqueStructures: new Set(life.episodes.map((episode) => episode.structureRef).filter((value) => value !== null)).size,
    introducedParticipants: life.episodes.reduce((sum, episode) => sum + episode.introducedParticipants.length, 0),
    selectedIntellectualStructureEvents: selectedIntellectualStructures.length,
    intellectualEncounterEvents: life.episodes.filter((episode) => episode.intellectualEncounter !== undefined).length,
    repairCount: life.recordEvidence.reduce((sum, record) => sum + record.repairs.length, 0),
    recordRetryCount: life.recordEvidence.reduce((sum, record) => sum + record.recordRetries.length, 0),
  });
}

export function characterizeE2BetweenLifeParticularity(lives) {
  if (!Array.isArray(lives) || lives.length < 2) throw new TypeError("between-life characterization requires at least two lives");
  const pairs = [];
  for (let leftIndex = 0; leftIndex < lives.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < lives.length; rightIndex += 1) {
      const left = lives[leftIndex];
      const right = lives[rightIndex];
      const leftSets = lifeSets(left);
      const rightSets = lifeSets(right);
      pairs.push(Object.freeze({
        leftSeed: left.seed,
        rightSeed: right.seed,
        placeRefs: jaccard(leftSets.places, rightSets.places),
        participantRoles: jaccard(leftSets.participantRoles, rightSets.participantRoles),
        structureRefs: jaccard(leftSets.structures, rightSets.structures),
        intellectualSubjectRefs: jaccard(leftSets.intellectualSubjects, rightSets.intellectualSubjects),
      }));
    }
  }
  return Object.freeze({
    characterizationVersion: "pr39-slice-e2-between-life-v1",
    pairCount: pairs.length,
    pairs: Object.freeze(pairs),
    admissionVerdict: null,
  });
}

export async function runE2A0Life({
  worldFixture,
  provider,
  model,
  seed,
  runOrdinal,
  adapter,
  onProgress = null,
}) {
  const identity = replaceSubject(worldFixture, runOrdinal);
  const plan = buildE2A0Plan(worldFixture, seed);
  const episodes = [];
  const recordEvidence = [];

  for (let index = 0; index < plan.length; index += 1) {
    const ordinal = index + 1;
    const { developmentalWindow, offeredEntries } = plan[index];
    if (typeof onProgress === "function") onProgress({
      type: "episode_start",
      worldId: worldFixture.id,
      seed,
      runOrdinal,
      ordinal,
      total: plan.length,
      developmentalWindow,
    });
    const startedAt = Date.now();
    const input = buildRichLifePassAInput({
      originMode: "de_novo",
      syntheticLineageWitness: null,
      worldSpec: worldFixture.worldSpec,
      subject: identity.subject,
      developmentalWindow,
      chronologyEndsAt: developmentalWindow.endAt,
      initialRoster: identity.initialRoster,
      priorEpisodes: episodes,
      previouslyIntroducedParticipants: uniqueIntroductions(episodes),
      eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
      offeredEntries,
    });
    const result = await generateRichPassAEpisode({
      adapter,
      input,
      clientRequestId: `slice-e2-a0:${worldFixture.id}:${seed}:episode:${String(ordinal).padStart(2, "0")}`,
      onRecordRepair: (repair) => {
        if (typeof onProgress === "function") onProgress({
          type: "record_repair",
          worldId: worldFixture.id,
          seed,
          runOrdinal,
          ordinal,
          total: plan.length,
          repair,
        });
      },
      onRecordRetry: (recordRetry) => {
        if (typeof onProgress === "function") onProgress({
          type: "record_retry",
          worldId: worldFixture.id,
          seed,
          runOrdinal,
          ordinal,
          total: plan.length,
          recordRetry,
        });
      },
    });
    episodes.push(result.episode);
    recordEvidence.push({
      inputDigest: result.inputDigest,
      episodeDigest: result.episodeDigest,
      calls: result.calls,
      repairs: result.repairs,
      recordRetries: result.recordRetries,
    });
    if (typeof onProgress === "function") onProgress({
      type: "episode_complete",
      worldId: worldFixture.id,
      seed,
      runOrdinal,
      ordinal,
      total: plan.length,
      elapsedMs: Date.now() - startedAt,
      episode: result.episode,
      repairs: result.repairs.length,
      recordRetries: result.recordRetries.length,
    });
  }

  const life = {
    worldId: worldFixture.id,
    worldSpecId: worldFixture.worldSpec.worldSpecId,
    seed,
    runOrdinal,
    originMode: "de_novo",
    subject: structuredClone(identity.subject),
    initialRoster: structuredClone(identity.initialRoster),
    developmentalSpan: structuredClone(worldFixture.span),
    offeredWindows: plan.map(({ developmentalWindow, offeredEntries }) => ({
      developmentalWindow: structuredClone(developmentalWindow),
      offeredStructureIds: offeredEntries.map((entry) => entry.structure.structureId).sort(),
      offeredIntellectualStructureIds: offeredEntries
        .filter((entry) => entry.contextKinds.includes("intellectual_encounter"))
        .map((entry) => entry.structure.structureId)
        .sort(),
    })),
    episodes: structuredClone(episodes),
    recordEvidence: structuredClone(recordEvidence),
    sliceECharacterization: characterizeSliceERichLife({
      originMode: "de_novo",
      episodes,
      eventStructurePoolV2: GENESIS_EVENT_STRUCTURE_POOL_V2,
    }),
  };
  return Object.freeze({ ...life, e2Characterization: characterizeLife(life) });
}

export async function runE2A0Baseline({
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
  for (const worldFixture of worlds) {
    for (let index = 0; index < seeds.length; index += 1) {
      lives.push(await runE2A0Life({
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
  const byWorld = worlds.map((worldFixture) => {
    const worldLives = lives.filter((life) => life.worldId === worldFixture.id);
    return {
      worldId: worldFixture.id,
      worldSpecId: worldFixture.worldSpec.worldSpecId,
      worldSpecDigest: digest(worldFixture.worldSpec),
      lives: structuredClone(worldLives),
      betweenLife: characterizeE2BetweenLifeParticularity(worldLives),
    };
  });
  return Object.freeze({
    evidenceVersion: E2_A0_EVIDENCE_VERSION,
    protocolVersion: E2_A0_PROTOCOL_VERSION,
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    arm: "A0_current_pass_a",
    originMode: "de_novo",
    originModeNote: "Pass A cognition is origin-mode blind; de_novo avoids adding irrelevant lineage evidence to this E2 mechanism baseline.",
    provider,
    model,
    seeds: Object.freeze([...seeds]),
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
    admissionVerdict: null,
  });
}

function progressPrinter(event) {
  const prefix = `[E2 A0 ${event.worldId} run ${event.runOrdinal}/3 · episode ${String(event.ordinal).padStart(2, "0")}/${event.total}]`;
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

function printUsage() {
  process.stdout.write("Usage: npm run genesis:e2-a0 -- --provider <openai|google> --model <model> [--out <file>] [--overwrite]\n");
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    return;
  }
  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const outputPath = readArg(argv, "--out");
  const overwrite = argv.includes("--overwrite");
  if (!["openai", "google"].includes(provider)) throw new Error("--provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new Error("--model is required");
  if (outputPath !== null && existsSync(outputPath) && !overwrite) throw new Error(`output exists: ${outputPath}; pass --overwrite to replace it`);

  process.stderr.write(`E2 A0 BASELINE: START · ${E2_DIAGNOSTIC_WORLDS.length} worlds · ${E2_A0_DEFAULT_SEEDS.length} lives/world · ${E2_A0_EPISODES} episodes/life\n`);
  const result = await runE2A0Baseline({ provider, model, onProgress: progressPrinter });
  const text = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath !== null) writeFileSync(outputPath, text, "utf8");
  else process.stdout.write(text);

  for (const world of result.worlds) {
    process.stdout.write(`${world.worldId}:\n`);
    for (const life of world.lives) {
      const c = life.e2Characterization;
      process.stdout.write(`  ${life.seed}: places=${c.uniquePlaces} · structures=${c.uniqueStructures} · intellectual-structures=${c.selectedIntellectualStructureEvents} · encounters=${c.intellectualEncounterEvents} · repairs=${c.repairCount} · retries=${c.recordRetryCount}\n`);
    }
    for (const pair of world.betweenLife.pairs) {
      process.stdout.write(`  pair ${pair.leftSeed}/${pair.rightSeed}: placeJ=${pair.placeRefs?.value ?? "n/a"} · roleJ=${pair.participantRoles?.value ?? "n/a"} · structureJ=${pair.structureRefs?.value ?? "n/a"} · sourceJ=${pair.intellectualSubjectRefs?.value ?? "n/a"}\n`);
    }
  }
  if (outputPath !== null) process.stdout.write(`Artifact: ${outputPath}\n`);
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`E2 A0 BASELINE: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

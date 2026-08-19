#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import { genesisRecordDigest } from "../services/world-kernel/src/genesis-domain.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  eventStructurePoolV2Digest,
  normalizeEventStructurePoolV2,
} from "../services/world-kernel/src/genesis-event-structure-pool-v2.mjs";
import {
  SLICE_E_DEV_SPAN,
  SLICE_E_DEV_WORLD,
} from "./genesis-rich-life-dev.mjs";
import {
  E2_D1_SPAN,
  E2_D1_WORLD,
  E2_D2_SPAN,
  E2_D2_WORLD,
} from "./genesis-rich-life-e2-worlds.mjs";

export const E2_H6_PROBE_VERSION = "pr39-slice-e2-h6-realization-probe-v1";

export const E2_H6_PROMPT = `You are performing a blind Fibre Rich-Life affordance-surface review.
You receive one factual Genesis WorldSpec, one developmental span, and the abstract EventStructurePool-v2 entries. You do NOT receive any generated life, prior episode, genome, personality target, memory, meaning, benchmark, seed, or prior failure result.

For every supplied structure, assess how broadly that abstract situation could be realized in THIS world without inventing a personality or desired developmental outcome.

Rate plausible scene diversity, distinct place/participant configurations, and whether the structure is effectively household-dominant in this world. A structure may have many lexical retellings but still count as realization-narrow if they all reduce to the same people/place/circumstance.

For realizationDegenerateWith, list supplied structure IDs that would often collapse to materially the same scene in this world. Use an empty array when none are clear.

Do not reward drama, intellectualism, novelty, adversity, or number of locations. Do not infer what would be formative. This is only an affordance-surface diagnostic.

Keep reason concrete and under 240 characters.`;

const SCENE_BANDS = Object.freeze(["one", "two", "three_to_five", "six_or_more"]);
const CONFIG_BANDS = Object.freeze(["one", "two", "three_or_more"]);
const OUTSIDE_BANDS = Object.freeze(["none", "one_narrow_path", "multiple"]);

export const E2_H6_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["worldSpecId", "ratings"],
  properties: {
    worldSpecId: { type: "string" },
    ratings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "structureId",
          "plausibleSceneCountBand",
          "distinctConfigurationBand",
          "outsideHouseholdPlausibility",
          "householdDominant",
          "realizationDegenerateWith",
          "reason",
        ],
        properties: {
          structureId: { type: "string" },
          plausibleSceneCountBand: { type: "string", enum: SCENE_BANDS },
          distinctConfigurationBand: { type: "string", enum: CONFIG_BANDS },
          outsideHouseholdPlausibility: { type: "string", enum: OUTSIDE_BANDS },
          householdDominant: { type: "boolean" },
          realizationDegenerateWith: { type: "array", items: { type: "string" } },
          reason: { type: "string" },
        },
      },
    },
  },
});

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function structureProjection(entry) {
  return {
    structureId: entry.structure.structureId,
    abstractSituation: entry.structure.abstractSituation,
    participatingRoles: [...entry.structure.participatingRoles],
    developmentalRange: structuredClone(entry.structure.developmentalRange),
    contextKinds: [...entry.contextKinds],
    accessModes: [...entry.accessModes],
  };
}

function probeInput(worldSpec, developmentalSpan) {
  return Object.freeze({
    probeVersion: E2_H6_PROBE_VERSION,
    worldSpec: structuredClone(worldSpec),
    developmentalSpan: structuredClone(developmentalSpan),
    structures: normalizeEventStructurePoolV2(GENESIS_EVENT_STRUCTURE_POOL_V2).map(structureProjection),
  });
}

function assertBand(name, value, allowed) {
  if (!allowed.includes(value)) throw new TypeError(`${name} is invalid`);
}

function normalizeProbeOutput(candidate, input) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError("H6 probe output must be an object");
  }
  if (candidate.worldSpecId !== input.worldSpec.worldSpecId) {
    throw new TypeError("H6 probe output worldSpecId does not match input world");
  }
  if (!Array.isArray(candidate.ratings)) throw new TypeError("H6 probe ratings must be an array");

  const expectedIds = input.structures.map((item) => item.structureId);
  const expectedSet = new Set(expectedIds);
  const seen = new Set();
  const ratings = candidate.ratings.map((rating, index) => {
    if (rating === null || typeof rating !== "object" || Array.isArray(rating)) throw new TypeError(`H6 rating[${index}] must be an object`);
    const keys = Object.keys(rating).sort();
    const expectedKeys = [
      "distinctConfigurationBand",
      "householdDominant",
      "outsideHouseholdPlausibility",
      "plausibleSceneCountBand",
      "realizationDegenerateWith",
      "reason",
      "structureId",
    ];
    if (canonicalJson(keys) !== canonicalJson(expectedKeys)) throw new TypeError(`H6 rating[${index}] has unexpected keys`);
    if (!expectedSet.has(rating.structureId)) throw new TypeError(`H6 rating references unknown structure ${rating.structureId}`);
    if (seen.has(rating.structureId)) throw new TypeError(`H6 rating duplicates structure ${rating.structureId}`);
    seen.add(rating.structureId);
    assertBand(`H6 rating ${rating.structureId} plausibleSceneCountBand`, rating.plausibleSceneCountBand, SCENE_BANDS);
    assertBand(`H6 rating ${rating.structureId} distinctConfigurationBand`, rating.distinctConfigurationBand, CONFIG_BANDS);
    assertBand(`H6 rating ${rating.structureId} outsideHouseholdPlausibility`, rating.outsideHouseholdPlausibility, OUTSIDE_BANDS);
    if (typeof rating.householdDominant !== "boolean") throw new TypeError(`H6 rating ${rating.structureId} householdDominant must be boolean`);
    if (!Array.isArray(rating.realizationDegenerateWith)) throw new TypeError(`H6 rating ${rating.structureId} realizationDegenerateWith must be an array`);
    for (const otherId of rating.realizationDegenerateWith) {
      if (!expectedSet.has(otherId) || otherId === rating.structureId) {
        throw new TypeError(`H6 rating ${rating.structureId} has invalid realizationDegenerateWith value ${otherId}`);
      }
    }
    if (new Set(rating.realizationDegenerateWith).size !== rating.realizationDegenerateWith.length) {
      throw new TypeError(`H6 rating ${rating.structureId} repeats realizationDegenerateWith IDs`);
    }
    if (typeof rating.reason !== "string" || rating.reason.trim() === "") throw new TypeError(`H6 rating ${rating.structureId} reason is required`);
    if (Buffer.byteLength(rating.reason, "utf8") > 240) throw new TypeError(`H6 rating ${rating.structureId} reason exceeds 240 UTF-8 bytes`);
    return Object.freeze({
      structureId: rating.structureId,
      plausibleSceneCountBand: rating.plausibleSceneCountBand,
      distinctConfigurationBand: rating.distinctConfigurationBand,
      outsideHouseholdPlausibility: rating.outsideHouseholdPlausibility,
      householdDominant: rating.householdDominant,
      realizationDegenerateWith: Object.freeze([...rating.realizationDegenerateWith].sort()),
      reason: rating.reason.trim(),
    });
  });

  if (seen.size !== expectedSet.size) {
    const missing = expectedIds.filter((id) => !seen.has(id));
    throw new TypeError(`H6 probe omitted structures: ${missing.join(", ")}`);
  }
  ratings.sort((a, b) => a.structureId.localeCompare(b.structureId));
  return Object.freeze({ worldSpecId: candidate.worldSpecId, ratings: Object.freeze(ratings) });
}

function characterize(ratings) {
  const lowScene = ratings.filter((item) => ["one", "two"].includes(item.plausibleSceneCountBand));
  const lowConfig = ratings.filter((item) => ["one", "two"].includes(item.distinctConfigurationBand));
  const householdDominant = ratings.filter((item) => item.householdDominant);
  const intellectualIds = new Set(normalizeEventStructurePoolV2(GENESIS_EVENT_STRUCTURE_POOL_V2)
    .filter((entry) => entry.contextKinds.includes("intellectual_encounter"))
    .map((entry) => entry.structure.structureId));
  const intellectual = ratings.filter((item) => intellectualIds.has(item.structureId));
  const intellectualLowScene = intellectual.filter((item) => ["one", "two"].includes(item.plausibleSceneCountBand));
  const total = ratings.length;
  return Object.freeze({
    totalStructures: total,
    lowSceneCount: lowScene.length,
    lowSceneShare: lowScene.length / total,
    lowConfigurationCount: lowConfig.length,
    lowConfigurationShare: lowConfig.length / total,
    householdDominantCount: householdDominant.length,
    householdDominantShare: householdDominant.length / total,
    intellectualStructureCount: intellectual.length,
    intellectualLowSceneCount: intellectualLowScene.length,
    intellectualLowSceneShare: intellectual.length === 0 ? null : intellectualLowScene.length / intellectual.length,
    warning: Object.freeze({
      moreThanHalfLowScene: lowScene.length / total > 0.5,
      moreThanHalfHouseholdDominant: householdDominant.length / total > 0.5,
    }),
  });
}

export async function runE2H6Probe({ adapter, provider, model, worlds = null } = {}) {
  if (adapter === null || typeof adapter?.invoke !== "function") throw new TypeError("H6 probe adapter must expose invoke()");
  const selected = worlds ?? [
    { label: "E1", worldSpec: SLICE_E_DEV_WORLD, developmentalSpan: SLICE_E_DEV_SPAN },
    { label: "E2-D1", worldSpec: E2_D1_WORLD, developmentalSpan: E2_D1_SPAN },
    { label: "E2-D2", worldSpec: E2_D2_WORLD, developmentalSpan: E2_D2_SPAN },
  ];
  const results = [];
  for (const item of selected) {
    const input = probeInput(item.worldSpec, item.developmentalSpan);
    const result = await adapter.invoke({
      systemPrompt: E2_H6_PROMPT,
      input,
      responseSchema: E2_H6_RESPONSE_SCHEMA,
      clientRequestId: `slice-e2-h6:${item.label}`,
    });
    const normalized = normalizeProbeOutput(result.output, input);
    results.push(Object.freeze({
      label: item.label,
      worldSpecId: item.worldSpec.worldSpecId,
      worldSpecDigest: genesisRecordDigest("world_spec", item.worldSpec),
      inputDigest: digest(input),
      outputDigest: digest(normalized),
      provenance: structuredClone(result.provenance),
      ratings: normalized.ratings,
      characterization: characterize(normalized.ratings),
    }));
  }
  return Object.freeze({
    evidenceVersion: E2_H6_PROBE_VERSION,
    developmentOnly: true,
    burnedForFinalCohort: true,
    provider,
    model,
    promptHash: digest(E2_H6_PROMPT),
    schemaHash: digest(E2_H6_RESPONSE_SCHEMA),
    eventStructurePoolDigest: eventStructurePoolV2Digest(GENESIS_EVENT_STRUCTURE_POOL_V2),
    results: Object.freeze(results),
    admissionVerdict: null,
  });
}

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

function usage() {
  process.stdout.write("Usage: node --env-file-if-exists=.env --disable-warning=ExperimentalWarning tools/genesis-rich-life-e2-h6-probe.mjs --provider <openai|google> --model <model> [--out <file>] [--overwrite]\n");
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) return usage();
  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const outputPath = readArg(argv, "--out");
  const overwrite = argv.includes("--overwrite");
  if (!["openai", "google"].includes(provider)) throw new TypeError("--provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new TypeError("--model is required");
  if (outputPath !== null && existsSync(outputPath) && !overwrite) throw new Error(`output already exists: ${outputPath}; pass --overwrite to replace it`);

  let call = 0;
  const observer = (event) => {
    if (event?.type === "operational_failure") process.stderr.write(`H6 operational failure: ${event.failure?.code ?? "MODEL_ERROR"}\n`);
  };
  const base = createAdapter({ provider, model, observer });
  const adapter = Object.freeze({
    ...base,
    async invoke(request) {
      call += 1;
      process.stderr.write(`[H6 ${call}/3] ${request.clientRequestId} ... `);
      const startedAt = Date.now();
      try {
        const result = await base.invoke(request);
        process.stderr.write(`✓ ${Date.now() - startedAt} ms\n`);
        return result;
      } catch (error) {
        process.stderr.write(`✗ ${Date.now() - startedAt} ms\n`);
        throw error;
      }
    },
  });

  const artifact = await runE2H6Probe({ adapter, provider, model });
  const text = `${JSON.stringify(artifact, null, 2)}\n`;
  if (outputPath !== null) {
    writeFileSync(outputPath, text, "utf8");
    for (const result of artifact.results) {
      process.stdout.write(`${result.label}: low-scene ${(result.characterization.lowSceneShare * 100).toFixed(1)}% · household-dominant ${(result.characterization.householdDominantShare * 100).toFixed(1)}%\n`);
    }
    process.stdout.write(`Artifact: ${outputPath}\n`);
    return;
  }
  process.stdout.write(text);
}

const isMain = process.argv[1] !== undefined && new URL(import.meta.url).pathname === new URL(`file://${process.argv[1]}`).pathname;
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`GENESIS E2 H6 PROBE: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

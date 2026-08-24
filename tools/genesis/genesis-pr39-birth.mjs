#!/usr/bin/env node

// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: publish and hydrate an already-generated current Genesis candidate
// fibre-tool-disposition: consolidate into permanent Genesis birth tooling after PR39

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA,
} from "../../services/world-kernel/src/genesis-historical-realization-v1.mjs";
import {
  GENESIS_PASS_B_RESPONSE_SCHEMA,
} from "../../services/world-kernel/src/genesis-pass-b-prompts.mjs";
import {
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
} from "../../services/world-kernel/src/genesis-pass-c-prompts.mjs";
import {
  GENESIS_REPLACEMENT_PASS_A_FORM_REPAIR_PROMPT,
  GENESIS_REPLACEMENT_PASS_A_PROMPT,
  GENESIS_REPLACEMENT_PASS_A_RETRY_PROMPT,
} from "../../services/world-kernel/src/genesis-replacement-pass-a.mjs";
import {
  GENESIS_REPLACEMENT_PASS_B_GENOME_COPY_RETRY_PROMPT,
  GENESIS_REPLACEMENT_PASS_B_PROMPT,
} from "../../services/world-kernel/src/genesis-replacement-pass-b.mjs";
import {
  GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
} from "../../services/world-kernel/src/genesis-rich-pass-a-runner.mjs";
import { buildGenesisDevelopmentPlans } from "./genesis-life-plan.mjs";
import {
  assertHydratedGenesisMatchesCandidate,
  buildGenesisBirthBundle,
  buildGenesisPublicationCognition,
  hydrateGenesisLife,
  publishGenesisLifeCandidate,
} from "./genesis-life-publication.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
function absolute(path) { return resolve(ROOT, path); }
function fail(message) { throw new Error(message); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function writeJson(path, value) {
  const target = absolute(path);
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}
function pad(value) { return String(value).padStart(2, "0"); }

function parseArgs(argv) {
  let run = null;
  let slot = 1;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--run") run = argv[++index];
    else if (argv[index] === "--slot") slot = Number(argv[++index]);
    else fail(`unknown argument ${argv[index]}`);
  }
  if (typeof run !== "string" || !/^[A-Za-z0-9._-]+$/u.test(run)) fail("--run is required and must be a safe development run label");
  if (!Number.isInteger(slot) || slot < 1 || slot > 5) fail("--slot must be an integer from 1 to 5");
  return { run, slot };
}

function adapterDescription({ modelId, temperature, topP, reasoningEffort }) {
  return Object.freeze({
    provider: "openai",
    modelId,
    configuration: Object.freeze({ temperature, topP, reasoningEffort }),
  });
}

function currentCognition(run, plans) {
  const creative = adapterDescription({
    modelId: run.modelId,
    temperature: run.creativeTemperature,
    topP: plans.sampling.topP,
    reasoningEffort: plans.sampling.reasoningEffort,
  });
  const repair = adapterDescription({
    modelId: run.modelId,
    temperature: run.mechanicalRepairTemperature,
    topP: plans.sampling.topP,
    reasoningEffort: plans.sampling.reasoningEffort,
  });
  return buildGenesisPublicationCognition({
    creativeAdapter: creative,
    repairAdapter: repair,
    passAPromptMaterial: {
      initial: GENESIS_REPLACEMENT_PASS_A_PROMPT,
      recordRetry: GENESIS_REPLACEMENT_PASS_A_RETRY_PROMPT,
    },
    passASchemaMaterial: GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA,
    passBPromptMaterial: {
      initial: GENESIS_REPLACEMENT_PASS_B_PROMPT,
      genomeCopyRetry: GENESIS_REPLACEMENT_PASS_B_GENOME_COPY_RETRY_PROMPT,
    },
    passBSchemaMaterial: GENESIS_PASS_B_RESPONSE_SCHEMA,
    passCPromptMaterial: {
      initial: GENESIS_PASS_C_INITIAL_PROMPT,
      reinterpretation: GENESIS_PASS_C_REINTERPRETATION_PROMPT,
    },
    passCSchemaMaterial: {
      initial: GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
      reinterpretation: GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
    },
    repairPromptMaterial: GENESIS_REPLACEMENT_PASS_A_FORM_REPAIR_PROMPT,
    repairSchemaMaterial: GENESIS_RICH_PASS_A_REPAIR_RESPONSE_SCHEMA,
  });
}

const options = parseArgs(process.argv.slice(2));
const root = `.fibre/genesis/pr39-dev/${options.run}`;
const runPath = `${root}/run-v1.json`;
const candidatePath = `${root}/slot-${pad(options.slot)}-candidate-v1.json`;
const databasePath = `${root}/slot-${pad(options.slot)}-birth.sqlite`;
const resultPath = `${root}/slot-${pad(options.slot)}-birth-v1.json`;
if (!existsSync(absolute(runPath))) fail(`development run not found: ${runPath}`);
if (!existsSync(absolute(candidatePath))) fail(`completed candidate not found: ${candidatePath}`);

const run = readJson(runPath);
const candidate = readJson(candidatePath);
const plans = buildGenesisDevelopmentPlans();
const slotPlan = plans.slots[options.slot - 1];
const cognition = currentCognition(run, plans);

console.log("PR39 CURRENT GENESIS BIRTH CHECK");
console.log(`run: ${options.run} · Thread ${options.slot}`);
console.log("model calls: 0");
console.log("target: local development world only; this grants no final-cohort authority");

if (existsSync(absolute(resultPath))) {
  const prior = readJson(resultPath);
  const birth = buildGenesisBirthBundle({
    candidate,
    slotPlan,
    cognition,
    publicationAt: prior.publicationAt,
  });
  const hydrated = hydrateGenesisLife({ databasePath: absolute(databasePath), candidate, slotPlan, birth });
  assertHydratedGenesisMatchesCandidate({ candidate, slotPlan, birth, hydrated });
  console.log(`✓ existing birth rehydrated and matches candidate · version ${hydrated.thread.version}`);
} else {
  if (existsSync(absolute(databasePath))) fail(`birth database already exists without a completed birth report: ${databasePath}`);
  const publicationAt = new Date().toISOString();
  const result = publishGenesisLifeCandidate({
    databasePath: absolute(databasePath),
    candidate,
    slotPlan,
    cognition,
    publicationAt,
  });
  const hydrated = hydrateGenesisLife({
    databasePath: absolute(databasePath),
    candidate,
    slotPlan,
    birth: result.birth,
  });
  assertHydratedGenesisMatchesCandidate({ candidate, slotPlan, birth: result.birth, hydrated });
  writeJson(resultPath, {
    version: "pr39-current-development-birth-v1",
    publicationAt,
    threadId: candidate.threadId,
    genesisId: candidate.genesisId,
    candidateDigest: candidate.candidateDigest ?? null,
    manifestDigest: result.publication.manifestDigest,
    firstLiveVersion: hydrated.thread.version,
    episodeCount: hydrated.episodes.length,
    memoryCount: hydrated.memories.length,
    relationCount: hydrated.lifeRelations.length,
    placeCount: hydrated.placeEpisodes.length,
    memoryVisualObligationCount: hydrated.memoryVisuals.length,
    candidateHydrationMatch: true,
  });
  console.log(`✓ candidate published atomically · version ${hydrated.thread.version}`);
  console.log(`✓ ${hydrated.episodes.length} episodes · ${hydrated.memories.length} memories · ${hydrated.lifeRelations.length} relations · ${hydrated.placeEpisodes.length} places`);
  console.log(`✓ ${hydrated.memoryVisuals.length} memory-visual obligations · candidate/hydration match`);
  console.log(`development birth: ${databasePath}`);
}

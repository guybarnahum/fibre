#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  createDurableModelAdapter,
  createFileModelInvocationJournal,
} from "#services/birth-center/src/model-runtime/durable-invocation-journal.mjs";
import {
  GENESIS_PASS_B_INPUT_VERSION,
  GENESIS_PASS_B_POLICY,
  normalizePassBInput,
} from "#services/world-kernel/src/genesis-pass-b-domain.mjs";
import {
  projectPassBInputForCognition,
} from "#services/world-kernel/src/genesis-pass-b-cognition.mjs";
import {
  GENESIS_LIFE_PASS_B_PROMPT,
  generateGenesisPassBMemory,
} from "#services/world-kernel/src/genesis-life-pass-b.mjs";
import {
  GENESIS_PASS_B_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-pass-b-prompts.mjs";
import { createOpenAIModelAdapter } from "#services/world-kernel/src/model-runtime/openai.mjs";
import {
  canonicalJson,
  sha256,
} from "#services/world-kernel/src/persistence-common.mjs";
import { repoFile } from "#repo-root";

export const MEMORY_SELECTIVITY_CONTROL_PATH = "fixtures/genesis/memory-selectivity-controls.json";
export const MEMORY_SELECTIVITY_RESULT_CONTRACT = "fibre-genesis-memory-selectivity-development-result";
export const MEMORY_SELECTIVITY_DEFAULT_MODEL = "gpt-5.1-2025-11-13";
export const MEMORY_SELECTIVITY_DEFAULT_ROOT = ".fibre/genesis/memory-selectivity";

const CONTROL_CLASSES = Object.freeze(["ordinary_nonselection", "strong_residue"]);

function digestValue(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function digestText(value) {
  return `sha256:${sha256(value)}`;
}

function assertPlainObject(name, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

function assertNonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
}

function assertInteger(name, value, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new TypeError(`${name} must be an integer >= ${minimum}`);
}

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((item) => item.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

function parseMode(argv) {
  const modes = [
    ["preflight", argv.includes("--preflight")],
    ["run", argv.includes("--run")],
    ["replay", argv.includes("--replay")],
  ].filter(([, present]) => present);
  if (modes.length > 1) throw new TypeError("choose only one of --preflight, --run, or --replay");
  return modes.length === 0 ? "preflight" : modes[0][0];
}

function loadControls(path = MEMORY_SELECTIVITY_CONTROL_PATH) {
  const parsed = JSON.parse(readFileSync(repoFile(path), "utf8"));
  assertPlainObject("memory selectivity controls", parsed);
  if (parsed.contract !== "fibre-genesis-memory-selectivity-controls") {
    throw new TypeError("memory selectivity control contract drift");
  }
  if (parsed.developmentOnly !== true) throw new TypeError("memory selectivity controls must be developmentOnly");
  assertPlainObject("memory selectivity subject", parsed.subject);
  assertPlainObject("memory selectivity world", parsed.world);
  assertPlainObject("memory selectivity decisionRule", parsed.decisionRule);
  assertInteger("residueRememberedMinimum", parsed.decisionRule.residueRememberedMinimum, 1);
  assertInteger("ordinaryNotRememberedMinimum", parsed.decisionRule.ordinaryNotRememberedMinimum, 1);
  assertInteger("matchedPairSeparationMinimum", parsed.decisionRule.matchedPairSeparationMinimum, 1);
  if (parsed.decisionRule.requireBothOutcomes !== true) {
    throw new TypeError("memory selectivity controls must require both outcomes");
  }
  if (!Array.isArray(parsed.cases) || parsed.cases.length !== 8) {
    throw new TypeError("memory selectivity controls require exactly 8 prospective cases");
  }

  const trialIds = new Set();
  const pairs = new Map();
  for (const [index, item] of parsed.cases.entries()) {
    const pathLabel = `memory selectivity case ${index + 1}`;
    assertPlainObject(pathLabel, item);
    assertNonEmpty(`${pathLabel}.trialId`, item.trialId);
    assertNonEmpty(`${pathLabel}.pairId`, item.pairId);
    if (trialIds.has(item.trialId)) throw new TypeError(`duplicate memory selectivity trialId ${item.trialId}`);
    trialIds.add(item.trialId);
    if (!CONTROL_CLASSES.includes(item.controlClass)) throw new TypeError(`${pathLabel}.controlClass is invalid`);
    const expected = item.controlClass === "strong_residue" ? "remembered" : "not_remembered";
    if (item.expectedOutcome !== expected) throw new TypeError(`${pathLabel}.expectedOutcome must be ${expected}`);
    if (!Array.isArray(item.history) || item.history.length !== 1) {
      throw new TypeError(`${pathLabel}.history must contain exactly one controlled opportunity`);
    }
    const pair = pairs.get(item.pairId) ?? [];
    pair.push(item);
    pairs.set(item.pairId, pair);
  }

  if (pairs.size !== 4) throw new TypeError("memory selectivity controls require exactly four matched pairs");
  for (const [pairId, pair] of pairs.entries()) {
    if (pair.length !== 2) throw new TypeError(`memory selectivity pair ${pairId} must contain two cases`);
    const classes = new Set(pair.map((item) => item.controlClass));
    if (classes.size !== 2) throw new TypeError(`memory selectivity pair ${pairId} must contain both control classes`);
    if (pair[0].rememberingAt !== pair[1].rememberingAt || pair[0].ageAtRemembering !== pair[1].ageAtRemembering) {
      throw new TypeError(`memory selectivity pair ${pairId} must match remembering time and age`);
    }
    const left = pair[0].history[0];
    const right = pair[1].history[0];
    for (const key of ["episodeId", "occurredAt", "ageAtEvent", "placeRef"]) {
      if (left[key] !== right[key]) throw new TypeError(`memory selectivity pair ${pairId} must match ${key}`);
    }
  }

  return Object.freeze(structuredClone(parsed));
}

export function buildMemorySelectivityPassBInput(controls, controlCase, ordinal) {
  assertInteger("memory selectivity ordinal", ordinal, 1);
  const input = normalizePassBInput({
    inputVersion: GENESIS_PASS_B_INPUT_VERSION,
    subject: structuredClone(controls.subject),
    world: structuredClone(controls.world),
    rememberingAt: controlCase.rememberingAt,
    ageAtRemembering: controlCase.ageAtRemembering,
    chronologyEndsAt: controlCase.rememberingAt,
    history: structuredClone(controlCase.history),
    priorMemories: [],
    assignment: {
      formationMode: "life_only",
      priorTreatmentMemoryExposure: false,
      analysisStratum: "life_only_unexposed",
    },
    genomeExposure: null,
    policyWitness: {
      policyVersion: GENESIS_PASS_B_POLICY.version,
      assignmentRef: `memory_selectivity_assignment_${String(ordinal).padStart(2, "0")}`,
      genomeExposurePolicyRef: null,
    },
  });

  const cognition = projectPassBInputForCognition(input);
  for (const forbiddenKey of ["trialId", "pairId", "controlClass", "expectedOutcome", "decisionRule"]) {
    if (canonicalJson(cognition).includes(`"${forbiddenKey}"`)) {
      throw new TypeError(`memory selectivity cognition leaked ${forbiddenKey}`);
    }
  }
  return input;
}

export function buildMemorySelectivityPlan({
  controls = loadControls(),
  model = MEMORY_SELECTIVITY_DEFAULT_MODEL,
} = {}) {
  assertNonEmpty("memory selectivity model", model);
  const fixtureDigest = digestValue(controls);
  const promptHash = digestText(GENESIS_LIFE_PASS_B_PROMPT);
  const responseSchemaHash = digestValue(GENESIS_PASS_B_RESPONSE_SCHEMA);
  const trialInputs = controls.cases.map((controlCase, index) => {
    const input = buildMemorySelectivityPassBInput(controls, controlCase, index + 1);
    return Object.freeze({
      trialId: controlCase.trialId,
      pairId: controlCase.pairId,
      controlClass: controlCase.controlClass,
      expectedOutcome: controlCase.expectedOutcome,
      input,
      cognitionInputDigest: digestValue(projectPassBInputForCognition(input)),
    });
  });
  const core = {
    contract: controls.contract,
    developmentOnly: true,
    model,
    fixtureDigest,
    promptHash,
    responseSchemaHash,
    trialCount: trialInputs.length,
    decisionRule: structuredClone(controls.decisionRule),
    unitOfObservation: "one stateless Pass-B memory-formation decision",
    scientificRetries: 0,
    orderReplicates: 0,
  };
  return Object.freeze({
    ...core,
    planDigest: digestValue(core),
    trials: Object.freeze(trialInputs),
  });
}

export function scoreMemorySelectivity(plan, trialResults) {
  if (!Array.isArray(trialResults) || trialResults.length !== plan.trials.length) {
    throw new TypeError("memory selectivity scoring requires one result per planned trial");
  }
  const byTrial = new Map(trialResults.map((item) => [item.trialId, item]));
  const residue = plan.trials.filter((item) => item.controlClass === "strong_residue");
  const ordinary = plan.trials.filter((item) => item.controlClass === "ordinary_nonselection");
  const residueRemembered = residue.filter((item) => byTrial.get(item.trialId)?.outcome === "remembered").length;
  const ordinaryNotRemembered = ordinary.filter((item) => byTrial.get(item.trialId)?.outcome === "not_remembered").length;
  const outcomes = new Set(trialResults.map((item) => item.outcome));

  let matchedPairSeparation = 0;
  for (const pairId of new Set(plan.trials.map((item) => item.pairId))) {
    const pair = plan.trials.filter((item) => item.pairId === pairId);
    const strong = pair.find((item) => item.controlClass === "strong_residue");
    const routine = pair.find((item) => item.controlClass === "ordinary_nonselection");
    if (
      byTrial.get(strong.trialId)?.outcome === "remembered" &&
      byTrial.get(routine.trialId)?.outcome === "not_remembered"
    ) matchedPairSeparation += 1;
  }

  const passes = (
    residueRemembered >= plan.decisionRule.residueRememberedMinimum &&
    ordinaryNotRemembered >= plan.decisionRule.ordinaryNotRememberedMinimum &&
    matchedPairSeparation >= plan.decisionRule.matchedPairSeparationMinimum &&
    (!plan.decisionRule.requireBothOutcomes || outcomes.size === 2)
  );

  let classification = "MIXED_OR_INCONCLUSIVE";
  if (passes) classification = "SELECTIVITY_EXERCISED";
  else if (trialResults.every((item) => item.outcome === "remembered")) classification = "SATURATED";
  else if (residueRemembered === 0) classification = "UNDER_RETENTION";

  return Object.freeze({
    admissionVerdict: null,
    classification,
    passesDevelopmentCriterion: passes,
    residueRemembered,
    residueTotal: residue.length,
    ordinaryNotRemembered,
    ordinaryTotal: ordinary.length,
    matchedPairSeparation,
    matchedPairTotal: 4,
    observedOutcomes: Object.freeze([...outcomes].sort()),
    note: plan.decisionRule.interpretation,
  });
}

function createDisabledNetworkAdapter({ model, observer }) {
  return createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "provider-network-disabled" },
    modelId: model,
    fetchImpl: async () => {
      throw new Error("provider network access is disabled for memory-selectivity replay");
    },
    observer,
  });
}

function printPreflight(plan) {
  process.stdout.write("GENESIS MEMORY SELECTIVITY: PREFLIGHT\n");
  process.stdout.write(`Plan: ${plan.planDigest}\n`);
  process.stdout.write(`Fixture: ${plan.fixtureDigest}\n`);
  process.stdout.write(`Prompt: ${plan.promptHash}\n`);
  process.stdout.write(`Schema: ${plan.responseSchemaHash}\n`);
  process.stdout.write(`Model: openai/${plan.model}\n`);
  process.stdout.write(`Trials: ${plan.trialCount} · 4 matched pairs · one judgment each\n`);
  process.stdout.write(`Criterion: residue remembered >= ${plan.decisionRule.residueRememberedMinimum}/4 · ordinary not_remembered >= ${plan.decisionRule.ordinaryNotRememberedMinimum}/4 · separated pairs >= ${plan.decisionRule.matchedPairSeparationMinimum}/4 · both outcomes required\n`);
  process.stdout.write("Scientific retries: 0\n");
  process.stdout.write("Provider calls made: 0\n");
  process.stdout.write("A valid disappointing result is retained; no quality resampling is authorized.\n");
}

function printResult(result, replay = false) {
  process.stdout.write(`GENESIS MEMORY SELECTIVITY: ${replay ? "REPLAY EXACT" : result.score.classification}\n`);
  process.stdout.write(`Plan: ${result.plan.planDigest}\n`);
  for (const item of result.trials) {
    process.stdout.write(`${item.trialId} ${item.controlClass}: ${item.outcome} · expected ${item.expectedOutcome}\n`);
  }
  process.stdout.write(`Strong-residue remembered: ${result.score.residueRemembered}/${result.score.residueTotal}\n`);
  process.stdout.write(`Ordinary non-selection: ${result.score.ordinaryNotRemembered}/${result.score.ordinaryTotal}\n`);
  process.stdout.write(`Matched-pair separation: ${result.score.matchedPairSeparation}/${result.score.matchedPairTotal}\n`);
  process.stdout.write(`Development criterion: ${result.score.passesDevelopmentCriterion ? "PASS" : "NOT MET"}\n`);
  process.stdout.write(`Committed judgments this invocation: ${result.execution.committedJudgmentsThisInvocation}\n`);
  process.stdout.write(`Durable replays this invocation: ${result.execution.durableReplaysThisInvocation}\n`);
  process.stdout.write(`Physical provider attempts this invocation: ${result.execution.providerAttemptsThisInvocation}\n`);
}

async function executePlan({ plan, mode, rootPath }) {
  const providerEvents = [];
  const durableEvents = [];
  const baseAdapter = mode === "replay"
    ? createDisabledNetworkAdapter({ model: plan.model, observer: (event) => providerEvents.push(event) })
    : createOpenAIModelAdapter({ modelId: plan.model, observer: (event) => providerEvents.push(event) });
  const journal = createFileModelInvocationJournal(resolve(rootPath, "invocations"));
  const adapter = createDurableModelAdapter({
    baseAdapter,
    journal,
    observer: (event) => durableEvents.push(event),
  });

  const trials = [];
  for (const [index, trial] of plan.trials.entries()) {
    const result = await generateGenesisPassBMemory({
      adapter,
      input: trial.input,
      clientRequestId: `memory-selectivity:${plan.planDigest.slice(7, 19)}:trial:${String(index + 1).padStart(2, "0")}`,
    });
    trials.push(Object.freeze({
      trialId: trial.trialId,
      pairId: trial.pairId,
      controlClass: trial.controlClass,
      expectedOutcome: trial.expectedOutcome,
      outcome: result.output.outcome,
      episodeRefs: structuredClone(result.output.episodeRefs),
      rememberedContent: result.output.rememberedContent,
      uncertainty: structuredClone(result.output.uncertainty),
      cognitionInputDigest: trial.cognitionInputDigest,
      calls: structuredClone(result.calls),
    }));
  }

  const score = scoreMemorySelectivity(plan, trials);
  return Object.freeze({
    contract: MEMORY_SELECTIVITY_RESULT_CONTRACT,
    developmentOnly: true,
    generatedAt: new Date().toISOString(),
    plan: Object.freeze({
      contract: plan.contract,
      model: plan.model,
      fixtureDigest: plan.fixtureDigest,
      promptHash: plan.promptHash,
      responseSchemaHash: plan.responseSchemaHash,
      planDigest: plan.planDigest,
      trialCount: plan.trialCount,
      decisionRule: structuredClone(plan.decisionRule),
      unitOfObservation: plan.unitOfObservation,
      scientificRetries: plan.scientificRetries,
      orderReplicates: plan.orderReplicates,
    }),
    trials: Object.freeze(trials),
    score,
    execution: Object.freeze({
      committedJudgmentsThisInvocation: durableEvents.filter((event) => event.type === "durable_model_commit").length,
      durableReplaysThisInvocation: durableEvents.filter((event) => event.type === "durable_model_replay").length,
      providerAttemptsThisInvocation: providerEvents.filter((event) => event.type === "model_attempt").length,
      providerResponsesThisInvocation: providerEvents.filter((event) => event.type === "model_response").length,
      operationalFailuresThisInvocation: providerEvents.filter((event) => event.type === "operational_failure").length,
    }),
  });
}

function comparableResult(result) {
  return {
    contract: result.contract,
    developmentOnly: result.developmentOnly,
    plan: result.plan,
    trials: result.trials,
    score: result.score,
  };
}

export async function runMemorySelectivityCli(argv = process.argv.slice(2)) {
  const mode = parseMode(argv);
  const model = readArg(argv, "--model", MEMORY_SELECTIVITY_DEFAULT_MODEL);
  const rootPath = resolve(readArg(argv, "--root", MEMORY_SELECTIVITY_DEFAULT_ROOT));
  const controls = loadControls();
  const plan = buildMemorySelectivityPlan({ controls, model });
  const resultPath = resolve(rootPath, "result.json");

  if (mode === "preflight") {
    printPreflight(plan);
    return { mode, plan, providerCallsMade: 0 };
  }

  if (mode === "run" && !argv.includes("--authorize-provider-calls")) {
    throw new Error("live memory-selectivity run requires --authorize-provider-calls");
  }
  if (mode === "run" && existsSync(resultPath)) {
    throw new Error("memory-selectivity result already exists; use --replay instead of rerunning accepted judgments");
  }

  const result = await executePlan({ plan, mode, rootPath });
  if (mode === "run") {
    mkdirSync(dirname(resultPath), { recursive: true });
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
    printResult(result, false);
    process.stdout.write(`Result: ${resultPath}\n`);
    return result;
  }

  if (!existsSync(resultPath)) {
    throw new Error("memory-selectivity replay requires the completed result.json");
  }
  const stored = JSON.parse(readFileSync(resultPath, "utf8"));
  if (canonicalJson(comparableResult(stored)) !== canonicalJson(comparableResult(result))) {
    throw new Error("memory-selectivity replay does not match the completed result");
  }
  printResult(result, true);
  process.stdout.write("Provider network access remained structurally disabled.\n");
  return result;
}

function isMain() {
  return process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

if (isMain()) {
  runMemorySelectivityCli().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

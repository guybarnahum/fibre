#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  createDurableModelAdapter,
  createFileModelInvocationJournal,
} from "#services/birth-center/src/model-runtime/durable-invocation-journal.mjs";
import {
  GENESIS_PASS_C_INPUT_VERSION,
  GENESIS_PASS_C_POLICY,
  genesisMeaningPartId,
  normalizePassCInput,
} from "#services/world-kernel/src/genesis-pass-c-domain.mjs";
import { projectPassCInputForCognition } from "#services/world-kernel/src/genesis-pass-c-cognition.mjs";
import { generateGenesisReinterpretation } from "#services/world-kernel/src/genesis-life-pass-c.mjs";
import {
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-pass-c-prompts.mjs";
import { createOpenAIModelAdapter } from "#services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import { repoFile } from "#repo-root";

export const REINTERPRETATION_RESTRAINT_FIXTURE = "fixtures/genesis/reinterpretation-restraint-controls.json";
export const REINTERPRETATION_RESTRAINT_DEFAULT_MODEL = "gpt-5.1-2025-11-13";
export const REINTERPRETATION_RESTRAINT_DEFAULT_ROOT = ".fibre/genesis/reinterpretation-restraint";
export const REINTERPRETATION_RESTRAINT_RESULT_CONTRACT = "fibre-genesis-reinterpretation-restraint-result";

const EXPECTED_OUTCOMES = Object.freeze(["unchanged", "revised"]);
const digestValue = (value) => `sha256:${sha256(canonicalJson(value))}`;
const digestText = (value) => `sha256:${sha256(value)}`;

function readArg(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  if (index !== -1) return argv[index + 1] ?? null;
  const inline = argv.find((item) => item.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

function parseMode(argv) {
  const selected = ["preflight", "run", "replay"].filter((mode) => argv.includes(`--${mode}`));
  if (selected.length > 1) throw new TypeError("choose only one of --preflight, --run, or --replay");
  return selected[0] ?? "preflight";
}

function assertObject(name, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
}

function assertText(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
}

function loadControls() {
  const controls = JSON.parse(readFileSync(repoFile(REINTERPRETATION_RESTRAINT_FIXTURE), "utf8"));
  assertObject("reinterpretation restraint controls", controls);
  if (controls.contract !== "fibre-genesis-reinterpretation-restraint-controls" || controls.developmentOnly !== true) {
    throw new TypeError("reinterpretation restraint control contract drift");
  }
  assertObject("reinterpretation restraint decisionRule", controls.decisionRule);
  if (!Array.isArray(controls.cases) || controls.cases.length !== 8) {
    throw new TypeError("reinterpretation restraint requires exactly 8 cases");
  }

  const ids = new Set();
  const pairs = new Map();
  for (const item of controls.cases) {
    assertText("reinterpretation restraint trialId", item.trialId);
    assertText("reinterpretation restraint pairId", item.pairId);
    assertText("reinterpretation restraint rememberedContent", item.rememberedContent);
    if (ids.has(item.trialId)) throw new TypeError(`duplicate reinterpretation restraint trialId ${item.trialId}`);
    ids.add(item.trialId);
    if (!EXPECTED_OUTCOMES.includes(item.expectedOutcome)) throw new TypeError("invalid reinterpretation restraint expectedOutcome");
    assertObject("reinterpretation restraint priorMeaning", item.priorMeaning);
    assertText("reinterpretation restraint priorMeaning.summary", item.priorMeaning.summary);
    if (!Array.isArray(item.priorMeaning.parts) || item.priorMeaning.parts.length === 0) {
      throw new TypeError("reinterpretation restraint priorMeaning.parts must be non-empty");
    }
    item.priorMeaning.parts.forEach((part, index) => assertText(`reinterpretation restraint priorMeaning.parts[${index}]`, part));
    assertObject("reinterpretation restraint trigger", item.trigger);
    assertText("reinterpretation restraint trigger.observableAction", item.trigger.observableAction);
    assertText("reinterpretation restraint trigger.relation", item.trigger.relation);
    const pair = pairs.get(item.pairId) ?? [];
    pair.push(item);
    pairs.set(item.pairId, pair);
  }

  if (pairs.size !== 4) throw new TypeError("reinterpretation restraint requires exactly 4 matched pairs");
  for (const [pairId, pair] of pairs.entries()) {
    if (pair.length !== 2) throw new TypeError(`reinterpretation restraint pair ${pairId} must contain 2 cases`);
    if (new Set(pair.map((item) => item.expectedOutcome)).size !== 2) {
      throw new TypeError(`reinterpretation restraint pair ${pairId} must contain unchanged and revised controls`);
    }
    if (pair[0].rememberedContent !== pair[1].rememberedContent ||
        canonicalJson(pair[0].priorMeaning) !== canonicalJson(pair[1].priorMeaning)) {
      throw new TypeError(`reinterpretation restraint pair ${pairId} is not matched on memory and prior meaning`);
    }
  }

  return Object.freeze(structuredClone(controls));
}

function normalizePriorMeaning(memoryRef, candidate) {
  return {
    summary: candidate.summary,
    parts: candidate.parts.map((meaning, index) => ({
      meaningPartId: genesisMeaningPartId({ memoryRef, ordinal: index + 1 }),
      meaning,
    })),
  };
}

export function buildReinterpretationRestraintInput(controlCase, ordinal) {
  const memoryRef = `memory_reinterpretation_restraint_${controlCase.pairId}`;
  return normalizePassCInput({
    inputVersion: GENESIS_PASS_C_INPUT_VERSION,
    mode: "reinterpretation",
    targetMemory: {
      memoryRef,
      episodeRefs: [`event_reinterpretation_restraint_${controlCase.pairId}`],
      rememberedContent: controlCase.rememberedContent,
      uncertainty: [],
    },
    formation: {
      asOf: "2020-06-15T00:00:00Z",
      ageAtFormation: 20 + ordinal / 10,
      chronologyIndex: 30 + ordinal,
    },
    priorMeaning: normalizePriorMeaning(memoryRef, controlCase.priorMeaning),
    trigger: {
      episodeRef: `event_reinterpretation_restraint_trigger_${controlCase.trialId}`,
      occurredAt: "2019-11-01T18:00:00Z",
      observableAction: controlCase.trigger.observableAction,
      relation: controlCase.trigger.relation,
    },
    policyWitness: { policyVersion: GENESIS_PASS_C_POLICY.version },
  });
}

export function buildReinterpretationRestraintPlan({ model = REINTERPRETATION_RESTRAINT_DEFAULT_MODEL } = {}) {
  assertText("reinterpretation restraint model", model);
  const controls = loadControls();
  const trials = controls.cases.map((controlCase, index) => {
    const input = buildReinterpretationRestraintInput(controlCase, index + 1);
    const cognitionInput = projectPassCInputForCognition(input);
    const cognitionJson = canonicalJson(cognitionInput);
    for (const forbidden of ["expectedOutcome", "pairId", "decisionRule", "developmentOnly"]) {
      if (cognitionJson.includes(`"${forbidden}"`)) throw new TypeError(`reinterpretation restraint cognition leaked ${forbidden}`);
    }
    return Object.freeze({
      trialId: controlCase.trialId,
      pairId: controlCase.pairId,
      expectedOutcome: controlCase.expectedOutcome,
      input,
      cognitionInputDigest: digestValue(cognitionInput),
    });
  });
  const core = {
    contract: controls.contract,
    developmentOnly: true,
    model,
    fixtureDigest: digestValue(controls),
    promptHash: digestText(GENESIS_PASS_C_REINTERPRETATION_PROMPT),
    schemaHash: digestValue(GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA),
    decisionRule: structuredClone(controls.decisionRule),
    trialCount: trials.length,
    matchedPairCount: 4,
    scientificRetries: 0,
  };
  return Object.freeze({ ...core, planDigest: digestValue(core), trials: Object.freeze(trials) });
}

export function scoreReinterpretationRestraint(plan, trialResults) {
  if (!Array.isArray(trialResults) || trialResults.length !== plan.trials.length) {
    throw new TypeError("reinterpretation restraint scoring requires one result per planned trial");
  }
  const byId = new Map(trialResults.map((item) => [item.trialId, item]));
  const unchangedControls = plan.trials.filter((item) => item.expectedOutcome === "unchanged");
  const revisedControls = plan.trials.filter((item) => item.expectedOutcome === "revised");
  const unchangedCorrect = unchangedControls.filter((item) => byId.get(item.trialId)?.output?.outcome === "unchanged").length;
  const revisedCorrect = revisedControls.filter((item) => byId.get(item.trialId)?.output?.outcome === "revised").length;
  const observedOutcomes = new Set(trialResults.map((item) => item.output?.outcome));

  let matchedPairSeparation = 0;
  for (const pairId of new Set(plan.trials.map((item) => item.pairId))) {
    const pair = plan.trials.filter((item) => item.pairId === pairId);
    const unchanged = pair.find((item) => item.expectedOutcome === "unchanged");
    const revised = pair.find((item) => item.expectedOutcome === "revised");
    if (byId.get(unchanged.trialId)?.output?.outcome === "unchanged" &&
        byId.get(revised.trialId)?.output?.outcome === "revised") {
      matchedPairSeparation += 1;
    }
  }

  const rule = plan.decisionRule;
  const passes = unchangedCorrect >= rule.unchangedMinimum &&
    revisedCorrect >= rule.revisedMinimum &&
    matchedPairSeparation >= rule.matchedPairSeparationMinimum &&
    (!rule.requireBothOutcomes || (observedOutcomes.has("unchanged") && observedOutcomes.has("revised")));

  let classification = "MIXED_OR_INCONCLUSIVE";
  if (passes) classification = "RESTRAINT_EXERCISED";
  else if (trialResults.every((item) => item.output?.outcome === "revised")) classification = "REVISION_SATURATED";
  else if (revisedCorrect === 0) classification = "UNDER_REVISION";

  return Object.freeze({
    admissionVerdict: null,
    classification,
    passesDevelopmentCriterion: passes,
    unchangedCorrect,
    unchangedTotal: unchangedControls.length,
    revisedCorrect,
    revisedTotal: revisedControls.length,
    matchedPairSeparation,
    matchedPairTotal: plan.matchedPairCount,
    observedOutcomes: Object.freeze([...observedOutcomes].sort()),
    note: rule.interpretation,
  });
}

function createBaseAdapter({ model, observer, replay }) {
  return replay
    ? createOpenAIModelAdapter({
        environment: { OPENAI_API_KEY: "provider-network-disabled" },
        modelId: model,
        fetchImpl: async () => { throw new Error("provider network access is disabled for reinterpretation-restraint replay"); },
        observer,
      })
    : createOpenAIModelAdapter({ modelId: model, observer });
}

function progressDisposition(durableEvents, startIndex) {
  const recent = durableEvents.slice(startIndex);
  if (recent.some((event) => event.type === "durable_model_replay")) return "durable replay";
  if (recent.some((event) => event.type === "durable_model_commit")) return "provider commit";
  return "completed";
}

async function executePlan({ plan, mode, rootPath, progress = true }) {
  const providerEvents = [];
  const durableEvents = [];
  const journal = createFileModelInvocationJournal(resolve(rootPath, "invocations"));
  const adapter = createDurableModelAdapter({
    baseAdapter: createBaseAdapter({
      model: plan.model,
      observer: (event) => providerEvents.push(event),
      replay: mode === "replay",
    }),
    journal,
    observer: (event) => durableEvents.push(event),
  });

  if (progress) {
    process.stdout.write(`GENESIS REINTERPRETATION RESTRAINT: ${mode.toUpperCase()} · ${plan.trialCount} model steps\n`);
    process.stdout.write(`Plan: ${plan.planDigest}\n`);
  }

  const trials = [];
  for (const [index, trial] of plan.trials.entries()) {
    const step = String(index + 1).padStart(2, "0");
    const total = String(plan.trialCount).padStart(2, "0");
    if (progress) process.stdout.write(`[${step}/${total}] START ${trial.trialId}\n`);
    const durableStart = durableEvents.length;
    const generated = await generateGenesisReinterpretation({
      adapter,
      input: trial.input,
      clientRequestId: `reinterpretation-restraint:${plan.planDigest.slice(7, 19)}:trial:${step}`,
    });
    const result = Object.freeze({
      trialId: trial.trialId,
      pairId: trial.pairId,
      expectedOutcome: trial.expectedOutcome,
      output: structuredClone(generated.output),
      cognitionInputDigest: trial.cognitionInputDigest,
      call: structuredClone(generated.call),
    });
    trials.push(result);
    if (progress) {
      process.stdout.write(`[${step}/${total}] DONE  ${trial.trialId} · ${result.output.outcome} · ${progressDisposition(durableEvents, durableStart)}\n`);
    }
  }

  const score = scoreReinterpretationRestraint(plan, trials);
  return Object.freeze({
    contract: REINTERPRETATION_RESTRAINT_RESULT_CONTRACT,
    developmentOnly: true,
    generatedAt: new Date().toISOString(),
    plan: Object.freeze({
      contract: plan.contract,
      model: plan.model,
      fixtureDigest: plan.fixtureDigest,
      promptHash: plan.promptHash,
      schemaHash: plan.schemaHash,
      planDigest: plan.planDigest,
      decisionRule: structuredClone(plan.decisionRule),
      trialCount: plan.trialCount,
      matchedPairCount: plan.matchedPairCount,
      scientificRetries: plan.scientificRetries,
    }),
    trials: Object.freeze(trials),
    score,
    execution: Object.freeze({
      committedJudgmentsThisInvocation: durableEvents.filter((event) => event.type === "durable_model_commit").length,
      durableReplaysThisInvocation: durableEvents.filter((event) => event.type === "durable_model_replay").length,
      physicalProviderAttemptsThisInvocation: providerEvents.filter((event) => event.type === "model_attempt").length,
    }),
  });
}

function comparable(result) {
  return {
    contract: result.contract,
    developmentOnly: result.developmentOnly,
    plan: result.plan,
    trials: result.trials,
    score: result.score,
  };
}

function printPreflight(plan) {
  process.stdout.write("GENESIS REINTERPRETATION RESTRAINT: PREFLIGHT\n");
  process.stdout.write(`Plan: ${plan.planDigest}\n`);
  process.stdout.write(`Fixture: ${plan.fixtureDigest}\n`);
  process.stdout.write(`Prompt: ${plan.promptHash}\n`);
  process.stdout.write(`Schema: ${plan.schemaHash}\n`);
  process.stdout.write(`Model: openai/${plan.model}\n`);
  process.stdout.write("Trials: 8 · 4 fresh matched pairs\n");
  process.stdout.write(`Criterion: unchanged >= ${plan.decisionRule.unchangedMinimum}/4 · revised >= ${plan.decisionRule.revisedMinimum}/4 · separated pairs >= ${plan.decisionRule.matchedPairSeparationMinimum}/4 · both outcomes required\n`);
  process.stdout.write("Scientific retries: 0\n");
  process.stdout.write("Maximum live provider calls: 8\n");
  process.stdout.write("Provider calls made: 0\n");
  process.stdout.write("A valid disappointing result is retained; no quality resampling is authorized.\n");
}

function printResult(result, replay = false) {
  process.stdout.write(`GENESIS REINTERPRETATION RESTRAINT: ${replay ? "REPLAY EXACT" : result.score.classification}\n`);
  process.stdout.write(`Plan: ${result.plan.planDigest}\n`);
  for (const trial of result.trials) {
    process.stdout.write(`${trial.trialId}: ${trial.output.outcome} · expected ${trial.expectedOutcome}\n`);
    if (trial.output.summary !== null) process.stdout.write(`  meaning: ${trial.output.summary}\n`);
  }
  process.stdout.write(`Unchanged correct: ${result.score.unchangedCorrect}/${result.score.unchangedTotal}\n`);
  process.stdout.write(`Revised correct: ${result.score.revisedCorrect}/${result.score.revisedTotal}\n`);
  process.stdout.write(`Matched-pair separation: ${result.score.matchedPairSeparation}/${result.score.matchedPairTotal}\n`);
  process.stdout.write(`Development criterion: ${result.score.passesDevelopmentCriterion ? "PASS" : "NOT MET"}\n`);
  process.stdout.write(`Committed judgments this invocation: ${result.execution.committedJudgmentsThisInvocation}\n`);
  process.stdout.write(`Durable replays this invocation: ${result.execution.durableReplaysThisInvocation}\n`);
  process.stdout.write(`Physical provider attempts this invocation: ${result.execution.physicalProviderAttemptsThisInvocation}\n`);
}

export async function runReinterpretationRestraintCli(argv = process.argv.slice(2)) {
  const mode = parseMode(argv);
  const model = readArg(argv, "--model", REINTERPRETATION_RESTRAINT_DEFAULT_MODEL);
  const rootPath = resolve(readArg(argv, "--root", REINTERPRETATION_RESTRAINT_DEFAULT_ROOT));
  const plan = buildReinterpretationRestraintPlan({ model });
  const resultPath = resolve(rootPath, "result.json");

  if (mode === "preflight") {
    printPreflight(plan);
    return { mode, plan, providerCallsMade: 0 };
  }
  if (mode === "run" && !argv.includes("--authorize-provider-calls")) {
    throw new Error("live reinterpretation-restraint run requires --authorize-provider-calls");
  }
  if (mode === "run" && existsSync(resultPath)) {
    throw new Error("reinterpretation-restraint result already exists; use --replay");
  }
  if (mode === "replay" && !existsSync(resultPath)) {
    throw new Error("reinterpretation-restraint replay requires completed result.json");
  }

  const result = await executePlan({ plan, mode, rootPath, progress: true });
  if (mode === "run") {
    mkdirSync(dirname(resultPath), { recursive: true });
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
    printResult(result, false);
    process.stdout.write(`Result: ${resultPath}\n`);
    return result;
  }

  const stored = JSON.parse(readFileSync(resultPath, "utf8"));
  if (canonicalJson(comparable(stored)) !== canonicalJson(comparable(result))) {
    throw new Error("reinterpretation-restraint replay does not match completed result");
  }
  printResult(result, true);
  process.stdout.write("Provider network access remained structurally disabled.\n");
  return result;
}

function isMain() {
  return process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

if (isMain()) {
  runReinterpretationRestraintCli().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

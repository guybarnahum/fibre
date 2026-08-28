#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  createDurableModelAdapter,
  createFileModelInvocationJournal,
} from "#services/birth-center/src/model-runtime/durable-invocation-journal.mjs";
import { normalizeReinterpretationPassCModelOutput } from "#services/world-kernel/src/genesis-pass-c-domain.mjs";
import { projectPassCInputForCognition } from "#services/world-kernel/src/genesis-pass-c-cognition.mjs";
import {
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-pass-c-prompts.mjs";
import { createOpenAIModelAdapter } from "#services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import { repoFile } from "#repo-root";
import {
  REINTERPRETATION_RESTRAINT_DEFAULT_MODEL,
  buildReinterpretationRestraintInput,
  scoreReinterpretationRestraint,
} from "./genesis-reinterpretation-restraint.mjs";

export const REINTERPRETATION_RESTRAINT_CORRECTION_FIXTURE =
  "fixtures/genesis/reinterpretation-restraint-correction-controls.json";
export const REINTERPRETATION_RESTRAINT_CORRECTION_DEFAULT_ROOT =
  ".fibre/genesis/reinterpretation-restraint-correction";
export const REINTERPRETATION_RESTRAINT_CORRECTION_RESULT_CONTRACT =
  "fibre-genesis-reinterpretation-restraint-correction-result";

export const GENESIS_PASS_C_REINTERPRETATION_RESTRAINT_AMENDMENT = `Reinterpretation is conservative because an existing durable meaning has already formed.
The existence of an eligible later echo is not by itself a reason to replace that meaning.
Return outcome=revised only when the supplied trigger introduces a material fact, relation, resolution, contradiction, or change of attribution that makes the prior durable meaning no longer adequate as the Thread's current durable interpretation.
Mere recurrence, another instance of a pattern already named by the prior meaning, eventual follow-through already compatible with that meaning, added specificity, or a richer wording for the same tension is not enough to supersede it. In those cases return outcome=unchanged.
Do not manufacture a more favorable, mature, coherent, explanatory, or resolved interpretation from neutral detail. If the prior meaning already accommodates the trigger, preserve it even when you could phrase the situation more richly.
outcome=none remains available when the eligible echo yields no new durable meaning at all. No quota applies across calls.`;

export const GENESIS_PASS_C_REINTERPRETATION_CORRECTION_PROMPT =
  `${GENESIS_PASS_C_REINTERPRETATION_PROMPT}\n\nReinterpretation-restraint authority:\n${GENESIS_PASS_C_REINTERPRETATION_RESTRAINT_AMENDMENT}`;

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

function loadControls() {
  const controls = JSON.parse(readFileSync(repoFile(REINTERPRETATION_RESTRAINT_CORRECTION_FIXTURE), "utf8"));
  if (controls?.contract !== "fibre-genesis-reinterpretation-restraint-correction-controls" || controls.developmentOnly !== true) {
    throw new TypeError("reinterpretation-restraint correction control contract drift");
  }
  if (!Array.isArray(controls.cases) || controls.cases.length !== 8) {
    throw new TypeError("reinterpretation-restraint correction requires exactly 8 cases");
  }
  const pairs = new Map();
  for (const item of controls.cases) {
    if (!["unchanged", "revised"].includes(item.expectedOutcome)) throw new TypeError("invalid correction expectedOutcome");
    const pair = pairs.get(item.pairId) ?? [];
    pair.push(item);
    pairs.set(item.pairId, pair);
  }
  if (pairs.size !== 4) throw new TypeError("reinterpretation-restraint correction requires 4 matched pairs");
  for (const [pairId, pair] of pairs.entries()) {
    if (pair.length !== 2 || new Set(pair.map((item) => item.expectedOutcome)).size !== 2) {
      throw new TypeError(`correction pair ${pairId} must contain unchanged and revised controls`);
    }
    if (pair[0].rememberedContent !== pair[1].rememberedContent ||
        canonicalJson(pair[0].priorMeaning) !== canonicalJson(pair[1].priorMeaning)) {
      throw new TypeError(`correction pair ${pairId} is not matched on memory and prior meaning`);
    }
  }
  return controls;
}

export function buildReinterpretationRestraintCorrectionPlan({ model = REINTERPRETATION_RESTRAINT_DEFAULT_MODEL } = {}) {
  const controls = loadControls();
  const trials = controls.cases.map((controlCase, index) => {
    const input = buildReinterpretationRestraintInput(controlCase, index + 1);
    const cognitionInput = projectPassCInputForCognition(input);
    const cognitionJson = canonicalJson(cognitionInput);
    for (const forbidden of ["expectedOutcome", "pairId", "decisionRule", "developmentOnly"]) {
      if (cognitionJson.includes(`"${forbidden}"`)) throw new TypeError(`correction cognition leaked ${forbidden}`);
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
    baselinePromptHash: digestText(GENESIS_PASS_C_REINTERPRETATION_PROMPT),
    candidatePromptHash: digestText(GENESIS_PASS_C_REINTERPRETATION_CORRECTION_PROMPT),
    schemaHash: digestValue(GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA),
    decisionRule: structuredClone(controls.decisionRule),
    trialCount: trials.length,
    matchedPairCount: 4,
    scientificRetries: 0,
  };
  return Object.freeze({ ...core, planDigest: digestValue(core), trials: Object.freeze(trials) });
}

function createBaseAdapter({ model, observer, replay }) {
  return replay
    ? createOpenAIModelAdapter({
        environment: { OPENAI_API_KEY: "provider-network-disabled" },
        modelId: model,
        fetchImpl: async () => { throw new Error("provider network access is disabled for reinterpretation-restraint correction replay"); },
        observer,
      })
    : createOpenAIModelAdapter({ modelId: model, observer });
}

function disposition(events, start) {
  const recent = events.slice(start);
  if (recent.some((event) => event.type === "durable_model_replay")) return "durable replay";
  if (recent.some((event) => event.type === "durable_model_commit")) return "provider commit";
  return "completed";
}

async function executePlan({ plan, mode, rootPath, progress = true }) {
  const providerEvents = [];
  const durableEvents = [];
  const adapter = createDurableModelAdapter({
    baseAdapter: createBaseAdapter({
      model: plan.model,
      observer: (event) => providerEvents.push(event),
      replay: mode === "replay",
    }),
    journal: createFileModelInvocationJournal(resolve(rootPath, "invocations")),
    observer: (event) => durableEvents.push(event),
  });

  if (progress) {
    process.stdout.write(`GENESIS REINTERPRETATION RESTRAINT CORRECTION: ${mode.toUpperCase()} · ${plan.trialCount} model steps\n`);
    process.stdout.write(`Plan: ${plan.planDigest}\n`);
  }

  const trials = [];
  for (const [index, trial] of plan.trials.entries()) {
    const step = String(index + 1).padStart(2, "0");
    const total = String(plan.trialCount).padStart(2, "0");
    if (progress) process.stdout.write(`[${step}/${total}] START ${trial.trialId}\n`);
    const start = durableEvents.length;
    const cognitionInput = projectPassCInputForCognition(trial.input);
    const invoked = await adapter.invoke({
      systemPrompt: GENESIS_PASS_C_REINTERPRETATION_CORRECTION_PROMPT,
      input: cognitionInput,
      responseSchema: GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
      clientRequestId: `reinterpretation-restraint-correction:${plan.planDigest.slice(7, 19)}:trial:${step}`,
    });
    const output = normalizeReinterpretationPassCModelOutput(invoked.output, trial.input);
    const result = Object.freeze({
      trialId: trial.trialId,
      pairId: trial.pairId,
      expectedOutcome: trial.expectedOutcome,
      output: structuredClone(output),
      cognitionInputDigest: trial.cognitionInputDigest,
      call: Object.freeze({
        inputDigest: digestValue(cognitionInput),
        promptHash: digestText(GENESIS_PASS_C_REINTERPRETATION_CORRECTION_PROMPT),
        schemaHash: digestValue(GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA),
        outputDigest: digestValue(invoked.output),
        provenance: structuredClone(invoked.provenance ?? null),
      }),
    });
    trials.push(result);
    if (progress) process.stdout.write(`[${step}/${total}] DONE  ${trial.trialId} · ${output.outcome} · ${disposition(durableEvents, start)}\n`);
  }

  const score = scoreReinterpretationRestraint(plan, trials);
  return Object.freeze({
    contract: REINTERPRETATION_RESTRAINT_CORRECTION_RESULT_CONTRACT,
    developmentOnly: true,
    generatedAt: new Date().toISOString(),
    plan: Object.freeze({
      contract: plan.contract,
      model: plan.model,
      fixtureDigest: plan.fixtureDigest,
      baselinePromptHash: plan.baselinePromptHash,
      candidatePromptHash: plan.candidatePromptHash,
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
  process.stdout.write("GENESIS REINTERPRETATION RESTRAINT CORRECTION: PREFLIGHT\n");
  process.stdout.write(`Plan: ${plan.planDigest}\n`);
  process.stdout.write(`Fixture: ${plan.fixtureDigest}\n`);
  process.stdout.write(`Baseline prompt: ${plan.baselinePromptHash}\n`);
  process.stdout.write(`Candidate prompt: ${plan.candidatePromptHash}\n`);
  process.stdout.write(`Schema: ${plan.schemaHash}\n`);
  process.stdout.write(`Model: openai/${plan.model}\n`);
  process.stdout.write("Trials: 8 · 4 fresh matched pairs\n");
  process.stdout.write("Criterion: unchanged >= 3/4 · revised >= 3/4 · separated pairs >= 3/4 · both outcomes required\n");
  process.stdout.write("Scientific retries: 0\n");
  process.stdout.write("Maximum live provider calls: 8\n");
  process.stdout.write("Provider calls made: 0\n");
  process.stdout.write("Candidate only; production Pass-C prompt is unchanged. A disappointing result is retained.\n");
}

function printResult(result, replay = false) {
  process.stdout.write(`GENESIS REINTERPRETATION RESTRAINT CORRECTION: ${replay ? "REPLAY EXACT" : result.score.classification}\n`);
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

export async function runReinterpretationRestraintCorrectionCli(argv = process.argv.slice(2)) {
  const mode = parseMode(argv);
  const model = readArg(argv, "--model", REINTERPRETATION_RESTRAINT_DEFAULT_MODEL);
  const rootPath = resolve(readArg(argv, "--root", REINTERPRETATION_RESTRAINT_CORRECTION_DEFAULT_ROOT));
  const plan = buildReinterpretationRestraintCorrectionPlan({ model });
  const resultPath = resolve(rootPath, "result.json");

  if (mode === "preflight") {
    printPreflight(plan);
    return { mode, plan, providerCallsMade: 0 };
  }
  if (mode === "run" && !argv.includes("--authorize-provider-calls")) {
    throw new Error("live reinterpretation-restraint correction requires --authorize-provider-calls");
  }
  if (mode === "run" && existsSync(resultPath)) throw new Error("reinterpretation-restraint correction result already exists; use --replay");
  if (mode === "replay" && !existsSync(resultPath)) throw new Error("reinterpretation-restraint correction replay requires completed result.json");

  const result = await executePlan({ plan, mode, rootPath });
  if (mode === "run") {
    mkdirSync(dirname(resultPath), { recursive: true });
    writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
    printResult(result);
    process.stdout.write(`Result: ${resultPath}\n`);
    return result;
  }

  const stored = JSON.parse(readFileSync(resultPath, "utf8"));
  if (canonicalJson(comparable(stored)) !== canonicalJson(comparable(result))) {
    throw new Error("reinterpretation-restraint correction replay does not match completed result");
  }
  printResult(result, true);
  process.stdout.write("Provider network access remained structurally disabled.\n");
  return result;
}

function isMain() {
  return process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

if (isMain()) {
  runReinterpretationRestraintCorrectionCli().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

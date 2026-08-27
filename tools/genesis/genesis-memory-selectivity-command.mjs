#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  createDurableModelAdapter,
  createFileModelInvocationJournal,
} from "#services/birth-center/src/model-runtime/durable-invocation-journal.mjs";
import {
  normalizeAdmittedPassBModelOutput,
} from "#services/world-kernel/src/genesis-pass-b-admission.mjs";
import {
  projectPassBInputForCognition,
} from "#services/world-kernel/src/genesis-pass-b-cognition.mjs";
import {
  GENESIS_LIFE_PASS_B_PROMPT,
} from "#services/world-kernel/src/genesis-life-pass-b.mjs";
import {
  GENESIS_PASS_B_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-pass-b-prompts.mjs";
import { createOpenAIModelAdapter } from "#services/world-kernel/src/model-runtime/openai.mjs";
import {
  canonicalJson,
  sha256,
} from "#services/world-kernel/src/persistence-common.mjs";
import {
  MEMORY_SELECTIVITY_DEFAULT_MODEL,
  MEMORY_SELECTIVITY_DEFAULT_ROOT,
  MEMORY_SELECTIVITY_RESULT_CONTRACT,
  buildMemorySelectivityPlan,
  runMemorySelectivityCli,
  scoreMemorySelectivity,
} from "./genesis-memory-selectivity.mjs";

const BURNED_PLAN_DIGEST = "sha256:fcca9a53ff811a17b9c785a42162838548f6e85250e2d8cd787e3932800a9348";
const BURNED_PROMPT_HASH = "sha256:cf98c7a64c267959719d9f429435f2ede789e9dc94e389b5f5aae946107402cb";

function digest(value) {
  return `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;
}

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((item) => item.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
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

function createDisabledNetworkAdapter({ model, observer }) {
  return createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "provider-network-disabled" },
    modelId: model,
    fetchImpl: async () => {
      throw new Error("provider network access is disabled for burned memory-selectivity replay");
    },
    observer,
  });
}

function frozenPlan(model) {
  const plan = buildMemorySelectivityPlan({ model });
  if (plan.planDigest !== BURNED_PLAN_DIGEST) {
    throw new Error(`burned memory-selectivity plan drift: ${plan.planDigest}`);
  }
  if (plan.promptHash !== BURNED_PROMPT_HASH || digest(GENESIS_LIFE_PASS_B_PROMPT) !== BURNED_PROMPT_HASH) {
    throw new Error("burned memory-selectivity prompt drift");
  }
  return plan;
}

async function replayBurnedBaseline({ model, rootPath }) {
  const plan = frozenPlan(model);
  const resultPath = resolve(rootPath, "result.json");
  if (!existsSync(resultPath)) {
    throw new Error("memory-selectivity replay requires the completed burned result.json");
  }

  const providerEvents = [];
  const durableEvents = [];
  const baseAdapter = createDisabledNetworkAdapter({
    model: plan.model,
    observer: (event) => providerEvents.push(event),
  });
  const journal = createFileModelInvocationJournal(resolve(rootPath, "invocations"));
  const adapter = createDurableModelAdapter({
    baseAdapter,
    journal,
    observer: (event) => durableEvents.push(event),
  });

  const trials = [];
  for (const [index, trial] of plan.trials.entries()) {
    const cognitionInput = projectPassBInputForCognition(trial.input);
    const clientRequestId = `memory-selectivity:${plan.planDigest.slice(7, 19)}:trial:${String(index + 1).padStart(2, "0")}:initial`;
    const replayed = await adapter.invoke({
      systemPrompt: GENESIS_LIFE_PASS_B_PROMPT,
      input: cognitionInput,
      responseSchema: GENESIS_PASS_B_RESPONSE_SCHEMA,
      clientRequestId,
    });
    const output = normalizeAdmittedPassBModelOutput(replayed.output, trial.input);
    trials.push(Object.freeze({
      trialId: trial.trialId,
      pairId: trial.pairId,
      controlClass: trial.controlClass,
      expectedOutcome: trial.expectedOutcome,
      outcome: output.outcome,
      episodeRefs: structuredClone(output.episodeRefs),
      rememberedContent: output.rememberedContent,
      uncertainty: structuredClone(output.uncertainty),
      cognitionInputDigest: trial.cognitionInputDigest,
      calls: Object.freeze([{
        kind: "initial",
        generatedVersion: 1,
        inputDigest: digest(trial.input),
        promptHash: digest(GENESIS_LIFE_PASS_B_PROMPT),
        outputDigest: digest(replayed.output),
        provenance: structuredClone(replayed.provenance ?? null),
      }]),
    }));
  }

  const score = scoreMemorySelectivity(plan, trials);
  const result = {
    contract: MEMORY_SELECTIVITY_RESULT_CONTRACT,
    developmentOnly: true,
    generatedAt: new Date().toISOString(),
    plan: {
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
    },
    trials,
    score,
    execution: {
      committedJudgmentsThisInvocation: durableEvents.filter((event) => event.type === "durable_model_commit").length,
      durableReplaysThisInvocation: durableEvents.filter((event) => event.type === "durable_model_replay").length,
      providerAttemptsThisInvocation: providerEvents.filter((event) => event.type === "model_attempt").length,
      providerResponsesThisInvocation: providerEvents.filter((event) => event.type === "model_response").length,
      operationalFailuresThisInvocation: providerEvents.filter((event) => event.type === "operational_failure").length,
    },
  };

  const stored = JSON.parse(readFileSync(resultPath, "utf8"));
  if (canonicalJson(comparableResult(stored)) !== canonicalJson(comparableResult(result))) {
    throw new Error("burned memory-selectivity replay does not match the completed result");
  }

  process.stdout.write("GENESIS MEMORY SELECTIVITY: REPLAY EXACT\n");
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
  process.stdout.write("Provider network access remained structurally disabled.\n");
  return result;
}

export async function runMemorySelectivityCommand(argv = process.argv.slice(2)) {
  if (argv.includes("--run")) {
    throw new Error("the burned memory-selectivity baseline is closed after selective-memory promotion; no new live baseline run is permitted");
  }
  if (!argv.includes("--replay")) {
    return runMemorySelectivityCli(argv);
  }
  const model = readArg(argv, "--model", MEMORY_SELECTIVITY_DEFAULT_MODEL);
  const rootPath = resolve(readArg(argv, "--root", MEMORY_SELECTIVITY_DEFAULT_ROOT));
  return replayBurnedBaseline({ model, rootPath });
}

function isMain() {
  return process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

if (isMain()) {
  runMemorySelectivityCommand().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

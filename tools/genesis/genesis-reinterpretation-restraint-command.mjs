#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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
import {
  REINTERPRETATION_RESTRAINT_DEFAULT_MODEL,
  REINTERPRETATION_RESTRAINT_DEFAULT_ROOT,
  REINTERPRETATION_RESTRAINT_RESULT_CONTRACT,
  buildReinterpretationRestraintPlan,
  runReinterpretationRestraintCli,
  scoreReinterpretationRestraint,
} from "./genesis-reinterpretation-restraint.mjs";

const digestValue = (value) => `sha256:${sha256(canonicalJson(value))}`;

function readArg(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  if (index !== -1) return argv[index + 1] ?? null;
  const inline = argv.find((item) => item.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
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

function printResult(result) {
  process.stdout.write("GENESIS REINTERPRETATION RESTRAINT: REPLAY EXACT\n");
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
  process.stdout.write("Provider network access remained structurally disabled.\n");
}

async function replayFrozen({ plan, rootPath }) {
  const providerEvents = [];
  const durableEvents = [];
  const adapter = createDurableModelAdapter({
    baseAdapter: createOpenAIModelAdapter({
      environment: { OPENAI_API_KEY: "provider-network-disabled" },
      modelId: plan.model,
      fetchImpl: async () => { throw new Error("provider network access is disabled for burned reinterpretation-restraint replay"); },
      observer: (event) => providerEvents.push(event),
    }),
    journal: createFileModelInvocationJournal(resolve(rootPath, "invocations")),
    observer: (event) => durableEvents.push(event),
  });

  process.stdout.write(`GENESIS REINTERPRETATION RESTRAINT: REPLAY · ${plan.trialCount} model steps\n`);
  process.stdout.write(`Plan: ${plan.planDigest}\n`);

  const trials = [];
  for (const [index, trial] of plan.trials.entries()) {
    const step = String(index + 1).padStart(2, "0");
    const total = String(plan.trialCount).padStart(2, "0");
    process.stdout.write(`[${step}/${total}] START ${trial.trialId}\n`);
    const durableStart = durableEvents.length;
    const cognitionInput = projectPassCInputForCognition(trial.input);
    const invoked = await adapter.invoke({
      systemPrompt: GENESIS_PASS_C_REINTERPRETATION_PROMPT,
      input: cognitionInput,
      responseSchema: GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
      clientRequestId: `reinterpretation-restraint:${plan.planDigest.slice(7, 19)}:trial:${step}`,
    });
    const output = normalizeReinterpretationPassCModelOutput(invoked.output, trial.input);
    const disposition = durableEvents.slice(durableStart).some((event) => event.type === "durable_model_replay")
      ? "durable replay"
      : "completed";
    process.stdout.write(`[${step}/${total}] DONE  ${trial.trialId} · ${output.outcome} · ${disposition}\n`);
    trials.push(Object.freeze({
      trialId: trial.trialId,
      pairId: trial.pairId,
      expectedOutcome: trial.expectedOutcome,
      output: structuredClone(output),
      cognitionInputDigest: trial.cognitionInputDigest,
      call: Object.freeze({
        inputDigest: digestValue(cognitionInput),
        promptHash: `sha256:${sha256(GENESIS_PASS_C_REINTERPRETATION_PROMPT)}`,
        schemaHash: digestValue(GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA),
        outputDigest: digestValue(invoked.output),
        provenance: structuredClone(invoked.provenance ?? null),
      }),
    }));
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

export async function runReinterpretationRestraintCommand(argv = process.argv.slice(2)) {
  if (!argv.includes("--replay")) {
    if (argv.includes("--run")) {
      throw new Error("the burned reinterpretation-restraint characterization is closed after prompt promotion; no new live run is permitted");
    }
    return runReinterpretationRestraintCli(argv);
  }

  const model = readArg(argv, "--model", REINTERPRETATION_RESTRAINT_DEFAULT_MODEL);
  const rootPath = resolve(readArg(argv, "--root", REINTERPRETATION_RESTRAINT_DEFAULT_ROOT));
  const resultPath = resolve(rootPath, "result.json");
  if (!existsSync(resultPath)) throw new Error("reinterpretation-restraint replay requires completed result.json");
  const plan = buildReinterpretationRestraintPlan({ model });
  const replayed = await replayFrozen({ plan, rootPath });
  const stored = JSON.parse(readFileSync(resultPath, "utf8"));
  if (canonicalJson(comparable(stored)) !== canonicalJson(comparable(replayed))) {
    throw new Error("reinterpretation-restraint replay does not match completed result");
  }
  printResult(replayed);
  return replayed;
}

function isMain() {
  return process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

if (isMain()) {
  runReinterpretationRestraintCommand().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

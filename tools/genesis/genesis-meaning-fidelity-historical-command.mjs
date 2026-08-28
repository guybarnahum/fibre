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
import { generateGenesisInitialMeaning } from "#services/world-kernel/src/genesis-life-pass-c.mjs";
import {
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-pass-c-prompts.mjs";
import { createOpenAIModelAdapter } from "#services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import {
  MEANING_FIDELITY_DEFAULT_MODEL,
  MEANING_FIDELITY_DEFAULT_ROOT,
  MEANING_FIDELITY_RESULT_CONTRACT,
  MEANING_FIDELITY_REVIEW_PROMPT,
  MEANING_FIDELITY_REVIEW_SCHEMA,
  buildMeaningFidelityPlan,
  buildSemanticReviewInput,
  runMeaningFidelityCli,
  scoreMeaningFidelity,
} from "./genesis-meaning-fidelity.mjs";

const REVIEW_ISSUES = Object.freeze([
  "none", "inflated_mundane", "positive_uplift", "ambiguity_erased",
  "forced_revision", "missed_revision", "ungrounded_meaning", "other",
]);
const TOTAL_STEPS = 13;
const digestValue = (value) => `sha256:${sha256(canonicalJson(value))}`;
const digestText = (value) => `sha256:${sha256(value)}`;

function readArg(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  if (index !== -1) return argv[index + 1] ?? null;
  const inline = argv.find((item) => item.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

function assertObject(name, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
}

function assertText(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
}

function normalizeReviews(candidate, plan) {
  assertObject("semantic review output", candidate);
  if (!Array.isArray(candidate.reviews) || candidate.reviews.length !== 12) throw new TypeError("semantic review must contain 12 reviews");
  return Object.freeze(candidate.reviews.map((item, index) => {
    assertObject(`semantic review ${index + 1}`, item);
    if (item.trialId !== plan.trials[index].trialId) throw new TypeError("semantic review trial order drift");
    if (!["pass", "fail"].includes(item.fidelity) || !REVIEW_ISSUES.includes(item.issue)) throw new TypeError("invalid semantic review");
    assertText("semantic review reason", item.reason);
    if (item.fidelity === "pass" && item.issue !== "none") throw new TypeError("passing review must use issue=none");
    if (item.fidelity === "fail" && item.issue === "none") throw new TypeError("failing review must identify an issue");
    return Object.freeze(structuredClone(item));
  }));
}

function comparable(result) {
  return {
    contract: result.contract,
    developmentOnly: result.developmentOnly,
    plan: result.plan,
    trials: result.trials,
    semanticReviews: result.semanticReviews,
    semanticReviewCall: result.semanticReviewCall,
    score: result.score,
  };
}

function progress(step, phase, label, detail = null) {
  const prefix = `[${String(step).padStart(2, "0")}/${TOTAL_STEPS}] ${phase.padEnd(5)} ${label}`;
  process.stdout.write(`${prefix}${detail === null ? "" : ` · ${detail}`}\n`);
}

function printResult(result) {
  process.stdout.write("GENESIS MEANING FIDELITY: REPLAY EXACT\n");
  process.stdout.write(`Plan: ${result.plan.planDigest}\n`);
  for (const trial of result.trials) {
    const review = result.semanticReviews.find((item) => item.trialId === trial.trialId);
    process.stdout.write(`${trial.trialId} ${trial.mode}: ${trial.output.outcome} · expected ${trial.expectedOutcome} · fidelity ${review.fidelity}/${review.issue}\n`);
    if (trial.output.summary !== null) process.stdout.write(`  meaning: ${trial.output.summary}\n`);
  }
  process.stdout.write(`Mundane no durable meaning: ${result.score.mundaneNoMeaning}/${result.score.mundaneTotal}\n`);
  process.stdout.write(`Negative durable meaning: ${result.score.negativeDurableMeaning}/${result.score.negativeTotal}\n`);
  process.stdout.write(`Ambiguous durable meaning: ${result.score.ambiguousDurableMeaning}/${result.score.ambiguousTotal}\n`);
  process.stdout.write(`Reinterpretation expected: ${result.score.reinterpretationExpected}/${result.score.reinterpretationTotal}\n`);
  process.stdout.write(`Unchanged observed: ${result.score.unchangedObserved}\n`);
  process.stdout.write(`Revised observed: ${result.score.revisedObserved}\n`);
  process.stdout.write(`Semantic fidelity pass: ${result.score.semanticFidelityPass}/${result.score.semanticFidelityTotal}\n`);
  process.stdout.write(`Forbidden semantic failures: ${result.score.forbiddenSemanticFailures}\n`);
  process.stdout.write(`Development criterion: ${result.score.passesDevelopmentCriterion ? "PASS" : "NOT MET"}\n`);
  process.stdout.write(`Committed judgments this invocation: ${result.execution.committedJudgmentsThisInvocation}\n`);
  process.stdout.write(`Durable replays this invocation: ${result.execution.durableReplaysThisInvocation}\n`);
  process.stdout.write(`Physical provider attempts this invocation: ${result.execution.physicalProviderAttemptsThisInvocation}\n`);
  process.stdout.write("Provider network access remained structurally disabled.\n");
}

async function replayFrozen({ plan, rootPath }) {
  const generationEvents = [];
  const reviewEvents = [];
  const durableEvents = [];
  const journal = createFileModelInvocationJournal(resolve(rootPath, "invocations"));
  const base = ({ model, observer }) => createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "provider-network-disabled" },
    modelId: model,
    fetchImpl: async () => { throw new Error("provider network access is disabled for burned meaning-fidelity replay"); },
    observer,
  });
  const generationAdapter = createDurableModelAdapter({
    baseAdapter: base({ model: plan.model, observer: (event) => generationEvents.push(event) }),
    journal,
    observer: (event) => durableEvents.push(event),
  });
  const reviewAdapter = createDurableModelAdapter({
    baseAdapter: base({ model: plan.raterModel, observer: (event) => reviewEvents.push(event) }),
    journal,
    observer: (event) => durableEvents.push(event),
  });

  process.stdout.write(`GENESIS MEANING FIDELITY: REPLAY · ${TOTAL_STEPS} model steps\n`);
  process.stdout.write(`Plan: ${plan.planDigest}\n`);
  const trials = [];
  for (const [index, trial] of plan.trials.entries()) {
    const step = index + 1;
    const label = `${trial.trialId} ${trial.mode}`;
    progress(step, "START", label);
    const durableStart = durableEvents.length;
    const requestId = `meaning-fidelity:${plan.planDigest.slice(7, 19)}:trial:${String(step).padStart(2, "0")}`;
    let output;
    let call;
    if (trial.mode === "initial") {
      const generated = await generateGenesisInitialMeaning({ adapter: generationAdapter, input: trial.input, clientRequestId: requestId });
      output = generated.output;
      call = generated.call;
    } else {
      const cognitionInput = projectPassCInputForCognition(trial.input);
      const invoked = await generationAdapter.invoke({
        systemPrompt: GENESIS_PASS_C_REINTERPRETATION_PROMPT,
        input: cognitionInput,
        responseSchema: GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
        clientRequestId: requestId,
      });
      output = normalizeReinterpretationPassCModelOutput(invoked.output, trial.input);
      call = Object.freeze({
        inputDigest: digestValue(cognitionInput),
        promptHash: digestText(GENESIS_PASS_C_REINTERPRETATION_PROMPT),
        schemaHash: digestValue(GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA),
        outputDigest: digestValue(invoked.output),
        provenance: structuredClone(invoked.provenance ?? null),
      });
    }
    const disposition = durableEvents.slice(durableStart).some((event) => event.type === "durable_model_replay") ? "durable replay" : "completed";
    progress(step, "DONE", label, `${output.outcome} · ${disposition}`);
    trials.push(Object.freeze({
      trialId: trial.trialId,
      mode: trial.mode,
      pairId: trial.pairId,
      semanticClass: trial.semanticClass,
      expectedOutcome: trial.expectedOutcome,
      output: structuredClone(output),
      cognitionInputDigest: trial.cognitionInputDigest,
      call: structuredClone(call),
    }));
  }

  const reviewInput = buildSemanticReviewInput(plan, trials);
  const reviewJson = canonicalJson(reviewInput);
  for (const forbidden of ["semanticClass", "expectedOutcome", "pairId", "decisionRule"]) {
    if (reviewJson.includes(`"${forbidden}"`)) throw new TypeError(`semantic review leaked ${forbidden}`);
  }
  progress(TOTAL_STEPS, "START", "blinded semantic review");
  const reviewStart = durableEvents.length;
  const reviewed = await reviewAdapter.invoke({
    systemPrompt: MEANING_FIDELITY_REVIEW_PROMPT,
    input: reviewInput,
    responseSchema: MEANING_FIDELITY_REVIEW_SCHEMA,
    clientRequestId: `meaning-fidelity:${plan.planDigest.slice(7, 19)}:semantic-review`,
  });
  const semanticReviews = normalizeReviews(reviewed.output, plan);
  const reviewDisposition = durableEvents.slice(reviewStart).some((event) => event.type === "durable_model_replay") ? "durable replay" : "completed";
  progress(TOTAL_STEPS, "DONE", "blinded semantic review", `${semanticReviews.filter((item) => item.fidelity === "pass").length}/12 fidelity pass · ${reviewDisposition}`);

  const score = scoreMeaningFidelity(plan, trials, semanticReviews);
  return Object.freeze({
    contract: MEANING_FIDELITY_RESULT_CONTRACT,
    developmentOnly: true,
    generatedAt: new Date().toISOString(),
    plan: Object.freeze({
      contract: plan.contract,
      model: plan.model,
      raterModel: plan.raterModel,
      fixtureDigest: plan.fixtureDigest,
      initialPromptHash: plan.initialPromptHash,
      initialSchemaHash: plan.initialSchemaHash,
      reinterpretationPromptHash: plan.reinterpretationPromptHash,
      reinterpretationSchemaHash: plan.reinterpretationSchemaHash,
      reviewPromptHash: plan.reviewPromptHash,
      reviewSchemaHash: plan.reviewSchemaHash,
      planDigest: plan.planDigest,
      decisionRule: structuredClone(plan.decisionRule),
      trialCount: plan.trialCount,
      generationCalls: plan.generationCalls,
      semanticReviewCalls: plan.semanticReviewCalls,
      scientificRetries: plan.scientificRetries,
    }),
    trials: Object.freeze(trials),
    semanticReviews,
    semanticReviewCall: Object.freeze({
      inputDigest: digestValue(reviewInput),
      outputDigest: digestValue(reviewed.output),
      provenance: structuredClone(reviewed.provenance ?? null),
    }),
    score,
    execution: Object.freeze({
      committedJudgmentsThisInvocation: durableEvents.filter((event) => event.type === "durable_model_commit").length,
      durableReplaysThisInvocation: durableEvents.filter((event) => event.type === "durable_model_replay").length,
      generationProviderAttemptsThisInvocation: generationEvents.filter((event) => event.type === "model_attempt").length,
      reviewProviderAttemptsThisInvocation: reviewEvents.filter((event) => event.type === "model_attempt").length,
      physicalProviderAttemptsThisInvocation: [...generationEvents, ...reviewEvents].filter((event) => event.type === "model_attempt").length,
    }),
  });
}

export async function runMeaningFidelityHistoricalCommand(argv = process.argv.slice(2)) {
  if (!argv.includes("--replay")) {
    if (argv.includes("--run")) {
      throw new Error("the burned meaning-fidelity baseline is closed after reinterpretation-prompt promotion; no new live run is permitted");
    }
    return runMeaningFidelityCli(argv);
  }

  const model = readArg(argv, "--model", MEANING_FIDELITY_DEFAULT_MODEL);
  const raterModel = readArg(argv, "--rater-model", model);
  const rootPath = resolve(readArg(argv, "--root", MEANING_FIDELITY_DEFAULT_ROOT));
  const resultPath = resolve(rootPath, "result.json");
  if (!existsSync(resultPath)) throw new Error("meaning-fidelity replay requires completed result.json");
  const plan = buildMeaningFidelityPlan({ model, raterModel });
  const replayed = await replayFrozen({ plan, rootPath });
  const stored = JSON.parse(readFileSync(resultPath, "utf8"));
  if (canonicalJson(comparable(stored)) !== canonicalJson(comparable(replayed))) {
    throw new Error("meaning-fidelity replay does not match completed result");
  }
  printResult(replayed);
  return replayed;
}

function isMain() {
  return process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

if (isMain()) {
  runMeaningFidelityHistoricalCommand().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

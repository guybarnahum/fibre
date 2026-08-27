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
import {
  generateGenesisInitialMeaning,
  generateGenesisReinterpretation,
} from "#services/world-kernel/src/genesis-life-pass-c.mjs";
import {
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA,
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-pass-c-prompts.mjs";
import { createOpenAIModelAdapter } from "#services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import { repoFile } from "#repo-root";

export const MEANING_FIDELITY_FIXTURE = "fixtures/genesis/meaning-fidelity-controls.json";
export const MEANING_FIDELITY_DEFAULT_MODEL = "gpt-5.1-2025-11-13";
export const MEANING_FIDELITY_DEFAULT_ROOT = ".fibre/genesis/meaning-fidelity";
export const MEANING_FIDELITY_RESULT_CONTRACT = "fibre-genesis-meaning-fidelity-result";

export const MEANING_FIDELITY_REVIEW_PROMPT = `You are a blinded semantic-fidelity reviewer for Fibre Genesis Pass C.
Review each case only from the remembered experience, prior meaning if present, later trigger if present, and generated Pass-C output.
Do not reward optimism, emotional uplift, narrative closure, personal growth, or coherence. Negative, mundane, unresolved, ambivalent, and unchanged interpretations are legitimate.
For initial meaning, flag inflated_mundane when ordinary material is turned into significance without evidence; positive_uplift when a negative experience becomes an unsupported positive lesson; ambiguity_erased when unresolved material receives unsupported resolution; ungrounded_meaning when meaning exceeds the memory.
For reinterpretation, revised is warranted only when the one trigger materially changes what the old memory can mean. Flag forced_revision for a manufactured revision from a reinforcing or weak echo; missed_revision when the trigger plainly changes the prior interpretation but the output does not; also flag positive_uplift, ambiguity_erased, or ungrounded_meaning when applicable.
A faithful output can be no_durable_meaning, durable_meaning, unchanged, none, or revised. Judge proportionality and grounding, not a preferred distribution.
Return one review for every supplied trialId, in the same order.`;

export const MEANING_FIDELITY_REVIEW_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: Object.freeze(["reviews"]),
  properties: Object.freeze({
    reviews: Object.freeze({
      type: "array",
      minItems: 12,
      maxItems: 12,
      items: Object.freeze({
        type: "object",
        additionalProperties: false,
        required: Object.freeze(["trialId", "fidelity", "issue", "reason"]),
        properties: Object.freeze({
          trialId: Object.freeze({ type: "string" }),
          fidelity: Object.freeze({ type: "string", enum: Object.freeze(["pass", "fail"]) }),
          issue: Object.freeze({
            type: "string",
            enum: Object.freeze([
              "none", "inflated_mundane", "positive_uplift", "ambiguity_erased",
              "forced_revision", "missed_revision", "ungrounded_meaning", "other",
            ]),
          }),
          reason: Object.freeze({ type: "string", maxLength: 240 }),
        }),
      }),
    }),
  }),
});

const REVIEW_ISSUES = Object.freeze([
  "none", "inflated_mundane", "positive_uplift", "ambiguity_erased",
  "forced_revision", "missed_revision", "ungrounded_meaning", "other",
]);
const INITIAL_CLASSES = new Set(["mundane", "negative_unresolved", "ambiguous_unresolved"]);

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
  const controls = JSON.parse(readFileSync(repoFile(MEANING_FIDELITY_FIXTURE), "utf8"));
  assertObject("meaning fidelity controls", controls);
  if (controls.contract !== "fibre-genesis-meaning-fidelity-controls" || controls.developmentOnly !== true) {
    throw new TypeError("meaning fidelity control contract drift");
  }
  assertObject("meaning fidelity decisionRule", controls.decisionRule);
  if (!Array.isArray(controls.cases) || controls.cases.length !== 12) throw new TypeError("meaning fidelity requires 12 cases");
  const ids = new Set();
  const pairs = new Map();
  let initial = 0;
  let reinterpretation = 0;
  for (const item of controls.cases) {
    assertText("meaning fidelity trialId", item.trialId);
    assertText("meaning fidelity rememberedContent", item.rememberedContent);
    if (ids.has(item.trialId)) throw new TypeError(`duplicate meaning fidelity trialId ${item.trialId}`);
    ids.add(item.trialId);
    if (item.mode === "initial") {
      initial += 1;
      if (!INITIAL_CLASSES.has(item.semanticClass)) throw new TypeError("invalid initial semantic class");
      if (!["durable_meaning", "no_durable_meaning"].includes(item.expectedOutcome)) throw new TypeError("invalid initial expected outcome");
    } else if (item.mode === "reinterpretation") {
      reinterpretation += 1;
      assertText("meaning fidelity pairId", item.pairId);
      assertObject("meaning fidelity priorMeaning", item.priorMeaning);
      assertObject("meaning fidelity trigger", item.trigger);
      const pair = pairs.get(item.pairId) ?? [];
      pair.push(item);
      pairs.set(item.pairId, pair);
    } else throw new TypeError("invalid meaning fidelity mode");
  }
  if (initial !== 6 || reinterpretation !== 6 || pairs.size !== 3) throw new TypeError("meaning fidelity balance drift");
  for (const [pairId, pair] of pairs.entries()) {
    if (pair.length !== 2 || new Set(pair.map((item) => item.expectedOutcome)).size !== 2) {
      throw new TypeError(`meaning fidelity pair ${pairId} must contain unchanged and revised controls`);
    }
    if (pair[0].rememberedContent !== pair[1].rememberedContent ||
        canonicalJson(pair[0].priorMeaning) !== canonicalJson(pair[1].priorMeaning)) {
      throw new TypeError(`meaning fidelity pair ${pairId} is not matched`);
    }
  }
  return controls;
}

function priorMeaning(memoryRef, candidate) {
  return {
    summary: candidate.summary,
    parts: candidate.parts.map((meaning, index) => ({
      meaningPartId: genesisMeaningPartId({ memoryRef, ordinal: index + 1 }),
      meaning,
    })),
  };
}

export function buildMeaningFidelityInput(controlCase, ordinal) {
  const identity = controlCase.mode === "initial" ? controlCase.trialId : controlCase.pairId;
  const targetMemory = {
    memoryRef: `memory_meaning_fidelity_${identity}`,
    episodeRefs: [`event_meaning_fidelity_${identity}`],
    rememberedContent: controlCase.rememberedContent,
    uncertainty: [],
  };
  const base = {
    inputVersion: GENESIS_PASS_C_INPUT_VERSION,
    mode: controlCase.mode,
    targetMemory,
    formation: controlCase.mode === "initial"
      ? { asOf: "2018-06-15T00:00:00Z", ageAtFormation: 12 + ordinal / 10, chronologyIndex: ordinal }
      : { asOf: "2020-06-15T00:00:00Z", ageAtFormation: 20 + ordinal / 10, chronologyIndex: 20 + ordinal },
    policyWitness: { policyVersion: GENESIS_PASS_C_POLICY.version },
  };
  return normalizePassCInput(controlCase.mode === "initial"
    ? { ...base, priorMeaning: null, trigger: null }
    : {
        ...base,
        priorMeaning: priorMeaning(targetMemory.memoryRef, controlCase.priorMeaning),
        trigger: {
          episodeRef: `event_meaning_fidelity_trigger_${controlCase.trialId}`,
          occurredAt: "2019-11-01T18:00:00Z",
          observableAction: controlCase.trigger.observableAction,
          relation: controlCase.trigger.relation,
        },
      });
}

export function buildMeaningFidelityPlan({
  model = MEANING_FIDELITY_DEFAULT_MODEL,
  raterModel = model,
} = {}) {
  const controls = loadControls();
  const trials = controls.cases.map((controlCase, index) => {
    const input = buildMeaningFidelityInput(controlCase, index + 1);
    const cognition = projectPassCInputForCognition(input);
    const cognitionJson = canonicalJson(cognition);
    for (const forbidden of ["semanticClass", "expectedOutcome", "pairId", "decisionRule"]) {
      if (cognitionJson.includes(`"${forbidden}"`)) throw new TypeError(`meaning fidelity cognition leaked ${forbidden}`);
    }
    return Object.freeze({
      trialId: controlCase.trialId,
      mode: controlCase.mode,
      pairId: controlCase.pairId ?? null,
      semanticClass: controlCase.semanticClass,
      expectedOutcome: controlCase.expectedOutcome,
      input,
      cognitionInputDigest: digestValue(cognition),
    });
  });
  const core = {
    contract: controls.contract,
    developmentOnly: true,
    model,
    raterModel,
    fixtureDigest: digestValue(controls),
    initialPromptHash: digestText(GENESIS_PASS_C_INITIAL_PROMPT),
    initialSchemaHash: digestValue(GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA),
    reinterpretationPromptHash: digestText(GENESIS_PASS_C_REINTERPRETATION_PROMPT),
    reinterpretationSchemaHash: digestValue(GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA),
    reviewPromptHash: digestText(MEANING_FIDELITY_REVIEW_PROMPT),
    reviewSchemaHash: digestValue(MEANING_FIDELITY_REVIEW_SCHEMA),
    decisionRule: structuredClone(controls.decisionRule),
    trialCount: 12,
    generationCalls: 12,
    semanticReviewCalls: 1,
    scientificRetries: 0,
  };
  return Object.freeze({ ...core, planDigest: digestValue(core), trials: Object.freeze(trials) });
}

export function buildSemanticReviewInput(plan, trialResults) {
  const byId = new Map(trialResults.map((item) => [item.trialId, item]));
  return Object.freeze({
    reviewVersion: "fibre-genesis-meaning-fidelity-review-v1",
    cases: plan.trials.map((trial) => {
      const result = byId.get(trial.trialId);
      if (!result) throw new TypeError(`semantic review missing ${trial.trialId}`);
      return Object.freeze({
        trialId: trial.trialId,
        mode: trial.mode,
        targetMemory: structuredClone(trial.input.targetMemory),
        priorMeaning: trial.input.priorMeaning === null ? null : structuredClone(trial.input.priorMeaning),
        trigger: trial.input.trigger === null ? null : structuredClone(trial.input.trigger),
        output: structuredClone(result.output),
      });
    }),
  });
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

export function scoreMeaningFidelity(plan, trialResults, reviews) {
  const byId = new Map(trialResults.map((item) => [item.trialId, item]));
  const mundane = plan.trials.filter((item) => item.semanticClass === "mundane");
  const negative = plan.trials.filter((item) => item.semanticClass === "negative_unresolved");
  const ambiguous = plan.trials.filter((item) => item.semanticClass === "ambiguous_unresolved");
  const re = plan.trials.filter((item) => item.mode === "reinterpretation");
  const mundaneNoMeaning = mundane.filter((item) => byId.get(item.trialId)?.output?.outcome === "no_durable_meaning").length;
  const negativeDurableMeaning = negative.filter((item) => byId.get(item.trialId)?.output?.outcome === "durable_meaning").length;
  const ambiguousDurableMeaning = ambiguous.filter((item) => byId.get(item.trialId)?.output?.outcome === "durable_meaning").length;
  const reinterpretationExpected = re.filter((item) => byId.get(item.trialId)?.output?.outcome === item.expectedOutcome).length;
  const unchangedObserved = re.filter((item) => byId.get(item.trialId)?.output?.outcome === "unchanged").length;
  const revisedObserved = re.filter((item) => byId.get(item.trialId)?.output?.outcome === "revised").length;
  const semanticFidelityPass = reviews.filter((item) => item.fidelity === "pass").length;
  const failureCounts = Object.fromEntries(REVIEW_ISSUES.map((issue) => [
    issue, reviews.filter((item) => item.issue === issue).length,
  ]));
  const rule = plan.decisionRule;
  const forbiddenSemanticFailures = rule.forbiddenSemanticFailureModes.reduce(
    (sum, issue) => sum + (failureCounts[issue] ?? 0), 0);
  const passes = mundaneNoMeaning >= rule.mundaneNoMeaningMinimum &&
    negativeDurableMeaning >= rule.negativeDurableMeaningMinimum &&
    ambiguousDurableMeaning >= rule.ambiguousDurableMeaningMinimum &&
    reinterpretationExpected >= rule.reinterpretationExpectedMinimum &&
    unchangedObserved >= rule.unchangedObservedMinimum &&
    revisedObserved >= rule.revisedObservedMinimum &&
    semanticFidelityPass >= rule.semanticFidelityPassMinimum &&
    forbiddenSemanticFailures === 0;
  let classification = "MIXED_OR_INCONCLUSIVE";
  if (passes) classification = "FIDELITY_EXERCISED";
  else if (mundaneNoMeaning === 0 &&
    plan.trials.filter((item) => item.mode === "initial").every(
      (item) => byId.get(item.trialId)?.output?.outcome === "durable_meaning")) {
    classification = "MEANING_SATURATED";
  } else if (revisedObserved === re.length) classification = "REVISION_SATURATED";
  return Object.freeze({
    admissionVerdict: null,
    classification,
    passesDevelopmentCriterion: passes,
    mundaneNoMeaning,
    mundaneTotal: mundane.length,
    negativeDurableMeaning,
    negativeTotal: negative.length,
    ambiguousDurableMeaning,
    ambiguousTotal: ambiguous.length,
    reinterpretationExpected,
    reinterpretationTotal: re.length,
    unchangedObserved,
    revisedObserved,
    semanticFidelityPass,
    semanticFidelityTotal: reviews.length,
    forbiddenSemanticFailures,
    failureCounts: Object.freeze(failureCounts),
    note: rule.interpretation,
  });
}

function createBaseAdapter({ model, observer, replay }) {
  return replay
    ? createOpenAIModelAdapter({
        environment: { OPENAI_API_KEY: "provider-network-disabled" },
        modelId: model,
        fetchImpl: async () => { throw new Error("provider network access is disabled for meaning-fidelity replay"); },
        observer,
      })
    : createOpenAIModelAdapter({ modelId: model, observer });
}

async function executePlan({ plan, mode, rootPath }) {
  const generationEvents = [];
  const reviewEvents = [];
  const durableEvents = [];
  const journal = createFileModelInvocationJournal(resolve(rootPath, "invocations"));
  const generationAdapter = createDurableModelAdapter({
    baseAdapter: createBaseAdapter({
      model: plan.model,
      observer: (event) => generationEvents.push(event),
      replay: mode === "replay",
    }),
    journal,
    observer: (event) => durableEvents.push(event),
  });
  const reviewAdapter = createDurableModelAdapter({
    baseAdapter: createBaseAdapter({
      model: plan.raterModel,
      observer: (event) => reviewEvents.push(event),
      replay: mode === "replay",
    }),
    journal,
    observer: (event) => durableEvents.push(event),
  });

  const trials = [];
  for (const [index, trial] of plan.trials.entries()) {
    const request = {
      adapter: generationAdapter,
      input: trial.input,
      clientRequestId: `meaning-fidelity:${plan.planDigest.slice(7, 19)}:trial:${String(index + 1).padStart(2, "0")}`,
    };
    const generated = trial.mode === "initial"
      ? await generateGenesisInitialMeaning(request)
      : await generateGenesisReinterpretation(request);
    trials.push(Object.freeze({
      trialId: trial.trialId,
      mode: trial.mode,
      pairId: trial.pairId,
      semanticClass: trial.semanticClass,
      expectedOutcome: trial.expectedOutcome,
      output: structuredClone(generated.output),
      cognitionInputDigest: trial.cognitionInputDigest,
      call: structuredClone(generated.call),
    }));
  }

  const reviewInput = buildSemanticReviewInput(plan, trials);
  const reviewJson = canonicalJson(reviewInput);
  for (const forbidden of ["semanticClass", "expectedOutcome", "pairId", "decisionRule"]) {
    if (reviewJson.includes(`"${forbidden}"`)) throw new TypeError(`semantic review leaked ${forbidden}`);
  }
  const reviewed = await reviewAdapter.invoke({
    systemPrompt: MEANING_FIDELITY_REVIEW_PROMPT,
    input: reviewInput,
    responseSchema: MEANING_FIDELITY_REVIEW_SCHEMA,
    clientRequestId: `meaning-fidelity:${plan.planDigest.slice(7, 19)}:semantic-review`,
  });
  const semanticReviews = normalizeReviews(reviewed.output, plan);
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
      physicalProviderAttemptsThisInvocation:
        [...generationEvents, ...reviewEvents].filter((event) => event.type === "model_attempt").length,
    }),
  });
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

function printPreflight(plan) {
  process.stdout.write("GENESIS MEANING FIDELITY: PREFLIGHT\n");
  process.stdout.write(`Plan: ${plan.planDigest}\n`);
  process.stdout.write(`Fixture: ${plan.fixtureDigest}\n`);
  process.stdout.write(`Initial prompt: ${plan.initialPromptHash}\n`);
  process.stdout.write(`Reinterpretation prompt: ${plan.reinterpretationPromptHash}\n`);
  process.stdout.write(`Semantic review prompt: ${plan.reviewPromptHash}\n`);
  process.stdout.write(`Model: openai/${plan.model}\n`);
  process.stdout.write(`Semantic reviewer: openai/${plan.raterModel}\n`);
  process.stdout.write("Trials: 12 · 6 initial + 6 reinterpretation\n");
  process.stdout.write("Semantic review: 1 blinded aggregate review\n");
  process.stdout.write("Scientific retries: 0\n");
  process.stdout.write("Maximum live provider calls: 13\n");
  process.stdout.write("Provider calls made: 0\n");
  process.stdout.write("A valid disappointing result is retained; no quality resampling is authorized.\n");
}

function printResult(result, replay = false) {
  process.stdout.write(`GENESIS MEANING FIDELITY: ${replay ? "REPLAY EXACT" : result.score.classification}\n`);
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
}

export async function runMeaningFidelityCli(argv = process.argv.slice(2)) {
  const mode = parseMode(argv);
  const model = readArg(argv, "--model", MEANING_FIDELITY_DEFAULT_MODEL);
  const raterModel = readArg(argv, "--rater-model", model);
  const rootPath = resolve(readArg(argv, "--root", MEANING_FIDELITY_DEFAULT_ROOT));
  const plan = buildMeaningFidelityPlan({ model, raterModel });
  const resultPath = resolve(rootPath, "result.json");

  if (mode === "preflight") {
    printPreflight(plan);
    return { mode, plan, providerCallsMade: 0 };
  }
  if (mode === "run" && !argv.includes("--authorize-provider-calls")) {
    throw new Error("live meaning-fidelity run requires --authorize-provider-calls");
  }
  if (mode === "run" && existsSync(resultPath)) {
    throw new Error("meaning-fidelity result already exists; use --replay");
  }
  if (mode === "replay" && !existsSync(resultPath)) {
    throw new Error("meaning-fidelity replay requires completed result.json");
  }

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
    throw new Error("meaning-fidelity replay does not match completed result");
  }
  printResult(result, true);
  process.stdout.write("Provider network access remained structurally disabled.\n");
  return result;
}

function isMain() {
  return process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

if (isMain()) {
  runMeaningFidelityCli().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

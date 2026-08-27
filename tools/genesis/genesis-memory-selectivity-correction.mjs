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
  normalizeAdmittedPassBModelOutput,
} from "#services/world-kernel/src/genesis-pass-b-admission.mjs";
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
import { repoFile } from "#repo-root";

export const MEMORY_SELECTIVITY_CORRECTION_FIXTURE =
  "fixtures/genesis/memory-selectivity-validation.json";
export const MEMORY_SELECTIVITY_CORRECTION_RESULT_CONTRACT =
  "fibre-genesis-memory-selectivity-correction-result";
export const MEMORY_SELECTIVITY_CORRECTION_DEFAULT_MODEL = "gpt-5.1-2025-11-13";
export const MEMORY_SELECTIVITY_CORRECTION_DEFAULT_ROOT =
  ".fibre/genesis/memory-selectivity-correction";

export const MEMORY_SELECTIVITY_AMENDMENT = `Autobiographical memory is selective.
A lived event being concrete, visible, recent, singular, or easy to describe is not by itself a reason to retain it autobiographically.
Form a memory only when the supplied lived experience plausibly leaves distinct autobiographical residue at rememberingAt. Relevant reasons may include disruption of expectation or routine, care or conflict involving a relationship, loss, achievement or failure, fear or embarrassment, discovery, unresolved concern, repeated return to attention, or another personally salient break in ordinary continuity. These are considerations, not a checklist and not a target distribution.
Ordinary routines may remain valid history without becoming autobiographical memory. When the visible material is ordinary or low-residue and there is no substantive reason for durable retention, return outcome=not_remembered. Do not invent significance in order to justify a memory.
priorMemories are already-constituted autobiographical context. History already represented there does not by itself justify forming another memory. A new memory may cite previously remembered history only when the supplied current context supports a genuinely distinct retained recollection rather than a duplicate paraphrase.
No quota applies. Do not remember or decline merely to balance outcomes across calls.`;

export const MEMORY_SELECTIVITY_CORRECTED_PROMPT =
  `${GENESIS_LIFE_PASS_B_PROMPT}\n\nSelective-memory authority:\n${MEMORY_SELECTIVITY_AMENDMENT}`;

const CONTROL_CLASSES = Object.freeze(["ordinary_nonselection", "strong_residue"]);
const CONTEXT_KINDS = Object.freeze(["isolated", "incremental"]);

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
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${name} must be an integer >= ${minimum}`);
  }
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

function loadControls(path = MEMORY_SELECTIVITY_CORRECTION_FIXTURE) {
  const parsed = JSON.parse(readFileSync(repoFile(path), "utf8"));
  assertPlainObject("memory selectivity correction controls", parsed);
  if (parsed.contract !== "fibre-genesis-memory-selectivity-correction-controls") {
    throw new TypeError("memory selectivity correction control contract drift");
  }
  if (parsed.developmentOnly !== true) {
    throw new TypeError("memory selectivity correction controls must be developmentOnly");
  }
  assertPlainObject("memory selectivity correction subject", parsed.subject);
  assertPlainObject("memory selectivity correction world", parsed.world);
  assertPlainObject("memory selectivity correction baselineBinding", parsed.baselineBinding);
  if (
    parsed.baselineBinding.planDigest !==
    "sha256:fcca9a53ff811a17b9c785a42162838548f6e85250e2d8cd787e3932800a9348"
  ) throw new TypeError("memory selectivity correction baseline plan drift");
  if (parsed.baselineBinding.classification !== "SATURATED") {
    throw new TypeError("memory selectivity correction must bind the saturated baseline");
  }
  assertPlainObject("memory selectivity correction decisionRule", parsed.decisionRule);
  assertInteger("residueRememberedMinimum", parsed.decisionRule.residueRememberedMinimum, 1);
  assertInteger("ordinaryNotRememberedMinimum", parsed.decisionRule.ordinaryNotRememberedMinimum, 1);
  assertInteger("matchedPairSeparationMinimum", parsed.decisionRule.matchedPairSeparationMinimum, 1);
  if (parsed.decisionRule.requireBothOutcomes !== true) {
    throw new TypeError("memory selectivity correction must require both outcomes");
  }
  if (!Array.isArray(parsed.cases) || parsed.cases.length !== 12) {
    throw new TypeError("memory selectivity correction requires exactly 12 fresh cases");
  }

  const trialIds = new Set();
  const pairs = new Map();
  for (const [index, item] of parsed.cases.entries()) {
    const pathLabel = `memory selectivity correction case ${index + 1}`;
    assertPlainObject(pathLabel, item);
    assertNonEmpty(`${pathLabel}.trialId`, item.trialId);
    assertNonEmpty(`${pathLabel}.pairId`, item.pairId);
    if (trialIds.has(item.trialId)) throw new TypeError(`duplicate trialId ${item.trialId}`);
    trialIds.add(item.trialId);
    if (!CONTEXT_KINDS.includes(item.contextKind)) throw new TypeError(`${pathLabel}.contextKind is invalid`);
    if (!CONTROL_CLASSES.includes(item.controlClass)) throw new TypeError(`${pathLabel}.controlClass is invalid`);
    const expected = item.controlClass === "strong_residue" ? "remembered" : "not_remembered";
    if (item.expectedOutcome !== expected) throw new TypeError(`${pathLabel}.expectedOutcome must be ${expected}`);
    if (!Array.isArray(item.history) || item.history.length < 1) throw new TypeError(`${pathLabel}.history is required`);
    if (!Array.isArray(item.priorMemories)) throw new TypeError(`${pathLabel}.priorMemories must be an array`);
    if (item.contextKind === "isolated" && (item.history.length !== 1 || item.priorMemories.length !== 0)) {
      throw new TypeError(`${pathLabel} isolated context must use one episode and no prior memory`);
    }
    if (item.contextKind === "incremental" && (item.history.length !== 2 || item.priorMemories.length !== 1)) {
      throw new TypeError(`${pathLabel} incremental context must use two episodes and one prior memory`);
    }
    const pair = pairs.get(item.pairId) ?? [];
    pair.push(item);
    pairs.set(item.pairId, pair);
  }

  if (pairs.size !== 6) throw new TypeError("memory selectivity correction requires six matched pairs");
  for (const [pairId, pair] of pairs.entries()) {
    if (pair.length !== 2) throw new TypeError(`pair ${pairId} must contain two cases`);
    if (new Set(pair.map((item) => item.controlClass)).size !== 2) {
      throw new TypeError(`pair ${pairId} must contain both control classes`);
    }
    if (
      pair[0].contextKind !== pair[1].contextKind ||
      pair[0].rememberingAt !== pair[1].rememberingAt ||
      pair[0].ageAtRemembering !== pair[1].ageAtRemembering
    ) throw new TypeError(`pair ${pairId} must match context kind, remembering time and age`);
    if (pair[0].history.length !== pair[1].history.length) {
      throw new TypeError(`pair ${pairId} history cardinality drift`);
    }
    for (let index = 0; index < pair[0].history.length; index += 1) {
      const left = pair[0].history[index];
      const right = pair[1].history[index];
      for (const key of ["episodeId", "occurredAt", "ageAtEvent", "placeRef"]) {
        if (left[key] !== right[key]) throw new TypeError(`pair ${pairId} must match ${key} at history ${index}`);
      }
    }
    if (canonicalJson(pair[0].priorMemories) !== canonicalJson(pair[1].priorMemories)) {
      throw new TypeError(`pair ${pairId} prior memory context drift`);
    }
  }
  return Object.freeze(structuredClone(parsed));
}

export function buildMemorySelectivityCorrectionInput(controls, controlCase, ordinal) {
  assertInteger("memory selectivity correction ordinal", ordinal, 1);
  const priorTreatmentMemoryExposure = controlCase.priorMemories.some(
    (item) => item.formationMode === "life_plus_genome",
  );
  const input = normalizePassBInput({
    inputVersion: GENESIS_PASS_B_INPUT_VERSION,
    subject: structuredClone(controls.subject),
    world: structuredClone(controls.world),
    rememberingAt: controlCase.rememberingAt,
    ageAtRemembering: controlCase.ageAtRemembering,
    chronologyEndsAt: controlCase.rememberingAt,
    history: structuredClone(controlCase.history),
    priorMemories: structuredClone(controlCase.priorMemories),
    assignment: {
      formationMode: "life_only",
      priorTreatmentMemoryExposure,
      analysisStratum: priorTreatmentMemoryExposure ? "life_only_exposed" : "life_only_unexposed",
    },
    genomeExposure: null,
    policyWitness: {
      policyVersion: GENESIS_PASS_B_POLICY.version,
      assignmentRef: `memory_selectivity_correction_assignment_${String(ordinal).padStart(2, "0")}`,
      genomeExposurePolicyRef: null,
    },
  });

  const cognition = projectPassBInputForCognition(input);
  const cognitionJson = canonicalJson(cognition);
  for (const forbiddenKey of [
    "trialId",
    "pairId",
    "contextKind",
    "controlClass",
    "expectedOutcome",
    "decisionRule",
    "baselineBinding",
  ]) {
    if (cognitionJson.includes(`"${forbiddenKey}"`)) {
      throw new TypeError(`memory selectivity correction cognition leaked ${forbiddenKey}`);
    }
  }
  return input;
}

export function buildMemorySelectivityCorrectionPlan({
  controls = loadControls(),
  model = MEMORY_SELECTIVITY_CORRECTION_DEFAULT_MODEL,
} = {}) {
  assertNonEmpty("memory selectivity correction model", model);
  const fixtureDigest = digestValue(controls);
  const promptHash = digestText(MEMORY_SELECTIVITY_CORRECTED_PROMPT);
  const responseSchemaHash = digestValue(GENESIS_PASS_B_RESPONSE_SCHEMA);
  const trials = controls.cases.map((controlCase, index) => {
    const input = buildMemorySelectivityCorrectionInput(controls, controlCase, index + 1);
    return Object.freeze({
      trialId: controlCase.trialId,
      pairId: controlCase.pairId,
      contextKind: controlCase.contextKind,
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
    baselineBinding: structuredClone(controls.baselineBinding),
    fixtureDigest,
    promptHash,
    responseSchemaHash,
    trialCount: trials.length,
    pairCount: 6,
    isolatedPairCount: 3,
    incrementalPairCount: 3,
    decisionRule: structuredClone(controls.decisionRule),
    unitOfObservation: "one stateless Pass-B memory-formation decision",
    scientificRetries: 0,
    orderReplicates: 0,
  };
  return Object.freeze({
    ...core,
    planDigest: digestValue(core),
    trials: Object.freeze(trials),
  });
}

export function scoreMemorySelectivityCorrection(plan, trialResults) {
  if (!Array.isArray(trialResults) || trialResults.length !== plan.trials.length) {
    throw new TypeError("memory selectivity correction scoring requires one result per planned trial");
  }
  const byTrial = new Map(trialResults.map((item) => [item.trialId, item]));
  if (byTrial.size !== plan.trials.length) throw new TypeError("memory selectivity correction trial IDs must be unique");
  const residue = plan.trials.filter((item) => item.controlClass === "strong_residue");
  const ordinary = plan.trials.filter((item) => item.controlClass === "ordinary_nonselection");
  const residueRemembered = residue.filter(
    (item) => byTrial.get(item.trialId)?.outcome === "remembered",
  ).length;
  const ordinaryNotRemembered = ordinary.filter(
    (item) => byTrial.get(item.trialId)?.outcome === "not_remembered",
  ).length;
  const outcomes = new Set(trialResults.map((item) => item.outcome));
  let matchedPairSeparation = 0;
  const pairDetails = [];
  for (const pairId of new Set(plan.trials.map((item) => item.pairId))) {
    const pair = plan.trials.filter((item) => item.pairId === pairId);
    const strong = pair.find((item) => item.controlClass === "strong_residue");
    const ordinaryCase = pair.find((item) => item.controlClass === "ordinary_nonselection");
    const separated = (
      byTrial.get(strong.trialId)?.outcome === "remembered" &&
      byTrial.get(ordinaryCase.trialId)?.outcome === "not_remembered"
    );
    if (separated) matchedPairSeparation += 1;
    pairDetails.push(Object.freeze({
      pairId,
      contextKind: strong.contextKind,
      separated,
    }));
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
    matchedPairTotal: 6,
    isolatedPairsSeparated: pairDetails.filter((item) => item.contextKind === "isolated" && item.separated).length,
    incrementalPairsSeparated: pairDetails.filter((item) => item.contextKind === "incremental" && item.separated).length,
    observedOutcomes: Object.freeze([...outcomes].sort()),
    pairDetails: Object.freeze(pairDetails),
    note: plan.decisionRule.interpretation,
  });
}

function createDisabledNetworkAdapter({ model, observer }) {
  return createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "provider-network-disabled" },
    modelId: model,
    fetchImpl: async () => {
      throw new Error("provider network access is disabled for memory-selectivity correction replay");
    },
    observer,
  });
}

function printPreflight(plan) {
  process.stdout.write("GENESIS MEMORY SELECTIVITY CORRECTION: PREFLIGHT\n");
  process.stdout.write(`Baseline: ${plan.baselineBinding.planDigest} · ${plan.baselineBinding.classification}\n`);
  process.stdout.write(`Plan: ${plan.planDigest}\n`);
  process.stdout.write(`Fixture: ${plan.fixtureDigest}\n`);
  process.stdout.write(`Corrected prompt: ${plan.promptHash}\n`);
  process.stdout.write(`Schema: ${plan.responseSchemaHash}\n`);
  process.stdout.write(`Model: openai/${plan.model}\n`);
  process.stdout.write("Trials: 12 · 6 fresh matched pairs · 3 isolated + 3 incremental\n");
  process.stdout.write(`Criterion: residue remembered >= ${plan.decisionRule.residueRememberedMinimum}/6 · ordinary not_remembered >= ${plan.decisionRule.ordinaryNotRememberedMinimum}/6 · separated pairs >= ${plan.decisionRule.matchedPairSeparationMinimum}/6 · both outcomes required\n`);
  process.stdout.write("Scientific retries: 0\n");
  process.stdout.write("Provider calls made: 0\n");
  process.stdout.write("This candidate correction is not yet the production Pass-B prompt.\n");
}

function printResult(result, replay = false) {
  process.stdout.write(`GENESIS MEMORY SELECTIVITY CORRECTION: ${replay ? "REPLAY EXACT" : result.score.classification}\n`);
  process.stdout.write(`Plan: ${result.plan.planDigest}\n`);
  for (const item of result.trials) {
    process.stdout.write(
      `${item.trialId} ${item.contextKind}/${item.controlClass}: ${item.outcome} · expected ${item.expectedOutcome}\n`,
    );
  }
  process.stdout.write(`Strong-residue remembered: ${result.score.residueRemembered}/${result.score.residueTotal}\n`);
  process.stdout.write(`Ordinary non-selection: ${result.score.ordinaryNotRemembered}/${result.score.ordinaryTotal}\n`);
  process.stdout.write(`Matched-pair separation: ${result.score.matchedPairSeparation}/${result.score.matchedPairTotal}\n`);
  process.stdout.write(`Isolated pairs separated: ${result.score.isolatedPairsSeparated}/3\n`);
  process.stdout.write(`Incremental pairs separated: ${result.score.incrementalPairsSeparated}/3\n`);
  process.stdout.write(`Development criterion: ${result.score.passesDevelopmentCriterion ? "PASS" : "NOT MET"}\n`);
  process.stdout.write(`Committed judgments this invocation: ${result.execution.committedJudgmentsThisInvocation}\n`);
  process.stdout.write(`Durable replays this invocation: ${result.execution.durableReplaysThisInvocation}\n`);
  process.stdout.write(`Physical provider attempts this invocation: ${result.execution.providerAttemptsThisInvocation}\n`);
}

async function executePlan({ plan, mode, rootPath }) {
  const providerEvents = [];
  const durableEvents = [];
  const baseAdapter = mode === "replay"
    ? createDisabledNetworkAdapter({
        model: plan.model,
        observer: (event) => providerEvents.push(event),
      })
    : createOpenAIModelAdapter({
        modelId: plan.model,
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
    const result = await adapter.invoke({
      systemPrompt: MEMORY_SELECTIVITY_CORRECTED_PROMPT,
      input: cognitionInput,
      responseSchema: GENESIS_PASS_B_RESPONSE_SCHEMA,
      clientRequestId: `memory-selectivity-correction:${plan.planDigest.slice(7, 19)}:trial:${String(index + 1).padStart(2, "0")}`,
    });
    const output = normalizeAdmittedPassBModelOutput(result.output, trial.input);
    trials.push(Object.freeze({
      trialId: trial.trialId,
      pairId: trial.pairId,
      contextKind: trial.contextKind,
      controlClass: trial.controlClass,
      expectedOutcome: trial.expectedOutcome,
      outcome: output.outcome,
      episodeRefs: structuredClone(output.episodeRefs),
      rememberedContent: output.rememberedContent,
      uncertainty: structuredClone(output.uncertainty),
      cognitionInputDigest: trial.cognitionInputDigest,
      provenance: structuredClone(result.provenance ?? null),
    }));
  }

  const score = scoreMemorySelectivityCorrection(plan, trials);
  return Object.freeze({
    contract: MEMORY_SELECTIVITY_CORRECTION_RESULT_CONTRACT,
    developmentOnly: true,
    generatedAt: new Date().toISOString(),
    plan: Object.freeze({
      contract: plan.contract,
      model: plan.model,
      baselineBinding: structuredClone(plan.baselineBinding),
      fixtureDigest: plan.fixtureDigest,
      promptHash: plan.promptHash,
      responseSchemaHash: plan.responseSchemaHash,
      planDigest: plan.planDigest,
      trialCount: plan.trialCount,
      pairCount: plan.pairCount,
      isolatedPairCount: plan.isolatedPairCount,
      incrementalPairCount: plan.incrementalPairCount,
      decisionRule: structuredClone(plan.decisionRule),
      unitOfObservation: plan.unitOfObservation,
      scientificRetries: plan.scientificRetries,
      orderReplicates: plan.orderReplicates,
    }),
    trials: Object.freeze(trials),
    score,
    execution: Object.freeze({
      committedJudgmentsThisInvocation: durableEvents.filter(
        (event) => event.type === "durable_model_commit",
      ).length,
      durableReplaysThisInvocation: durableEvents.filter(
        (event) => event.type === "durable_model_replay",
      ).length,
      providerAttemptsThisInvocation: providerEvents.filter(
        (event) => event.type === "model_attempt",
      ).length,
      providerResponsesThisInvocation: providerEvents.filter(
        (event) => event.type === "model_response",
      ).length,
      operationalFailuresThisInvocation: providerEvents.filter(
        (event) => event.type === "operational_failure",
      ).length,
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

export async function runMemorySelectivityCorrectionCli(argv = process.argv.slice(2)) {
  const mode = parseMode(argv);
  const model = readArg(argv, "--model", MEMORY_SELECTIVITY_CORRECTION_DEFAULT_MODEL);
  const rootPath = resolve(
    readArg(argv, "--root", MEMORY_SELECTIVITY_CORRECTION_DEFAULT_ROOT),
  );
  const controls = loadControls();
  const plan = buildMemorySelectivityCorrectionPlan({ controls, model });
  const resultPath = resolve(rootPath, "result.json");

  if (mode === "preflight") {
    printPreflight(plan);
    return { mode, plan, providerCallsMade: 0 };
  }

  if (mode === "run" && !argv.includes("--authorize-provider-calls")) {
    throw new Error("live memory-selectivity correction requires --authorize-provider-calls");
  }
  if (mode === "run" && existsSync(resultPath)) {
    throw new Error(
      "memory-selectivity correction result already exists; use --replay instead of rerunning accepted judgments",
    );
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
    throw new Error("memory-selectivity correction replay requires the completed result.json");
  }
  const stored = JSON.parse(readFileSync(resultPath, "utf8"));
  if (canonicalJson(comparableResult(stored)) !== canonicalJson(comparableResult(result))) {
    throw new Error("memory-selectivity correction replay does not match the completed result");
  }
  printResult(result, true);
  process.stdout.write("Provider network access remained structurally disabled.\n");
  return result;
}

function isMain() {
  return (
    process.argv[1] !== undefined &&
    pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  );
}

if (isMain()) {
  runMemorySelectivityCorrectionCli().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

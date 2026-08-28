#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  generateGenesisPassBMemory,
  GENESIS_LIFE_PASS_B_COGNITION_PROMPT,
} from "#services/world-kernel/src/genesis-life-pass-b.mjs";
import {
  GENESIS_PASS_B_RESPONSE_SCHEMA,
} from "#services/world-kernel/src/genesis-pass-b-prompts.mjs";
import { createOpenAIModelAdapter } from "#services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import { repoFile } from "#repo-root";

export const GENOME_MEMORY_SEAM_FIXTURE = "fixtures/genesis/genome-memory-seam-controls.json";
export const GENOME_MEMORY_SEAM_DEFAULT_MODEL = "gpt-5.1-2025-11-13";
export const GENOME_MEMORY_SEAM_DEFAULT_ROOT = ".fibre/genesis/genome-memory-seam";
export const GENOME_MEMORY_SEAM_RESULT_CONTRACT = "fibre-genesis-genome-memory-seam-result";

const DAY_MS = 24 * 60 * 60 * 1000;
const OPAQUE_EXPOSURE_POLICY_REF = "genome_memory_seam_whole_genome_v1";
const FILLER_ACTIONS = Object.freeze([
  ["place_gms_home", "The child cleared the dinner table, rinsed two cups, and put a folded dish towel back beside the sink."],
  ["place_gms_school", "The child copied the next week's assignment dates into a notebook and returned two reference books to the classroom shelf."],
  ["place_gms_transit", "The child rode the usual route home, checked the stop display once, and walked the familiar block from the bus stop."],
  ["place_gms_center", "The child stacked chairs after a community-center activity and returned markers and tape to the labeled supply drawer."],
  ["place_gms_home", "The child sorted clean laundry into two drawers and left a small pile of unmatched socks on top of the dresser."],
  ["place_gms_school", "The child sharpened two pencils before class, filed a worksheet in the correct binder section, and sat down before the bell."],
  ["place_gms_center", "The child wiped a shared worktable after a club meeting and returned borrowed scissors to the tool tray."],
  ["place_gms_transit", "The child waited for the normal bus, boarded with several classmates, and got off at the usual neighborhood stop."],
]);

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
  const controls = JSON.parse(readFileSync(repoFile(GENOME_MEMORY_SEAM_FIXTURE), "utf8"));
  assertObject("genome memory seam controls", controls);
  if (controls.contract !== "fibre-genesis-genome-memory-seam-controls" || controls.developmentOnly !== true) {
    throw new TypeError("genome memory seam control contract drift");
  }
  assertObject("genome memory seam taskMatchedPositiveControl", controls.taskMatchedPositiveControl);
  assertObject("genome memory seam decisionRule", controls.decisionRule);
  assertObject("genome memory seam subject", controls.subject);
  assertObject("genome memory seam world", controls.world);
  if (!Array.isArray(controls.genomes) || controls.genomes.length !== 2) throw new TypeError("genome memory seam requires exactly two genome contexts");
  if (!Array.isArray(controls.cases) || controls.cases.length !== 8) throw new TypeError("genome memory seam requires exactly eight matched opportunities");

  const treatments = new Set(controls.genomes.map((item) => item.treatment));
  if (treatments.size !== 2 || !treatments.has("alpha") || !treatments.has("beta")) {
    throw new TypeError("genome memory seam treatments must be alpha and beta");
  }
  for (const genome of controls.genomes) {
    assertText("genome memory seam genomeRef", genome.genomeRef);
    if (!Array.isArray(genome.loci) || genome.loci.length !== 6) throw new TypeError("genome memory seam genomes require six loci");
    genome.loci.forEach((locus, index) => {
      if (locus.ordinal !== index + 1) throw new TypeError("genome memory seam loci must be ordinal");
      assertText("genome memory seam locusId", locus.locusId);
      assertText("genome memory seam locus value", locus.value);
    });
  }

  const pairIds = new Set();
  let alphaFirst = 0;
  let betaFirst = 0;
  let alphaRecent = 0;
  let betaRecent = 0;
  const horizonCounts = new Map();
  for (const item of controls.cases) {
    assertText("genome memory seam pairId", item.pairId);
    if (pairIds.has(item.pairId)) throw new TypeError(`duplicate genome memory seam pair ${item.pairId}`);
    pairIds.add(item.pairId);
    if (![4, 6, 8, 10].includes(item.historyHorizon)) throw new TypeError("genome memory seam history horizon must be 4, 6, 8 or 10");
    if (!Number.isFinite(item.ageAtRemembering) || item.ageAtRemembering <= 0) throw new TypeError("genome memory seam ageAtRemembering is invalid");
    if (!Number.isFinite(Date.parse(item.rememberingAt))) throw new TypeError("genome memory seam rememberingAt is invalid");
    if (canonicalJson([...item.treatmentOrder].sort()) !== canonicalJson(["alpha", "beta"])) throw new TypeError("genome memory seam treatmentOrder must contain both treatments");
    if (canonicalJson([...item.anchorTemporalOrder].sort()) !== canonicalJson(["alpha", "beta"])) throw new TypeError("genome memory seam anchorTemporalOrder must contain both treatments");
    assertObject("genome memory seam anchors", item.anchors);
    for (const treatment of ["alpha", "beta"]) {
      assertObject(`genome memory seam ${treatment} anchor`, item.anchors[treatment]);
      assertText(`genome memory seam ${treatment} episodeId`, item.anchors[treatment].episodeId);
      assertText(`genome memory seam ${treatment} placeRef`, item.anchors[treatment].placeRef);
      assertText(`genome memory seam ${treatment} observableAction`, item.anchors[treatment].observableAction);
    }
    if (item.treatmentOrder[0] === "alpha") alphaFirst += 1;
    else betaFirst += 1;
    if (item.anchorTemporalOrder[1] === "alpha") alphaRecent += 1;
    else betaRecent += 1;
    horizonCounts.set(item.historyHorizon, (horizonCounts.get(item.historyHorizon) ?? 0) + 1);
  }
  if (alphaFirst !== 4 || betaFirst !== 4) throw new TypeError("genome memory seam treatment order is not counterbalanced");
  if (alphaRecent !== 4 || betaRecent !== 4) throw new TypeError("genome memory seam anchor recency is not counterbalanced");
  for (const horizon of [4, 6, 8, 10]) {
    if (horizonCounts.get(horizon) !== 2) throw new TypeError(`genome memory seam horizon ${horizon} is not balanced`);
  }
  return Object.freeze(structuredClone(controls));
}

function buildHistory(controlCase, pairOrdinal, subjectId) {
  const horizon = controlCase.historyHorizon;
  const rememberingMs = Date.parse(controlCase.rememberingAt);
  const anchorBySlot = new Map([
    [horizon - 2, controlCase.anchors[controlCase.anchorTemporalOrder[0]]],
    [horizon - 1, controlCase.anchors[controlCase.anchorTemporalOrder[1]]],
  ]);
  const history = [];
  let fillerOrdinal = 0;
  for (let index = 0; index < horizon; index += 1) {
    const occurredAt = new Date(rememberingMs - (horizon - index) * 30 * DAY_MS).toISOString();
    const ageAtEvent = Number((controlCase.ageAtRemembering - ((horizon - index) * 30 / 365.25)).toFixed(3));
    const anchor = anchorBySlot.get(index);
    if (anchor !== undefined) {
      history.push({
        episodeId: anchor.episodeId,
        occurredAt,
        ageAtEvent,
        placeRef: anchor.placeRef,
        participantRefs: [subjectId],
        observableAction: anchor.observableAction,
        introducedParticipants: [],
      });
      continue;
    }
    const filler = FILLER_ACTIONS[(pairOrdinal + fillerOrdinal) % FILLER_ACTIONS.length];
    fillerOrdinal += 1;
    history.push({
      episodeId: `ep_gms_${String(pairOrdinal).padStart(2, "0")}_f${String(fillerOrdinal).padStart(2, "0")}`,
      occurredAt,
      ageAtEvent,
      placeRef: filler[0],
      participantRefs: [subjectId],
      observableAction: filler[1],
      introducedParticipants: [],
    });
  }
  return history;
}

function exposureForGenome(genome) {
  return {
    policy: { kind: "whole_genome", k: null },
    genomeRef: genome.genomeRef,
    genomeDigest: digestValue({ genomeRef: genome.genomeRef, loci: genome.loci }),
    totalLoci: genome.loci.length,
    loci: structuredClone(genome.loci),
  };
}

function buildInput(controls, controlCase, pairOrdinal, treatment, treatmentOrdinal) {
  const genome = controls.genomes.find((item) => item.treatment === treatment);
  if (!genome) throw new TypeError(`missing genome memory seam treatment ${treatment}`);
  return normalizePassBInput({
    inputVersion: GENESIS_PASS_B_INPUT_VERSION,
    subject: structuredClone(controls.subject),
    world: structuredClone(controls.world),
    rememberingAt: controlCase.rememberingAt,
    ageAtRemembering: controlCase.ageAtRemembering,
    chronologyEndsAt: controlCase.rememberingAt,
    history: buildHistory(controlCase, pairOrdinal, controls.subject.provisionalThreadId),
    priorMemories: [],
    assignment: {
      formationMode: "life_plus_genome",
      priorTreatmentMemoryExposure: false,
      analysisStratum: "life_plus_genome",
    },
    genomeExposure: exposureForGenome(genome),
    policyWitness: {
      policyVersion: GENESIS_PASS_B_POLICY.version,
      assignmentRef: `genome_memory_seam_assignment_${String(pairOrdinal).padStart(2, "0")}_${String(treatmentOrdinal).padStart(2, "0")}`,
      genomeExposurePolicyRef: OPAQUE_EXPOSURE_POLICY_REF,
    },
  });
}

function withoutGenomeExposure(cognition) {
  return { ...structuredClone(cognition), genomeExposure: null };
}

export function buildGenomeMemorySeamPlan({
  controls = loadControls(),
  model = GENOME_MEMORY_SEAM_DEFAULT_MODEL,
} = {}) {
  assertText("genome memory seam model", model);
  const promptHash = digestText(GENESIS_LIFE_PASS_B_COGNITION_PROMPT);
  if (promptHash !== controls.taskMatchedPositiveControl.promptHash) {
    throw new TypeError("genome memory seam current Pass-B prompt no longer matches the burned task-matched positive control");
  }

  const trials = [];
  for (const [caseIndex, controlCase] of controls.cases.entries()) {
    const pairOrdinal = caseIndex + 1;
    const pairTrials = [];
    for (const [treatmentIndex, treatment] of controlCase.treatmentOrder.entries()) {
      const input = buildInput(controls, controlCase, pairOrdinal, treatment, treatmentIndex + 1);
      const cognition = projectPassBInputForCognition(input);
      const cognitionJson = canonicalJson(cognition);
      for (const forbidden of [
        "treatmentOrder", "anchorTemporalOrder", "decisionRule", "taskMatchedPositiveControl",
        "expectedAnchorEpisodeId", "pairId", "\"treatment\"",
      ]) {
        if (cognitionJson.includes(forbidden)) throw new TypeError(`genome memory seam cognition leaked ${forbidden}`);
      }
      const expectedAnchorEpisodeId = controlCase.anchors[treatment].episodeId;
      const oppositeTreatment = treatment === "alpha" ? "beta" : "alpha";
      pairTrials.push(Object.freeze({
        trialId: `gms_trial_${String(trials.length + pairTrials.length + 1).padStart(2, "0")}`,
        pairId: controlCase.pairId,
        pairOrdinal,
        treatment,
        expectedAnchorEpisodeId,
        oppositeAnchorEpisodeId: controlCase.anchors[oppositeTreatment].episodeId,
        historyHorizon: controlCase.historyHorizon,
        ageAtRemembering: controlCase.ageAtRemembering,
        input,
        cognitionInputDigest: digestValue(cognition),
      }));
    }
    if (
      canonicalJson(withoutGenomeExposure(projectPassBInputForCognition(pairTrials[0].input))) !==
      canonicalJson(withoutGenomeExposure(projectPassBInputForCognition(pairTrials[1].input)))
    ) {
      throw new TypeError(`genome memory seam pair ${controlCase.pairId} differs outside genome exposure`);
    }
    trials.push(...pairTrials);
  }

  const core = {
    contract: controls.contract,
    developmentOnly: true,
    model,
    fixtureDigest: digestValue(controls),
    promptHash,
    responseSchemaHash: digestValue(GENESIS_PASS_B_RESPONSE_SCHEMA),
    taskMatchedPositiveControl: structuredClone(controls.taskMatchedPositiveControl),
    decisionRule: structuredClone(controls.decisionRule),
    pairCount: controls.cases.length,
    trialCount: trials.length,
    unitOfObservation: "one fresh matched historical opportunity evaluated once under each of two genome contexts",
    historyHorizons: Object.freeze([4, 6, 8, 10]),
    treatmentOrderCounterbalanced: true,
    anchorRecencyCounterbalanced: true,
    scientificRetries: 0,
    maxMechanicalGenomeCopyRetriesPerTrial: 1,
    maximumPhysicalProviderAttempts: trials.length * 2,
  };
  return Object.freeze({
    ...core,
    planDigest: digestValue({
      ...core,
      cognitionInputDigests: trials.map((trial) => trial.cognitionInputDigest),
    }),
    trials: Object.freeze(trials),
  });
}

function selectedAnchor(trial, output) {
  const refs = new Set(output?.episodeRefs ?? []);
  const expected = refs.has(trial.expectedAnchorEpisodeId);
  const opposite = refs.has(trial.oppositeAnchorEpisodeId);
  if (expected && !opposite) return "expected";
  if (!expected && opposite) return "opposite";
  if (expected && opposite) return "both";
  if (output?.outcome === "not_remembered") return "none";
  return "other";
}

export function scoreGenomeMemorySeam(plan, trialResults) {
  if (!Array.isArray(trialResults) || trialResults.length !== plan.trials.length) {
    throw new TypeError("genome memory seam scoring requires one result per planned trial");
  }
  const byId = new Map(trialResults.map((item) => [item.trialId, item]));
  if (byId.size !== plan.trials.length) throw new TypeError("genome memory seam result trial IDs must be unique");

  let directionalPairCount = 0;
  let reversePairCount = 0;
  let citationDifferencePairCount = 0;
  const pairDetails = [];
  for (let pairOrdinal = 1; pairOrdinal <= plan.pairCount; pairOrdinal += 1) {
    const pair = plan.trials.filter((trial) => trial.pairOrdinal === pairOrdinal);
    const alpha = pair.find((trial) => trial.treatment === "alpha");
    const beta = pair.find((trial) => trial.treatment === "beta");
    const alphaResult = byId.get(alpha.trialId);
    const betaResult = byId.get(beta.trialId);
    const alphaSelection = selectedAnchor(alpha, alphaResult.output);
    const betaSelection = selectedAnchor(beta, betaResult.output);
    const directional = alphaSelection === "expected" && betaSelection === "expected";
    const reverse = alphaSelection === "opposite" && betaSelection === "opposite";
    const citationDifference =
      canonicalJson(alphaResult.output?.episodeRefs ?? []) !== canonicalJson(betaResult.output?.episodeRefs ?? []);
    if (directional) directionalPairCount += 1;
    if (reverse) reversePairCount += 1;
    if (citationDifference) citationDifferencePairCount += 1;
    pairDetails.push(Object.freeze({
      pairId: alpha.pairId,
      historyHorizon: alpha.historyHorizon,
      ageAtRemembering: alpha.ageAtRemembering,
      alphaSelection,
      betaSelection,
      directional,
      reverse,
      citationDifference,
    }));
  }

  const rule = plan.decisionRule;
  let classification = "INCONCLUSIVE";
  if (
    directionalPairCount >= rule.behaviorallyCausalDirectionalPairMinimum &&
    reversePairCount <= rule.reversePairMaximum
  ) {
    classification = "BEHAVIORALLY_CAUSAL";
  } else if (
    directionalPairCount <= rule.contextOnlyDirectionalPairMaximum &&
    reversePairCount <= rule.contextOnlyReversePairMaximum
  ) {
    classification = "CONTEXT_ONLY";
  }

  return Object.freeze({
    admissionVerdict: null,
    classification,
    structuralExposure: "whole symbolic genome reaches Pass-B cognition under the declared life_plus_genome seam",
    directionalPairCount,
    reversePairCount,
    citationDifferencePairCount,
    pairCount: plan.pairCount,
    pairDetails: Object.freeze(pairDetails),
    taskMatchedPositiveControl: structuredClone(plan.taskMatchedPositiveControl),
    sensitivity: "Resolves only a large consistent directional effect: >=7/8 concordant matched opportunities. Smaller or mixed effects remain inconclusive; Context-only is not evidence of absence.",
    note: rule.interpretation,
  });
}

function createBaseAdapter({ model, observer, replay }) {
  return replay
    ? createOpenAIModelAdapter({
        environment: { OPENAI_API_KEY: "provider-network-disabled" },
        modelId: model,
        fetchImpl: async () => { throw new Error("provider network access is disabled for genome-memory-seam replay"); },
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
    process.stdout.write(`GENESIS GENOME MEMORY SEAM: ${mode.toUpperCase()} · ${plan.trialCount} judgments\n`);
    process.stdout.write(`Plan: ${plan.planDigest}\n`);
  }

  const trials = [];
  for (const [index, trial] of plan.trials.entries()) {
    const step = String(index + 1).padStart(2, "0");
    const total = String(plan.trialCount).padStart(2, "0");
    if (progress) process.stdout.write(`[${step}/${total}] START ${trial.pairId}\n`);
    const durableStart = durableEvents.length;
    const generated = await generateGenesisPassBMemory({
      adapter,
      input: trial.input,
      clientRequestId: `genome-memory-seam:${plan.planDigest.slice(7, 19)}:trial:${step}`,
    });
    const result = Object.freeze({
      trialId: trial.trialId,
      pairId: trial.pairId,
      pairOrdinal: trial.pairOrdinal,
      treatment: trial.treatment,
      expectedAnchorEpisodeId: trial.expectedAnchorEpisodeId,
      oppositeAnchorEpisodeId: trial.oppositeAnchorEpisodeId,
      historyHorizon: trial.historyHorizon,
      ageAtRemembering: trial.ageAtRemembering,
      cognitionInputDigest: trial.cognitionInputDigest,
      output: structuredClone(generated.output),
      calls: structuredClone(generated.calls),
    });
    trials.push(result);
    if (progress) {
      process.stdout.write(
        `[${step}/${total}] DONE  ${trial.pairId} · ${generated.output.outcome} · ${selectedAnchor(trial, generated.output)} anchor · ${disposition(durableEvents, durableStart)}\n`,
      );
    }
  }

  const score = scoreGenomeMemorySeam(plan, trials);
  return Object.freeze({
    contract: GENOME_MEMORY_SEAM_RESULT_CONTRACT,
    developmentOnly: true,
    generatedAt: new Date().toISOString(),
    plan: Object.freeze({
      contract: plan.contract,
      model: plan.model,
      fixtureDigest: plan.fixtureDigest,
      promptHash: plan.promptHash,
      responseSchemaHash: plan.responseSchemaHash,
      taskMatchedPositiveControl: structuredClone(plan.taskMatchedPositiveControl),
      decisionRule: structuredClone(plan.decisionRule),
      pairCount: plan.pairCount,
      trialCount: plan.trialCount,
      unitOfObservation: plan.unitOfObservation,
      historyHorizons: [...plan.historyHorizons],
      treatmentOrderCounterbalanced: plan.treatmentOrderCounterbalanced,
      anchorRecencyCounterbalanced: plan.anchorRecencyCounterbalanced,
      scientificRetries: plan.scientificRetries,
      maxMechanicalGenomeCopyRetriesPerTrial: plan.maxMechanicalGenomeCopyRetriesPerTrial,
      maximumPhysicalProviderAttempts: plan.maximumPhysicalProviderAttempts,
      planDigest: plan.planDigest,
    }),
    trials: Object.freeze(trials),
    score,
    execution: Object.freeze({
      completedTrialsThisInvocation: trials.length,
      durableModelCommitsThisInvocation: durableEvents.filter((event) => event.type === "durable_model_commit").length,
      durableModelReplaysThisInvocation: durableEvents.filter((event) => event.type === "durable_model_replay").length,
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
  process.stdout.write("GENESIS GENOME MEMORY SEAM: PREFLIGHT\n");
  process.stdout.write(`Plan: ${plan.planDigest}\n`);
  process.stdout.write(`Fixture: ${plan.fixtureDigest}\n`);
  process.stdout.write(`Runtime Pass-B prompt: ${plan.promptHash}\n`);
  process.stdout.write(`Schema: ${plan.responseSchemaHash}\n`);
  process.stdout.write(`Model: openai/${plan.model}\n`);
  process.stdout.write(`Task-matched positive control: ${plan.taskMatchedPositiveControl.planDigest} · 6/6 prior matched-pair separation\n`);
  process.stdout.write("Fresh units: 8 matched historical opportunities · 16 Pass-B judgments\n");
  process.stdout.write("Treatment: same history/age/horizon within pair; only whole-genome context differs\n");
  process.stdout.write("Counterbalance: 4 alpha-first / 4 beta-first · anchor recency balanced · horizons 4/6/8/10 each used twice\n");
  process.stdout.write("Resolution: behaviorally causal only at >=7/8 directional pair separation with <=1 reverse pair\n");
  process.stdout.write("Scientific retries: 0\n");
  process.stdout.write("Mechanical genome-copy retry: at most 1 per trial\n");
  process.stdout.write(`Maximum physical provider attempts if live: ${plan.maximumPhysicalProviderAttempts}\n`);
  process.stdout.write("Provider calls made: 0\n");
  process.stdout.write("A null or mixed result is retained. No genome wording, history, threshold or prompt is tuned after output.\n");
}

function printResult(result, replay = false) {
  process.stdout.write(`GENESIS GENOME MEMORY SEAM: ${replay ? "REPLAY EXACT" : result.score.classification}\n`);
  process.stdout.write(`Plan: ${result.plan.planDigest}\n`);
  for (const pair of result.score.pairDetails) {
    process.stdout.write(
      `${pair.pairId}: alpha=${pair.alphaSelection} · beta=${pair.betaSelection} · ${pair.directional ? "directional" : pair.reverse ? "reverse" : "not-separated"}\n`,
    );
  }
  process.stdout.write(`Directional genome-concordant pairs: ${result.score.directionalPairCount}/${result.score.pairCount}\n`);
  process.stdout.write(`Reverse pairs: ${result.score.reversePairCount}/${result.score.pairCount}\n`);
  process.stdout.write(`Pairs with different episodeRefs: ${result.score.citationDifferencePairCount}/${result.score.pairCount}\n`);
  process.stdout.write(`Standing classification: ${result.score.classification}\n`);
  process.stdout.write(`Durable model commits this invocation: ${result.execution.durableModelCommitsThisInvocation}\n`);
  process.stdout.write(`Durable model replays this invocation: ${result.execution.durableModelReplaysThisInvocation}\n`);
  process.stdout.write(`Physical provider attempts this invocation: ${result.execution.physicalProviderAttemptsThisInvocation}\n`);
}

export async function runGenomeMemorySeamCli(argv = process.argv.slice(2)) {
  const mode = parseMode(argv);
  const model = readArg(argv, "--model", GENOME_MEMORY_SEAM_DEFAULT_MODEL);
  const rootPath = resolve(readArg(argv, "--root", GENOME_MEMORY_SEAM_DEFAULT_ROOT));
  const plan = buildGenomeMemorySeamPlan({ model });
  const resultPath = resolve(rootPath, "result.json");

  if (mode === "preflight") {
    printPreflight(plan);
    return { mode, plan, providerCallsMade: 0 };
  }
  if (mode === "run" && !argv.includes("--authorize-provider-calls")) {
    throw new Error("live genome-memory-seam characterization requires --authorize-provider-calls");
  }
  if (mode === "run" && existsSync(resultPath)) throw new Error("genome-memory-seam result already exists; use --replay");
  if (mode === "replay" && !existsSync(resultPath)) throw new Error("genome-memory-seam replay requires completed result.json");

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
    throw new Error("genome-memory-seam replay does not match completed result");
  }
  printResult(result, true);
  process.stdout.write("Provider network access remained structurally disabled.\n");
  return result;
}

function isMain() {
  return process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

if (isMain()) {
  runGenomeMemorySeamCli().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

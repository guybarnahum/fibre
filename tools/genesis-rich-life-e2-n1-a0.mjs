#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import { normalizePassBModelOutput } from "../services/world-kernel/src/genesis-pass-b-domain.mjs";
import {
  passBCognitionInputDigest,
  projectPassBInputForCognition,
} from "../services/world-kernel/src/genesis-pass-b-cognition.mjs";
import {
  GENESIS_PASS_C_INPUT_VERSION,
  GENESIS_PASS_C_POLICY,
  normalizeInitialPassCModelOutput,
  normalizePassCInput,
} from "../services/world-kernel/src/genesis-pass-c-domain.mjs";
import {
  passCCognitionInputDigest,
  projectPassCInputForCognition,
} from "../services/world-kernel/src/genesis-pass-c-cognition.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import {
  E2_N1_HORIZONS,
  E2_N1_PASS_C_PROMPT,
  E2_N1_PASS_C_RESPONSE_SCHEMA,
  E2_N1_RATER_PROMPT,
  E2_N1_RATER_RESPONSE_SCHEMA,
  buildN1PassBInput,
  exactBinomialTailHalf,
  neutralizeN1Life,
} from "./genesis-rich-life-e2-n1.mjs";
import {
  E2_N1_BOUNDED_PASS_B_PROMPT,
  E2_N1_BOUNDED_PASS_B_RESPONSE_SCHEMA,
  E2_N1_PASS_B_FORM_PROFILE,
  E2_N1_PASS_B_MAX_MODEL_CHARACTERS,
} from "./genesis-rich-life-e2-n1-bounded-driver.mjs";
import { E2_N1_NOT_REMEMBERED_RESIDUE_POLICY } from "./genesis-rich-life-e2-n1-residue-driver.mjs";
import { E2_V1_WORLD_FIXTURE } from "./genesis-rich-life-e2-v1-world.mjs";

export const E2_N1_A0_EVIDENCE_VERSION = "pr39-slice-e2-n1-a0-v1";
export const E2_N1_A0_PROTOCOL_VERSION = "pr39-slice-e2-n1-a0-downstream-fertility-v1";
export const E2_N1_A0_ARM = "N1_A0_fresh_world_downstream_fertility_2afc";
export const E2_N1_A0_SOURCE_EVIDENCE_VERSION = "pr39-slice-e2-v1-fresh-world-v1";
export const E2_N1_A0_SOURCE_PROTOCOL_VERSION = "pr39-slice-e2-v1-fresh-world-protocol-v1";
export const E2_N1_A0_SOURCE_ARM = "A0_corrected_coupled_chooser_realizer";
export const E2_N1_A0_SOURCE_FILE = "artifacts/validation/m2-pr39/e2/fibre-m2-pr39-slice-e2-v1-fresh-world-v1.json";
export const E2_N1_A0_SOURCE_FILE_SHA256 = "e6f59d1e62e7856914598b8f10424f778bef0ed6256ad771385af67f2e4cc720";
export const E2_N1_A0_TRIAL_COUNT = 9;
export const E2_N1_A0_POSITIVE_THRESHOLD = 8;
export const E2_N1_A0_EXPECTED_THRESHOLD_TAIL = 0.01953125;
export const E2_N1_A0_CANDIDATE_ORDER_DOMAIN = "E2-N1-A0";

const PAIRS = Object.freeze([
  Object.freeze([0, 1]),
  Object.freeze([0, 2]),
  Object.freeze([1, 2]),
]);

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

function createAdapter({ provider, model, observer }) {
  if (provider === "openai") return createOpenAIModelAdapter({ modelId: model, observer });
  if (provider === "google") return createGoogleModelAdapter({ modelId: model, observer });
  throw new TypeError(`unsupported provider ${provider}`);
}

function sourceSide(pairOrdinal, repetitionOrdinal) {
  const oddOrientation = [null, "left", "right", "left"];
  const evenOrientation = [null, "right", "left", "right"];
  return (repetitionOrdinal % 2 === 1 ? oddOrientation : evenOrientation)[pairOrdinal];
}

function candidateASide(pairOrdinal, repetitionOrdinal) {
  const material = `${E2_N1_A0_CANDIDATE_ORDER_DOMAIN}|${pairOrdinal}|${repetitionOrdinal}|candidate-order`;
  const hashHex = sha256(material);
  return Number.parseInt(hashHex.slice(-1), 16) % 2 === 0 ? "left" : "right";
}

export function buildN1A0TrialPlan() {
  const trials = [];
  let trialOrdinal = 0;
  for (let pairIndex = 0; pairIndex < PAIRS.length; pairIndex += 1) {
    const pairOrdinal = pairIndex + 1;
    const [leftRunIndex, rightRunIndex] = PAIRS[pairIndex];
    for (let repetitionIndex = 0; repetitionIndex < E2_N1_HORIZONS.length; repetitionIndex += 1) {
      const repetitionOrdinal = repetitionIndex + 1;
      const horizon = E2_N1_HORIZONS[repetitionIndex];
      trialOrdinal += 1;
      const source = sourceSide(pairOrdinal, repetitionOrdinal);
      const candidateA = candidateASide(pairOrdinal, repetitionOrdinal);
      const truthCandidate = source === candidateA ? "A" : "B";
      trials.push(Object.freeze({
        trialOrdinal,
        worldId: E2_V1_WORLD_FIXTURE.id,
        pairOrdinal,
        repetitionOrdinal,
        horizon,
        leftRunOrdinal: leftRunIndex + 1,
        rightRunOrdinal: rightRunIndex + 1,
        sourceSide: source,
        candidateASide: candidateA,
        truthCandidate,
        assignmentDigest: digest({
          protocolVersion: E2_N1_A0_PROTOCOL_VERSION,
          pairOrdinal,
          repetitionOrdinal,
          horizon,
          source,
          candidateA,
        }),
      }));
    }
  }

  const sourceCounts = new Map();
  const truthCounts = { A: 0, B: 0 };
  const candidateSideCounts = { left: 0, right: 0 };
  for (const trial of trials) {
    const sourceRunOrdinal = trial.sourceSide === "left" ? trial.leftRunOrdinal : trial.rightRunOrdinal;
    sourceCounts.set(sourceRunOrdinal, (sourceCounts.get(sourceRunOrdinal) ?? 0) + 1);
    truthCounts[trial.truthCandidate] += 1;
    candidateSideCounts[trial.candidateASide] += 1;
  }
  if (trials.length !== E2_N1_A0_TRIAL_COUNT) throw new TypeError("N1-on-A0 frozen trial count changed");
  if (sourceCounts.size !== 3 || [...sourceCounts.values()].some((count) => count !== 3)) {
    throw new TypeError("N1-on-A0 source-life assignment is not three trials per life");
  }
  if (truthCounts.A !== 5 || truthCounts.B !== 4) throw new TypeError("N1-on-A0 truth labels are not frozen 5/4");
  if (candidateSideCounts.left !== 5 || candidateSideCounts.right !== 4) {
    throw new TypeError("N1-on-A0 candidate ordering is not frozen 5/4");
  }
  return Object.freeze(trials);
}

function validateSourceArtifact(sourceArtifact, sourceFileSha256) {
  if (sourceFileSha256 !== E2_N1_A0_SOURCE_FILE_SHA256) {
    throw new TypeError(`N1-on-A0 source byte SHA-256 mismatch: expected ${E2_N1_A0_SOURCE_FILE_SHA256}, got ${sourceFileSha256}`);
  }
  if (sourceArtifact === null || typeof sourceArtifact !== "object" || Array.isArray(sourceArtifact)) {
    throw new TypeError("N1-on-A0 source artifact must be an object");
  }
  if (sourceArtifact.evidenceVersion !== E2_N1_A0_SOURCE_EVIDENCE_VERSION) throw new TypeError("N1-on-A0 source evidence version mismatch");
  if (sourceArtifact.protocolVersion !== E2_N1_A0_SOURCE_PROTOCOL_VERSION) throw new TypeError("N1-on-A0 source protocol version mismatch");
  if (sourceArtifact.status !== "complete") throw new TypeError("N1-on-A0 requires a complete E2-V1 source artifact");
  if (sourceArtifact.developmentOnly !== true || sourceArtifact.burnedForFinalCohort !== true) {
    throw new TypeError("N1-on-A0 source artifact must remain development-burned");
  }
  if (sourceArtifact.preflight?.worldId !== E2_V1_WORLD_FIXTURE.id) throw new TypeError("N1-on-A0 source world mismatch");
  if (sourceArtifact.preflight?.worldSpecId !== E2_V1_WORLD_FIXTURE.worldSpec.worldSpecId) throw new TypeError("N1-on-A0 source WorldSpec mismatch");
  if (sourceArtifact.preflight?.worldSpecDigest !== digest(E2_V1_WORLD_FIXTURE.worldSpec)) throw new TypeError("N1-on-A0 source WorldSpec digest mismatch");
  if (sourceArtifact.arms?.A0?.arm !== E2_N1_A0_SOURCE_ARM) throw new TypeError("N1-on-A0 source A0 arm mismatch");
  const lives = sourceArtifact.arms?.A0?.lives;
  if (!Array.isArray(lives) || lives.length !== 3) throw new TypeError("N1-on-A0 source must contain exactly three A0 lives");
  for (let index = 0; index < lives.length; index += 1) {
    const life = lives[index];
    if (life.worldId !== E2_V1_WORLD_FIXTURE.id || life.worldSpecId !== E2_V1_WORLD_FIXTURE.worldSpec.worldSpecId) {
      throw new TypeError("N1-on-A0 A0 life world mismatch");
    }
    if (life.runOrdinal !== index + 1) throw new TypeError("N1-on-A0 A0 run ordinals changed");
    if (!Array.isArray(life.episodes) || life.episodes.length !== 10) throw new TypeError("N1-on-A0 source life must contain ten episodes");
  }
  return lives;
}

function sourceWitness(sourceArtifact, sourceFileSha256) {
  return Object.freeze({
    file: E2_N1_A0_SOURCE_FILE,
    fileSha256: sourceFileSha256,
    canonicalArtifactDigest: digest(sourceArtifact),
    evidenceVersion: sourceArtifact.evidenceVersion,
    protocolVersion: sourceArtifact.protocolVersion,
    generatedAt: sourceArtifact.generatedAt ?? null,
    sourceArm: E2_N1_A0_SOURCE_ARM,
    worldId: E2_V1_WORLD_FIXTURE.id,
    lifeCount: 3,
  });
}

function assignmentSummary(plan) {
  const sourceUses = { 1: 0, 2: 0, 3: 0 };
  const truthLabels = { A: 0, B: 0 };
  const candidateASides = { left: 0, right: 0 };
  for (const trial of plan) {
    const sourceRun = trial.sourceSide === "left" ? trial.leftRunOrdinal : trial.rightRunOrdinal;
    sourceUses[sourceRun] += 1;
    truthLabels[trial.truthCandidate] += 1;
    candidateASides[trial.candidateASide] += 1;
  }
  return Object.freeze({ sourceUses, truthLabels, candidateASides });
}

export function buildN1A0Preflight({ sourceArtifact, sourceFileSha256 }) {
  validateSourceArtifact(sourceArtifact, sourceFileSha256);
  const plan = buildN1A0TrialPlan();
  const thresholdTail = exactBinomialTailHalf(E2_N1_A0_TRIAL_COUNT, E2_N1_A0_POSITIVE_THRESHOLD);
  if (thresholdTail !== E2_N1_A0_EXPECTED_THRESHOLD_TAIL) throw new TypeError("N1-on-A0 threshold tail changed");
  const sevenOfNineTail = exactBinomialTailHalf(E2_N1_A0_TRIAL_COUNT, 7);
  const witness = {
    protocolVersion: E2_N1_A0_PROTOCOL_VERSION,
    evidenceVersion: E2_N1_A0_EVIDENCE_VERSION,
    purpose: "Gate-F alignment of downstream-fertility evidence with corrected A0 shipping generator candidate",
    source: sourceWitness(sourceArtifact, sourceFileSha256),
    sourceLivesRegenerated: false,
    sourceWorldAlreadyBurned: true,
    horizons: [...E2_N1_HORIZONS],
    trialCount: E2_N1_A0_TRIAL_COUNT,
    positiveThreshold: E2_N1_A0_POSITIVE_THRESHOLD,
    thresholdChanceTail: thresholdTail,
    sevenOfNineChanceTail: sevenOfNineTail,
    scoring: {
      rawForcedChoiceReported: true,
      conservativeFertilityIsGateScore: true,
      notRememberedReceivesPositiveCredit: false,
      criterion: "remembered_and_rater_correct >= 8/9",
    },
    assignment: {
      pairs: PAIRS.map(([left, right]) => [left + 1, right + 1]),
      candidateOrderDomain: E2_N1_A0_CANDIDATE_ORDER_DOMAIN,
      ...assignmentSummary(plan),
    },
    cognition: {
      passBBoundary: "life_only_unexposed",
      passCMode: "initial",
      candidateIdentifierNeutralization: true,
      richStructureMetadataVisibleToPassB: false,
      genomeVisibleToPassB: false,
      historyVisibleToPassC: false,
      genomeVisibleToPassC: false,
      sourceArmLabelVisibleToCognition: false,
    },
    passBForm: {
      profile: E2_N1_PASS_B_FORM_PROFILE,
      maxModelCharacters: E2_N1_PASS_B_MAX_MODEL_CHARACTERS,
      promptHash: digest(E2_N1_BOUNDED_PASS_B_PROMPT),
      responseSchemaHash: digest(E2_N1_BOUNDED_PASS_B_RESPONSE_SCHEMA),
      notRememberedResiduePolicy: E2_N1_NOT_REMEMBERED_RESIDUE_POLICY,
      residuePolicyFrozenBeforeFirstScore: true,
    },
    passC: {
      promptHash: digest(E2_N1_PASS_C_PROMPT),
      responseSchemaHash: digest(E2_N1_PASS_C_RESPONSE_SCHEMA),
    },
    rater: {
      promptHash: digest(E2_N1_RATER_PROMPT),
      responseSchemaHash: digest(E2_N1_RATER_RESPONSE_SCHEMA),
    },
    plan: plan.map((trial) => structuredClone(trial)),
    noRerunOnScore: true,
    admissionVerdict: null,
  };
  return Object.freeze({ ...witness, preflightDigest: digest(witness) });
}

function lifeFor(sourceArtifact, runOrdinal) {
  const life = sourceArtifact.arms.A0.lives.find((candidate) => candidate.runOrdinal === runOrdinal);
  if (life === undefined) throw new TypeError(`N1-on-A0 source life missing run ${runOrdinal}`);
  return life;
}

function candidateHistoryForRater(neutralized) {
  const descriptions = new Map(neutralized.world.places.map((place) => [place.placeId, place.description]));
  return neutralized.history.map((episode, index) => ({
    ordinal: index + 1,
    ageAtEvent: episode.ageAtEvent,
    placeLabel: episode.placeRef,
    placeDescription: descriptions.get(episode.placeRef),
    observableAction: episode.observableAction,
  }));
}

function episodeOrdinal(ref, horizon) {
  const match = /^n1_ep_(\d{2})$/.exec(ref);
  if (match === null) throw new TypeError(`N1-on-A0 memory returned non-neutral episode ref ${ref}`);
  const ordinal = Number(match[1]);
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > horizon) throw new TypeError(`N1-on-A0 memory episode ref ${ref} exceeds horizon`);
  return ordinal;
}

function memoryForRater(passBOutput, horizon) {
  return {
    outcome: passBOutput.outcome,
    episodeOrdinals: passBOutput.episodeRefs.map((ref) => episodeOrdinal(ref, horizon)),
    rememberedContent: passBOutput.rememberedContent,
    uncertainty: [...passBOutput.uncertainty],
  };
}

function meaningForRater(passCOutput) {
  if (passCOutput === null) return { outcome: null, summary: null, parts: [] };
  return {
    outcome: passCOutput.outcome,
    summary: passCOutput.summary,
    parts: passCOutput.parts.map((part) => part.meaning),
  };
}

function passCInputFromMemory({ trialOrdinal, passBOutput, sourceNeutral }) {
  if (passBOutput.outcome !== "remembered") return null;
  return normalizePassCInput({
    inputVersion: GENESIS_PASS_C_INPUT_VERSION,
    mode: "initial",
    targetMemory: {
      memoryRef: `memory_n1_a0_trial_${pad(trialOrdinal, 3)}`,
      episodeRefs: [...passBOutput.episodeRefs],
      rememberedContent: passBOutput.rememberedContent,
      uncertainty: [...passBOutput.uncertainty],
    },
    formation: {
      asOf: sourceNeutral.rememberingAt,
      ageAtFormation: sourceNeutral.ageAtRemembering,
      chronologyIndex: sourceNeutral.horizon,
    },
    priorMeaning: null,
    trigger: null,
    policyWitness: { policyVersion: GENESIS_PASS_C_POLICY.version },
  });
}

function normalizeRaterOutput(candidate, horizon) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) throw new TypeError("N1-on-A0 rater output must be an object");
  const keys = Object.keys(candidate).sort();
  if (canonicalJson(keys) !== canonicalJson(["chosenCandidate", "evidenceEpisodeOrdinals", "rationale"].sort())) throw new TypeError("N1-on-A0 rater output has unexpected keys");
  if (!["A", "B"].includes(candidate.chosenCandidate)) throw new TypeError("N1-on-A0 rater chosenCandidate must be A or B");
  if (!Array.isArray(candidate.evidenceEpisodeOrdinals) || candidate.evidenceEpisodeOrdinals.length === 0) throw new TypeError("N1-on-A0 rater must cite at least one episode ordinal");
  const ordinals = [...new Set(candidate.evidenceEpisodeOrdinals)];
  for (const ordinal of ordinals) {
    if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > horizon) throw new TypeError("N1-on-A0 rater evidence ordinal exceeds visible horizon");
  }
  if (typeof candidate.rationale !== "string" || candidate.rationale.trim() === "") throw new TypeError("N1-on-A0 rater rationale is required");
  return {
    chosenCandidate: candidate.chosenCandidate,
    evidenceEpisodeOrdinals: ordinals,
    rationale: candidate.rationale.trim(),
  };
}

function buildRaterInput({ passBOutput, passCOutput, candidateA, candidateB, horizon }) {
  return {
    protocolVersion: E2_N1_A0_PROTOCOL_VERSION,
    rememberingHorizonEpisodeCount: horizon,
    memory: memoryForRater(passBOutput, horizon),
    meaning: meaningForRater(passCOutput),
    candidates: [
      { label: "A", history: candidateHistoryForRater(candidateA) },
      { label: "B", history: candidateHistoryForRater(candidateB) },
    ],
  };
}

function isNotRememberedResidue(raw) {
  return raw?.outcome === "not_remembered"
    && Array.isArray(raw.episodeRefs)
    && raw.episodeRefs.length === 0
    && raw.rememberedContent === null
    && Array.isArray(raw.uncertainty)
    && raw.uncertainty.length > 0;
}

function normalizePassBWithKnownResidue(raw, passBInput) {
  try {
    return Object.freeze({ output: normalizePassBModelOutput(raw, passBInput), canonicalization: null });
  } catch (error) {
    if (!isNotRememberedResidue(raw)) throw error;
    const canonicalRaw = {
      outcome: "not_remembered",
      episodeRefs: [],
      rememberedContent: null,
      uncertainty: [],
    };
    const output = normalizePassBModelOutput(canonicalRaw, passBInput);
    return Object.freeze({
      output,
      canonicalization: Object.freeze({
        policy: E2_N1_NOT_REMEMBERED_RESIDUE_POLICY,
        providerRawOutputDigest: digest(raw),
        canonicalOutputDigest: digest(canonicalRaw),
        providerRawOutput: structuredClone(raw),
        canonicalOutput: structuredClone(canonicalRaw),
        modelCallUsed: false,
        semanticDecisionChanged: false,
      }),
    });
  }
}

function scoreTrials(trials) {
  const rawCorrect = trials.filter((trial) => trial.correct).length;
  const rememberedTrials = trials.filter((trial) => trial.passB.output.outcome === "remembered");
  const conservativeCorrect = rememberedTrials.filter((trial) => trial.correct).length;
  return Object.freeze({
    n: trials.length,
    rawForcedChoice: Object.freeze({
      correct: rawCorrect,
      incorrect: trials.length - rawCorrect,
      accuracy: trials.length === 0 ? null : rawCorrect / trials.length,
      exactBinomialChanceTail: exactBinomialTailHalf(trials.length, rawCorrect),
    }),
    conservativeFertility: Object.freeze({
      correct: conservativeCorrect,
      incorrectOrNoMemory: trials.length - conservativeCorrect,
      rememberedTrials: rememberedTrials.length,
      notRememberedTrials: trials.length - rememberedTrials.length,
      accuracyAgainstAllTrials: trials.length === 0 ? null : conservativeCorrect / trials.length,
      positiveThreshold: E2_N1_A0_POSITIVE_THRESHOLD,
      thresholdMet: conservativeCorrect >= E2_N1_A0_POSITIVE_THRESHOLD,
      frozenThresholdChanceTail: E2_N1_A0_EXPECTED_THRESHOLD_TAIL,
      rule: "credit only trials with actual remembered memory and correct blind source attribution",
    }),
    calibrationNote: "Development diagnostic only; nine trials share one world and three source lives and are not claimed as independent population samples.",
  });
}

function completedTrialKeys(trials) {
  return new Set(trials.map((trial) => trial.trialOrdinal));
}

function validateResumeArtifact(resumeArtifact, { provider, model, sourceArtifact, sourceFileSha256, preflight }) {
  if (resumeArtifact === null) return;
  if (!["running", "failed"].includes(resumeArtifact.status)) throw new TypeError("N1-on-A0 resume requires running or failed checkpoint evidence");
  if (resumeArtifact.evidenceVersion !== E2_N1_A0_EVIDENCE_VERSION || resumeArtifact.protocolVersion !== E2_N1_A0_PROTOCOL_VERSION) throw new TypeError("N1-on-A0 resume protocol/evidence mismatch");
  if (resumeArtifact.arm !== E2_N1_A0_ARM) throw new TypeError("N1-on-A0 resume arm mismatch");
  if (resumeArtifact.provider !== provider || resumeArtifact.model !== model) throw new TypeError("N1-on-A0 resume provider/model mismatch");
  if (resumeArtifact.source?.fileSha256 !== sourceFileSha256 || resumeArtifact.source?.canonicalArtifactDigest !== digest(sourceArtifact)) throw new TypeError("N1-on-A0 resume source mismatch");
  if (resumeArtifact.preflight?.preflightDigest !== preflight.preflightDigest) throw new TypeError("N1-on-A0 resume preflight mismatch");
  if (!Array.isArray(resumeArtifact.completedTrials)) throw new TypeError("N1-on-A0 resume lacks completed trials");
  const plan = buildN1A0TrialPlan();
  const byOrdinal = new Map(plan.map((trial) => [trial.trialOrdinal, trial]));
  for (const completed of resumeArtifact.completedTrials) {
    const frozen = byOrdinal.get(completed.trialOrdinal);
    if (frozen === undefined || completed.assignmentDigest !== frozen.assignmentDigest) throw new TypeError("N1-on-A0 resume completed assignment mismatch");
  }
  if (resumeArtifact.inFlight !== null) {
    const frozen = byOrdinal.get(resumeArtifact.inFlight.trialOrdinal);
    if (frozen === undefined || resumeArtifact.inFlight.assignmentDigest !== frozen.assignmentDigest) throw new TypeError("N1-on-A0 resume in-flight assignment mismatch");
  }
}

function artifactSnapshot({ status, provider, model, sourceArtifact, sourceFileSha256, preflight, completedTrials, inFlight, modelEvents, error = null, resumedFrom = null }) {
  return {
    evidenceVersion: E2_N1_A0_EVIDENCE_VERSION,
    protocolVersion: E2_N1_A0_PROTOCOL_VERSION,
    status,
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    arm: E2_N1_A0_ARM,
    provider,
    model,
    source: sourceWitness(sourceArtifact, sourceFileSha256),
    preflight: structuredClone(preflight),
    resumedFrom,
    completedTrials: structuredClone(completedTrials),
    inFlight: inFlight === null ? null : structuredClone(inFlight),
    score: status === "complete" ? scoreTrials(completedTrials) : null,
    modelEvents: structuredClone(modelEvents),
    failure: error === null ? null : {
      name: error?.name ?? null,
      code: error?.code ?? null,
      gate: error?.gate ?? null,
      message: error?.message ?? String(error),
    },
    admissionVerdict: null,
  };
}

async function runOneTrial({ trial, sourceArtifact, adapter, priorInFlight, checkpoint, onProgress }) {
  const leftLife = lifeFor(sourceArtifact, trial.leftRunOrdinal);
  const rightLife = lifeFor(sourceArtifact, trial.rightRunOrdinal);
  const leftNeutral = neutralizeN1Life({ worldFixture: E2_V1_WORLD_FIXTURE, life: leftLife, horizon: trial.horizon });
  const rightNeutral = neutralizeN1Life({ worldFixture: E2_V1_WORLD_FIXTURE, life: rightLife, horizon: trial.horizon });
  const sourceLife = trial.sourceSide === "left" ? leftLife : rightLife;
  const sourceNeutral = trial.sourceSide === "left" ? leftNeutral : rightNeutral;
  const candidateA = trial.candidateASide === "left" ? leftNeutral : rightNeutral;
  const candidateB = trial.candidateASide === "left" ? rightNeutral : leftNeutral;

  let state = priorInFlight === null ? {
    trialOrdinal: trial.trialOrdinal,
    assignmentDigest: trial.assignmentDigest,
    passBRaw: null,
    passCRaw: null,
    passCSkipped: false,
    raterRaw: null,
  } : structuredClone(priorInFlight);
  await checkpoint(state);
  if (typeof onProgress === "function") onProgress({ type: "trial_start", trial, sourceSeed: sourceLife.seed });

  const passBInput = buildN1PassBInput(sourceNeutral);
  const passBCognition = projectPassBInputForCognition(passBInput);
  if (state.passBRaw === null) {
    const result = await adapter.invoke({
      systemPrompt: E2_N1_BOUNDED_PASS_B_PROMPT,
      input: passBCognition,
      responseSchema: E2_N1_BOUNDED_PASS_B_RESPONSE_SCHEMA,
      clientRequestId: `slice-e2-n1-a0:trial-${pad(trial.trialOrdinal, 3)}:pass-b`,
    });
    state.passBRaw = { output: structuredClone(result.output), provenance: structuredClone(result.provenance) };
    await checkpoint(state);
  }
  const normalizedPassB = normalizePassBWithKnownResidue(state.passBRaw.output, passBInput);
  const passBOutput = normalizedPassB.output;

  let passCInput = null;
  let passCCognition = null;
  let passCOutput = null;
  if (passBOutput.outcome === "remembered") {
    passCInput = passCInputFromMemory({ trialOrdinal: trial.trialOrdinal, passBOutput, sourceNeutral });
    passCCognition = projectPassCInputForCognition(passCInput);
    if (state.passCRaw === null) {
      const result = await adapter.invoke({
        systemPrompt: E2_N1_PASS_C_PROMPT,
        input: passCCognition,
        responseSchema: E2_N1_PASS_C_RESPONSE_SCHEMA,
        clientRequestId: `slice-e2-n1-a0:trial-${pad(trial.trialOrdinal, 3)}:pass-c`,
      });
      state.passCRaw = { output: structuredClone(result.output), provenance: structuredClone(result.provenance) };
      await checkpoint(state);
    }
    passCOutput = normalizeInitialPassCModelOutput(state.passCRaw.output, passCInput);
  } else {
    state.passCSkipped = true;
    state.passCRaw = null;
    await checkpoint(state);
  }

  const raterInput = buildRaterInput({ passBOutput, passCOutput, candidateA, candidateB, horizon: trial.horizon });
  if (state.raterRaw === null) {
    const result = await adapter.invoke({
      systemPrompt: E2_N1_RATER_PROMPT,
      input: raterInput,
      responseSchema: E2_N1_RATER_RESPONSE_SCHEMA,
      clientRequestId: `slice-e2-n1-a0:trial-${pad(trial.trialOrdinal, 3)}:rater`,
    });
    state.raterRaw = { output: structuredClone(result.output), provenance: structuredClone(result.provenance) };
    await checkpoint(state);
  }
  const raterOutput = normalizeRaterOutput(state.raterRaw.output, trial.horizon);
  const correct = raterOutput.chosenCandidate === trial.truthCandidate;

  if (typeof onProgress === "function") onProgress({
    type: "trial_complete",
    trial,
    memoryOutcome: passBOutput.outcome,
    meaningOutcome: passCOutput?.outcome ?? null,
    chosenCandidate: raterOutput.chosenCandidate,
    correct,
    conservativeCredit: passBOutput.outcome === "remembered" && correct,
  });

  return {
    trialOrdinal: trial.trialOrdinal,
    worldId: trial.worldId,
    pairOrdinal: trial.pairOrdinal,
    repetitionOrdinal: trial.repetitionOrdinal,
    horizon: trial.horizon,
    pairSeeds: [leftLife.seed, rightLife.seed],
    sourceSeed: sourceLife.seed,
    sourceRunOrdinal: sourceLife.runOrdinal,
    sourceSide: trial.sourceSide,
    candidateASide: trial.candidateASide,
    truthCandidate: trial.truthCandidate,
    assignmentDigest: trial.assignmentDigest,
    neutralization: {
      leftDigest: leftNeutral.neutralizationDigest,
      rightDigest: rightNeutral.neutralizationDigest,
      sourceDigest: sourceNeutral.neutralizationDigest,
    },
    passB: {
      canonicalInputDigest: digest(passBInput),
      cognitionInputDigest: passBCognitionInputDigest(passBInput),
      rawOutputDigest: digest(state.passBRaw.output),
      output: structuredClone(passBOutput),
      provenance: structuredClone(state.passBRaw.provenance),
      formCanonicalization: normalizedPassB.canonicalization === null ? null : structuredClone(normalizedPassB.canonicalization),
    },
    passC: passCOutput === null ? null : {
      canonicalInputDigest: digest(passCInput),
      cognitionInputDigest: passCCognitionInputDigest(passCInput),
      rawOutputDigest: digest(state.passCRaw.output),
      output: structuredClone(passCOutput),
      provenance: structuredClone(state.passCRaw.provenance),
    },
    rater: {
      inputDigest: digest(raterInput),
      rawOutputDigest: digest(state.raterRaw.output),
      output: structuredClone(raterOutput),
      provenance: structuredClone(state.raterRaw.provenance),
    },
    correct,
    conservativeCredit: passBOutput.outcome === "remembered" && correct,
  };
}

export async function runN1A0({
  provider,
  model,
  sourceArtifact,
  sourceFileSha256,
  resumeArtifact = null,
  adapterOverride = null,
  onCheckpoint = null,
  onProgress = null,
} = {}) {
  if (!["openai", "google"].includes(provider) && adapterOverride === null) throw new TypeError("provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new TypeError("model is required");
  const preflight = buildN1A0Preflight({ sourceArtifact, sourceFileSha256 });
  validateResumeArtifact(resumeArtifact, { provider, model, sourceArtifact, sourceFileSha256, preflight });
  const plan = buildN1A0TrialPlan();
  const completedTrials = structuredClone(resumeArtifact?.completedTrials ?? []);
  let inFlight = resumeArtifact?.inFlight === null || resumeArtifact?.inFlight === undefined ? null : structuredClone(resumeArtifact.inFlight);
  const modelEvents = structuredClone(resumeArtifact?.modelEvents ?? []);
  const adapter = adapterOverride ?? createAdapter({ provider, model, observer: (event) => modelEvents.push(event) });
  const resumedFrom = resumeArtifact === null ? null : {
    sourceGeneratedAt: resumeArtifact.generatedAt ?? null,
    sourceArtifactDigest: digest(resumeArtifact),
    reusedCompletedTrials: completedTrials.length,
    reusedInFlightTrial: inFlight?.trialOrdinal ?? null,
  };

  const emit = async (status, error = null) => {
    const snapshot = artifactSnapshot({
      status, provider, model, sourceArtifact, sourceFileSha256, preflight,
      completedTrials, inFlight, modelEvents, error, resumedFrom,
    });
    if (typeof onCheckpoint === "function") await onCheckpoint(snapshot);
    return snapshot;
  };

  await emit("running");
  try {
    const done = completedTrialKeys(completedTrials);
    for (const trial of plan) {
      if (done.has(trial.trialOrdinal)) continue;
      if (inFlight !== null && inFlight.trialOrdinal !== trial.trialOrdinal) throw new TypeError("N1-on-A0 resume in-flight trial is not the next incomplete trial");
      const completed = await runOneTrial({
        trial,
        sourceArtifact,
        adapter,
        priorInFlight: inFlight,
        checkpoint: async (state) => {
          inFlight = structuredClone(state);
          await emit("running");
        },
        onProgress,
      });
      completedTrials.push(completed);
      done.add(trial.trialOrdinal);
      inFlight = null;
      await emit("running");
    }
    return await emit("complete");
  } catch (error) {
    error.e2N1A0FailureArtifact = await emit("failed", error);
    throw error;
  }
}

function progressPrinter(event) {
  const trial = event.trial;
  const prefix = `[N1-A0 ${pad(trial.trialOrdinal, 2)}/${E2_N1_A0_TRIAL_COUNT} pair${trial.pairOrdinal} h${trial.horizon}]`;
  if (event.type === "trial_start") process.stderr.write(`${prefix} B/C/rater ... `);
  else if (event.type === "trial_complete") {
    process.stderr.write(`${event.memoryOutcome} · meaning=${event.meaningOutcome ?? "n/a"} · chose=${event.chosenCandidate} ${event.correct ? "✓" : "✗"} · conservative=${event.conservativeCredit ? "credit" : "no-credit"}\n`);
  }
}

function printSummary(result) {
  const raw = result.score.rawForcedChoice;
  const conservative = result.score.conservativeFertility;
  process.stdout.write(`N1-A0 raw: ${raw.correct}/${result.score.n} · p_tail=${raw.exactBinomialChanceTail}\n`);
  process.stdout.write(`N1-A0 conservative: ${conservative.correct}/${result.score.n} · remembered=${conservative.rememberedTrials} · threshold=${conservative.positiveThreshold} · met=${conservative.thresholdMet ? "YES" : "NO"}\n`);
}

function readSource(sourcePath) {
  if (!existsSync(sourcePath)) throw new Error(`source artifact does not exist: ${sourcePath}`);
  const sourceText = readFileSync(sourcePath, "utf8");
  return {
    sourceText,
    sourceFileSha256: sha256(sourceText),
    sourceArtifact: JSON.parse(sourceText),
  };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage:\n  npm run genesis:e2-n1-a0 -- --preflight [--source <e2-v1.json>] [--out <preflight.json>]\n  npm run genesis:e2-n1-a0 -- --provider <openai|google> --model <model> [--source <e2-v1.json>] --out <n1-a0.json> [--resume <checkpoint.json>]\n");
    return;
  }

  const sourcePath = readArg(argv, "--source", E2_N1_A0_SOURCE_FILE);
  const outputPath = readArg(argv, "--out");
  const { sourceArtifact, sourceFileSha256 } = readSource(sourcePath);

  if (argv.includes("--preflight")) {
    const preflight = buildN1A0Preflight({ sourceArtifact, sourceFileSha256 });
    const text = `${JSON.stringify(preflight, null, 2)}\n`;
    if (outputPath !== null) writeFileSync(outputPath, text, "utf8");
    else process.stdout.write(text);
    return;
  }

  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const resumePath = readArg(argv, "--resume");
  if (!["openai", "google"].includes(provider)) throw new Error("--provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new Error("--model is required");
  if (typeof outputPath !== "string" || outputPath.trim() === "") throw new Error("--out is required for checkpoint-safe N1-on-A0 execution");
  if (resumePath !== null && !existsSync(resumePath)) throw new Error(`resume artifact does not exist: ${resumePath}`);
  if (existsSync(outputPath) && resumePath === null) throw new Error(`output exists: ${outputPath}; completed/started N1-on-A0 evidence must not be overwritten`);

  const resumeArtifact = resumePath === null ? null : JSON.parse(readFileSync(resumePath, "utf8"));
  const writeCheckpoint = async (artifact) => writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stderr.write(`E2 N1-on-A0: START · ${E2_N1_A0_TRIAL_COUNT} trials · threshold=${E2_N1_A0_POSITIVE_THRESHOLD}/${E2_N1_A0_TRIAL_COUNT} conservative · form=${E2_N1_PASS_B_FORM_PROFILE} · source=${sourcePath}${resumePath === null ? "" : ` · resume=${resumePath}`}\n`);
  try {
    const result = await runN1A0({
      provider,
      model,
      sourceArtifact,
      sourceFileSha256,
      resumeArtifact,
      onCheckpoint: writeCheckpoint,
      onProgress: progressPrinter,
    });
    printSummary(result);
    process.stdout.write(`Artifact: ${outputPath}\n`);
  } catch (error) {
    process.stderr.write(`Failure artifact: ${outputPath}\n`);
    throw error;
  }
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`E2 N1-on-A0: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

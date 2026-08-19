#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import { normalizePassBModelOutput } from "../services/world-kernel/src/genesis-pass-b-domain.mjs";
import { passBCognitionInputDigest, projectPassBInputForCognition } from "../services/world-kernel/src/genesis-pass-b-cognition.mjs";
import {
  GENESIS_PASS_C_INPUT_VERSION,
  GENESIS_PASS_C_POLICY,
  normalizeInitialPassCModelOutput,
  normalizePassCInput,
} from "../services/world-kernel/src/genesis-pass-c-domain.mjs";
import { passCCognitionInputDigest, projectPassCInputForCognition } from "../services/world-kernel/src/genesis-pass-c-cognition.mjs";
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
  E2_N1_BOUNDED_PASS_B_RESPONSE_SCHEMA,
  E2_N1_PASS_B_MAX_MODEL_CHARACTERS,
} from "./genesis-rich-life-e2-n1-bounded-driver.mjs";
import { E2_N1_NOT_REMEMBERED_RESIDUE_POLICY } from "./genesis-rich-life-e2-n1-residue-driver.mjs";
import { E2_V1_WORLD_FIXTURE } from "./genesis-rich-life-e2-v1-world.mjs";
import {
  E2_V2_A0_ARM,
  E2_V2_A0_EVIDENCE_VERSION,
  E2_V2_A0_PROTOCOL_VERSION,
} from "./genesis-rich-life-e2-v2-a0.mjs";
import { E2_V2_WORLD_FIXTURE } from "./genesis-rich-life-e2-v2-world.mjs";

export const E2_N2_EVIDENCE_VERSION = "pr39-slice-e2-n2-v1";
export const E2_N2_PROTOCOL_VERSION = "pr39-slice-e2-n2-memory-formation-v1";
export const E2_N2_ARM = "N2_A0_constitutive_memory_downstream_fertility_2afc";
export const E2_N2_TRIAL_COUNT = 18;
export const E2_N2_MIN_REMEMBERED = 10;
export const E2_N2_SOURCE_V1_FILE = "artifacts/validation/m2-pr39/e2/fibre-m2-pr39-slice-e2-v1-fresh-world-v1.json";
export const E2_N2_SOURCE_V1_FILE_SHA256 = "e6f59d1e62e7856914598b8f10424f778bef0ed6256ad771385af67f2e4cc720";
export const E2_N2_SOURCE_V2_FILE = "artifacts/validation/m2-pr39/e2/fibre-m2-pr39-slice-e2-v2-a0-v1.json";
export const E2_N2_PASS_B_FORM_PROFILE = "n2-pass-b-constitutive-bounded-output-v1";
export const E2_N2_CANDIDATE_ORDER_DOMAIN = "E2-N2";

export const E2_N2_PASS_B_PROMPT = `You are Fibre Genesis Pass B in a development-only clean-control execution.
Form the autobiographical memory this Thread retains from the supplied visible history at rememberingAt, if any.
This is a constitutive memory-formation task, not a request to detect or prove that a memory already exists elsewhere.
priorMemories may be empty; that is normal for initial formation and is not evidence that nothing is retained.
Use only the supplied Pass-B cognition input. There is no genome exposure.
If one or more concrete experiences are retained autobiographically, cite only visible episode IDs and write rememberedContent as the memory itself, with uncertainty where appropriate.
If nothing from the visible history is retained autobiographically at this formation moment, return outcome=not_remembered with episodeRefs=[], rememberedContent=null, uncertainty=[]. not_remembered is fully legal; do not force a memory.
Do not write durable meaning, significance, personality, lessons, future policy, or a summary of the whole life.
Mechanical form constraint: when outcome=remembered, rememberedContent MUST be at most ${E2_N1_PASS_B_MAX_MODEL_CHARACTERS} characters total.
Return JSON matching the supplied schema.`;

export const E2_N2_PASS_B_RESPONSE_SCHEMA = E2_N1_BOUNDED_PASS_B_RESPONSE_SCHEMA;

const PAIRS = Object.freeze([
  Object.freeze([0, 1]),
  Object.freeze([0, 2]),
  Object.freeze([1, 2]),
]);

const WORLD_TRUTH_PATTERNS = Object.freeze({
  "E2-V1": Object.freeze(["A", "B", "B", "A", "B", "B", "A", "A", "A"]),
  "E2-V2": Object.freeze(["B", "A", "A", "B", "A", "A", "B", "B", "B"]),
});

export const E2_N2_ATTRIBUTION_THRESHOLDS = Object.freeze({
  10: 9,
  11: 9,
  12: 10,
  13: 10,
  14: 11,
  15: 12,
  16: 12,
  17: 13,
  18: 13,
});

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

function opposite(side) {
  return side === "left" ? "right" : "left";
}

export function buildN2TrialPlan() {
  const worlds = [E2_V1_WORLD_FIXTURE, E2_V2_WORLD_FIXTURE];
  const trials = [];
  let trialOrdinal = 0;
  for (let worldIndex = 0; worldIndex < worlds.length; worldIndex += 1) {
    const worldFixture = worlds[worldIndex];
    const truthPattern = WORLD_TRUTH_PATTERNS[worldFixture.id];
    let worldTrialIndex = 0;
    for (let pairIndex = 0; pairIndex < PAIRS.length; pairIndex += 1) {
      const pairOrdinal = pairIndex + 1;
      const [leftRunIndex, rightRunIndex] = PAIRS[pairIndex];
      for (let repetitionIndex = 0; repetitionIndex < E2_N1_HORIZONS.length; repetitionIndex += 1) {
        const repetitionOrdinal = repetitionIndex + 1;
        const horizon = E2_N1_HORIZONS[repetitionIndex];
        const source = sourceSide(pairOrdinal, repetitionOrdinal);
        const truthCandidate = truthPattern[worldTrialIndex];
        const candidateA = truthCandidate === "A" ? source : opposite(source);
        trialOrdinal += 1;
        worldTrialIndex += 1;
        trials.push(Object.freeze({
          trialOrdinal,
          worldId: worldFixture.id,
          worldOrdinal: worldIndex + 1,
          pairOrdinal,
          repetitionOrdinal,
          horizon,
          leftRunOrdinal: leftRunIndex + 1,
          rightRunOrdinal: rightRunIndex + 1,
          sourceSide: source,
          candidateASide: candidateA,
          truthCandidate,
          assignmentDigest: digest({
            protocolVersion: E2_N2_PROTOCOL_VERSION,
            candidateOrderDomain: E2_N2_CANDIDATE_ORDER_DOMAIN,
            worldId: worldFixture.id,
            pairOrdinal,
            repetitionOrdinal,
            horizon,
            source,
            candidateA,
            truthCandidate,
          }),
        }));
      }
    }
  }

  const sourceCounts = new Map();
  const truthCounts = { A: 0, B: 0 };
  const candidateSideCounts = { left: 0, right: 0 };
  for (const trial of trials) {
    const sourceRun = trial.sourceSide === "left" ? trial.leftRunOrdinal : trial.rightRunOrdinal;
    const key = `${trial.worldId}:${sourceRun}`;
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
    truthCounts[trial.truthCandidate] += 1;
    candidateSideCounts[trial.candidateASide] += 1;
  }
  if (trials.length !== E2_N2_TRIAL_COUNT) throw new TypeError("N2 frozen trial count changed");
  if (sourceCounts.size !== 6 || [...sourceCounts.values()].some((count) => count !== 3)) throw new TypeError("N2 source-life assignment is not three trials per life");
  if (truthCounts.A !== 9 || truthCounts.B !== 9) throw new TypeError("N2 truth labels are not balanced 9/9");
  if (candidateSideCounts.left !== 9 || candidateSideCounts.right !== 9) throw new TypeError("N2 candidate ordering is not balanced 9/9");
  return Object.freeze(trials);
}

function validateThresholdTable() {
  for (const [mText, threshold] of Object.entries(E2_N2_ATTRIBUTION_THRESHOLDS)) {
    const m = Number(mText);
    const tail = exactBinomialTailHalf(m, threshold);
    if (tail > 0.05) throw new TypeError(`N2 attribution threshold for m=${m} exceeds alpha`);
    if (threshold > 0 && exactBinomialTailHalf(m, threshold - 1) <= 0.05) throw new TypeError(`N2 attribution threshold for m=${m} is not minimal`);
  }
}

function sourceV1Lives(sourceArtifact) {
  return sourceArtifact?.arms?.A0?.lives;
}

function sourceV2Lives(sourceArtifact) {
  return sourceArtifact?.lives;
}

function validateSourceV1(sourceArtifact, fileSha256) {
  if (fileSha256 !== E2_N2_SOURCE_V1_FILE_SHA256) throw new TypeError("N2 E2-V1 source byte SHA-256 mismatch");
  if (sourceArtifact?.evidenceVersion !== "pr39-slice-e2-v1-fresh-world-v1" || sourceArtifact?.protocolVersion !== "pr39-slice-e2-v1-fresh-world-protocol-v1") throw new TypeError("N2 E2-V1 source version mismatch");
  if (sourceArtifact?.status !== "complete" || sourceArtifact?.developmentOnly !== true || sourceArtifact?.burnedForFinalCohort !== true) throw new TypeError("N2 E2-V1 source status mismatch");
  if (sourceArtifact?.preflight?.worldId !== E2_V1_WORLD_FIXTURE.id || sourceArtifact?.preflight?.worldSpecDigest !== digest(E2_V1_WORLD_FIXTURE.worldSpec)) throw new TypeError("N2 E2-V1 world witness mismatch");
  const lives = sourceV1Lives(sourceArtifact);
  if (!Array.isArray(lives) || lives.length !== 3) throw new TypeError("N2 E2-V1 source must contain three A0 lives");
  for (let index = 0; index < lives.length; index += 1) {
    if (lives[index].runOrdinal !== index + 1 || lives[index].worldId !== E2_V1_WORLD_FIXTURE.id || !Array.isArray(lives[index].episodes) || lives[index].episodes.length !== 10) throw new TypeError("N2 E2-V1 source life mismatch");
  }
  return lives;
}

function validateSourceV2(sourceArtifact) {
  if (sourceArtifact?.evidenceVersion !== E2_V2_A0_EVIDENCE_VERSION || sourceArtifact?.protocolVersion !== E2_V2_A0_PROTOCOL_VERSION) throw new TypeError("N2 E2-V2 source version mismatch");
  if (sourceArtifact?.status !== "complete" || sourceArtifact?.developmentOnly !== true || sourceArtifact?.burnedForFinalCohort !== true) throw new TypeError("N2 E2-V2 source status mismatch");
  if (sourceArtifact?.arm !== E2_V2_A0_ARM || sourceArtifact?.worldId !== E2_V2_WORLD_FIXTURE.id || sourceArtifact?.preflight?.worldSpecDigest !== digest(E2_V2_WORLD_FIXTURE.worldSpec)) throw new TypeError("N2 E2-V2 source witness mismatch");
  const lives = sourceV2Lives(sourceArtifact);
  if (!Array.isArray(lives) || lives.length !== 3) throw new TypeError("N2 E2-V2 source must contain three A0 lives");
  for (let index = 0; index < lives.length; index += 1) {
    if (lives[index].runOrdinal !== index + 1 || lives[index].worldId !== E2_V2_WORLD_FIXTURE.id || !Array.isArray(lives[index].episodes) || lives[index].episodes.length !== 10) throw new TypeError("N2 E2-V2 source life mismatch");
  }
  return lives;
}

function sourceWitness({ path, fileSha256, artifact, worldId }) {
  return Object.freeze({
    file: path,
    fileSha256,
    canonicalArtifactDigest: digest(artifact),
    evidenceVersion: artifact.evidenceVersion,
    protocolVersion: artifact.protocolVersion,
    generatedAt: artifact.generatedAt ?? null,
    sourceArm: E2_V2_A0_ARM,
    worldId,
    lifeCount: 3,
  });
}

export function buildN2Preflight({ sourceV1, sourceV1FileSha256, sourceV2, sourceV2FileSha256 }) {
  validateThresholdTable();
  validateSourceV1(sourceV1, sourceV1FileSha256);
  validateSourceV2(sourceV2);
  const plan = buildN2TrialPlan();
  const thresholdTable = Object.fromEntries(Object.entries(E2_N2_ATTRIBUTION_THRESHOLDS).map(([m, k]) => [m, Object.freeze({
    minimumCorrect: k,
    exactChanceTail: exactBinomialTailHalf(Number(m), k),
  })]));
  const witness = {
    protocolVersion: E2_N2_PROTOCOL_VERSION,
    evidenceVersion: E2_N2_EVIDENCE_VERSION,
    purpose: "Gate-F downstream fertility for corrected A0 under constitutive Pass-B memory formation",
    sources: {
      "E2-V1": sourceWitness({ path: E2_N2_SOURCE_V1_FILE, fileSha256: sourceV1FileSha256, artifact: sourceV1, worldId: E2_V1_WORLD_FIXTURE.id }),
      "E2-V2": sourceWitness({ path: E2_N2_SOURCE_V2_FILE, fileSha256: sourceV2FileSha256, artifact: sourceV2, worldId: E2_V2_WORLD_FIXTURE.id }),
    },
    horizons: [...E2_N1_HORIZONS],
    trialCount: E2_N2_TRIAL_COUNT,
    memoryFormationFloor: E2_N2_MIN_REMEMBERED,
    planningMemoryRate: 0.70,
    probabilityMeetMemoryFloorAtPlanningRate: 0.9404141160133612,
    scoring: {
      criterionA: "remembered >= 10/18",
      criterionB: "among remembered trials, exact one-sided binomial source-attribution p<=0.05",
      bothRequired: true,
      notRememberedLegal: true,
      notRememberedIncludedInAttributionDenominator: false,
      rawForcedChoiceReportedForCharacterizationOnly: true,
      thresholdTable,
    },
    assignment: {
      pairs: PAIRS.map(([left, right]) => [left + 1, right + 1]),
      candidateOrderDomain: E2_N2_CANDIDATE_ORDER_DOMAIN,
      sourceUsesPerLife: 3,
      truthLabels: { A: 9, B: 9 },
      candidateASides: { left: 9, right: 9 },
    },
    cognition: {
      passBSemantics: "constitutive_memory_formation",
      passBBoundary: "life_only_unexposed",
      priorMemoriesEmptyIsNormal: true,
      passCMode: "initial",
      candidateIdentifierNeutralization: true,
      richStructureMetadataVisibleToPassB: false,
      genomeVisibleToPassB: false,
      historyVisibleToPassC: false,
      genomeVisibleToPassC: false,
      sourceArmLabelVisibleToCognition: false,
    },
    passB: {
      formProfile: E2_N2_PASS_B_FORM_PROFILE,
      maxModelCharacters: E2_N1_PASS_B_MAX_MODEL_CHARACTERS,
      promptHash: digest(E2_N2_PASS_B_PROMPT),
      responseSchemaHash: digest(E2_N2_PASS_B_RESPONSE_SCHEMA),
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

function worldContext(worldId, sourceV1, sourceV2) {
  if (worldId === E2_V1_WORLD_FIXTURE.id) return { fixture: E2_V1_WORLD_FIXTURE, lives: sourceV1Lives(sourceV1) };
  if (worldId === E2_V2_WORLD_FIXTURE.id) return { fixture: E2_V2_WORLD_FIXTURE, lives: sourceV2Lives(sourceV2) };
  throw new TypeError(`N2 unknown world ${worldId}`);
}

function lifeFor(worldId, sourceV1, sourceV2, runOrdinal) {
  const context = worldContext(worldId, sourceV1, sourceV2);
  const life = context.lives.find((candidate) => candidate.runOrdinal === runOrdinal);
  if (life === undefined) throw new TypeError(`N2 source life missing ${worldId} run ${runOrdinal}`);
  return { fixture: context.fixture, life };
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
  if (match === null) throw new TypeError(`N2 memory returned non-neutral episode ref ${ref}`);
  const ordinal = Number(match[1]);
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > horizon) throw new TypeError(`N2 memory episode ref ${ref} exceeds horizon`);
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
  return { outcome: passCOutput.outcome, summary: passCOutput.summary, parts: passCOutput.parts.map((part) => part.meaning) };
}

function passCInputFromMemory({ trialOrdinal, passBOutput, sourceNeutral }) {
  if (passBOutput.outcome !== "remembered") return null;
  return normalizePassCInput({
    inputVersion: GENESIS_PASS_C_INPUT_VERSION,
    mode: "initial",
    targetMemory: {
      memoryRef: `memory_n2_trial_${pad(trialOrdinal, 3)}`,
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
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) throw new TypeError("N2 rater output must be an object");
  const keys = Object.keys(candidate).sort();
  if (canonicalJson(keys) !== canonicalJson(["chosenCandidate", "evidenceEpisodeOrdinals", "rationale"].sort())) throw new TypeError("N2 rater output has unexpected keys");
  if (!["A", "B"].includes(candidate.chosenCandidate)) throw new TypeError("N2 rater chosenCandidate must be A or B");
  if (!Array.isArray(candidate.evidenceEpisodeOrdinals) || candidate.evidenceEpisodeOrdinals.length === 0) throw new TypeError("N2 rater must cite at least one episode ordinal");
  const ordinals = [...new Set(candidate.evidenceEpisodeOrdinals)];
  for (const ordinal of ordinals) if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > horizon) throw new TypeError("N2 rater evidence ordinal exceeds visible horizon");
  if (typeof candidate.rationale !== "string" || candidate.rationale.trim() === "") throw new TypeError("N2 rater rationale is required");
  return { chosenCandidate: candidate.chosenCandidate, evidenceEpisodeOrdinals: ordinals, rationale: candidate.rationale.trim() };
}

function buildRaterInput({ passBOutput, passCOutput, candidateA, candidateB, horizon }) {
  return {
    protocolVersion: E2_N2_PROTOCOL_VERSION,
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
  return raw?.outcome === "not_remembered" && Array.isArray(raw.episodeRefs) && raw.episodeRefs.length === 0 && raw.rememberedContent === null && Array.isArray(raw.uncertainty) && raw.uncertainty.length > 0;
}

function normalizePassBWithKnownResidue(raw, passBInput) {
  try {
    return Object.freeze({ output: normalizePassBModelOutput(raw, passBInput), canonicalization: null });
  } catch (error) {
    if (!isNotRememberedResidue(raw)) throw error;
    const canonicalRaw = { outcome: "not_remembered", episodeRefs: [], rememberedContent: null, uncertainty: [] };
    return Object.freeze({
      output: normalizePassBModelOutput(canonicalRaw, passBInput),
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

export function scoreN2Trials(trials) {
  const rawCorrect = trials.filter((trial) => trial.correct).length;
  const remembered = trials.filter((trial) => trial.passB.output.outcome === "remembered");
  const rememberedCorrect = remembered.filter((trial) => trial.correct).length;
  const m = remembered.length;
  const minimumCorrect = m >= E2_N2_MIN_REMEMBERED ? E2_N2_ATTRIBUTION_THRESHOLDS[m] : null;
  const attributionTail = m === 0 ? null : exactBinomialTailHalf(m, rememberedCorrect);
  const criterionA = m >= E2_N2_MIN_REMEMBERED;
  const criterionB = criterionA && rememberedCorrect >= minimumCorrect && attributionTail <= 0.05;
  return Object.freeze({
    n: trials.length,
    rawForcedChoice: Object.freeze({
      correct: rawCorrect,
      incorrect: trials.length - rawCorrect,
      accuracy: trials.length === 0 ? null : rawCorrect / trials.length,
      exactBinomialChanceTail: exactBinomialTailHalf(trials.length, rawCorrect),
      gateUse: false,
    }),
    memoryFormation: Object.freeze({
      remembered: m,
      notRemembered: trials.length - m,
      minimumRemembered: E2_N2_MIN_REMEMBERED,
      criterionMet: criterionA,
    }),
    conditionalAttribution: Object.freeze({
      rememberedTrials: m,
      correct: rememberedCorrect,
      incorrect: m - rememberedCorrect,
      accuracy: m === 0 ? null : rememberedCorrect / m,
      minimumCorrectAtObservedM: minimumCorrect,
      exactBinomialChanceTail: attributionTail,
      criterionMet: criterionB,
    }),
    gateFDownstreamFertilityMet: criterionA && criterionB,
    rule: "Gate support requires remembered>=10/18 and exact one-sided p<=0.05 source attribution among remembered trials.",
    calibrationNote: "Development diagnostic only; 18 trials share two worlds and six source lives and are not claimed as independent population samples.",
  });
}

function completedTrialKeys(trials) {
  return new Set(trials.map((trial) => trial.trialOrdinal));
}

function sourceBundleDigest(sourceV1, sourceV1FileSha256, sourceV2, sourceV2FileSha256) {
  return digest({
    sourceV1FileSha256,
    sourceV1ArtifactDigest: digest(sourceV1),
    sourceV2FileSha256,
    sourceV2ArtifactDigest: digest(sourceV2),
  });
}

function validateResumeArtifact(resumeArtifact, { provider, model, preflight, sourceBundle }) {
  if (resumeArtifact === null) return;
  if (!["running", "failed"].includes(resumeArtifact.status)) throw new TypeError("N2 resume requires running or failed checkpoint evidence");
  if (resumeArtifact.evidenceVersion !== E2_N2_EVIDENCE_VERSION || resumeArtifact.protocolVersion !== E2_N2_PROTOCOL_VERSION || resumeArtifact.arm !== E2_N2_ARM) throw new TypeError("N2 resume protocol/evidence mismatch");
  if (resumeArtifact.provider !== provider || resumeArtifact.model !== model) throw new TypeError("N2 resume provider/model mismatch");
  if (resumeArtifact.preflight?.preflightDigest !== preflight.preflightDigest) throw new TypeError("N2 resume preflight mismatch");
  if (resumeArtifact.sourceBundleDigest !== sourceBundle) throw new TypeError("N2 resume source bundle mismatch");
  const byOrdinal = new Map(buildN2TrialPlan().map((trial) => [trial.trialOrdinal, trial]));
  for (const completed of resumeArtifact.completedTrials ?? []) {
    const frozen = byOrdinal.get(completed.trialOrdinal);
    if (frozen === undefined || completed.assignmentDigest !== frozen.assignmentDigest) throw new TypeError("N2 resume completed assignment mismatch");
  }
  if (resumeArtifact.inFlight !== null && resumeArtifact.inFlight !== undefined) {
    const frozen = byOrdinal.get(resumeArtifact.inFlight.trialOrdinal);
    if (frozen === undefined || resumeArtifact.inFlight.assignmentDigest !== frozen.assignmentDigest) throw new TypeError("N2 resume in-flight assignment mismatch");
  }
}

function artifactSnapshot({ status, provider, model, preflight, sourceBundle, completedTrials, inFlight, modelEvents, error = null, resumedFrom = null }) {
  return {
    evidenceVersion: E2_N2_EVIDENCE_VERSION,
    protocolVersion: E2_N2_PROTOCOL_VERSION,
    status,
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    arm: E2_N2_ARM,
    provider,
    model,
    preflight: structuredClone(preflight),
    sourceBundleDigest: sourceBundle,
    resumedFrom,
    completedTrials: structuredClone(completedTrials),
    inFlight: inFlight === null ? null : structuredClone(inFlight),
    score: status === "complete" ? scoreN2Trials(completedTrials) : null,
    modelEvents: structuredClone(modelEvents),
    failure: error === null ? null : { name: error?.name ?? null, code: error?.code ?? null, gate: error?.gate ?? null, message: error?.message ?? String(error) },
    admissionVerdict: null,
  };
}

async function runOneTrial({ trial, sourceV1, sourceV2, adapter, priorInFlight, checkpoint, onProgress }) {
  const left = lifeFor(trial.worldId, sourceV1, sourceV2, trial.leftRunOrdinal);
  const right = lifeFor(trial.worldId, sourceV1, sourceV2, trial.rightRunOrdinal);
  const leftNeutral = neutralizeN1Life({ worldFixture: left.fixture, life: left.life, horizon: trial.horizon });
  const rightNeutral = neutralizeN1Life({ worldFixture: right.fixture, life: right.life, horizon: trial.horizon });
  const sourceLife = trial.sourceSide === "left" ? left.life : right.life;
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
      systemPrompt: E2_N2_PASS_B_PROMPT,
      input: passBCognition,
      responseSchema: E2_N2_PASS_B_RESPONSE_SCHEMA,
      clientRequestId: `slice-e2-n2:trial-${pad(trial.trialOrdinal, 3)}:pass-b`,
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
        clientRequestId: `slice-e2-n2:trial-${pad(trial.trialOrdinal, 3)}:pass-c`,
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
      clientRequestId: `slice-e2-n2:trial-${pad(trial.trialOrdinal, 3)}:rater`,
    });
    state.raterRaw = { output: structuredClone(result.output), provenance: structuredClone(result.provenance) };
    await checkpoint(state);
  }
  const raterOutput = normalizeRaterOutput(state.raterRaw.output, trial.horizon);
  const correct = raterOutput.chosenCandidate === trial.truthCandidate;

  if (typeof onProgress === "function") onProgress({ type: "trial_complete", trial, memoryOutcome: passBOutput.outcome, meaningOutcome: passCOutput?.outcome ?? null, chosenCandidate: raterOutput.chosenCandidate, correct });

  return {
    trialOrdinal: trial.trialOrdinal,
    worldId: trial.worldId,
    pairOrdinal: trial.pairOrdinal,
    repetitionOrdinal: trial.repetitionOrdinal,
    horizon: trial.horizon,
    pairSeeds: [left.life.seed, right.life.seed],
    sourceSeed: sourceLife.seed,
    sourceRunOrdinal: sourceLife.runOrdinal,
    sourceSide: trial.sourceSide,
    candidateASide: trial.candidateASide,
    truthCandidate: trial.truthCandidate,
    assignmentDigest: trial.assignmentDigest,
    neutralization: { leftDigest: leftNeutral.neutralizationDigest, rightDigest: rightNeutral.neutralizationDigest, sourceDigest: sourceNeutral.neutralizationDigest },
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
    rater: { inputDigest: digest(raterInput), rawOutputDigest: digest(state.raterRaw.output), output: structuredClone(raterOutput), provenance: structuredClone(state.raterRaw.provenance) },
    correct,
  };
}

export async function runN2({ provider, model, sourceV1, sourceV1FileSha256, sourceV2, sourceV2FileSha256, resumeArtifact = null, adapterOverride = null, onCheckpoint = null, onProgress = null } = {}) {
  if (!["openai", "google"].includes(provider) && adapterOverride === null) throw new TypeError("provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new TypeError("model is required");
  const preflight = buildN2Preflight({ sourceV1, sourceV1FileSha256, sourceV2, sourceV2FileSha256 });
  const sourceBundle = sourceBundleDigest(sourceV1, sourceV1FileSha256, sourceV2, sourceV2FileSha256);
  validateResumeArtifact(resumeArtifact, { provider, model, preflight, sourceBundle });
  const plan = buildN2TrialPlan();
  const completedTrials = structuredClone(resumeArtifact?.completedTrials ?? []);
  let inFlight = resumeArtifact?.inFlight === null || resumeArtifact?.inFlight === undefined ? null : structuredClone(resumeArtifact.inFlight);
  const modelEvents = structuredClone(resumeArtifact?.modelEvents ?? []);
  const adapter = adapterOverride ?? createAdapter({ provider, model, observer: (event) => modelEvents.push(event) });
  const resumedFrom = resumeArtifact === null ? null : { sourceGeneratedAt: resumeArtifact.generatedAt ?? null, sourceArtifactDigest: digest(resumeArtifact), reusedCompletedTrials: completedTrials.length, reusedInFlightTrial: inFlight?.trialOrdinal ?? null };

  const emit = async (status, error = null) => {
    const snapshot = artifactSnapshot({ status, provider, model, preflight, sourceBundle, completedTrials, inFlight, modelEvents, error, resumedFrom });
    if (typeof onCheckpoint === "function") await onCheckpoint(snapshot);
    return snapshot;
  };

  await emit("running");
  try {
    const done = completedTrialKeys(completedTrials);
    for (const trial of plan) {
      if (done.has(trial.trialOrdinal)) continue;
      if (inFlight !== null && inFlight.trialOrdinal !== trial.trialOrdinal) throw new TypeError("N2 resume in-flight trial is not the next incomplete trial");
      const completed = await runOneTrial({
        trial, sourceV1, sourceV2, adapter, priorInFlight: inFlight,
        checkpoint: async (state) => { inFlight = structuredClone(state); await emit("running"); },
        onProgress,
      });
      completedTrials.push(completed);
      done.add(trial.trialOrdinal);
      inFlight = null;
      await emit("running");
    }
    return await emit("complete");
  } catch (error) {
    error.e2N2FailureArtifact = await emit("failed", error);
    throw error;
  }
}

function progressPrinter(event) {
  const trial = event.trial;
  const prefix = `[N2 ${pad(trial.trialOrdinal, 2)}/${E2_N2_TRIAL_COUNT} ${trial.worldId} pair${trial.pairOrdinal} h${trial.horizon}]`;
  if (event.type === "trial_start") process.stderr.write(`${prefix} B/C/rater ... `);
  else if (event.type === "trial_complete") process.stderr.write(`${event.memoryOutcome} · meaning=${event.meaningOutcome ?? "n/a"} · chose=${event.chosenCandidate} ${event.correct ? "✓" : "✗"}\n`);
}

function printSummary(result) {
  const score = result.score;
  process.stdout.write(`N2 memory: ${score.memoryFormation.remembered}/${score.n} · floor=${score.memoryFormation.minimumRemembered} · met=${score.memoryFormation.criterionMet ? "YES" : "NO"}\n`);
  process.stdout.write(`N2 attribution: ${score.conditionalAttribution.correct}/${score.conditionalAttribution.rememberedTrials} · min=${score.conditionalAttribution.minimumCorrectAtObservedM ?? "n/a"} · p_tail=${score.conditionalAttribution.exactBinomialChanceTail ?? "n/a"} · met=${score.conditionalAttribution.criterionMet ? "YES" : "NO"}\n`);
  process.stdout.write(`N2 Gate-F downstream fertility: ${score.gateFDownstreamFertilityMet ? "YES" : "NO"}\n`);
}

function readSource(path) {
  if (!existsSync(path)) throw new Error(`source artifact does not exist: ${path}`);
  const text = readFileSync(path, "utf8");
  return { artifact: JSON.parse(text), fileSha256: sha256(text) };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage:\n  npm run genesis:e2-n2 -- --preflight [--source-v1 <e2-v1.json>] [--source-v2 <e2-v2-a0.json>] [--out <preflight.json>]\n  npm run genesis:e2-n2 -- --provider <openai|google> --model <model> [--source-v1 <e2-v1.json>] [--source-v2 <e2-v2-a0.json>] --out <n2.json> [--resume <checkpoint.json>]\n");
    return;
  }
  const sourceV1Path = readArg(argv, "--source-v1", E2_N2_SOURCE_V1_FILE);
  const sourceV2Path = readArg(argv, "--source-v2", E2_N2_SOURCE_V2_FILE);
  const outputPath = readArg(argv, "--out");
  const v1 = readSource(sourceV1Path);
  const v2 = readSource(sourceV2Path);

  if (argv.includes("--preflight")) {
    const preflight = buildN2Preflight({ sourceV1: v1.artifact, sourceV1FileSha256: v1.fileSha256, sourceV2: v2.artifact, sourceV2FileSha256: v2.fileSha256 });
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
  if (typeof outputPath !== "string" || outputPath.trim() === "") throw new Error("--out is required for checkpoint-safe N2 execution");
  if (resumePath !== null && !existsSync(resumePath)) throw new Error(`resume artifact does not exist: ${resumePath}`);
  if (existsSync(outputPath) && resumePath === null) throw new Error(`output exists: ${outputPath}; started/completed N2 evidence must not be overwritten`);
  const resumeArtifact = resumePath === null ? null : JSON.parse(readFileSync(resumePath, "utf8"));
  const writeCheckpoint = async (artifact) => writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stderr.write(`E2 N2: START · ${E2_N2_TRIAL_COUNT} trials · memoryFloor=${E2_N2_MIN_REMEMBERED} · constitutive Pass-B · sources=${sourceV1Path},${sourceV2Path}${resumePath === null ? "" : ` · resume=${resumePath}`}\n`);
  try {
    const result = await runN2({ provider, model, sourceV1: v1.artifact, sourceV1FileSha256: v1.fileSha256, sourceV2: v2.artifact, sourceV2FileSha256: v2.fileSha256, resumeArtifact, onCheckpoint: writeCheckpoint, onProgress: progressPrinter });
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
    process.stderr.write(`E2 N2: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

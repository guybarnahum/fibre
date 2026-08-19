#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import {
  GENESIS_PASS_B_INPUT_VERSION,
  GENESIS_PASS_B_POLICY,
  normalizePassBInput,
  normalizePassBModelOutput,
} from "../services/world-kernel/src/genesis-pass-b-domain.mjs";
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
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";

export const E2_N1_EVIDENCE_VERSION = "pr39-slice-e2-n1-v1";
export const E2_N1_PROTOCOL_VERSION = "pr39-slice-e2-n1-downstream-fertility-v1";
export const E2_N1_ARM = "N1_life_only_downstream_fertility_2afc";
export const E2_N1_HORIZONS = Object.freeze([6, 8, 10]);
export const E2_N1_POSITIVE_THRESHOLD = 13;
export const E2_N1_TRIAL_COUNT = 18;
export const E2_N1_SOURCE_ARM = "A2b_plausibility_surface_seeded_contingency";

export const E2_N1_PASS_B_PROMPT = `You are Fibre Genesis Pass B in a development-only clean-control execution.
Decide whether one or more concrete episodes in the supplied visible history are autobiographically remembered at rememberingAt.
Use only the supplied Pass-B cognition input. There is no genome exposure.
If remembered, cite only visible episode IDs and write rememberedContent as memory content: what is recalled, with uncertainty where appropriate.
Do not write durable meaning, significance, personality, lessons, future policy, or a summary of the whole life.
Returning not_remembered is fully legal. Do not force a memory because this is an experiment.
Return JSON matching the supplied schema.`;

export const E2_N1_PASS_C_PROMPT = `You are Fibre Genesis Pass C for initial durable-meaning formation in a development-only diagnostic.
You receive exactly one remembered autobiographical memory through the canonical Pass-C cognition boundary.
Decide whether this memory has durable meaning at the supplied formation moment.
Use only the supplied memory. Do not infer unseen history, genome, personality targets, future behavior, or universal future policy.
Meaning may be concrete, partial, ambivalent, or absent. Returning no_durable_meaning is fully legal.
Return JSON matching the supplied schema.`;

export const E2_N1_RATER_PROMPT = `You are a blind diagnostic rater for Fibre's downstream-fertility experiment.
You receive one generated autobiographical memory/meaning bundle and two same-world candidate lived histories, A and B, truncated to the same remembering horizon.
Choose which candidate history most plausibly produced the generated bundle.
Base the choice only on concrete lived details that connect the memory or meaning to one candidate history. Do not infer from IDs, seed identity, structure labels, model metadata, writing-format quirks, or generic world facts shared by both candidates.
If the memory outcome is not_remembered, you must still make a forced choice; do not invent a memory that is not present.
Cite one or more candidate episode ordinals that best support your forced choice and give a short factual rationale.
Return JSON matching the supplied schema.`;

export const E2_N1_PASS_B_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["outcome", "episodeRefs", "rememberedContent", "uncertainty"],
  properties: {
    outcome: { type: "string", enum: ["remembered", "not_remembered"] },
    episodeRefs: { type: "array", items: { type: "string" } },
    rememberedContent: { type: ["string", "null"] },
    uncertainty: { type: "array", items: { type: "string" } },
  },
});

export const E2_N1_PASS_C_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["outcome", "summary", "parts"],
  properties: {
    outcome: { type: "string", enum: ["durable_meaning", "no_durable_meaning"] },
    summary: { type: ["string", "null"] },
    parts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["meaning"],
        properties: { meaning: { type: "string" } },
      },
    },
  },
});

export const E2_N1_RATER_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["chosenCandidate", "evidenceEpisodeOrdinals", "rationale"],
  properties: {
    chosenCandidate: { type: "string", enum: ["A", "B"] },
    evidenceEpisodeOrdinals: { type: "array", minItems: 1, items: { type: "integer" } },
    rationale: { type: "string" },
  },
});

const PAIRS = Object.freeze([
  Object.freeze([0, 1]),
  Object.freeze([0, 2]),
  Object.freeze([1, 2]),
]);

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

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

function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}

function replaceAllLiteral(value, replacements) {
  let result = value;
  for (const [from, to] of replacements) {
    if (typeof from !== "string" || from.length === 0) continue;
    result = result.split(from).join(to);
  }
  return result;
}

function passBWorldProjection(worldFixture) {
  const world = worldFixture.worldSpec;
  return Object.freeze({
    worldSpecId: `world_n1_${worldFixture.id.toLowerCase().replaceAll("-", "_")}`,
    timeFrame: structuredClone(world.timeFrame),
    places: Object.freeze(world.places.map((place, index) => Object.freeze({
      placeId: `n1_place_${pad(index + 1)}`,
      description: place.description,
    }))),
    householdShape: world.householdShape,
    familyRelations: Object.freeze([...world.familyRelations]),
    languages: Object.freeze([...world.languages]),
    materialCircumstances: world.materialCircumstances,
    mobilityPattern: world.mobilityPattern,
    schoolingOrCommunityContext: world.schoolingOrCommunityContext,
    culturalContext: world.culturalContext,
    availableInstitutions: Object.freeze([...world.availableInstitutions]),
    intellectualEnvironment: world.intellectualEnvironment,
    affordedRoles: Object.freeze([...world.affordedRoles]),
  });
}

function horizonWindow(life, horizon) {
  const candidate = life.offeredWindows?.[horizon - 1]?.developmentalWindow
    ?? life.a2bPlausibilityEvidence?.[horizon - 1]?.developmentalWindow
    ?? null;
  if (candidate === null) throw new TypeError(`N1 source life lacks developmental window for horizon ${horizon}`);
  return candidate;
}

function participantAliasMap(life, visibleEpisodes) {
  const mapping = new Map();
  mapping.set(life.subject.provisionalThreadId, "thr_n1_subject");
  let ordinal = 0;
  const ensure = (rawId) => {
    if (mapping.has(rawId)) return mapping.get(rawId);
    ordinal += 1;
    const alias = `n1_person_${String(ordinal).padStart(3, "0")}`;
    mapping.set(rawId, alias);
    return alias;
  };
  for (const participant of life.initialRoster ?? []) {
    if (participant.participantId !== life.subject.provisionalThreadId) ensure(participant.participantId);
  }
  for (const episode of visibleEpisodes) {
    for (const ref of episode.participantRefs ?? []) ensure(ref);
    for (const introduced of episode.introducedParticipants ?? []) ensure(introduced.provisionalPersonId);
  }
  return mapping;
}

function assertNeutralized(serialized, forbiddenValues) {
  for (const value of forbiddenValues) {
    if (typeof value === "string" && value.length > 0 && serialized.includes(value)) {
      throw new TypeError(`N1 neutralization leaked source identifier ${value}`);
    }
  }
}

export function neutralizeN1Life({ worldFixture, life, horizon }) {
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > life.episodes.length) {
    throw new TypeError("N1 horizon must address visible source episodes");
  }
  const visibleEpisodes = life.episodes.slice(0, horizon);
  const neutralWorld = passBWorldProjection(worldFixture);
  const placeMap = new Map(worldFixture.worldSpec.places.map((place, index) => [place.placeId, neutralWorld.places[index].placeId]));
  const participantMap = participantAliasMap(life, visibleEpisodes);
  const episodeMap = new Map(visibleEpisodes.map((episode, index) => [episode.episodeId, `n1_ep_${pad(index + 1)}`]));

  const replacementEntries = [
    ...episodeMap.entries(),
    ...participantMap.entries(),
    ...placeMap.entries(),
  ].sort((left, right) => right[0].length - left[0].length);

  const history = visibleEpisodes.map((episode, index) => {
    const placeRef = placeMap.get(episode.placeRef);
    if (placeRef === undefined) throw new TypeError(`N1 source episode uses unknown place ${episode.placeRef}`);
    return Object.freeze({
      episodeId: `n1_ep_${pad(index + 1)}`,
      occurredAt: episode.occurredAt,
      ageAtEvent: episode.ageAtEvent,
      placeRef,
      participantRefs: Object.freeze(episode.participantRefs.map((ref) => {
        const alias = participantMap.get(ref);
        if (alias === undefined) throw new TypeError(`N1 source episode uses unmapped participant ${ref}`);
        return alias;
      })),
      observableAction: replaceAllLiteral(episode.observableAction, replacementEntries),
      introducedParticipants: Object.freeze((episode.introducedParticipants ?? []).map((introduced) => Object.freeze({
        participantId: participantMap.get(introduced.provisionalPersonId),
        roleRef: introduced.roleRef,
        introducedAt: introduced.introducedAt,
      }))),
    });
  });

  const window = horizonWindow(life, horizon);
  const sourceIdentifiers = [
    life.seed,
    life.worldId,
    life.worldSpecId,
    life.subject.provisionalThreadId,
    ...life.initialRoster.map((participant) => participant.participantId),
    ...visibleEpisodes.map((episode) => episode.episodeId),
    ...visibleEpisodes.flatMap((episode) => episode.introducedParticipants?.map((item) => item.provisionalPersonId) ?? []),
    ...worldFixture.worldSpec.places.map((place) => place.placeId),
  ];

  const neutralized = Object.freeze({
    subject: Object.freeze({ provisionalThreadId: "thr_n1_subject", bornAt: life.subject.bornAt }),
    world: neutralWorld,
    rememberingAt: window.endAt,
    ageAtRemembering: window.maxAge,
    chronologyEndsAt: window.endAt,
    history: Object.freeze(history),
    horizon,
  });
  assertNeutralized(canonicalJson(neutralized), sourceIdentifiers);
  return Object.freeze({
    ...neutralized,
    neutralizationDigest: digest(neutralized),
  });
}

export function buildN1PassBInput(neutralized) {
  return normalizePassBInput({
    inputVersion: GENESIS_PASS_B_INPUT_VERSION,
    subject: structuredClone(neutralized.subject),
    world: structuredClone(neutralized.world),
    rememberingAt: neutralized.rememberingAt,
    ageAtRemembering: neutralized.ageAtRemembering,
    chronologyEndsAt: neutralized.chronologyEndsAt,
    history: structuredClone(neutralized.history),
    priorMemories: [],
    assignment: {
      formationMode: "life_only",
      priorTreatmentMemoryExposure: false,
      analysisStratum: "life_only_unexposed",
    },
    genomeExposure: null,
    policyWitness: {
      policyVersion: GENESIS_PASS_B_POLICY.version,
      assignmentRef: "assignment_n1_life_only",
      genomeExposurePolicyRef: null,
    },
  });
}

function passCInputFromMemory({ trialOrdinal, passBOutput, neutralized }) {
  if (passBOutput.outcome !== "remembered") return null;
  return normalizePassCInput({
    inputVersion: GENESIS_PASS_C_INPUT_VERSION,
    mode: "initial",
    targetMemory: {
      memoryRef: `memory_n1_trial_${pad(trialOrdinal, 3)}`,
      episodeRefs: [...passBOutput.episodeRefs],
      rememberedContent: passBOutput.rememberedContent,
      uncertainty: [...passBOutput.uncertainty],
    },
    formation: {
      asOf: neutralized.rememberingAt,
      ageAtFormation: neutralized.ageAtRemembering,
      chronologyIndex: neutralized.horizon,
    },
    priorMeaning: null,
    trigger: null,
    policyWitness: { policyVersion: GENESIS_PASS_C_POLICY.version },
  });
}

function candidateHistoryForRater(neutralized) {
  const descriptions = new Map(neutralized.world.places.map((place) => [place.placeId, place.description]));
  return Object.freeze(neutralized.history.map((episode, index) => Object.freeze({
    ordinal: index + 1,
    ageAtEvent: episode.ageAtEvent,
    placeLabel: episode.placeRef,
    placeDescription: descriptions.get(episode.placeRef),
    observableAction: episode.observableAction,
  })));
}

function episodeOrdinal(ref, horizon) {
  const match = /^n1_ep_(\d{2})$/.exec(ref);
  if (match === null) throw new TypeError(`N1 memory returned non-neutral episode ref ${ref}`);
  const ordinal = Number(match[1]);
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > horizon) throw new TypeError(`N1 memory episode ref ${ref} exceeds horizon`);
  return ordinal;
}

function memoryForRater(passBOutput, horizon) {
  return Object.freeze({
    outcome: passBOutput.outcome,
    episodeOrdinals: Object.freeze(passBOutput.episodeRefs.map((ref) => episodeOrdinal(ref, horizon))),
    rememberedContent: passBOutput.rememberedContent,
    uncertainty: Object.freeze([...passBOutput.uncertainty]),
  });
}

function meaningForRater(passCOutput) {
  if (passCOutput === null) return Object.freeze({ outcome: null, summary: null, parts: Object.freeze([]) });
  return Object.freeze({
    outcome: passCOutput.outcome,
    summary: passCOutput.summary,
    parts: Object.freeze(passCOutput.parts.map((part) => part.meaning)),
  });
}

function normalizeRaterOutput(candidate, horizon) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) throw new TypeError("N1 rater output must be an object");
  const keys = Object.keys(candidate).sort();
  if (canonicalJson(keys) !== canonicalJson(["chosenCandidate", "evidenceEpisodeOrdinals", "rationale"].sort())) {
    throw new TypeError("N1 rater output has unexpected keys");
  }
  if (!["A", "B"].includes(candidate.chosenCandidate)) throw new TypeError("N1 rater chosenCandidate must be A or B");
  if (!Array.isArray(candidate.evidenceEpisodeOrdinals) || candidate.evidenceEpisodeOrdinals.length === 0) {
    throw new TypeError("N1 rater must cite at least one episode ordinal");
  }
  const ordinals = [...new Set(candidate.evidenceEpisodeOrdinals)];
  for (const ordinal of ordinals) {
    if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > horizon) throw new TypeError("N1 rater evidence ordinal exceeds visible horizon");
  }
  if (typeof candidate.rationale !== "string" || candidate.rationale.trim() === "") throw new TypeError("N1 rater rationale is required");
  return Object.freeze({
    chosenCandidate: candidate.chosenCandidate,
    evidenceEpisodeOrdinals: Object.freeze(ordinals),
    rationale: candidate.rationale.trim(),
  });
}

function sourceSide(pairOrdinal, repetitionOrdinal) {
  // Odd horizons: pair1=left, pair2=right, pair3=left.
  // Middle horizon reverses the cycle. Each life is source once per horizon.
  const oddOrientation = [null, "left", "right", "left"];
  const evenOrientation = [null, "right", "left", "right"];
  return (repetitionOrdinal % 2 === 1 ? oddOrientation : evenOrientation)[pairOrdinal];
}

function candidateASide(worldOrdinal, pairOrdinal, repetitionOrdinal) {
  const material = `N1|${worldOrdinal}|${pairOrdinal}|${repetitionOrdinal}|candidate-order`;
  const hashHex = sha256(material);
  return Number.parseInt(hashHex.slice(-1), 16) % 2 === 0 ? "left" : "right";
}

export function buildN1TrialPlan() {
  const trials = [];
  let trialOrdinal = 0;
  for (let worldIndex = 0; worldIndex < E2_DIAGNOSTIC_WORLDS.length; worldIndex += 1) {
    const worldOrdinal = worldIndex + 1;
    const worldFixture = E2_DIAGNOSTIC_WORLDS[worldIndex];
    for (let pairIndex = 0; pairIndex < PAIRS.length; pairIndex += 1) {
      const pairOrdinal = pairIndex + 1;
      const [leftRunIndex, rightRunIndex] = PAIRS[pairIndex];
      for (let repetitionIndex = 0; repetitionIndex < E2_N1_HORIZONS.length; repetitionIndex += 1) {
        const repetitionOrdinal = repetitionIndex + 1;
        const horizon = E2_N1_HORIZONS[repetitionIndex];
        trialOrdinal += 1;
        const source = sourceSide(pairOrdinal, repetitionOrdinal);
        const candidateA = candidateASide(worldOrdinal, pairOrdinal, repetitionOrdinal);
        const truthCandidate = source === candidateA ? "A" : "B";
        trials.push(Object.freeze({
          trialOrdinal,
          worldId: worldFixture.id,
          worldOrdinal,
          pairOrdinal,
          repetitionOrdinal,
          horizon,
          leftRunOrdinal: leftRunIndex + 1,
          rightRunOrdinal: rightRunIndex + 1,
          sourceSide: source,
          candidateASide: candidateA,
          truthCandidate,
          assignmentDigest: digest({
            protocolVersion: E2_N1_PROTOCOL_VERSION,
            worldOrdinal,
            pairOrdinal,
            repetitionOrdinal,
            horizon,
            source,
            candidateA,
          }),
        }));
      }
    }
  }

  const sourceCounts = new Map();
  const truthCounts = { A: 0, B: 0 };
  const candidateSideCounts = { left: 0, right: 0 };
  for (const trial of trials) {
    const sourceRunOrdinal = trial.sourceSide === "left" ? trial.leftRunOrdinal : trial.rightRunOrdinal;
    const sourceKey = `${trial.worldId}:${sourceRunOrdinal}`;
    sourceCounts.set(sourceKey, (sourceCounts.get(sourceKey) ?? 0) + 1);
    truthCounts[trial.truthCandidate] += 1;
    candidateSideCounts[trial.candidateASide] += 1;
  }
  if (trials.length !== E2_N1_TRIAL_COUNT) throw new TypeError("N1 frozen trial count changed");
  if ([...sourceCounts.values()].some((count) => count !== 3) || sourceCounts.size !== 6) {
    throw new TypeError("N1 source-life assignment is not three trials per life");
  }
  if (truthCounts.A !== 9 || truthCounts.B !== 9) throw new TypeError("N1 truth labels are not balanced 9/9");
  if (candidateSideCounts.left !== 9 || candidateSideCounts.right !== 9) throw new TypeError("N1 candidate ordering is not balanced 9/9");
  return Object.freeze(trials);
}

function binomialCoefficient(n, k) {
  const m = Math.min(k, n - k);
  let value = 1;
  for (let index = 1; index <= m; index += 1) value = (value * (n - m + index)) / index;
  return value;
}

export function exactBinomialTailHalf(n, k) {
  let numerator = 0;
  for (let successes = k; successes <= n; successes += 1) numerator += binomialCoefficient(n, successes);
  return numerator / (2 ** n);
}

export function scoreN1Trials(trials) {
  const correct = trials.filter((trial) => trial.correct === true).length;
  return Object.freeze({
    n: trials.length,
    correct,
    incorrect: trials.length - correct,
    accuracy: trials.length === 0 ? null : correct / trials.length,
    positiveThreshold: E2_N1_POSITIVE_THRESHOLD,
    thresholdMet: correct >= E2_N1_POSITIVE_THRESHOLD,
    exactBinomialChanceTail: exactBinomialTailHalf(trials.length, correct),
    calibrationNote: "Development diagnostic only; trials share worlds/source lives and are not claimed as fully independent samples.",
  });
}

function validateSourceArtifact(sourceArtifact) {
  if (sourceArtifact === null || typeof sourceArtifact !== "object" || Array.isArray(sourceArtifact)) throw new TypeError("N1 source artifact must be an object");
  if (sourceArtifact.status !== "complete") throw new TypeError("N1 requires a complete source artifact");
  if (sourceArtifact.arm !== E2_N1_SOURCE_ARM) throw new TypeError("N1 source artifact arm mismatch");
  if (sourceArtifact.developmentOnly !== true || sourceArtifact.burnedForFinalCohort !== true) throw new TypeError("N1 source artifact must remain development-burned");
  if (!Array.isArray(sourceArtifact.worlds) || sourceArtifact.worlds.length !== 2) throw new TypeError("N1 source artifact must contain two worlds");
  for (const worldFixture of E2_DIAGNOSTIC_WORLDS) {
    const world = sourceArtifact.worlds.find((candidate) => candidate.worldId === worldFixture.id);
    if (world === undefined || !Array.isArray(world.lives) || world.lives.length !== 3) throw new TypeError(`N1 source artifact lacks three lives for ${worldFixture.id}`);
    for (const life of world.lives) {
      if (!Array.isArray(life.episodes) || life.episodes.length !== 10) throw new TypeError("N1 source life must contain exactly ten episodes");
    }
  }
}

function lifeFor(sourceArtifact, worldId, runOrdinal) {
  const world = sourceArtifact.worlds.find((candidate) => candidate.worldId === worldId);
  const life = world?.lives.find((candidate) => candidate.runOrdinal === runOrdinal);
  if (life === undefined) throw new TypeError(`N1 source life missing ${worldId} run ${runOrdinal}`);
  return life;
}

function buildRaterInput({ memory, meaning, candidateA, candidateB, horizon }) {
  return Object.freeze({
    protocolVersion: E2_N1_PROTOCOL_VERSION,
    rememberingHorizonEpisodeCount: horizon,
    memory: structuredClone(memory),
    meaning: structuredClone(meaning),
    candidates: Object.freeze([
      Object.freeze({ label: "A", history: candidateHistoryForRater(candidateA) }),
      Object.freeze({ label: "B", history: candidateHistoryForRater(candidateB) }),
    ]),
  });
}

async function runTrial({ trial, sourceArtifact, adapter, onProgress = null }) {
  const worldFixture = E2_DIAGNOSTIC_WORLDS.find((candidate) => candidate.id === trial.worldId);
  const leftLife = lifeFor(sourceArtifact, trial.worldId, trial.leftRunOrdinal);
  const rightLife = lifeFor(sourceArtifact, trial.worldId, trial.rightRunOrdinal);
  const leftNeutral = neutralizeN1Life({ worldFixture, life: leftLife, horizon: trial.horizon });
  const rightNeutral = neutralizeN1Life({ worldFixture, life: rightLife, horizon: trial.horizon });
  const sourceLife = trial.sourceSide === "left" ? leftLife : rightLife;
  const sourceNeutral = trial.sourceSide === "left" ? leftNeutral : rightNeutral;
  const candidateA = trial.candidateASide === "left" ? leftNeutral : rightNeutral;
  const candidateB = trial.candidateASide === "left" ? rightNeutral : leftNeutral;

  if (typeof onProgress === "function") onProgress({ type: "trial_start", trial, sourceSeed: sourceLife.seed });

  const passBInput = buildN1PassBInput(sourceNeutral);
  const passBCognition = projectPassBInputForCognition(passBInput);
  const passBResult = await adapter.invoke({
    systemPrompt: E2_N1_PASS_B_PROMPT,
    input: passBCognition,
    responseSchema: E2_N1_PASS_B_RESPONSE_SCHEMA,
    clientRequestId: `slice-e2-n1:trial-${pad(trial.trialOrdinal, 3)}:pass-b`,
  });
  const passBOutput = normalizePassBModelOutput(passBResult.output, passBInput);

  let passCInput = null;
  let passCCognition = null;
  let passCResult = null;
  let passCOutput = null;
  if (passBOutput.outcome === "remembered") {
    passCInput = passCInputFromMemory({ trialOrdinal: trial.trialOrdinal, passBOutput, neutralized: sourceNeutral });
    passCCognition = projectPassCInputForCognition(passCInput);
    passCResult = await adapter.invoke({
      systemPrompt: E2_N1_PASS_C_PROMPT,
      input: passCCognition,
      responseSchema: E2_N1_PASS_C_RESPONSE_SCHEMA,
      clientRequestId: `slice-e2-n1:trial-${pad(trial.trialOrdinal, 3)}:pass-c`,
    });
    passCOutput = normalizeInitialPassCModelOutput(passCResult.output, passCInput);
  }

  const memory = memoryForRater(passBOutput, trial.horizon);
  const meaning = meaningForRater(passCOutput);
  const raterInput = buildRaterInput({ memory, meaning, candidateA, candidateB, horizon: trial.horizon });
  const raterResult = await adapter.invoke({
    systemPrompt: E2_N1_RATER_PROMPT,
    input: raterInput,
    responseSchema: E2_N1_RATER_RESPONSE_SCHEMA,
    clientRequestId: `slice-e2-n1:trial-${pad(trial.trialOrdinal, 3)}:rater`,
  });
  const raterOutput = normalizeRaterOutput(raterResult.output, trial.horizon);
  const correct = raterOutput.chosenCandidate === trial.truthCandidate;

  if (typeof onProgress === "function") onProgress({
    type: "trial_complete",
    trial,
    memoryOutcome: passBOutput.outcome,
    meaningOutcome: passCOutput?.outcome ?? null,
    chosenCandidate: raterOutput.chosenCandidate,
    correct,
  });

  return Object.freeze({
    trialOrdinal: trial.trialOrdinal,
    worldId: trial.worldId,
    pairOrdinal: trial.pairOrdinal,
    repetitionOrdinal: trial.repetitionOrdinal,
    horizon: trial.horizon,
    pairSeeds: Object.freeze([leftLife.seed, rightLife.seed]),
    sourceSeed: sourceLife.seed,
    sourceRunOrdinal: sourceLife.runOrdinal,
    sourceSide: trial.sourceSide,
    candidateASide: trial.candidateASide,
    truthCandidate: trial.truthCandidate,
    assignmentDigest: trial.assignmentDigest,
    neutralization: Object.freeze({
      leftDigest: leftNeutral.neutralizationDigest,
      rightDigest: rightNeutral.neutralizationDigest,
      sourceDigest: sourceNeutral.neutralizationDigest,
    }),
    passB: Object.freeze({
      canonicalInputDigest: digest(passBInput),
      cognitionInputDigest: passBCognitionInputDigest(passBInput),
      rawOutputDigest: digest(passBResult.output),
      output: structuredClone(passBOutput),
      provenance: structuredClone(passBResult.provenance),
    }),
    passC: passCOutput === null ? null : Object.freeze({
      canonicalInputDigest: digest(passCInput),
      cognitionInputDigest: passCCognitionInputDigest(passCInput),
      rawOutputDigest: digest(passCResult.output),
      output: structuredClone(passCOutput),
      provenance: structuredClone(passCResult.provenance),
    }),
    rater: Object.freeze({
      inputDigest: digest(raterInput),
      rawOutputDigest: digest(raterResult.output),
      output: structuredClone(raterOutput),
      provenance: structuredClone(raterResult.provenance),
    }),
    correct,
  });
}

export async function runE2N1({ provider, model, sourceArtifact, adapterOverride = null, onProgress = null } = {}) {
  if (!["openai", "google"].includes(provider) && adapterOverride === null) throw new TypeError("provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new TypeError("model is required");
  validateSourceArtifact(sourceArtifact);
  const modelEvents = [];
  const adapter = adapterOverride ?? createAdapter({ provider, model, observer: (event) => modelEvents.push(event) });
  const plan = buildN1TrialPlan();
  const trials = [];
  for (const trial of plan) {
    trials.push(await runTrial({ trial, sourceArtifact, adapter, onProgress }));
  }
  const score = scoreN1Trials(trials);
  const byWorld = E2_DIAGNOSTIC_WORLDS.map((worldFixture) => {
    const subset = trials.filter((trial) => trial.worldId === worldFixture.id);
    return Object.freeze({ worldId: worldFixture.id, ...scoreN1Trials(subset) });
  });
  return Object.freeze({
    evidenceVersion: E2_N1_EVIDENCE_VERSION,
    protocolVersion: E2_N1_PROTOCOL_VERSION,
    status: "complete",
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    arm: E2_N1_ARM,
    provider,
    model,
    source: Object.freeze({
      evidenceVersion: sourceArtifact.evidenceVersion ?? null,
      protocolVersion: sourceArtifact.protocolVersion ?? null,
      arm: sourceArtifact.arm,
      generatedAt: sourceArtifact.generatedAt ?? null,
      artifactDigest: digest(sourceArtifact),
    }),
    protocol: Object.freeze({
      horizons: Object.freeze([...E2_N1_HORIZONS]),
      trialCount: E2_N1_TRIAL_COUNT,
      positiveThreshold: E2_N1_POSITIVE_THRESHOLD,
      thresholdChanceTail: exactBinomialTailHalf(E2_N1_TRIAL_COUNT, E2_N1_POSITIVE_THRESHOLD),
      passBPromptHash: digest(E2_N1_PASS_B_PROMPT),
      passBResponseSchemaHash: digest(E2_N1_PASS_B_RESPONSE_SCHEMA),
      passCPromptHash: digest(E2_N1_PASS_C_PROMPT),
      passCResponseSchemaHash: digest(E2_N1_PASS_C_RESPONSE_SCHEMA),
      raterPromptHash: digest(E2_N1_RATER_PROMPT),
      raterResponseSchemaHash: digest(E2_N1_RATER_RESPONSE_SCHEMA),
      passBBoundary: "life_only_unexposed",
      passCMode: "initial",
      candidateIdentifierNeutralization: true,
      richStructureMetadataVisibleToPassB: false,
      sourceAssignmentPerLife: 3,
      truthLabelBalance: Object.freeze({ A: 9, B: 9 }),
      candidateOrderBalance: Object.freeze({ leftAsA: 9, rightAsA: 9 }),
    }),
    plan: Object.freeze(plan.map((trial) => structuredClone(trial))),
    trials: Object.freeze(trials),
    score,
    byWorld: Object.freeze(byWorld),
    modelEvents: Object.freeze(structuredClone(modelEvents)),
    admissionVerdict: null,
  });
}

function progressPrinter(event) {
  const trial = event.trial;
  const prefix = `[N1 ${pad(trial.trialOrdinal, 2)}/${E2_N1_TRIAL_COUNT} ${trial.worldId} pair${trial.pairOrdinal} h${trial.horizon}]`;
  if (event.type === "trial_start") {
    process.stderr.write(`${prefix} B/C/rater ... `);
    return;
  }
  if (event.type === "trial_complete") {
    process.stderr.write(`${event.memoryOutcome} · meaning=${event.meaningOutcome ?? "n/a"} · chose=${event.chosenCandidate} ${event.correct ? "✓" : "✗"}\n`);
  }
}

function printSummary(result) {
  process.stdout.write(`N1: ${result.score.correct}/${result.score.n} correct · threshold=${result.score.positiveThreshold} · p_tail=${result.score.exactBinomialChanceTail}\n`);
  for (const world of result.byWorld) process.stdout.write(`  ${world.worldId}: ${world.correct}/${world.n}\n`);
  const memoryCounts = new Map();
  const meaningCounts = new Map();
  for (const trial of result.trials) {
    const memory = trial.passB.output.outcome;
    const meaning = trial.passC?.output.outcome ?? "not_run";
    memoryCounts.set(memory, (memoryCounts.get(memory) ?? 0) + 1);
    meaningCounts.set(meaning, (meaningCounts.get(meaning) ?? 0) + 1);
  }
  process.stdout.write(`Memory outcomes: ${[...memoryCounts.entries()].map(([key, count]) => `${key}=${count}`).join(" · ")}\n`);
  process.stdout.write(`Meaning outcomes: ${[...meaningCounts.entries()].map(([key, count]) => `${key}=${count}`).join(" · ")}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage: npm run genesis:e2-n1 -- --provider <openai|google> --model <model> --source <a2b-v2.json> [--out <file>] [--overwrite]\n");
    return;
  }
  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const sourcePath = readArg(argv, "--source");
  const outputPath = readArg(argv, "--out");
  const overwrite = argv.includes("--overwrite");
  if (!["openai", "google"].includes(provider)) throw new Error("--provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new Error("--model is required");
  if (typeof sourcePath !== "string" || sourcePath.trim() === "") throw new Error("--source is required");
  if (!existsSync(sourcePath)) throw new Error(`source artifact does not exist: ${sourcePath}`);
  if (outputPath !== null && existsSync(outputPath) && !overwrite) throw new Error(`output exists: ${outputPath}; pass --overwrite to replace it`);

  const sourceArtifact = JSON.parse(readFileSync(sourcePath, "utf8"));
  process.stderr.write(`E2 N1: START · ${E2_N1_TRIAL_COUNT} trials · horizons=${E2_N1_HORIZONS.join(",")} · source=${sourcePath}\n`);
  const result = await runE2N1({ provider, model, sourceArtifact, onProgress: progressPrinter });
  const text = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath !== null) writeFileSync(outputPath, text, "utf8");
  else process.stdout.write(text);
  printSummary(result);
  if (outputPath !== null) process.stdout.write(`Artifact: ${outputPath}\n`);
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`E2 N1: FAILED\n${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

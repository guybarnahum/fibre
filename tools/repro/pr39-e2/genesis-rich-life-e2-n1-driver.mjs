#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import { normalizePassBModelOutput } from "../services/world-kernel/src/genesis-pass-b-domain.mjs";
import { passBCognitionInputDigest, projectPassBInputForCognition } from "../services/world-kernel/src/genesis-pass-b-cognition.mjs";
import {
  GENESIS_PASS_C_INPUT_VERSION,
  GENESIS_PASS_C_POLICY,
  normalizeInitialPassCModelOutput,
  normalizePassCInput,
} from "../services/world-kernel/src/genesis-pass-c-domain.mjs";
import { passCCognitionInputDigest, projectPassCInputForCognition } from "../services/world-kernel/src/genesis-pass-c-cognition.mjs";
import {
  E2_N1_ARM,
  E2_N1_EVIDENCE_VERSION,
  E2_N1_HORIZONS,
  E2_N1_PASS_B_PROMPT,
  E2_N1_PASS_B_RESPONSE_SCHEMA,
  E2_N1_PASS_C_PROMPT,
  E2_N1_PASS_C_RESPONSE_SCHEMA,
  E2_N1_POSITIVE_THRESHOLD,
  E2_N1_PROTOCOL_VERSION,
  E2_N1_RATER_PROMPT,
  E2_N1_RATER_RESPONSE_SCHEMA,
  E2_N1_SOURCE_ARM,
  E2_N1_TRIAL_COUNT,
  buildN1PassBInput,
  buildN1TrialPlan,
  exactBinomialTailHalf,
  neutralizeN1Life,
  scoreN1Trials,
} from "./genesis-rich-life-e2-n1.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}

function createAdapter({ provider, model, observer }) {
  if (provider === "openai") return createOpenAIModelAdapter({ modelId: model, observer });
  if (provider === "google") return createGoogleModelAdapter({ modelId: model, observer });
  throw new TypeError(`unsupported provider ${provider}`);
}

function lifeFor(sourceArtifact, worldId, runOrdinal) {
  const life = sourceArtifact.worlds
    .find((world) => world.worldId === worldId)?.lives
    .find((candidate) => candidate.runOrdinal === runOrdinal);
  if (life === undefined) throw new TypeError(`N1 source life missing ${worldId} run ${runOrdinal}`);
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
  if (match === null) throw new TypeError(`N1 memory returned non-neutral episode ref ${ref}`);
  const ordinal = Number(match[1]);
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > horizon) throw new TypeError(`N1 memory episode ref ${ref} exceeds horizon`);
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
      memoryRef: `memory_n1_trial_${pad(trialOrdinal, 3)}`,
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
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) throw new TypeError("N1 rater output must be an object");
  const keys = Object.keys(candidate).sort();
  if (canonicalJson(keys) !== canonicalJson(["chosenCandidate", "evidenceEpisodeOrdinals", "rationale"].sort())) throw new TypeError("N1 rater output has unexpected keys");
  if (!["A", "B"].includes(candidate.chosenCandidate)) throw new TypeError("N1 rater chosenCandidate must be A or B");
  if (!Array.isArray(candidate.evidenceEpisodeOrdinals) || candidate.evidenceEpisodeOrdinals.length === 0) throw new TypeError("N1 rater must cite at least one episode ordinal");
  const ordinals = [...new Set(candidate.evidenceEpisodeOrdinals)];
  for (const ordinal of ordinals) {
    if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > horizon) throw new TypeError("N1 rater evidence ordinal exceeds visible horizon");
  }
  if (typeof candidate.rationale !== "string" || candidate.rationale.trim() === "") throw new TypeError("N1 rater rationale is required");
  return {
    chosenCandidate: candidate.chosenCandidate,
    evidenceEpisodeOrdinals: ordinals,
    rationale: candidate.rationale.trim(),
  };
}

function buildRaterInput({ passBOutput, passCOutput, candidateA, candidateB, horizon }) {
  return {
    protocolVersion: E2_N1_PROTOCOL_VERSION,
    rememberingHorizonEpisodeCount: horizon,
    memory: memoryForRater(passBOutput, horizon),
    meaning: meaningForRater(passCOutput),
    candidates: [
      { label: "A", history: candidateHistoryForRater(candidateA) },
      { label: "B", history: candidateHistoryForRater(candidateB) },
    ],
  };
}

function validateSourceArtifact(sourceArtifact) {
  if (sourceArtifact === null || typeof sourceArtifact !== "object" || Array.isArray(sourceArtifact)) throw new TypeError("N1 source artifact must be an object");
  if (sourceArtifact.status !== "complete" || sourceArtifact.arm !== E2_N1_SOURCE_ARM) throw new TypeError("N1 source artifact status/arm mismatch");
  if (sourceArtifact.developmentOnly !== true || sourceArtifact.burnedForFinalCohort !== true) throw new TypeError("N1 source artifact must remain development-burned");
  for (const worldFixture of E2_DIAGNOSTIC_WORLDS) {
    const world = sourceArtifact.worlds?.find((candidate) => candidate.worldId === worldFixture.id);
    if (!Array.isArray(world?.lives) || world.lives.length !== 3) throw new TypeError(`N1 source artifact lacks three lives for ${worldFixture.id}`);
    if (world.lives.some((life) => !Array.isArray(life.episodes) || life.episodes.length !== 10)) throw new TypeError("N1 source life must contain exactly ten episodes");
  }
}

function sourceWitness(sourceArtifact) {
  return {
    evidenceVersion: sourceArtifact.evidenceVersion ?? null,
    protocolVersion: sourceArtifact.protocolVersion ?? null,
    arm: sourceArtifact.arm,
    generatedAt: sourceArtifact.generatedAt ?? null,
    artifactDigest: digest(sourceArtifact),
  };
}

function protocolWitness() {
  return {
    horizons: [...E2_N1_HORIZONS],
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
    truthLabelBalance: { A: 9, B: 9 },
    candidateOrderBalance: { leftAsA: 9, rightAsA: 9 },
  };
}

function completedTrialKeys(trials) {
  return new Set(trials.map((trial) => trial.trialOrdinal));
}

export function validateN1ResumeArtifact(resumeArtifact, { provider, model, sourceArtifact }) {
  if (resumeArtifact === null) return;
  if (resumeArtifact.status !== "failed") throw new TypeError("N1 resume requires a failed artifact");
  if (resumeArtifact.arm !== E2_N1_ARM || resumeArtifact.protocolVersion !== E2_N1_PROTOCOL_VERSION) throw new TypeError("N1 resume protocol/arm mismatch");
  if (resumeArtifact.provider !== provider || resumeArtifact.model !== model) throw new TypeError("N1 resume provider/model mismatch");
  if (resumeArtifact.source?.artifactDigest !== digest(sourceArtifact)) throw new TypeError("N1 resume source artifact digest mismatch");
  if (!Array.isArray(resumeArtifact.completedTrials)) throw new TypeError("N1 resume artifact lacks completed trials");
  const plan = buildN1TrialPlan();
  const byOrdinal = new Map(plan.map((trial) => [trial.trialOrdinal, trial]));
  for (const completed of resumeArtifact.completedTrials) {
    const frozen = byOrdinal.get(completed.trialOrdinal);
    if (frozen === undefined || completed.assignmentDigest !== frozen.assignmentDigest) throw new TypeError("N1 resume completed-trial assignment mismatch");
  }
  if (resumeArtifact.inFlight !== null) {
    const frozen = byOrdinal.get(resumeArtifact.inFlight.trialOrdinal);
    if (frozen === undefined || resumeArtifact.inFlight.assignmentDigest !== frozen.assignmentDigest) throw new TypeError("N1 resume in-flight assignment mismatch");
  }
}

function artifactSnapshot({ status, provider, model, sourceArtifact, plan, completedTrials, inFlight, modelEvents, error = null, resumedFrom = null }) {
  const score = status === "complete" ? scoreN1Trials(completedTrials) : null;
  const byWorld = status === "complete"
    ? E2_DIAGNOSTIC_WORLDS.map((worldFixture) => {
      const subset = completedTrials.filter((trial) => trial.worldId === worldFixture.id);
      const correct = subset.filter((trial) => trial.correct).length;
      return { worldId: worldFixture.id, n: subset.length, correct, accuracy: subset.length === 0 ? null : correct / subset.length };
    })
    : null;
  return {
    evidenceVersion: E2_N1_EVIDENCE_VERSION,
    protocolVersion: E2_N1_PROTOCOL_VERSION,
    status,
    developmentOnly: true,
    burnedForFinalCohort: true,
    generatedAt: new Date().toISOString(),
    arm: E2_N1_ARM,
    provider,
    model,
    source: sourceWitness(sourceArtifact),
    protocol: protocolWitness(),
    resumedFrom,
    plan: plan.map((trial) => structuredClone(trial)),
    completedTrials: structuredClone(completedTrials),
    inFlight: inFlight === null ? null : structuredClone(inFlight),
    score,
    byWorld,
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
  const worldFixture = E2_DIAGNOSTIC_WORLDS.find((candidate) => candidate.id === trial.worldId);
  const leftLife = lifeFor(sourceArtifact, trial.worldId, trial.leftRunOrdinal);
  const rightLife = lifeFor(sourceArtifact, trial.worldId, trial.rightRunOrdinal);
  const leftNeutral = neutralizeN1Life({ worldFixture, life: leftLife, horizon: trial.horizon });
  const rightNeutral = neutralizeN1Life({ worldFixture, life: rightLife, horizon: trial.horizon });
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
  if (typeof onProgress === "function") onProgress({ type: "trial_start", trial });

  const passBInput = buildN1PassBInput(sourceNeutral);
  const passBCognition = projectPassBInputForCognition(passBInput);
  if (state.passBRaw === null) {
    const result = await adapter.invoke({
      systemPrompt: E2_N1_PASS_B_PROMPT,
      input: passBCognition,
      responseSchema: E2_N1_PASS_B_RESPONSE_SCHEMA,
      clientRequestId: `slice-e2-n1:trial-${pad(trial.trialOrdinal, 3)}:pass-b`,
    });
    state.passBRaw = { output: structuredClone(result.output), provenance: structuredClone(result.provenance) };
    await checkpoint(state);
  }
  const passBOutput = normalizePassBModelOutput(state.passBRaw.output, passBInput);

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
        clientRequestId: `slice-e2-n1:trial-${pad(trial.trialOrdinal, 3)}:pass-c`,
      });
      state.passCRaw = { output: structuredClone(result.output), provenance: structuredClone(result.provenance) };
      await checkpoint(state);
    }
    passCOutput = normalizeInitialPassCModelOutput(state.passCRaw.output, passCInput);
  } else if (!state.passCSkipped) {
    state.passCSkipped = true;
    await checkpoint(state);
  }

  const raterInput = buildRaterInput({ passBOutput, passCOutput, candidateA, candidateB, horizon: trial.horizon });
  if (state.raterRaw === null) {
    const result = await adapter.invoke({
      systemPrompt: E2_N1_RATER_PROMPT,
      input: raterInput,
      responseSchema: E2_N1_RATER_RESPONSE_SCHEMA,
      clientRequestId: `slice-e2-n1:trial-${pad(trial.trialOrdinal, 3)}:rater`,
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
  };
}

export async function runE2N1Driver({ provider, model, sourceArtifact, resumeArtifact = null, adapterOverride = null, onCheckpoint = null, onProgress = null } = {}) {
  validateSourceArtifact(sourceArtifact);
  validateN1ResumeArtifact(resumeArtifact, { provider, model, sourceArtifact });
  const plan = buildN1TrialPlan();
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
    const snapshot = artifactSnapshot({ status, provider, model, sourceArtifact, plan, completedTrials, inFlight, modelEvents, error, resumedFrom });
    if (typeof onCheckpoint === "function") await onCheckpoint(snapshot);
    return snapshot;
  };

  await emit("running");
  try {
    const done = completedTrialKeys(completedTrials);
    for (const trial of plan) {
      if (done.has(trial.trialOrdinal)) continue;
      if (inFlight !== null && inFlight.trialOrdinal !== trial.trialOrdinal) throw new TypeError("N1 resume in-flight trial is not the next incomplete trial");
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
    error.e2N1FailureArtifact = await emit("failed", error);
    throw error;
  }
}

function progressPrinter(event) {
  const trial = event.trial;
  const prefix = `[N1 ${pad(trial.trialOrdinal, 2)}/${E2_N1_TRIAL_COUNT} ${trial.worldId} pair${trial.pairOrdinal} h${trial.horizon}]`;
  if (event.type === "trial_start") {
    process.stderr.write(`${prefix} B/C/rater ... `);
  } else if (event.type === "trial_complete") {
    process.stderr.write(`${event.memoryOutcome} · meaning=${event.meaningOutcome ?? "n/a"} · chose=${event.chosenCandidate} ${event.correct ? "✓" : "✗"}\n`);
  }
}

function printSummary(result) {
  process.stdout.write(`N1: ${result.score.correct}/${result.score.n} correct · threshold=${result.score.positiveThreshold} · p_tail=${result.score.exactBinomialChanceTail}\n`);
  for (const world of result.byWorld) process.stdout.write(`  ${world.worldId}: ${world.correct}/${world.n}\n`);
  const memoryCounts = new Map();
  const meaningCounts = new Map();
  for (const trial of result.completedTrials) {
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
    process.stdout.write("Usage: npm run genesis:e2-n1 -- --provider <openai|google> --model <model> --source <a2b-v2.json> --out <n1.json> [--resume <failed-n1.json>] [--overwrite]\n");
    return;
  }
  const provider = readArg(argv, "--provider");
  const model = readArg(argv, "--model");
  const sourcePath = readArg(argv, "--source");
  const outputPath = readArg(argv, "--out");
  const resumePath = readArg(argv, "--resume");
  const overwrite = argv.includes("--overwrite");
  if (!["openai", "google"].includes(provider)) throw new Error("--provider must be openai or google");
  if (typeof model !== "string" || model.trim() === "") throw new Error("--model is required");
  if (typeof sourcePath !== "string" || sourcePath.trim() === "" || !existsSync(sourcePath)) throw new Error("--source must name an existing A2b artifact");
  if (typeof outputPath !== "string" || outputPath.trim() === "") throw new Error("--out is required for checkpoint-safe N1 execution");
  if (existsSync(outputPath) && !overwrite && resumePath === null) throw new Error(`output exists: ${outputPath}; pass --overwrite to replace it`);
  if (resumePath !== null && !existsSync(resumePath)) throw new Error(`resume artifact does not exist: ${resumePath}`);

  const sourceArtifact = JSON.parse(readFileSync(sourcePath, "utf8"));
  const resumeArtifact = resumePath === null ? null : JSON.parse(readFileSync(resumePath, "utf8"));
  const writeCheckpoint = async (artifact) => writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stderr.write(`E2 N1: START · ${E2_N1_TRIAL_COUNT} trials · horizons=${E2_N1_HORIZONS.join(",")} · source=${sourcePath}${resumePath === null ? "" : ` · resume=${resumePath}`}\n`);
  try {
    const result = await runE2N1Driver({
      provider,
      model,
      sourceArtifact,
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
    process.stderr.write(`E2 N1: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

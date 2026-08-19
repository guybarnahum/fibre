#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import {
  GENESIS_PASS_B_POLICY,
  normalizePassBModelOutput,
} from "../services/world-kernel/src/genesis-pass-b-domain.mjs";
import { projectPassBInputForCognition } from "../services/world-kernel/src/genesis-pass-b-cognition.mjs";
import {
  E2_N1_ARM,
  E2_N1_PASS_B_RESPONSE_SCHEMA,
  E2_N1_PROTOCOL_VERSION,
  E2_N1_TRIAL_COUNT,
  buildN1PassBInput,
  buildN1TrialPlan,
  neutralizeN1Life,
} from "./genesis-rich-life-e2-n1.mjs";
import { runE2N1Driver } from "./genesis-rich-life-e2-n1-driver.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";

export const E2_N1_PASS_B_FORM_REPAIR_PROMPT = `You are performing record-level form repair on an already-generated Fibre Genesis Pass-B memory.
The autobiographical-memory decision is frozen. Preserve outcome, episodeRefs, and uncertainty EXACTLY.
Only rememberedContent may change.
If outcome is remembered, rewrite rememberedContent as a shorter expression of the same recollection so it fits the supplied maxUtf8Bytes mechanical bound.
Do not add facts, cited episodes, durable meaning, significance, personality, lessons, future policy, or a summary of the whole life.
Do not use the repair to improve quality or distinctiveness. This is form repair only.
Return JSON matching the supplied schema.`;

export const E2_N1_PASS_B_FORM_REPAIR_CAP = 2;
export const E2_N1_PASS_B_BYTE_GATE = "pass_b_remembered_content_bytes";

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;
const utf8Bytes = (value) => Buffer.byteLength(value, "utf8");

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

export function isN1PassBRememberedContentByteFailure(failureArtifact) {
  if (failureArtifact?.status !== "failed") return false;
  if (failureArtifact.arm !== E2_N1_ARM || failureArtifact.protocolVersion !== E2_N1_PROTOCOL_VERSION) return false;
  if (failureArtifact.failure?.message !== `MemoryFormation.rememberedContent exceeds ${GENESIS_PASS_B_POLICY.maxRememberedContentBytes} UTF-8 bytes`) return false;
  const raw = failureArtifact.inFlight?.passBRaw?.output;
  return raw?.outcome === "remembered"
    && typeof raw.rememberedContent === "string"
    && utf8Bytes(raw.rememberedContent) > GENESIS_PASS_B_POLICY.maxRememberedContentBytes;
}

export function assertN1PassBFormRepairPreservesSelection(original, repaired) {
  if (repaired?.outcome !== original?.outcome) throw new TypeError("N1 Pass-B form repair changed outcome");
  if (canonicalJson(repaired?.episodeRefs) !== canonicalJson(original?.episodeRefs)) throw new TypeError("N1 Pass-B form repair changed episodeRefs");
  if (canonicalJson(repaired?.uncertainty) !== canonicalJson(original?.uncertainty)) throw new TypeError("N1 Pass-B form repair changed uncertainty");
  if (typeof repaired?.rememberedContent !== "string") throw new TypeError("N1 Pass-B form repair did not return rememberedContent");
  if (utf8Bytes(repaired.rememberedContent) > GENESIS_PASS_B_POLICY.maxRememberedContentBytes) {
    throw new TypeError("N1 Pass-B form repair still exceeds rememberedContent byte bound");
  }
}

function existingRepairAttempts(failureArtifact, trialOrdinal) {
  return (failureArtifact.modelEvents ?? []).filter((event) =>
    event?.type === "n1_pass_b_form_repair"
    && event.trialOrdinal === trialOrdinal).length;
}

function buildRepairContext({ sourceArtifact, failureArtifact }) {
  const trialOrdinal = failureArtifact.inFlight?.trialOrdinal;
  const trial = buildN1TrialPlan().find((candidate) => candidate.trialOrdinal === trialOrdinal);
  if (trial === undefined) throw new TypeError("N1 repair failure artifact does not identify a frozen trial");
  if (failureArtifact.inFlight.assignmentDigest !== trial.assignmentDigest) throw new TypeError("N1 repair assignment digest mismatch");
  const worldFixture = E2_DIAGNOSTIC_WORLDS.find((candidate) => candidate.id === trial.worldId);
  if (worldFixture === undefined) throw new TypeError("N1 repair trial world is unknown");
  const leftLife = lifeFor(sourceArtifact, trial.worldId, trial.leftRunOrdinal);
  const rightLife = lifeFor(sourceArtifact, trial.worldId, trial.rightRunOrdinal);
  const sourceLife = trial.sourceSide === "left" ? leftLife : rightLife;
  const sourceNeutral = neutralizeN1Life({ worldFixture, life: sourceLife, horizon: trial.horizon });
  const passBInput = buildN1PassBInput(sourceNeutral);
  return { trial, passBInput, passBCognition: projectPassBInputForCognition(passBInput) };
}

export async function repairN1PassBFailureArtifact({ failureArtifact, sourceArtifact, adapter }) {
  if (!isN1PassBRememberedContentByteFailure(failureArtifact)) throw new TypeError("N1 failure is not the rememberedContent byte-bound form failure");
  const { trial, passBInput, passBCognition } = buildRepairContext({ sourceArtifact, failureArtifact });
  const originalRaw = structuredClone(failureArtifact.inFlight.passBRaw);
  const originalOutput = originalRaw.output;
  let attemptsUsed = existingRepairAttempts(failureArtifact, trial.trialOrdinal);
  let lastFailure = null;

  while (attemptsUsed < E2_N1_PASS_B_FORM_REPAIR_CAP) {
    attemptsUsed += 1;
    const repairInput = {
      passBCognition: structuredClone(passBCognition),
      frozenOutput: structuredClone(originalOutput),
      mechanicalConstraint: {
        field: "rememberedContent",
        maxUtf8Bytes: GENESIS_PASS_B_POLICY.maxRememberedContentBytes,
        preserveExactly: ["outcome", "episodeRefs", "uncertainty"],
      },
    };
    const result = await adapter.invoke({
      systemPrompt: E2_N1_PASS_B_FORM_REPAIR_PROMPT,
      input: repairInput,
      responseSchema: E2_N1_PASS_B_RESPONSE_SCHEMA,
      clientRequestId: `slice-e2-n1:trial-${pad(trial.trialOrdinal, 3)}:pass-b-form-repair-${attemptsUsed}`,
    });

    const witness = {
      type: "n1_pass_b_form_repair",
      trialOrdinal: trial.trialOrdinal,
      repairAttempt: attemptsUsed,
      gate: E2_N1_PASS_B_BYTE_GATE,
      maxUtf8Bytes: GENESIS_PASS_B_POLICY.maxRememberedContentBytes,
      originalRememberedContentBytes: utf8Bytes(originalOutput.rememberedContent),
      originalOutputDigest: digest(originalOutput),
      originalProvenance: structuredClone(originalRaw.provenance),
      repairInputDigest: digest(repairInput),
      repairPromptHash: digest(E2_N1_PASS_B_FORM_REPAIR_PROMPT),
      repairSchemaHash: digest(E2_N1_PASS_B_RESPONSE_SCHEMA),
      repairedOutputDigest: digest(result.output),
      repairedRememberedContentBytes: typeof result.output?.rememberedContent === "string" ? utf8Bytes(result.output.rememberedContent) : null,
      repairProvenance: structuredClone(result.provenance),
      preservedSelection: false,
      admittedForm: false,
      rejectedOutput: structuredClone(originalOutput),
    };

    try {
      assertN1PassBFormRepairPreservesSelection(originalOutput, result.output);
      normalizePassBModelOutput(result.output, passBInput);
      witness.preservedSelection = true;
      witness.admittedForm = true;
      const repairedArtifact = structuredClone(failureArtifact);
      repairedArtifact.inFlight.passBRaw = {
        output: structuredClone(result.output),
        provenance: structuredClone(result.provenance),
      };
      repairedArtifact.modelEvents = [...(repairedArtifact.modelEvents ?? []), witness];
      repairedArtifact.failure = null;
      return repairedArtifact;
    } catch (error) {
      lastFailure = error;
      const retryArtifact = structuredClone(failureArtifact);
      retryArtifact.modelEvents = [...(retryArtifact.modelEvents ?? []), {
        ...witness,
        repairFailure: { name: error?.name ?? null, message: error?.message ?? String(error) },
      }];
      failureArtifact = retryArtifact;
    }
  }

  const error = new Error(`N1 Pass-B record form repair exhausted after ${E2_N1_PASS_B_FORM_REPAIR_CAP} repair attempts: ${lastFailure?.message ?? "unknown form failure"}`);
  error.code = "record_repair_exhausted";
  throw error;
}

export async function runE2N1WithFormRepair({ provider, model, sourceArtifact, resumeArtifact = null, adapterOverride = null, onCheckpoint = null, onProgress = null } = {}) {
  const repairModelEvents = [];
  const repairAdapter = adapterOverride ?? createAdapter({ provider, model, observer: (event) => repairModelEvents.push(event) });
  let resume = resumeArtifact;

  if (resume !== null && isN1PassBRememberedContentByteFailure(resume)) {
    resume = await repairN1PassBFailureArtifact({ failureArtifact: resume, sourceArtifact, adapter: repairAdapter });
    resume.modelEvents = [...(resume.modelEvents ?? []), ...repairModelEvents.splice(0)];
    if (typeof onCheckpoint === "function") await onCheckpoint(resume);
  }

  while (true) {
    try {
      return await runE2N1Driver({ provider, model, sourceArtifact, resumeArtifact: resume, onCheckpoint, onProgress });
    } catch (error) {
      const failureArtifact = error.e2N1FailureArtifact;
      if (!isN1PassBRememberedContentByteFailure(failureArtifact)) throw error;
      resume = await repairN1PassBFailureArtifact({ failureArtifact, sourceArtifact, adapter: repairAdapter });
      resume.modelEvents = [...(resume.modelEvents ?? []), ...repairModelEvents.splice(0)];
      if (typeof onCheckpoint === "function") await onCheckpoint(resume);
    }
  }
}

function progressPrinter(event) {
  const trial = event.trial;
  const prefix = `[N1 ${pad(trial.trialOrdinal, 2)}/${E2_N1_TRIAL_COUNT} ${trial.worldId} pair${trial.pairOrdinal} h${trial.horizon}]`;
  if (event.type === "trial_start") process.stderr.write(`${prefix} B/C/rater ... `);
  else if (event.type === "trial_complete") process.stderr.write(`${event.memoryOutcome} · meaning=${event.meaningOutcome ?? "n/a"} · chose=${event.chosenCandidate} ${event.correct ? "✓" : "✗"}\n`);
}

function printSummary(result) {
  process.stdout.write(`N1: ${result.score.correct}/${result.score.n} correct · threshold=${result.score.positiveThreshold} · p_tail=${result.score.exactBinomialChanceTail}\n`);
  for (const world of result.byWorld) process.stdout.write(`  ${world.worldId}: ${world.correct}/${world.n}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage: npm run genesis:e2-n1 -- --provider <openai|google> --model <model> --source <a2b-v3.json> --out <n1.json> [--resume <failed-n1.json>] [--overwrite]\n");
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
  if (resumePath !== null && !existsSync(resumePath)) throw new Error(`resume artifact does not exist: ${resumePath}`);
  if (existsSync(outputPath) && !overwrite && resumePath === null) throw new Error(`output exists: ${outputPath}; pass --overwrite to replace it`);

  const sourceArtifact = JSON.parse(readFileSync(sourcePath, "utf8"));
  const resumeArtifact = resumePath === null ? null : JSON.parse(readFileSync(resumePath, "utf8"));
  const writeCheckpoint = async (artifact) => writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stderr.write(`E2 N1: START · ${E2_N1_TRIAL_COUNT} trials · source=${sourcePath}${resumePath === null ? "" : ` · resume=${resumePath}`}\n`);
  try {
    const result = await runE2N1WithFormRepair({ provider, model, sourceArtifact, resumeArtifact, onCheckpoint: writeCheckpoint, onProgress: progressPrinter });
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

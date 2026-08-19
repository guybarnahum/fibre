#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import { GENESIS_PASS_B_POLICY } from "../services/world-kernel/src/genesis-pass-b-domain.mjs";
import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import {
  E2_N1_ARM,
  E2_N1_EVIDENCE_VERSION,
  E2_N1_PASS_B_PROMPT,
  E2_N1_PASS_B_RESPONSE_SCHEMA,
  E2_N1_PROTOCOL_VERSION,
  E2_N1_TRIAL_COUNT,
} from "./genesis-rich-life-e2-n1.mjs";
import { runE2N1Driver } from "./genesis-rich-life-e2-n1-driver.mjs";

export const E2_N1_BOUNDED_EVIDENCE_VERSION = "pr39-slice-e2-n1-v2";
export const E2_N1_PASS_B_FORM_PROFILE = "n1-pass-b-bounded-output-v1";
export const E2_N1_PASS_B_MAX_MODEL_CHARACTERS = 600;

export const E2_N1_BOUNDED_PASS_B_PROMPT = `${E2_N1_PASS_B_PROMPT}
Mechanical form constraint: when outcome=remembered, rememberedContent MUST be at most ${E2_N1_PASS_B_MAX_MODEL_CHARACTERS} characters total. Keep only the concrete recollection; do not spend the budget summarizing the visible life. This character ceiling is a model-facing safety margin below Fibre's canonical ${GENESIS_PASS_B_POLICY.maxRememberedContentBytes}-UTF-8-byte admission bound.`;

export const E2_N1_BOUNDED_PASS_B_RESPONSE_SCHEMA = Object.freeze({
  ...structuredClone(E2_N1_PASS_B_RESPONSE_SCHEMA),
  properties: Object.freeze({
    ...structuredClone(E2_N1_PASS_B_RESPONSE_SCHEMA.properties),
    rememberedContent: Object.freeze({
      ...structuredClone(E2_N1_PASS_B_RESPONSE_SCHEMA.properties.rememberedContent),
      maxLength: E2_N1_PASS_B_MAX_MODEL_CHARACTERS,
    }),
  }),
});

const digest = (value) => `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

function createProviderAdapter({ provider, model, observer }) {
  if (provider === "openai") return createOpenAIModelAdapter({ modelId: model, observer });
  if (provider === "google") return createGoogleModelAdapter({ modelId: model, observer });
  throw new TypeError(`unsupported provider ${provider}`);
}

function createBoundedAdapter({ provider, model, observer }) {
  const base = createProviderAdapter({ provider, model, observer });
  return Object.freeze({
    provider: base.provider,
    modelId: base.modelId,
    configuration: Object.freeze({
      ...structuredClone(base.configuration),
      n1PassBFormProfile: E2_N1_PASS_B_FORM_PROFILE,
      n1PassBMaxModelCharacters: E2_N1_PASS_B_MAX_MODEL_CHARACTERS,
    }),
    async invoke(args) {
      if (args.clientRequestId.endsWith(":pass-b")) {
        return base.invoke({
          ...args,
          systemPrompt: E2_N1_BOUNDED_PASS_B_PROMPT,
          responseSchema: E2_N1_BOUNDED_PASS_B_RESPONSE_SCHEMA,
        });
      }
      return base.invoke(args);
    },
  });
}

export function decorateN1BoundedArtifact(snapshot, providerEvents = snapshot?.modelEvents ?? []) {
  const decorated = structuredClone(snapshot);
  decorated.evidenceVersion = E2_N1_BOUNDED_EVIDENCE_VERSION;
  decorated.protocolVersion = E2_N1_PROTOCOL_VERSION;
  decorated.executionAmendment = {
    profile: E2_N1_PASS_B_FORM_PROFILE,
    scientificProtocolChanged: false,
    trialPlanChanged: false,
    thresholdChanged: false,
    priorScientificScoreObserved: false,
    supersedesFailedEvidenceVersion: E2_N1_EVIDENCE_VERSION,
    passBModelFacingMaxCharacters: E2_N1_PASS_B_MAX_MODEL_CHARACTERS,
    canonicalPassBMaxRememberedContentBytes: GENESIS_PASS_B_POLICY.maxRememberedContentBytes,
    reason: "N1-v1 aborted before Pass C/rater/scoring because Pass-B rememberedContent exceeded the canonical byte bound and both permitted form repairs remained over-bound.",
  };
  decorated.protocol = {
    ...structuredClone(decorated.protocol),
    passBPromptHash: digest(E2_N1_BOUNDED_PASS_B_PROMPT),
    passBResponseSchemaHash: digest(E2_N1_BOUNDED_PASS_B_RESPONSE_SCHEMA),
    passBFormProfile: E2_N1_PASS_B_FORM_PROFILE,
    passBModelFacingMaxCharacters: E2_N1_PASS_B_MAX_MODEL_CHARACTERS,
  };
  decorated.modelEvents = structuredClone(providerEvents);
  return decorated;
}

export async function runE2N1Bounded({
  provider,
  model,
  sourceArtifact,
  resumeArtifact = null,
  onCheckpoint = null,
  onProgress = null,
} = {}) {
  if (resumeArtifact !== null && resumeArtifact.evidenceVersion !== E2_N1_BOUNDED_EVIDENCE_VERSION) {
    throw new TypeError(`N1 bounded execution may resume only ${E2_N1_BOUNDED_EVIDENCE_VERSION} artifacts; failed v1 evidence is burned and must not be continued`);
  }
  const providerEvents = structuredClone(resumeArtifact?.modelEvents ?? []);
  const adapter = createBoundedAdapter({ provider, model, observer: (event) => providerEvents.push(event) });
  const checkpoint = typeof onCheckpoint !== "function"
    ? null
    : async (snapshot) => onCheckpoint(decorateN1BoundedArtifact(snapshot, providerEvents));
  try {
    const result = await runE2N1Driver({
      provider,
      model,
      sourceArtifact,
      resumeArtifact,
      adapterOverride: adapter,
      onCheckpoint: checkpoint,
      onProgress,
    });
    return decorateN1BoundedArtifact(result, providerEvents);
  } catch (error) {
    if (error?.e2N1FailureArtifact !== undefined) {
      error.e2N1FailureArtifact = decorateN1BoundedArtifact(error.e2N1FailureArtifact, providerEvents);
    }
    throw error;
  }
}

function progressPrinter(event) {
  const trial = event.trial;
  const prefix = `[N1v2 ${String(trial.trialOrdinal).padStart(2, "0")}/${E2_N1_TRIAL_COUNT} ${trial.worldId} pair${trial.pairOrdinal} h${trial.horizon}]`;
  if (event.type === "trial_start") process.stderr.write(`${prefix} B/C/rater ... `);
  else if (event.type === "trial_complete") process.stderr.write(`${event.memoryOutcome} · meaning=${event.meaningOutcome ?? "n/a"} · chose=${event.chosenCandidate} ${event.correct ? "✓" : "✗"}\n`);
}

function printSummary(result) {
  process.stdout.write(`N1v2: ${result.score.correct}/${result.score.n} correct · threshold=${result.score.positiveThreshold} · p_tail=${result.score.exactBinomialChanceTail}\n`);
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
    process.stdout.write("Usage: npm run genesis:e2-n1 -- --provider <openai|google> --model <model> --source <a2b-v3.json> --out <n1-v2.json> [--resume <failed-n1-v2.json>] [--overwrite]\n");
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
  process.stderr.write(`E2 N1v2: START · ${E2_N1_TRIAL_COUNT} trials · Pass-B<=${E2_N1_PASS_B_MAX_MODEL_CHARACTERS} chars · source=${sourcePath}${resumePath === null ? "" : ` · resume=${resumePath}`}\n`);
  try {
    const result = await runE2N1Bounded({
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
    process.stderr.write(`E2 N1v2: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";

import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";
import {
  CONTROL_GENOME_A,
  CONTROL_GENOME_B,
  CONTROL_SITUATIONS,
  runGenomeSpecificityControl,
} from "./genesis-genome-positive-control.mjs";

const TOTAL_CALLS = CONTROL_SITUATIONS.length * 3;
const SITUATION_ORDINAL = new Map(CONTROL_SITUATIONS.map(({ id }, index) => [id, index + 1]));

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

function normalizeGenome(candidate, name) {
  if (!Array.isArray(candidate) || candidate.length === 0) throw new TypeError(`${name} must be a non-empty array`);
  return candidate.map((value, index) => {
    if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name}[${index}] must be non-empty text`);
    return value.trim();
  });
}

function readGenomeFile(path, name) {
  if (path === null) return null;
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const candidate = Array.isArray(parsed) ? parsed : parsed?.orderedLoci?.map((locus) => locus.value) ?? parsed?.loci;
  return normalizeGenome(candidate, name);
}

function createBaseAdapter({ provider, model, environment, fetchImpl, observer }) {
  if (provider === "openai") {
    return createOpenAIModelAdapter({ environment, modelId: model, fetchImpl, observer });
  }
  if (provider === "google") {
    return createGoogleModelAdapter({ environment, modelId: model, fetchImpl, observer });
  }
  throw new TypeError(`unsupported provider ${provider}`);
}

function callDescription(clientRequestId) {
  const parts = String(clientRequestId).split(":");
  if (parts[0] !== "genome-control") return { situationId: "?", stage: "model call" };
  if (parts[1] === "generate") return { situationId: parts[3] ?? "?", stage: `generate ${parts[2] ?? "?"}` };
  if (parts[1] === "rate") return { situationId: parts[2] ?? "?", stage: "blind rate" };
  return { situationId: "?", stage: parts[1] ?? "model call" };
}

function progressSink(stream = process.stderr) {
  function line(text) {
    if (stream.isTTY) stream.write(`\r\u001b[2K${text}\n`);
    else stream.write(`${text}\n`);
  }
  function active(text) {
    if (stream.isTTY) stream.write(`\r\u001b[2K${text}`);
    else stream.write(`${text}\n`);
  }
  return { line, active };
}

export function createProgressAdapterFactory({ stream = process.stderr, now = () => Date.now() } = {}) {
  const progress = progressSink(stream);
  let callNumber = 0;
  return ({ provider, model, environment, fetchImpl, observer }) => {
    let activeCall = null;
    const base = createBaseAdapter({
      provider,
      model,
      environment,
      fetchImpl,
      observer: (event) => {
        observer?.(event);
        if (event?.type === "operational_failure" && activeCall !== null) {
          const retryText = event.retrying
            ? `retrying${event.retryDelayMs === null ? "" : ` in ${event.retryDelayMs} ms`}`
            : "not retrying";
          progress.line(`${activeCall.prefix} ! ${event.failure?.code ?? "MODEL_ERROR"} · ${retryText}`);
        }
      },
    });

    return Object.freeze({
      ...base,
      async invoke(request) {
        callNumber += 1;
        const { situationId, stage } = callDescription(request?.clientRequestId);
        const trial = SITUATION_ORDINAL.get(situationId) ?? "?";
        const prefix = `[trial ${String(trial).padStart(2, "0")}/${CONTROL_SITUATIONS.length} · call ${String(callNumber).padStart(2, "0")}/${TOTAL_CALLS}] ${stage} · ${provider}/${model}`;
        const startedAt = now();
        activeCall = { prefix };
        progress.active(`${prefix} ...`);
        try {
          const result = await base.invoke(request);
          const elapsedMs = now() - startedAt;
          progress.line(`${prefix} ✓ ${elapsedMs} ms`);
          return result;
        } catch (error) {
          const elapsedMs = now() - startedAt;
          progress.line(`${prefix} ✗ ${elapsedMs} ms · ${error?.code ?? error?.name ?? "ERROR"}`);
          throw error;
        } finally {
          activeCall = null;
        }
      },
    });
  };
}

function printUsage() {
  process.stdout.write(
    "Usage: npm run genesis:genome-control -- --provider openai|google --model <generator-model> [--rater-provider openai|google --rater-model <model>] [--genome-a-file <json> --genome-b-file <json> --genome-source <label>] [--seed <seed>] [--out <file>]\n",
  );
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    return;
  }

  const generatorProvider = readArg(argv, "--provider");
  const generatorModel = readArg(argv, "--model");
  if (!["openai", "google"].includes(generatorProvider)) throw new Error("--provider must be openai or google");
  if (typeof generatorModel !== "string" || generatorModel.trim() === "") throw new Error("--model is required");

  const raterProvider = readArg(argv, "--rater-provider", generatorProvider);
  const raterModel = readArg(argv, "--rater-model", generatorModel);
  if (!["openai", "google"].includes(raterProvider)) throw new Error("--rater-provider must be openai or google");
  if (typeof raterModel !== "string" || raterModel.trim() === "") throw new Error("--rater-model is required");

  const seed = readArg(argv, "--seed", "slice-b-positive-control-v3");
  const genomeAFile = readArg(argv, "--genome-a-file");
  const genomeBFile = readArg(argv, "--genome-b-file");
  if ((genomeAFile === null) !== (genomeBFile === null)) throw new Error("--genome-a-file and --genome-b-file must be provided together");

  const genomeA = readGenomeFile(genomeAFile, "genomeA") ?? CONTROL_GENOME_A;
  const genomeB = readGenomeFile(genomeBFile, "genomeB") ?? CONTROL_GENOME_B;
  const genomeSource = readArg(argv, "--genome-source", genomeAFile === null ? "hand_authored_exemplars" : "external_frozen_genomes");
  const outputPath = readArg(argv, "--out");

  process.stderr.write(`GENESIS GENOME CONTROL: START · 24 trials · 72 model calls\n`);
  process.stderr.write(`Generator: ${generatorProvider}/${generatorModel}\n`);
  process.stderr.write(`Rater: ${raterProvider}/${raterModel}\n`);

  const startedAt = Date.now();
  const result = await runGenomeSpecificityControl({
    generatorProvider,
    generatorModel,
    raterProvider,
    raterModel,
    genomeA,
    genomeB,
    genomeSource,
    seed,
    adapterFactory: createProgressAdapterFactory(),
  });
  const elapsedMs = Date.now() - startedAt;
  const text = `${JSON.stringify(result, null, 2)}\n`;

  if (outputPath !== null) {
    writeFileSync(outputPath, text, "utf8");
    process.stdout.write(`GENESIS GENOME CONTROL: COMPLETE\n`);
    process.stdout.write(`Correct: ${result.result.correct}/${result.result.trials} (${(result.result.accuracy * 100).toFixed(1)}%)\n`);
    process.stdout.write(`Exact one-sided p: ${result.result.exactOneSidedBinomialP}\n`);
    process.stdout.write(`A-left: ${result.positionBalance.genomeALeft.correct}/${result.positionBalance.genomeALeft.trials}\n`);
    process.stdout.write(`A-right: ${result.positionBalance.genomeARight.correct}/${result.positionBalance.genomeARight.trials}\n`);
    process.stdout.write(`Elapsed: ${(elapsedMs / 1000).toFixed(1)} s\n`);
    process.stdout.write(`Artifact: ${outputPath}\n`);
    return;
  }

  process.stdout.write(text);
}

main().catch((error) => {
  process.stderr.write(`GENESIS GENOME CONTROL: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
  process.exitCode = 1;
});

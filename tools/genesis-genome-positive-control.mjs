#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";

export const GENOME_CONTROL_VERSION = "genesis-genome-specificity-control-v1";

export const CONTROL_GENOME_A = Object.freeze([
  "changes tactics after a failed attempt instead of repeating it unchanged",
  "becomes curious when two trusted accounts disagree about the same event",
  "asks for evidence when authority relies mainly on rank or reputation",
  "recovers from embarrassment by preparing more carefully the next time",
  "shows affection by noticing practical burdens before being asked",
  "seeks company after long periods of concentrated solitary work",
]);

export const CONTROL_GENOME_B = Object.freeze([
  "keeps small promises even when nobody else is likely to notice",
  "uses humor to lower tension when a group becomes excessively formal",
  "hesitates to ask for favors when another person already seems overloaded",
  "prefers to confront a conflict early rather than let resentment accumulate",
  "takes unfamiliar routes when routine has made attention feel automatic",
  "becomes more persistent when another person is depending on the outcome",
]);

export const CONTROL_SITUATIONS = Object.freeze([
  { id: "s1", text: "A group plan fails for the second time, with an hour left before a deadline." },
  { id: "s2", text: "Two people the person trusts give incompatible accounts of the same meeting." },
  { id: "s3", text: "A respected organizer insists on a rule but gives little explanation for it." },
  { id: "s4", text: "The person makes a visible mistake in front of people whose opinion matters." },
  { id: "s5", text: "A close friend is quietly carrying more work than everyone else." },
  { id: "s6", text: "After several hours alone on a difficult task, an unplanned social invitation arrives." },
  { id: "s7", text: "A minor disagreement has stayed polite for days but is beginning to create distance." },
  { id: "s8", text: "A familiar afternoon unexpectedly opens with no obligations or scheduled plans." },
]);

const GENERATOR_PROMPT = `You are running a controlled Fibre development diagnostic.
For each neutral situation, write one short plausible internal interpretation or point of attention that could be shaped by the supplied symbolic genome.
This is a ceiling test of semantic specificity, not a biography and not a prediction of fixed behavior.
Do not mention genomes, loci, traits, labels, or testing. Do not quote or closely paraphrase the locus wording. Do not write universal future rules such as "I always" or "I never".
Return exactly one item per situation in the supplied order.`;

const RATER_PROMPT = `You are a blind rater for a Fibre symbolic-genome specificity control.
For each trial, compare the two candidate semantic responses against Genome A and Genome B.
Choose which candidate is more characteristically aligned with Genome A rather than Genome B.
Judge semantic route and attention, not prose style. You do not know which model call produced either candidate and must not infer from candidate ordering.
Return exactly one choice per trial in the supplied order.`;

export const GENERATOR_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      minItems: CONTROL_SITUATIONS.length,
      maxItems: CONTROL_SITUATIONS.length,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["situationId", "semanticResponse"],
        properties: {
          situationId: { type: "string", enum: CONTROL_SITUATIONS.map((item) => item.id) },
          semanticResponse: { type: "string", minLength: 8, maxLength: 500 },
        },
      },
    },
  },
});

export const RATER_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["choices"],
  properties: {
    choices: {
      type: "array",
      minItems: CONTROL_SITUATIONS.length,
      maxItems: CONTROL_SITUATIONS.length,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["situationId", "genomeAChoice"],
        properties: {
          situationId: { type: "string", enum: CONTROL_SITUATIONS.map((item) => item.id) },
          genomeAChoice: { type: "string", enum: ["left", "right"] },
        },
      },
    },
  },
});

function digest(value) {
  return `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;
}

function createAdapter({ provider, model, environment, fetchImpl, observer }) {
  if (provider === "openai") {
    return createOpenAIModelAdapter({ environment, modelId: model, fetchImpl, observer });
  }
  if (provider === "google") {
    return createGoogleModelAdapter({ environment, modelId: model, fetchImpl, observer });
  }
  throw new TypeError(`unsupported provider ${provider}`);
}

function validateGenerated(output) {
  const byId = new Map(output.items.map((item) => [item.situationId, item]));
  if (byId.size !== CONTROL_SITUATIONS.length) throw new Error("generator returned duplicate/missing situation IDs");
  return CONTROL_SITUATIONS.map(({ id }) => {
    const item = byId.get(id);
    if (item === undefined || typeof item.semanticResponse !== "string" || item.semanticResponse.trim() === "") {
      throw new Error(`generator omitted semantic response for ${id}`);
    }
    return { situationId: id, semanticResponse: item.semanticResponse.trim() };
  });
}

export function candidateOrderFor(seed, situationId) {
  return Number.parseInt(sha256(canonicalJson({ seed, situationId })).slice(0, 2), 16) % 2 === 0
    ? "A-left"
    : "A-right";
}

function buildTrials(outputsA, outputsB, seed) {
  return CONTROL_SITUATIONS.map((situation, index) => {
    const order = candidateOrderFor(seed, situation.id);
    const a = outputsA[index].semanticResponse;
    const b = outputsB[index].semanticResponse;
    return {
      situationId: situation.id,
      situation: situation.text,
      left: order === "A-left" ? a : b,
      right: order === "A-left" ? b : a,
      correctGenomeAChoice: order === "A-left" ? "left" : "right",
    };
  });
}

function validateChoices(output) {
  const byId = new Map(output.choices.map((item) => [item.situationId, item]));
  if (byId.size !== CONTROL_SITUATIONS.length) throw new Error("rater returned duplicate/missing situation IDs");
  return CONTROL_SITUATIONS.map(({ id }) => {
    const item = byId.get(id);
    if (item === undefined || !["left", "right"].includes(item.genomeAChoice)) {
      throw new Error(`rater omitted a valid choice for ${id}`);
    }
    return { situationId: id, genomeAChoice: item.genomeAChoice };
  });
}

export async function runGenomeSpecificityControl({
  generatorProvider,
  generatorModel,
  raterProvider = generatorProvider,
  raterModel = generatorModel,
  seed = "slice-b-positive-control-v1",
  environment = process.env,
  fetchImpl = globalThis.fetch,
  adapterFactory = createAdapter,
} = {}) {
  const generatorEvents = [];
  const raterEvents = [];
  const generator = adapterFactory({
    provider: generatorProvider,
    model: generatorModel,
    environment,
    fetchImpl,
    observer: (event) => generatorEvents.push(event),
  });

  async function generate(label, genome) {
    const result = await generator.invoke({
      systemPrompt: GENERATOR_PROMPT,
      input: {
        controlVersion: GENOME_CONTROL_VERSION,
        genome,
        situations: CONTROL_SITUATIONS,
      },
      responseSchema: GENERATOR_SCHEMA,
      clientRequestId: `genome-control:generate:${label}:${seed}`,
    });
    return { outputs: validateGenerated(result.output), provenance: result.provenance };
  }

  const generatedA = await generate("A", CONTROL_GENOME_A);
  const generatedB = await generate("B", CONTROL_GENOME_B);
  const trialsWithAnswers = buildTrials(generatedA.outputs, generatedB.outputs, seed);
  const blindedTrials = trialsWithAnswers.map(({ correctGenomeAChoice: _hidden, ...trial }) => trial);

  const rater = adapterFactory({
    provider: raterProvider,
    model: raterModel,
    environment,
    fetchImpl,
    observer: (event) => raterEvents.push(event),
  });
  const rating = await rater.invoke({
    systemPrompt: RATER_PROMPT,
    input: {
      controlVersion: GENOME_CONTROL_VERSION,
      genomeA: CONTROL_GENOME_A,
      genomeB: CONTROL_GENOME_B,
      trials: blindedTrials,
    },
    responseSchema: RATER_SCHEMA,
    clientRequestId: `genome-control:rate:${seed}`,
  });
  const choices = validateChoices(rating.output);
  const scored = choices.map((choice, index) => ({
    ...choice,
    correctChoice: trialsWithAnswers[index].correctGenomeAChoice,
    correct: choice.genomeAChoice === trialsWithAnswers[index].correctGenomeAChoice,
  }));
  const correct = scored.filter((item) => item.correct).length;

  return {
    controlVersion: GENOME_CONTROL_VERSION,
    seed,
    generatedAt: new Date().toISOString(),
    interpretation: "Slice-B capability ceiling only; this score is not Genesis personhood evidence and is not an admission gate.",
    generator: {
      provider: generatorProvider,
      model: generatorModel,
      promptHash: digest(GENERATOR_PROMPT),
      schemaHash: digest(GENERATOR_SCHEMA),
      calls: [generatedA.provenance, generatedB.provenance],
      eventTypes: generatorEvents.map((event) => event.type),
    },
    rater: {
      provider: raterProvider,
      model: raterModel,
      promptHash: digest(RATER_PROMPT),
      schemaHash: digest(RATER_SCHEMA),
      provenance: rating.provenance,
      eventTypes: raterEvents.map((event) => event.type),
    },
    genomes: { A: CONTROL_GENOME_A, B: CONTROL_GENOME_B },
    situations: CONTROL_SITUATIONS,
    outputs: { A: generatedA.outputs, B: generatedB.outputs },
    blindedTrials,
    scoredChoices: scored,
    result: {
      trials: scored.length,
      correct,
      accuracy: correct / scored.length,
      chanceAccuracy: 0.5,
    },
  };
}

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(
      "Usage: npm run genesis:genome-control -- --provider openai --model <model> [--rater-provider openai --rater-model <model>] [--seed <seed>] [--out <file>]\n",
    );
    return;
  }
  const generatorProvider = readArg(argv, "--provider");
  const generatorModel = readArg(argv, "--model");
  if (!["openai", "google"].includes(generatorProvider)) throw new Error("--provider must be openai or google");
  if (typeof generatorModel !== "string" || generatorModel.trim() === "") throw new Error("--model is required");
  const raterProvider = readArg(argv, "--rater-provider", generatorProvider);
  const raterModel = readArg(argv, "--rater-model", generatorModel);
  const seed = readArg(argv, "--seed", "slice-b-positive-control-v1");
  const outputPath = readArg(argv, "--out");
  const result = await runGenomeSpecificityControl({
    generatorProvider,
    generatorModel,
    raterProvider,
    raterModel,
    seed,
  });
  const text = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath !== null) writeFileSync(outputPath, text, "utf8");
  process.stdout.write(text);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`GENESIS GENOME CONTROL: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

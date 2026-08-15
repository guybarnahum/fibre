#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import { createGoogleModelAdapter } from "../services/world-kernel/src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../services/world-kernel/src/model-runtime/openai.mjs";

export const GENOME_CONTROL_VERSION = "genesis-genome-specificity-control-v2";

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

// Twenty-four distinct situations give the 2AFC instrument enough power to detect
// a useful-but-not-near-ceiling signal. Each situation is generated and rated in
// isolation; no model call can use cross-trial voice clustering as evidence.
export const CONTROL_SITUATIONS = Object.freeze([
  { id: "s01", text: "A group plan fails for the second time, with an hour left before a deadline." },
  { id: "s02", text: "Two people the person trusts give incompatible accounts of the same meeting." },
  { id: "s03", text: "A respected organizer insists on a rule but gives little explanation for it." },
  { id: "s04", text: "The person makes a visible mistake in front of people whose opinion matters." },
  { id: "s05", text: "A close friend is quietly carrying more work than everyone else." },
  { id: "s06", text: "After several hours alone on a difficult task, an unplanned social invitation arrives." },
  { id: "s07", text: "A minor disagreement has stayed polite for days but is beginning to create distance." },
  { id: "s08", text: "A familiar afternoon unexpectedly opens with no obligations or scheduled plans." },
  { id: "s09", text: "A teammate forgets a small commitment that nobody else appears to have noticed." },
  { id: "s10", text: "A planning meeting becomes stiff and ceremonial even though the participants know one another well." },
  { id: "s11", text: "The person needs a modest favor from someone who already appears stretched thin." },
  { id: "s12", text: "A small interpersonal friction could be ignored for now, but it may become harder to discuss later." },
  { id: "s13", text: "A routine route home is unexpectedly blocked, while several unfamiliar alternatives remain open." },
  { id: "s14", text: "Another person has explicitly said they are relying on the person's part of a shared task." },
  { id: "s15", text: "A method that worked reliably last month fails twice under slightly different conditions." },
  { id: "s16", text: "Two experienced colleagues remember the cause of an old project failure differently." },
  { id: "s17", text: "A senior colleague dismisses a question by pointing to long experience rather than explaining the reasoning." },
  { id: "s18", text: "After a presentation, the person notices an avoidable error that several attendees probably saw." },
  { id: "s19", text: "At the end of a shared activity, one person quietly starts handling the cleanup alone." },
  { id: "s20", text: "Several days of absorbing solitary work end just as friends invite the person to join an ordinary evening." },
  { id: "s21", text: "A casual promise made earlier in the week becomes mildly inconvenient to keep." },
  { id: "s22", text: "A tense conversation becomes more formal with each exchange, although nobody has become openly hostile." },
  { id: "s23", text: "The person could ask for help now, but everyone nearby seems to be managing their own pressures." },
  { id: "s24", text: "A recurring small disagreement has not caused a crisis, but both people now anticipate it before meeting." },
]);

export const PREDECLARED_READING = Object.freeze({
  trials: 24,
  chanceAccuracy: 0.5,
  alpha: 0.05,
  firstSignificantCorrectCount: 17,
  bands: Object.freeze([
    Object.freeze({
      correctMin: 20,
      correctMax: 24,
      label: "strong_ceiling_signal",
      reading: "The hand-authored exemplar loci carry a strong directly visible semantic signal. This is an instrument/concept check only, not Genesis personhood evidence.",
    }),
    Object.freeze({
      correctMin: 17,
      correctMax: 19,
      label: "detectable_moderate_ceiling",
      reading: "The hand-authored exemplar loci carry detectable directly visible semantic signal. Preserve the result; do not rewrite loci merely to chase a higher score.",
    }),
    Object.freeze({
      correctMin: 13,
      correctMax: 16,
      label: "inconclusive_near_chance",
      reading: "This run does not establish an above-chance ceiling at the predeclared alpha. Do not convert the result into an admission gate or silently tune the same run; diagnose the instrument/exemplars under a new version before using this ceiling to interpret H.",
    }),
    Object.freeze({
      correctMin: 0,
      correctMax: 12,
      label: "no_positive_ceiling_signal",
      reading: "The instrument shows no positive discrimination signal. Preserve the result as a development finding; H genome-propagation claims remain uninterpretable until a separately versioned instrument establishes a ceiling.",
    }),
  ]),
  sliceG: "Repeat the same independent trial structure against frozen Genesis-produced cohort genomes before cohort life generation. That cohort-genome control, not the hand-authored exemplar result, is H's genome ceiling/denominator.",
});

const GENERATOR_PROMPT = `You are running a controlled Fibre development diagnostic.
For the one neutral situation supplied, write one short plausible internal interpretation or point of attention that could be shaped by the supplied symbolic genome.
This is a ceiling test of semantic specificity, not a biography and not a prediction of fixed behavior.
Do not mention genomes, loci, traits, labels, or testing. Do not quote or closely paraphrase the locus wording. Do not write universal future rules such as "I always" or "I never".`;

const RATER_PROMPT = `You are a blind rater for one independent Fibre symbolic-genome specificity trial.
Compare the two candidate semantic responses against Genome A and Genome B.
Choose which candidate is more characteristically aligned with Genome A rather than Genome B.
Judge semantic route and attention, not prose style. You see only this trial and have no access to any other generated response or rating trial. Do not infer from candidate ordering.`;

export const GENERATOR_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["situationId", "semanticResponse"],
  properties: {
    situationId: { type: "string" },
    semanticResponse: { type: "string", minLength: 8, maxLength: 500 },
  },
});

export const RATER_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["situationId", "genomeAChoice"],
  properties: {
    situationId: { type: "string" },
    genomeAChoice: { type: "string", enum: ["left", "right"] },
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

function normalizeGenome(genome, field) {
  if (!Array.isArray(genome) || genome.length === 0) throw new TypeError(`${field} must be a non-empty array`);
  return genome.map((value, index) => {
    if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field}[${index}] must be non-empty text`);
    return value.trim();
  });
}

function validateGenerated(output, situationId) {
  if (output?.situationId !== situationId) throw new Error(`generator returned wrong situation ID for ${situationId}`);
  if (typeof output.semanticResponse !== "string" || output.semanticResponse.trim() === "") {
    throw new Error(`generator omitted semantic response for ${situationId}`);
  }
  return { situationId, semanticResponse: output.semanticResponse.trim() };
}

export function candidateOrderFor(seed, situationId) {
  return Number.parseInt(sha256(canonicalJson({ seed, situationId })).slice(0, 2), 16) % 2 === 0
    ? "A-left"
    : "A-right";
}

function buildTrial(situation, outputA, outputB, seed) {
  const order = candidateOrderFor(seed, situation.id);
  return {
    situationId: situation.id,
    situation: situation.text,
    left: order === "A-left" ? outputA.semanticResponse : outputB.semanticResponse,
    right: order === "A-left" ? outputB.semanticResponse : outputA.semanticResponse,
    correctGenomeAChoice: order === "A-left" ? "left" : "right",
  };
}

function validateChoice(output, situationId) {
  if (output?.situationId !== situationId) throw new Error(`rater returned wrong situation ID for ${situationId}`);
  if (!["left", "right"].includes(output.genomeAChoice)) throw new Error(`rater omitted a valid choice for ${situationId}`);
  return { situationId, genomeAChoice: output.genomeAChoice };
}

function combination(n, k) {
  if (k < 0 || k > n) return 0;
  const m = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= m; i += 1) result = (result * (n - m + i)) / i;
  return result;
}

export function exactOneSidedBinomialP({ trials, correct }) {
  let numerator = 0;
  for (let k = correct; k <= trials; k += 1) numerator += combination(trials, k);
  return numerator / 2 ** trials;
}

export async function runGenomeSpecificityControl({
  generatorProvider,
  generatorModel,
  raterProvider = generatorProvider,
  raterModel = generatorModel,
  genomeA = CONTROL_GENOME_A,
  genomeB = CONTROL_GENOME_B,
  genomeSource = "hand_authored_exemplars",
  seed = "slice-b-positive-control-v2",
  environment = process.env,
  fetchImpl = globalThis.fetch,
  adapterFactory = createAdapter,
} = {}) {
  const normalizedGenomeA = normalizeGenome(genomeA, "genomeA");
  const normalizedGenomeB = normalizeGenome(genomeB, "genomeB");
  const generatorEvents = [];
  const raterEvents = [];
  const generator = adapterFactory({
    provider: generatorProvider,
    model: generatorModel,
    environment,
    fetchImpl,
    observer: (event) => generatorEvents.push(event),
  });
  const rater = adapterFactory({
    provider: raterProvider,
    model: raterModel,
    environment,
    fetchImpl,
    observer: (event) => raterEvents.push(event),
  });

  const outputsA = [];
  const outputsB = [];
  const generationProvenance = [];
  const blindedTrials = [];
  const scoredChoices = [];
  const ratingProvenance = [];

  async function generateOne(label, genome, situation) {
    const result = await generator.invoke({
      systemPrompt: GENERATOR_PROMPT,
      input: {
        controlVersion: GENOME_CONTROL_VERSION,
        genome,
        situation,
      },
      responseSchema: GENERATOR_SCHEMA,
      clientRequestId: `genome-control:generate:${label}:${situation.id}:${seed}`,
    });
    return { output: validateGenerated(result.output, situation.id), provenance: result.provenance };
  }

  for (const situation of CONTROL_SITUATIONS) {
    // Separate calls are intentional: no generation call can establish a cross-trial voice.
    const generatedA = await generateOne("A", normalizedGenomeA, situation);
    const generatedB = await generateOne("B", normalizedGenomeB, situation);
    outputsA.push(generatedA.output);
    outputsB.push(generatedB.output);
    generationProvenance.push({ situationId: situation.id, genome: "A", provenance: generatedA.provenance });
    generationProvenance.push({ situationId: situation.id, genome: "B", provenance: generatedB.provenance });

    const trialWithAnswer = buildTrial(situation, generatedA.output, generatedB.output, seed);
    const { correctGenomeAChoice, ...blindedTrial } = trialWithAnswer;
    blindedTrials.push(blindedTrial);

    // Separate rating calls are intentional: no rater can cluster responses across trials.
    const rating = await rater.invoke({
      systemPrompt: RATER_PROMPT,
      input: {
        controlVersion: GENOME_CONTROL_VERSION,
        genomeA: normalizedGenomeA,
        genomeB: normalizedGenomeB,
        trial: blindedTrial,
      },
      responseSchema: RATER_SCHEMA,
      clientRequestId: `genome-control:rate:${situation.id}:${seed}`,
    });
    const choice = validateChoice(rating.output, situation.id);
    ratingProvenance.push({ situationId: situation.id, provenance: rating.provenance });
    scoredChoices.push({
      ...choice,
      correctChoice: correctGenomeAChoice,
      correct: choice.genomeAChoice === correctGenomeAChoice,
    });
  }

  const correct = scoredChoices.filter((item) => item.correct).length;
  const trials = scoredChoices.length;
  const sameRaterAndGenerator = generatorProvider === raterProvider && generatorModel === raterModel;

  return {
    controlVersion: GENOME_CONTROL_VERSION,
    seed,
    generatedAt: new Date().toISOString(),
    interpretation: "Slice-B capability ceiling only; this score is not Genesis personhood evidence and is not an admission gate.",
    predeclaredReading: PREDECLARED_READING,
    generator: {
      provider: generatorProvider,
      model: generatorModel,
      promptHash: digest(GENERATOR_PROMPT),
      schemaHash: digest(GENERATOR_SCHEMA),
      calls: generationProvenance,
      eventTypes: generatorEvents.map((event) => event.type),
    },
    rater: {
      provider: raterProvider,
      model: raterModel,
      promptHash: digest(RATER_PROMPT),
      schemaHash: digest(RATER_SCHEMA),
      calls: ratingProvenance,
      sameProviderAndModelAsGenerator: sameRaterAndGenerator,
      interpretationBound: sameRaterAndGenerator
        ? "Generator and rater are the same provider/model; self-recognition cannot be excluded and bounds the result."
        : "Generator and rater use different provider/model identities, reducing direct self-recognition risk.",
      eventTypes: raterEvents.map((event) => event.type),
    },
    genomes: { source: genomeSource, A: normalizedGenomeA, B: normalizedGenomeB },
    situations: CONTROL_SITUATIONS,
    outputs: { A: outputsA, B: outputsB },
    blindedTrials,
    scoredChoices,
    result: {
      trials,
      correct,
      accuracy: correct / trials,
      chanceAccuracy: 0.5,
      exactOneSidedBinomialP: exactOneSidedBinomialP({ trials, correct }),
    },
  };
}

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

function readGenomeFile(path, name) {
  if (path === null) return null;
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const candidate = Array.isArray(parsed) ? parsed : parsed?.orderedLoci?.map((locus) => locus.value) ?? parsed?.loci;
  return normalizeGenome(candidate, name);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(
      "Usage: npm run genesis:genome-control -- --provider openai --model <model> [--rater-provider google --rater-model <different-model>] [--genome-a-file <json> --genome-b-file <json> --genome-source <label>] [--seed <seed>] [--out <file>]\n",
    );
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
  const seed = readArg(argv, "--seed", "slice-b-positive-control-v2");
  const genomeAFile = readArg(argv, "--genome-a-file");
  const genomeBFile = readArg(argv, "--genome-b-file");
  if ((genomeAFile === null) !== (genomeBFile === null)) throw new Error("--genome-a-file and --genome-b-file must be provided together");
  const genomeA = readGenomeFile(genomeAFile, "genomeA") ?? CONTROL_GENOME_A;
  const genomeB = readGenomeFile(genomeBFile, "genomeB") ?? CONTROL_GENOME_B;
  const genomeSource = readArg(argv, "--genome-source", genomeAFile === null ? "hand_authored_exemplars" : "external_frozen_genomes");
  const outputPath = readArg(argv, "--out");
  const result = await runGenomeSpecificityControl({
    generatorProvider,
    generatorModel,
    raterProvider,
    raterModel,
    genomeA,
    genomeB,
    genomeSource,
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

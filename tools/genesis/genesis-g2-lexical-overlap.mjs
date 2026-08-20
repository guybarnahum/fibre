#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_AGGREGATE_PATH = "artifacts/validation/m2-pr39/g/results/g2-cohort-genome-specificity-ceiling-v1.json";
const DEFAULT_OUTPUT_PATH = "artifacts/validation/m2-pr39/g/results/g2-lexical-overlap-v1.json";

const STOPWORDS = new Set([
  "about", "after", "again", "against", "also", "another", "because", "been", "before", "being", "between",
  "both", "could", "does", "doing", "during", "each", "from", "have", "having", "into", "itself", "more",
  "most", "other", "over", "same", "should", "some", "such", "than", "that", "their", "them", "then",
  "there", "these", "they", "this", "those", "through", "under", "very", "what", "when", "where", "which",
  "while", "with", "would", "your", "person", "people", "someone", "something", "situation",
]);

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function tokenize(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length >= 4 && !STOPWORDS.has(token)) ?? [];
}

function tokenSet(texts) {
  const values = Array.isArray(texts) ? texts : [texts];
  return new Set(values.flatMap((value) => tokenize(value)));
}

function setDifference(left, right) {
  return new Set([...left].filter((value) => !right.has(value)));
}

function overlapCount(text, tokens) {
  const response = tokenSet(text);
  let count = 0;
  for (const token of tokens) if (response.has(token)) count += 1;
  return count;
}

function mean(values) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pearson(xs, ys) {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let numerator = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let index = 0; index < xs.length; index += 1) {
    const dx = xs[index] - mx;
    const dy = ys[index] - my;
    numerator += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  if (dx2 === 0 || dy2 === 0) return null;
  return numerator / Math.sqrt(dx2 * dy2);
}

function phi(a, b, c, d) {
  const denominator = Math.sqrt((a + b) * (c + d) * (a + c) * (b + d));
  return denominator === 0 ? null : ((a * d) - (b * c)) / denominator;
}

function bySituation(items, field) {
  const map = new Map();
  for (const item of items ?? []) {
    if (typeof item?.situationId !== "string") throw new Error(`${field} contains item without situationId`);
    if (map.has(item.situationId)) throw new Error(`${field} repeats ${item.situationId}`);
    map.set(item.situationId, item);
  }
  return map;
}

export function analyzePairLexicalOverlap(raw, pairId = "pair") {
  const genomeA = raw?.genomes?.A;
  const genomeB = raw?.genomes?.B;
  if (!Array.isArray(genomeA) || !Array.isArray(genomeB) || genomeA.length === 0 || genomeB.length === 0) {
    throw new Error(`${pairId} must embed non-empty genomes A and B`);
  }

  const tokensA = tokenSet(genomeA);
  const tokensB = tokenSet(genomeB);
  const distinctiveA = setDifference(tokensA, tokensB);
  const distinctiveB = setDifference(tokensB, tokensA);
  const outputsA = bySituation(raw?.outputs?.A, `${pairId}.outputs.A`);
  const outputsB = bySituation(raw?.outputs?.B, `${pairId}.outputs.B`);
  const choices = bySituation(raw?.scoredChoices, `${pairId}.scoredChoices`);

  if (choices.size === 0 || outputsA.size !== choices.size || outputsB.size !== choices.size) {
    throw new Error(`${pairId} outputs/scoredChoices must cover the same non-empty situation set`);
  }

  const trials = [];
  for (const [situationId, choice] of choices.entries()) {
    const outputA = outputsA.get(situationId)?.semanticResponse;
    const outputB = outputsB.get(situationId)?.semanticResponse;
    if (typeof outputA !== "string" || typeof outputB !== "string") {
      throw new Error(`${pairId} missing generated response for ${situationId}`);
    }

    const aOwn = overlapCount(outputA, distinctiveA);
    const aOpposite = overlapCount(outputA, distinctiveB);
    const bA = overlapCount(outputB, distinctiveA);
    const bOwn = overlapCount(outputB, distinctiveB);
    const aGenomeMarginForAResponse = aOwn - aOpposite;
    const aGenomeMarginForBResponse = bA - bOwn;
    const correctCandidateLiteralMargin = aGenomeMarginForAResponse - aGenomeMarginForBResponse;
    const lexicalPrediction = correctCandidateLiteralMargin > 0
      ? "correct_candidate"
      : correctCandidateLiteralMargin < 0
        ? "distractor"
        : "tie";

    trials.push({
      situationId,
      raterCorrect: choice.correct === true,
      exactDistinctiveTokenReuse: {
        responseAOwn: aOwn,
        responseAOpposite: aOpposite,
        responseBOwn: bOwn,
        responseBOpposite: bA,
      },
      correctCandidateLiteralMargin,
      lexicalPrediction,
    });
  }

  const nonTies = trials.filter(({ lexicalPrediction }) => lexicalPrediction !== "tie");
  const lexicalCorrect = nonTies.filter(({ lexicalPrediction }) => lexicalPrediction === "correct_candidate").length;
  const lexicalIncorrect = nonTies.length - lexicalCorrect;
  const raterCorrectMargins = trials.filter(({ raterCorrect }) => raterCorrect).map(({ correctCandidateLiteralMargin }) => correctCandidateLiteralMargin);
  const raterIncorrectMargins = trials.filter(({ raterCorrect }) => !raterCorrect).map(({ correctCandidateLiteralMargin }) => correctCandidateLiteralMargin);

  let bothCorrect = 0;
  let lexicalCorrectRaterWrong = 0;
  let lexicalWrongRaterCorrect = 0;
  let bothWrong = 0;
  for (const trial of nonTies) {
    const literalCorrect = trial.lexicalPrediction === "correct_candidate";
    if (literalCorrect && trial.raterCorrect) bothCorrect += 1;
    else if (literalCorrect) lexicalCorrectRaterWrong += 1;
    else if (trial.raterCorrect) lexicalWrongRaterCorrect += 1;
    else bothWrong += 1;
  }

  return {
    pairId,
    trials: trials.length,
    genomeDistinctiveTokenCounts: {
      A: distinctiveA.size,
      B: distinctiveB.size,
    },
    literalClassifier: {
      nonTieTrials: nonTies.length,
      tieTrials: trials.length - nonTies.length,
      correct: lexicalCorrect,
      incorrect: lexicalIncorrect,
      accuracyExcludingTies: nonTies.length === 0 ? null : lexicalCorrect / nonTies.length,
    },
    associationWithBlindRater: {
      pearsonLiteralMarginVsRaterCorrect: pearson(
        trials.map(({ correctCandidateLiteralMargin }) => correctCandidateLiteralMargin),
        trials.map(({ raterCorrect }) => raterCorrect ? 1 : 0),
      ),
      meanLiteralMarginWhenRaterCorrect: mean(raterCorrectMargins),
      meanLiteralMarginWhenRaterIncorrect: mean(raterIncorrectMargins),
      nonTiePhi: phi(bothCorrect, lexicalCorrectRaterWrong, lexicalWrongRaterCorrect, bothWrong),
      nonTieContingency: {
        bothCorrect,
        lexicalCorrectRaterWrong,
        lexicalWrongRaterCorrect,
        bothWrong,
      },
    },
    trialsDetail: trials,
  };
}

export function analyzeG2LexicalOverlap({ aggregatePath = DEFAULT_AGGREGATE_PATH } = {}) {
  const aggregate = readJson(aggregatePath);
  if (aggregate?.evidenceVersion !== "pr39-slice-g2-cohort-genome-specificity-ceiling-v1") {
    throw new Error("unexpected G2 aggregate evidence version");
  }
  if (!Array.isArray(aggregate.pairSummaries) || aggregate.pairSummaries.length !== 5) {
    throw new Error("G2 lexical diagnostic expects the frozen five-pair ceiling");
  }

  const pairAnalyses = aggregate.pairSummaries.map((pair) => analyzePairLexicalOverlap(readJson(pair.resultPath), pair.pairId));
  const allTrials = pairAnalyses.flatMap(({ trialsDetail, pairId }) => trialsDetail.map((trial) => ({ pairId, ...trial })));
  const nonTies = allTrials.filter(({ lexicalPrediction }) => lexicalPrediction !== "tie");
  const lexicalCorrect = nonTies.filter(({ lexicalPrediction }) => lexicalPrediction === "correct_candidate").length;
  const raterCorrectMargins = allTrials.filter(({ raterCorrect }) => raterCorrect).map(({ correctCandidateLiteralMargin }) => correctCandidateLiteralMargin);
  const raterIncorrectMargins = allTrials.filter(({ raterCorrect }) => !raterCorrect).map(({ correctCandidateLiteralMargin }) => correctCandidateLiteralMargin);

  let bothCorrect = 0;
  let lexicalCorrectRaterWrong = 0;
  let lexicalWrongRaterCorrect = 0;
  let bothWrong = 0;
  for (const trial of nonTies) {
    const literalCorrect = trial.lexicalPrediction === "correct_candidate";
    if (literalCorrect && trial.raterCorrect) bothCorrect += 1;
    else if (literalCorrect) lexicalCorrectRaterWrong += 1;
    else if (trial.raterCorrect) lexicalWrongRaterCorrect += 1;
    else bothWrong += 1;
  }

  return {
    evidenceVersion: "pr39-slice-g2-lexical-overlap-v1",
    status: "post_hoc_observational_non_gating",
    sourceAggregatePath: aggregatePath,
    sourceVerdict: aggregate.verdict,
    measuredPairScope: aggregate.pairSummaries.map(({ pairId, genomeASlot, genomeBSlot }) => ({ pairId, genomeASlot, genomeBSlot })),
    method: {
      name: "exact_distinctive_token_margin_v1",
      tokenization: "Unicode NFKD -> remove combining marks -> lowercase ASCII alphanumeric tokens; length >=4; fixed stopword removal",
      distinctiveTokenDefinition: "token present in one embedded genome and absent from the opposing genome",
      trialClassifier: "Choose the generated response with the larger (Genome-A-distinctive overlap minus Genome-B-distinctive overlap) score; ties remain ties.",
      limitation: "Measures exact normalized token reuse only. It does not detect synonyms, paraphrase, syntax, style, shared semantic route, or other non-literal cues. It is a post-hoc bound on surface matching, not a new G2 gate.",
    },
    pairAnalyses,
    overall: {
      trials: allTrials.length,
      literalClassifier: {
        nonTieTrials: nonTies.length,
        tieTrials: allTrials.length - nonTies.length,
        correct: lexicalCorrect,
        incorrect: nonTies.length - lexicalCorrect,
        accuracyExcludingTies: nonTies.length === 0 ? null : lexicalCorrect / nonTies.length,
      },
      associationWithBlindRater: {
        pearsonLiteralMarginVsRaterCorrect: pearson(
          allTrials.map(({ correctCandidateLiteralMargin }) => correctCandidateLiteralMargin),
          allTrials.map(({ raterCorrect }) => raterCorrect ? 1 : 0),
        ),
        meanLiteralMarginWhenRaterCorrect: mean(raterCorrectMargins),
        meanLiteralMarginWhenRaterIncorrect: mean(raterIncorrectMargins),
        nonTiePhi: phi(bothCorrect, lexicalCorrectRaterWrong, lexicalWrongRaterCorrect, bothWrong),
        nonTieContingency: {
          bothCorrect,
          lexicalCorrectRaterWrong,
          lexicalWrongRaterCorrect,
          bothWrong,
        },
      },
    },
    interpretationBoundary: "G2 remains a five-pair textual-distinguishability ceiling. This diagnostic can show that exact lexical reuse is or is not associated with rater success; it cannot by itself establish semantic specificity.",
  };
}

function readArg(argv, name, fallback = null) {
  const exact = argv.indexOf(name);
  if (exact !== -1) return argv[exact + 1] ?? null;
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline === undefined ? fallback : inline.slice(name.length + 1);
}

function main() {
  const argv = process.argv.slice(2);
  const aggregatePath = readArg(argv, "--aggregate", DEFAULT_AGGREGATE_PATH);
  const outputPath = readArg(argv, "--out", DEFAULT_OUTPUT_PATH);
  if (existsSync(resolve(outputPath))) throw new Error(`refusing to overwrite existing diagnostic ${outputPath}`);
  const result = analyzeG2LexicalOverlap({ aggregatePath });
  mkdirSync(dirname(resolve(outputPath)), { recursive: true });
  writeFileSync(resolve(outputPath), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  const overall = result.overall;
  process.stdout.write("G2 LEXICAL OVERLAP: COMPLETE (post-hoc observational)\n");
  process.stdout.write(`Literal classifier: ${overall.literalClassifier.correct}/${overall.literalClassifier.nonTieTrials} non-tie trials; ${overall.literalClassifier.tieTrials} ties\n`);
  process.stdout.write(`Literal accuracy excluding ties: ${overall.literalClassifier.accuracyExcludingTies === null ? "n/a" : `${(overall.literalClassifier.accuracyExcludingTies * 100).toFixed(1)}%`}\n`);
  process.stdout.write(`Pearson literal margin vs blind-rater correctness: ${overall.associationWithBlindRater.pearsonLiteralMarginVsRaterCorrect ?? "n/a"}\n`);
  process.stdout.write(`Non-tie phi: ${overall.associationWithBlindRater.nonTiePhi ?? "n/a"}\n`);
  process.stdout.write(`Artifact: ${outputPath}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`G2 LEXICAL OVERLAP: FAILED\n${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  }
}

#!/usr/bin/env node

// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: preflight, durably run, and score the frozen blind PR39 D1-D5 diagnostics
// fibre-tool-disposition: retire after PR39; retain summarized diagnostic results in milestone history

import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  linkSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { repoFile } from "#repo-root";
import { createOpenAIModelAdapter } from "#services/world-kernel/src/model-runtime/openai.mjs";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import { loadPr39ClosureFinalization } from "./genesis-pr39-closure-finalization.mjs";

const READY_VERSION = "diagnostics-rater-ready-v1";
const RUN_VERSION = "diagnostics-rater-run-v1";
const PLAN_VERSION = "pr39-diagnostic-rater-plan-v1";
const CLAIM_VERSION = "pr39-diagnostic-rater-run-claim-v1";
const RESULT_VERSION = "pr39-diagnostic-rater-trial-v1";
const SUMMARY_VERSION = "pr39-diagnostic-results-v1";
const LABELS = Object.freeze(["A", "B", "C", "D", "E"]);
const RATER_TEMPERATURE = 0;
const RATER_TOP_P = 1;
const RATER_REASONING_EFFORT = "none";
const RATER_RETRY_LIMIT = 2;
const RATER_RETRY_DELAY_MS = 2_000;
const HEARTBEAT_MS = 15_000;

export const CHOICE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["choice"],
  properties: {
    choice: { type: "string", enum: [...LABELS] },
  },
});

const D1_PROMPT = `You are a blind evaluator. Match one remembered self-account to the one underlying life history that most plausibly produced it.
Use only the supplied target and five supplied choices.
Do not infer hidden identities, build metadata, treatment labels, or facts not present in the material.
Choose exactly one label.`;

const D2_PROMPT = `You are a blind evaluator scoring emotional valence.
The input identifies whether all supplied items are cited history episodes or current durable meanings.
For every supplied item, assign exactly one ordinal valence:
-2 strongly negative, -1 negative, 0 neutral/mixed, +1 positive, +2 strongly positive.
Score only the supplied text. Do not infer hidden psychology or identities, and do not compare against any material that is not supplied in this call.
Return one score for every item and no missing or duplicate indexes.`;

const D3_PROMPT = `You are a blind evaluator. Choose the one anonymous genome semantic projection most compatible with the supplied target.
Use only the supplied target and five supplied genome projections.
Do not infer hidden identities, assignment labels, treatment labels, or build metadata.
Choose exactly one label.`;

const D5_PROMPT = `You are a blind evaluator of self-account overreach.
For each supplied history episode, mark it accommodated only when at least one supplied current durable meaning statement textually supports that reading.
Unsupported psychological inference is not accommodation.
If accommodated, cite one or more supplied meaning-statement labels that directly support the reading.
If unaccommodated, return no supporting statement labels.
Judge every history episode exactly once.`;

function fail(message) { throw new Error(message); }
function absolute(path) { return fileURLToPath(repoFile(path)); }
function readJson(path) { return JSON.parse(readFileSync(absolute(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function pad(value, width = 3) { return String(value).padStart(width, "0"); }
function removeIfPresent(path) {
  try { unlinkSync(path); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}
function writeJsonAtomic(path, value, { exclusive = false } = {}) {
  const target = absolute(path);
  mkdirSync(dirname(target), { recursive: true });
  const temp = `${target}.${randomUUID()}.tmp`;
  let descriptor;
  try {
    descriptor = openSync(temp, "wx", 0o600);
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    if (exclusive) {
      linkSync(temp, target);
      removeIfPresent(temp);
    } else {
      renameSync(temp, target);
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    removeIfPresent(temp);
  }
}
function gitHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: absolute("."), encoding: "utf8" }).trim();
}
function assertCleanTree() {
  const status = execFileSync("git", ["status", "--porcelain"], { cwd: absolute("."), encoding: "utf8" }).trim();
  if (status !== "") fail("PR39 diagnostic execution requires a clean Git working tree");
}
function exactKeys(name, value, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(`${name} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (canonicalJson(actual) !== canonicalJson(expected)) fail(`${name} keys drift`);
}
export function median(values) {
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => !Number.isFinite(value))) fail("median requires finite values");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
function ranks(values) {
  const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = Array(values.length);
  for (let start = 0; start < indexed.length;) {
    let end = start + 1;
    while (end < indexed.length && indexed[end].value === indexed[start].value) end += 1;
    const rank = ((start + 1) + end) / 2;
    for (let cursor = start; cursor < end; cursor += 1) result[indexed[cursor].index] = rank;
    start = end;
  }
  return result;
}
export function spearmanRho(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length < 2) return null;
  const x = ranks(left);
  const y = ranks(right);
  const mx = x.reduce((sum, value) => sum + value, 0) / x.length;
  const my = y.reduce((sum, value) => sum + value, 0) / y.length;
  let numerator = 0;
  let xx = 0;
  let yy = 0;
  for (let index = 0; index < x.length; index += 1) {
    const dx = x[index] - mx;
    const dy = y[index] - my;
    numerator += dx * dy;
    xx += dx * dx;
    yy += dy * dy;
  }
  if (xx === 0 || yy === 0) return 0;
  return numerator / Math.sqrt(xx * yy);
}
function combination(n, k) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let index = 1; index <= Math.min(k, n - k); index += 1) result = (result * (n - index + 1)) / index;
  return result;
}
export function exactBinomialTail(successes, trials, probability) {
  let total = 0;
  for (let k = successes; k <= trials; k += 1) {
    total += combination(trials, k) * (probability ** k) * ((1 - probability) ** (trials - k));
  }
  return total;
}
export function majorityChoice(values) {
  if (!Array.isArray(values) || values.length !== 3) fail("majorityChoice requires exactly three replicate values");
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  return ranked[0][1] >= 2 ? ranked[0][0] : null;
}
export function canonicalD3Cell(value) {
  if (value === "life_only_unexposed" || value === "life_plus_genome") return value;
  if (value === "life_only_exposed" || value === "later_life_only_potentially_contaminated") {
    return "later_life_only_potentially_contaminated";
  }
  fail(`unexpected D3 cell ${value}`);
}
function permutation(count, seed) {
  const entries = Array.from({ length: count }, (_, index) => ({
    index,
    rank: sha256(`${seed}:choice:${index}`),
  }));
  entries.sort((left, right) => left.rank.localeCompare(right.rank) || left.index - right.index);
  return entries.map((item) => item.index);
}
function responseSchemaOrdinalScores(count) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["scores"],
    properties: {
      scores: {
        type: "array",
        minItems: count,
        maxItems: count,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["index", "valence"],
          properties: {
            index: { type: "integer", enum: Array.from({ length: count }, (_, index) => index + 1) },
            valence: { type: "integer", enum: [-2, -1, 0, 1, 2] },
          },
        },
      },
    },
  };
}
function responseSchemaD5(episodeLabels, statementLabels) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["episodes"],
    properties: {
      episodes: {
        type: "array",
        minItems: episodeLabels.length,
        maxItems: episodeLabels.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["episodeLabel", "status", "supportingStatementLabels"],
          properties: {
            episodeLabel: { type: "string", enum: episodeLabels },
            status: { type: "string", enum: ["accommodated", "unaccommodated"] },
            supportingStatementLabels: {
              type: "array",
              uniqueItems: true,
              items: { type: "string", enum: statementLabels },
            },
          },
        },
      },
    },
  };
}
function d5MeaningStatements(thread) {
  const statements = [];
  for (const meaning of thread.currentMeanings) {
    const parts = String(meaning.text ?? "").split("\n").map((value) => value.trim()).filter(Boolean);
    parts.forEach((statement, index) => {
      statements.push({
        statementLabel: `${meaning.meaningLabel}.S${index + 1}`,
        meaningLabel: meaning.meaningLabel,
        text: statement,
      });
    });
  }
  return statements;
}
function validateIndexedScores(name, scores, count) {
  if (!Array.isArray(scores) || scores.length !== count) fail(`${name} score count drift`);
  const indexes = new Set();
  for (const score of scores) {
    exactKeys(`${name} score`, score, ["index", "valence"]);
    if (!Number.isInteger(score.index) || score.index < 1 || score.index > count) fail(`${name} score index drift`);
    if (![-2, -1, 0, 1, 2].includes(score.valence)) fail(`${name} valence drift`);
    indexes.add(score.index);
  }
  if (indexes.size !== count) fail(`${name} score indexes are not complete/unique`);
}
function validateD5Output(output, episodeLabels, statementLabels) {
  exactKeys("D5 output", output, ["episodes"]);
  if (!Array.isArray(output.episodes) || output.episodes.length !== episodeLabels.length) fail("D5 episode count drift");
  const byLabel = new Map();
  for (const judgment of output.episodes) {
    exactKeys("D5 judgment", judgment, ["episodeLabel", "status", "supportingStatementLabels"]);
    if (!episodeLabels.includes(judgment.episodeLabel) || byLabel.has(judgment.episodeLabel)) fail("D5 episode label drift/duplicate");
    if (!["accommodated", "unaccommodated"].includes(judgment.status)) fail("D5 status drift");
    if (!Array.isArray(judgment.supportingStatementLabels) || new Set(judgment.supportingStatementLabels).size !== judgment.supportingStatementLabels.length) {
      fail("D5 supporting statement labels drift");
    }
    if (judgment.supportingStatementLabels.some((label) => !statementLabels.includes(label))) fail("D5 unknown supporting statement label");
    if (judgment.status === "accommodated") {
      if (judgment.supportingStatementLabels.length === 0) fail("D5 accommodated judgment lacks textual citation");
    } else if (judgment.supportingStatementLabels.length !== 0) {
      fail("D5 unaccommodated judgment must not claim supporting meaning text");
    }
    byLabel.set(judgment.episodeLabel, judgment);
  }
  if (byLabel.size !== episodeLabels.length) fail("D5 judgments do not cover every episode exactly once");
}

function loadReadyMaterial(frozen) {
  const root = `.fibre/genesis/pr39-closure/${frozen.finalization.closureId}/${READY_VERSION}`;
  const manifest = readJson(`${root}/manifest.json`);
  const material = readJson(`${root}/rater-material.json`);
  const privateKey = readJson(`${root}/private-key.json`);
  const d4 = readJson(`${root}/d4-summary.json`);
  if (manifest.status !== "RATER_READY_NO_CALLS" || manifest.providerCallsMade !== 0) fail("PR39 rater material is not frozen zero-call input");
  if (manifest.raterMaterialDigest !== digest(material)) fail("PR39 rater material digest drift");
  if (manifest.privateKeyDigest !== digest(privateKey)) fail("PR39 private rater key digest drift");
  if (manifest.d4Digest !== digest(d4)) fail("PR39 D4 digest drift");
  if (manifest.closureId !== frozen.finalization.closureId || manifest.finalizationDigest !== frozen.finalizationDigest) fail("PR39 rater material does not match frozen closure");
  return { root, manifest, material, privateKey, d4 };
}
function choiceInput(target, choices, order) {
  return {
    target,
    choices: order.map((choiceIndex, labelIndex) => ({
      label: LABELS[labelIndex],
      material: choices[choiceIndex],
    })),
  };
}
function trialDigestMaterial(trial) {
  const { correctChoiceIndex, ...publicWitness } = trial;
  return publicWitness;
}
function buildPlan({ frozen, ready, toolingHead }) {
  const discipline = frozen.precommitment.protocol.raterDiscipline;
  if (
    discipline.provider !== "openai" ||
    discipline.statelessCalls !== true ||
    discipline.replicatesPerTrial !== 3 ||
    discipline.majorityVotesRequired !== 2 ||
    discipline.choiceLabelsIndependentlyPermutedPerReplicate !== true
  ) fail("PR39 frozen rater discipline drift");
  const trials = [];
  let ordinal = 0;
  const push = (trial) => {
    ordinal += 1;
    const withOrdinal = { ordinal, ...trial };
    trials.push({
      ...withOrdinal,
      requestDigest: digest(trialDigestMaterial(withOrdinal)),
    });
  };

  for (let targetIndex = 0; targetIndex < ready.material.D3.calibrationTargets.length; targetIndex += 1) {
    for (let replicate = 1; replicate <= 3; replicate += 1) {
      const order = permutation(5, `${frozen.finalization.closureId}:D3:calibration:${targetIndex}:replicate:${replicate}`);
      const correctChoiceIndex = ready.privateKey.D3.calibrationAnswers[targetIndex].correctGenomeChoiceIndex;
      const input = choiceInput(
        ready.material.D3.calibrationTargets[targetIndex],
        ready.material.D3.genomeChoices,
        order,
      );
      push({
        diagnostic: "D3",
        stage: "calibration",
        targetIndex,
        replicate,
        choiceOrder: order,
        correctChoiceIndex,
        clientRequestId: `pr39-diag-d3-cal-${pad(targetIndex + 1, 2)}-r${replicate}`,
        promptDigest: digest(D3_PROMPT),
        schemaDigest: digest(CHOICE_SCHEMA),
        inputDigest: digest(input),
      });
    }
  }

  for (const condition of ["raw", "normalized"]) {
    const source = ready.material.D1[condition];
    for (let targetIndex = 0; targetIndex < source.targets.length; targetIndex += 1) {
      for (let replicate = 1; replicate <= 3; replicate += 1) {
        const order = permutation(5, `${frozen.finalization.closureId}:D1:${condition}:${targetIndex}:replicate:${replicate}`);
        const correctChoiceIndex = ready.privateKey.D1.correctChoiceIndexByTargetIndex[targetIndex];
        const input = choiceInput(source.targets[targetIndex], source.choices, order);
        push({
          diagnostic: "D1",
          condition,
          targetIndex,
          replicate,
          choiceOrder: order,
          correctChoiceIndex,
          clientRequestId: `pr39-diag-d1-${condition === "raw" ? "raw" : "norm"}-${pad(targetIndex + 1, 2)}-r${replicate}`,
          promptDigest: digest(D1_PROMPT),
          schemaDigest: digest(CHOICE_SCHEMA),
          inputDigest: digest(input),
        });
      }
    }
  }

  for (let threadIndex = 0; threadIndex < ready.material.D2.threads.length; threadIndex += 1) {
    const thread = ready.material.D2.threads[threadIndex];
    for (const surface of ["events", "meanings"]) {
      const items = surface === "events"
        ? thread.citedEpisodes.map((item, index) => ({ index: index + 1, age: item.age, text: item.text }))
        : thread.currentMeanings.map((item, index) => ({ index: index + 1, text: item.text }));
      const schema = responseSchemaOrdinalScores(items.length);
      const input = {
        surface: surface === "events" ? "cited_history_episode" : "current_durable_meaning",
        items,
      };
      for (let replicate = 1; replicate <= 3; replicate += 1) {
        push({
          diagnostic: "D2",
          surface,
          threadIndex,
          replicate,
          clientRequestId: `pr39-diag-d2-${surface === "events" ? "evt" : "meaning"}-${pad(threadIndex + 1, 2)}-r${replicate}`,
          promptDigest: digest(D2_PROMPT),
          schemaDigest: digest(schema),
          inputDigest: digest(input),
        });
      }
    }
  }

  for (let targetIndex = 0; targetIndex < ready.material.D3.memoryTargets.length; targetIndex += 1) {
    const answer = ready.privateKey.D3.memoryAnswers[targetIndex];
    const cell = canonicalD3Cell(answer.cell);
    for (let replicate = 1; replicate <= 3; replicate += 1) {
      const order = permutation(5, `${frozen.finalization.closureId}:D3:memory:${targetIndex}:replicate:${replicate}`);
      const correctChoiceIndex = answer.correctGenomeChoiceIndex;
      const input = choiceInput(
        ready.material.D3.memoryTargets[targetIndex],
        ready.material.D3.genomeChoices,
        order,
      );
      push({
        diagnostic: "D3",
        stage: "memory",
        targetIndex,
        replicate,
        choiceOrder: order,
        correctChoiceIndex,
        cell,
        callOrdinal: answer.callOrdinal,
        horizon: answer.horizon,
        clientRequestId: `pr39-diag-d3-mem-${pad(targetIndex + 1, 2)}-r${replicate}`,
        promptDigest: digest(D3_PROMPT),
        schemaDigest: digest(CHOICE_SCHEMA),
        inputDigest: digest(input),
      });
    }
  }

  for (let threadIndex = 0; threadIndex < ready.material.D5.threads.length; threadIndex += 1) {
    const thread = ready.material.D5.threads[threadIndex];
    const episodeLabels = thread.history.map((item) => item.episodeLabel);
    const meaningStatements = d5MeaningStatements(thread);
    const statementLabels = meaningStatements.map((item) => item.statementLabel);
    const schema = responseSchemaD5(episodeLabels, statementLabels);
    const input = { history: thread.history, currentMeaningStatements: meaningStatements };
    for (let replicate = 1; replicate <= 3; replicate += 1) {
      push({
        diagnostic: "D5",
        threadIndex,
        replicate,
        clientRequestId: `pr39-diag-d5-${pad(threadIndex + 1, 2)}-r${replicate}`,
        promptDigest: digest(D5_PROMPT),
        schemaDigest: digest(schema),
        inputDigest: digest(input),
      });
    }
  }

  const counts = trials.reduce((acc, trial) => {
    const key = trial.diagnostic === "D3" ? `D3_${trial.stage}` : trial.diagnostic;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const expectedCounts = { D3_calibration: 15, D1: 30, D2: 30, D3_memory: 90, D5: 15 };
  if (canonicalJson(counts) !== canonicalJson(expectedCounts)) fail(`PR39 diagnostic planned call count drift: ${JSON.stringify(counts)}`);
  const d3Cells = ready.privateKey.D3.memoryAnswers.map((answer) => canonicalD3Cell(answer.cell));
  const d3CellCounts = Object.fromEntries(
    ["life_only_unexposed", "life_plus_genome", "later_life_only_potentially_contaminated"]
      .map((cell) => [cell, d3Cells.filter((value) => value === cell).length]),
  );
  if (canonicalJson(d3CellCounts) !== canonicalJson({
    life_only_unexposed: 10,
    life_plus_genome: 10,
    later_life_only_potentially_contaminated: 10,
  })) fail("D3 frozen realized cell count drift");

  const core = {
    version: PLAN_VERSION,
    status: "PREFLIGHTED_NO_PROVIDER_CALLS",
    closureId: frozen.finalization.closureId,
    finalizationDigest: frozen.finalizationDigest,
    toolingHead,
    raterMaterialDigest: ready.manifest.raterMaterialDigest,
    privateKeyDigest: ready.manifest.privateKeyDigest,
    d4Digest: ready.manifest.d4Digest,
    rater: {
      provider: frozen.precommitment.protocol.raterDiscipline.provider,
      model: frozen.precommitment.protocol.raterDiscipline.model,
      statelessCalls: true,
      replicatesPerTrial: 3,
      majorityVotesRequired: 2,
      temperature: RATER_TEMPERATURE,
      topP: RATER_TOP_P,
      reasoningEffort: RATER_REASONING_EFFORT,
      operationalRetryLimit: RATER_RETRY_LIMIT,
      operationalRetryDelayMs: RATER_RETRY_DELAY_MS,
      choicePermutation: "sha256_seeded_per_target_per_replicate",
      D2ReplicateAggregation: "median_of_three_ordinal_scores_per_item",
      D2Blindness: "cited episodes and current meanings are rated in separate stateless calls",
      D5AccommodationCitation: "rater cites deterministic labels for exact supplied current-meaning statements",
    },
    interpretationLimits: {
      D3: "cell assignment is perfectly collinear with call ordinal/history horizon; threshold result is reported but is not clean genome causality",
      D4: "machine summary is authoritative for eligible/run/skipped/revised reinterpretation counts",
    },
    plannedCallsIfD3CalibrationValid: trials.length,
    plannedUnconditionalCalls: trials.filter((trial) => !(trial.diagnostic === "D3" && trial.stage === "memory")).length,
    plannedD3MemoryCallsConditionalOnCalibration: trials.filter((trial) => trial.diagnostic === "D3" && trial.stage === "memory").length,
    counts,
    d3CellTargetCounts: d3CellCounts,
    trials,
    providerCallsMade: 0,
  };
  return { ...core, planDigest: digest(core) };
}
function assertPlanMatches(plan, expected) {
  const { planDigest, ...core } = plan;
  if (planDigest !== digest(core)) fail("PR39 diagnostic plan digest drift");
  if (canonicalJson(plan) !== canonicalJson(expected)) fail("PR39 diagnostic preflight plan does not match current frozen material/tooling");
}
function resultPath(root, trial) {
  return `${root}/trials/trial-${pad(trial.ordinal)}.json`;
}
function validationFailurePath(root, trial) {
  return `${root}/trials/trial-${pad(trial.ordinal)}-validation-failure.json`;
}
function promptFor(trial) {
  if (trial.diagnostic === "D1") return D1_PROMPT;
  if (trial.diagnostic === "D2") return D2_PROMPT;
  if (trial.diagnostic === "D3") return D3_PROMPT;
  if (trial.diagnostic === "D5") return D5_PROMPT;
  fail(`unknown diagnostic ${trial.diagnostic}`);
}
function schemaAndInputFor(trial, ready) {
  if (trial.diagnostic === "D1") {
    const source = ready.material.D1[trial.condition];
    return {
      schema: CHOICE_SCHEMA,
      input: choiceInput(source.targets[trial.targetIndex], source.choices, trial.choiceOrder),
    };
  }
  if (trial.diagnostic === "D2") {
    const thread = ready.material.D2.threads[trial.threadIndex];
    const items = trial.surface === "events"
      ? thread.citedEpisodes.map((item, index) => ({ index: index + 1, age: item.age, text: item.text }))
      : trial.surface === "meanings"
        ? thread.currentMeanings.map((item, index) => ({ index: index + 1, text: item.text }))
        : fail(`unknown D2 surface ${trial.surface}`);
    return {
      schema: responseSchemaOrdinalScores(items.length),
      input: {
        surface: trial.surface === "events" ? "cited_history_episode" : "current_durable_meaning",
        items,
      },
    };
  }
  if (trial.diagnostic === "D3") {
    const target = trial.stage === "calibration"
      ? ready.material.D3.calibrationTargets[trial.targetIndex]
      : ready.material.D3.memoryTargets[trial.targetIndex];
    return {
      schema: CHOICE_SCHEMA,
      input: choiceInput(target, ready.material.D3.genomeChoices, trial.choiceOrder),
    };
  }
  if (trial.diagnostic === "D5") {
    const thread = ready.material.D5.threads[trial.threadIndex];
    const meaningStatements = d5MeaningStatements(thread);
    return {
      schema: responseSchemaD5(
        thread.history.map((item) => item.episodeLabel),
        meaningStatements.map((item) => item.statementLabel),
      ),
      input: { history: thread.history, currentMeaningStatements: meaningStatements },
    };
  }
  fail(`unknown diagnostic ${trial.diagnostic}`);
}
function validateTrialOutput(trial, output, ready) {
  if (trial.diagnostic === "D1" || trial.diagnostic === "D3") {
    exactKeys(`${trial.diagnostic} choice output`, output, ["choice"]);
    if (!LABELS.includes(output.choice)) fail(`${trial.diagnostic} choice drift`);
    return;
  }
  if (trial.diagnostic === "D2") {
    exactKeys("D2 output", output, ["scores"]);
    const thread = ready.material.D2.threads[trial.threadIndex];
    const count = trial.surface === "events"
      ? thread.citedEpisodes.length
      : trial.surface === "meanings"
        ? thread.currentMeanings.length
        : fail(`unknown D2 surface ${trial.surface}`);
    validateIndexedScores(`D2 ${trial.surface}`, output.scores, count);
    return;
  }
  if (trial.diagnostic === "D5") {
    const thread = ready.material.D5.threads[trial.threadIndex];
    const meaningStatements = d5MeaningStatements(thread);
    validateD5Output(
      output,
      thread.history.map((item) => item.episodeLabel),
      meaningStatements.map((item) => item.statementLabel),
    );
    return;
  }
  fail(`unknown diagnostic ${trial.diagnostic}`);
}
function existingResult(root, trial, ready) {
  const failurePath = validationFailurePath(root, trial);
  if (existsSync(absolute(failurePath))) {
    fail(`saved diagnostic trial ${trial.ordinal} has an unresolved rater-response validation failure; do not resample it`);
  }
  const path = resultPath(root, trial);
  if (!existsSync(absolute(path))) return null;
  const result = readJson(path);
  if (
    result.version !== RESULT_VERSION ||
    result.ordinal !== trial.ordinal ||
    result.requestDigest !== trial.requestDigest ||
    result.clientRequestId !== trial.clientRequestId ||
    result.diagnostic !== trial.diagnostic
  ) fail(`saved diagnostic trial ${trial.ordinal} witness drift`);
  validateTrialOutput(trial, result.output, ready);
  return result;
}
async function invokeWithHeartbeat(adapter, trial, prompt, input, schema) {
  const started = Date.now();
  const timer = setInterval(() => {
    const seconds = Math.floor((Date.now() - started) / 1000);
    console.log(`… trial ${trial.ordinal} ${trial.diagnostic}${trial.stage ? `/${trial.stage}` : ""} · waiting ${seconds}s`);
  }, HEARTBEAT_MS);
  try {
    return await adapter.invoke({
      systemPrompt: prompt,
      input,
      responseSchema: schema,
      clientRequestId: trial.clientRequestId,
    });
  } finally {
    clearInterval(timer);
  }
}
export function selectedChoiceIndex(trial, outputChoice) {
  const labelIndex = LABELS.indexOf(outputChoice);
  if (labelIndex < 0) fail(`trial ${trial.ordinal} returned unknown choice label`);
  const selected = trial.choiceOrder?.[labelIndex];
  if (!Number.isInteger(selected)) fail(`trial ${trial.ordinal} choice permutation drift`);
  return selected;
}
function calibrationPassed(results, plan) {
  const trials = plan.trials.filter((trial) => trial.diagnostic === "D3" && trial.stage === "calibration");
  const byTarget = new Map();
  for (const trial of trials) {
    const result = results.get(trial.ordinal);
    if (!result) return false;
    const list = byTarget.get(trial.targetIndex) ?? [];
    list.push({
      replicate: trial.replicate,
      selectedChoiceIndex: selectedChoiceIndex(trial, result.output.choice),
      correctChoiceIndex: trial.correctChoiceIndex,
    });
    byTarget.set(trial.targetIndex, list);
  }
  for (const list of byTarget.values()) {
    list.sort((a, b) => a.replicate - b.replicate);
    const majority = majorityChoice(list.map((item) => item.selectedChoiceIndex));
    const correct = list[0].correctChoiceIndex;
    if (list.some((item) => item.correctChoiceIndex !== correct)) fail("D3 calibration correct-choice mapping drift across replicates");
    if (majority === null || majority !== correct) return false;
  }
  return byTarget.size === 5;
}
function majorityReportForChoiceTrials(trials, results) {
  const groups = new Map();
  for (const trial of trials) {
    const key = [trial.diagnostic, trial.condition ?? trial.stage, trial.targetIndex].join(":");
    const list = groups.get(key) ?? [];
    list.push({
      replicate: trial.replicate,
      outputLabel: results.get(trial.ordinal).output.choice,
      selectedChoiceIndex: selectedChoiceIndex(trial, results.get(trial.ordinal).output.choice),
      correctChoiceIndex: trial.correctChoiceIndex,
    });
    groups.set(key, list);
  }
  return [...groups.values()].map((list) => {
    list.sort((a, b) => a.replicate - b.replicate);
    const majorityChoiceIndex = majorityChoice(list.map((item) => item.selectedChoiceIndex));
    const correctChoiceIndex = list[0].correctChoiceIndex;
    if (list.some((item) => item.correctChoiceIndex !== correctChoiceIndex)) fail("choice-task correct mapping drift across replicates");
    return {
      votes: list.map((item) => ({
        label: item.outputLabel,
        selectedChoiceIndex: item.selectedChoiceIndex,
      })),
      majorityChoiceIndex,
      correctChoiceIndex,
      majorityCorrect: majorityChoiceIndex !== null && majorityChoiceIndex === correctChoiceIndex,
    };
  });
}
function scoreD1(plan, results) {
  const report = {};
  for (const condition of ["raw", "normalized"]) {
    const trials = plan.trials.filter((trial) => trial.diagnostic === "D1" && trial.condition === condition);
    const targets = majorityReportForChoiceTrials(trials, results);
    const correct = targets.filter((item) => item.majorityCorrect).length;
    report[condition] = {
      targets,
      majorityCorrectThreads: correct,
      accuracy: correct / 5,
      exactOneSidedBinomialTailP02: exactBinomialTail(correct, 5, 0.2),
    };
  }
  let interpretation;
  if (report.raw.majorityCorrectThreads >= 4 && report.normalized.majorityCorrectThreads >= 4) interpretation = "strongParticularity";
  else if (report.normalized.majorityCorrectThreads === 3) interpretation = "mixedParticularity";
  else if (report.raw.majorityCorrectThreads >= 4 && report.normalized.majorityCorrectThreads <= 2) interpretation = "settingDominated";
  else if (report.raw.majorityCorrectThreads <= 3 && report.normalized.majorityCorrectThreads <= 2) interpretation = "weakParticularity";
  else interpretation = "unclassified_boundary_case";
  return { ...report, interpretation };
}
function scoreD2(plan, results, ready) {
  const threads = [];
  for (let threadIndex = 0; threadIndex < ready.material.D2.threads.length; threadIndex += 1) {
    const thread = ready.material.D2.threads[threadIndex];
    const eventTrials = plan.trials.filter((trial) =>
      trial.diagnostic === "D2" && trial.threadIndex === threadIndex && trial.surface === "events");
    const meaningTrials = plan.trials.filter((trial) =>
      trial.diagnostic === "D2" && trial.threadIndex === threadIndex && trial.surface === "meanings");
    if (eventTrials.length !== 3 || meaningTrials.length !== 3) fail(`D2 Thread ${threadIndex + 1} replicate plan drift`);

    const eventScores = Array.from({ length: thread.citedEpisodes.length }, () => []);
    const meaningScores = Array.from({ length: thread.currentMeanings.length }, () => []);
    for (const trial of eventTrials) {
      for (const score of results.get(trial.ordinal).output.scores) eventScores[score.index - 1].push(score.valence);
    }
    for (const trial of meaningTrials) {
      for (const score of results.get(trial.ordinal).output.scores) meaningScores[score.index - 1].push(score.valence);
    }
    const eventMedians = eventScores.map(median);
    const meaningMedians = meaningScores.map(median);
    const pairRows = ready.privateKey.D2.threads[threadIndex].pairs.map((pair) => ({
      meaningIndex: pair.meaningIndex,
      citedEventIndexes: pair.citedEventIndexes,
      citedEventValence: median(pair.citedEventIndexes.map((index) => eventMedians[index])),
      meaningValence: meaningMedians[pair.meaningIndex],
    }));
    const rho = pairRows.length >= 2
      ? spearmanRho(pairRows.map((row) => row.citedEventValence), pairRows.map((row) => row.meaningValence))
      : null;
    threads.push({
      threadIndex,
      eligiblePairCount: pairRows.length,
      eventReplicateMedians: eventMedians,
      meaningReplicateMedians: meaningMedians,
      pairRows,
      spearmanRho: rho,
      absoluteRho: rho === null ? null : Math.abs(rho),
      concern: rho === null || pairRows.length < 4
        ? "insufficientCell"
        : Math.abs(rho) >= 0.70
          ? "highConcern"
          : Math.abs(rho) >= 0.40
            ? "moderate"
            : "low",
    });
  }
  const eligible = threads.filter((thread) => thread.eligiblePairCount >= 4 && thread.absoluteRho !== null);
  const abs = eligible.map((thread) => thread.absoluteRho);
  const highConcernCount = eligible.filter((thread) => thread.absoluteRho >= 0.70).length;
  const leaveOneOutMedians = eligible.length > 1
    ? eligible.map((_, omitted) => median(abs.filter((__, index) => index !== omitted)))
    : [];
  return {
    threads,
    eligibleThreadCount: eligible.length,
    cohortMedianAbsoluteRho: abs.length > 0 ? median(abs) : null,
    leaveOneThreadOutMedianAbsoluteRhoRange: leaveOneOutMedians.length > 0
      ? [Math.min(...leaveOneOutMedians), Math.max(...leaveOneOutMedians)]
      : null,
    cohortHighConcern: highConcernCount >= 4,
    highConcernThreadCount: highConcernCount,
    scoringSeparation: "cited episodes and current meanings were rated in separate stateless calls",
  };
}
function aboveChance(successes, trials) {
  if (trials < 5) return false;
  const accuracy = successes / trials;
  return accuracy >= 0.60 && exactBinomialTail(successes, trials, 0.2) < 0.05;
}
function nearCeiling(successes, trials) {
  return trials >= 5 && successes / trials >= 0.80 && aboveChance(successes, trials);
}
function scoreD3(plan, results) {
  const calibrationTrials = plan.trials.filter((trial) => trial.diagnostic === "D3" && trial.stage === "calibration");
  const calibrationTargets = majorityReportForChoiceTrials(calibrationTrials, results);
  const calibrationCorrect = calibrationTargets.filter((item) => item.majorityCorrect).length;
  const calibrationValid = calibrationCorrect === 5;
  if (!calibrationValid) {
    return {
      calibration: { targets: calibrationTargets, majorityCorrect: calibrationCorrect, instrumentValid: false },
      memoryAttribution: { status: "instrument_invalid_not_run" },
    };
  }

  const memoryTrials = plan.trials.filter((trial) => trial.diagnostic === "D3" && trial.stage === "memory");
  const groups = new Map();
  for (const trial of memoryTrials) {
    const key = trial.targetIndex;
    const list = groups.get(key) ?? [];
    list.push(trial);
    groups.set(key, list);
  }
  const targets = [];
  for (const [targetIndex, trials] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    trials.sort((a, b) => a.replicate - b.replicate);
    const first = trials[0];
    const selected = trials.map((trial) => selectedChoiceIndex(trial, results.get(trial.ordinal).output.choice));
    const majorityChoiceIndex = majorityChoice(selected);
    const correctChoiceIndex = first.correctChoiceIndex;
    if (trials.some((trial) => trial.correctChoiceIndex !== correctChoiceIndex)) fail("D3 memory correct mapping drift across replicates");
    targets.push({
      targetIndex,
      cell: first.cell,
      callOrdinal: first.callOrdinal,
      horizon: first.horizon,
      votes: trials.map((trial, index) => ({
        label: results.get(trial.ordinal).output.choice,
        selectedChoiceIndex: selected[index],
      })),
      majorityChoiceIndex,
      correctChoiceIndex,
      majorityCorrect: majorityChoiceIndex !== null && majorityChoiceIndex === correctChoiceIndex,
    });
  }
  const cellReports = {};
  for (const cell of ["life_only_unexposed", "life_plus_genome", "later_life_only_potentially_contaminated"]) {
    const rows = targets.filter((target) => target.cell === cell);
    const successes = rows.filter((target) => target.majorityCorrect).length;
    cellReports[cell] = {
      rememberedTrials: rows.length,
      notRememberedTrials: 0,
      majorityCorrect: successes,
      accuracy: rows.length === 0 ? null : successes / rows.length,
      exactOneSidedBinomialTailP02: rows.length === 0 ? null : exactBinomialTail(successes, rows.length, 0.2),
      aboveChance: aboveChance(successes, rows.length),
      nearCeiling: nearCeiling(successes, rows.length),
      targets: rows,
    };
  }
  let interpretation;
  const treated = cellReports.life_plus_genome;
  const control = cellReports.life_only_unexposed;
  if (treated.rememberedTrials < 5 || control.rememberedTrials < 5) interpretation = "insufficientCell";
  else if (control.aboveChance) interpretation = treated.nearCeiling && control.nearCeiling ? "possibleOverDetermination" : "negativeControlFailure";
  else if (treated.aboveChance) interpretation = "intendedPropagation";
  else interpretation = "noDetectedPropagation";
  return {
    calibration: { targets: calibrationTargets, majorityCorrect: calibrationCorrect, instrumentValid: true },
    memoryAttribution: {
      status: "completed",
      cells: cellReports,
      interpretation,
      interpretiveLimit: "cell assignment is perfectly collinear with call ordinal/history horizon; this is not clean genome causality",
    },
  };
}
function scoreD5(plan, results, ready) {
  const threads = [];
  for (let threadIndex = 0; threadIndex < ready.material.D5.threads.length; threadIndex += 1) {
    const trials = plan.trials.filter((trial) => trial.diagnostic === "D5" && trial.threadIndex === threadIndex);
    const thread = ready.material.D5.threads[threadIndex];
    const rows = [];
    for (let episodeIndex = 0; episodeIndex < thread.history.length; episodeIndex += 1) {
      const label = thread.history[episodeIndex].episodeLabel;
      const judgments = trials
        .sort((a, b) => a.replicate - b.replicate)
        .map((trial) => results.get(trial.ordinal).output.episodes.find((item) => item.episodeLabel === label));
      const majority = majorityChoice(judgments.map((item) => item.status));
      const disagreement = new Set(judgments.map((item) => item.status)).size > 1;
      rows.push({
        episodeLabel: label,
        votes: judgments.map((item) => ({
          status: item.status,
          supportingStatementLabels: item.supportingStatementLabels,
        })),
        majorityStatus: majority,
        raterDisagreement: disagreement,
      });
    }
    const accommodated = rows.filter((row) => row.majorityStatus === "accommodated").length;
    const unaccommodated = rows.filter((row) => row.majorityStatus === "unaccommodated").length;
    threads.push({
      threadIndex,
      majorityUnaccommodatedEpisodeCount: unaccommodated,
      majorityAccommodatedEpisodeCount: accommodated,
      raterDisagreementCount: rows.filter((row) => row.raterDisagreement).length,
      historicalExcessObserved: unaccommodated >= 1,
      episodes: rows,
    });
  }
  const zeroUnaccommodated = threads.filter((thread) => thread.majorityUnaccommodatedEpisodeCount === 0).length;
  return { threads, zeroUnaccommodatedThreadCount: zeroUnaccommodated, cohortOverreachConcern: zeroUnaccommodated >= 4 };
}
function scoreAll({ plan, results, ready }) {
  return {
    version: SUMMARY_VERSION,
    status: "DIAGNOSTICS_COMPLETE",
    closureId: plan.closureId,
    finalizationDigest: plan.finalizationDigest,
    toolingHead: plan.toolingHead,
    raterMaterialDigest: plan.raterMaterialDigest,
    planDigest: plan.planDigest,
    rater: structuredClone(plan.rater),
    D1: scoreD1(plan, results),
    D2: scoreD2(plan, results, ready),
    D3: scoreD3(plan, results),
    D4: structuredClone(ready.d4),
    D5: scoreD5(plan, results, ready),
    providerCallsMade: results.size,
    providerCallsMadeThisInvocation: [...results.values()].filter((result) => result.reused !== true).length,
    completedAt: new Date().toISOString(),
  };
}
function parseArgs(argv) {
  if (argv.length !== 1 || !["--preflight", "--run"].includes(argv[0])) {
    fail("usage: genesis-pr39-diagnostic-rater-runner.mjs --preflight | --run");
  }
  return argv[0];
}

async function main() {
  const mode = parseArgs(process.argv.slice(2));
  assertCleanTree();
  const frozen = loadPr39ClosureFinalization();
  const ready = loadReadyMaterial(frozen);
  const head = gitHead();
  const expectedPlan = buildPlan({ frozen, ready, toolingHead: head });
  const root = `.fibre/genesis/pr39-closure/${frozen.finalization.closureId}/${RUN_VERSION}`;
  const planPath = `${root}/plan.json`;

  if (mode === "--preflight") {
    if (existsSync(absolute(planPath))) {
      const existing = readJson(planPath);
      assertPlanMatches(existing, expectedPlan);
      console.log("PR39 DIAGNOSTIC RATER PREFLIGHT: REUSED");
    } else {
      writeJsonAtomic(planPath, expectedPlan, { exclusive: true });
      console.log("PR39 DIAGNOSTIC RATER PREFLIGHT: READY");
    }
    console.log(`Tooling HEAD: ${head}`);
    console.log(`Rater material: ${ready.manifest.raterMaterialDigest}`);
    console.log(`Plan digest: ${expectedPlan.planDigest}`);
    console.log(`Rater: ${expectedPlan.rater.provider}/${expectedPlan.rater.model} · stateless · temperature ${expectedPlan.rater.temperature}`);
    console.log(`Planned calls if D3 calibration valid: ${expectedPlan.plannedCallsIfD3CalibrationValid}`);
    console.log(`Unconditional calls: ${expectedPlan.plannedUnconditionalCalls}`);
    console.log(`Conditional D3 memory calls: ${expectedPlan.plannedD3MemoryCallsConditionalOnCalibration}`);
    console.log(`D3 realized target cells: ${JSON.stringify(expectedPlan.d3CellTargetCounts)}`);
    console.log("D2 blindness: cited episodes and current meanings scored in separate stateless calls");
    console.log("D2 replicate aggregation: median of three ordinal scores per item");
    console.log("D3 interpretation limit: position/history-horizon confound declared before result");
    console.log(`D4 authority: ${ready.d4.cohort.totalReinterpretationEligible} eligible · ${ready.d4.cohort.totalReinterpretationRuns} run · ${ready.d4.cohort.totalReinterpretationRevised} revised`);
    console.log("Provider calls made: 0");
    console.log("Live execution is NOT authorized by preflight.");
    return;
  }

  if (!existsSync(absolute(planPath))) fail("run requires a completed zero-provider preflight plan");
  const plan = readJson(planPath);
  assertPlanMatches(plan, expectedPlan);
  if (plan.toolingHead !== head) fail("diagnostic plan belongs to a different tooling HEAD");

  const protocol = frozen.precommitment.protocol;
  const modelId = protocol.raterDiscipline.model;
  const adapter = createOpenAIModelAdapter({
    modelId,
    temperature: RATER_TEMPERATURE,
    topP: RATER_TOP_P,
    reasoningEffort: RATER_REASONING_EFFORT,
    retryLimit: RATER_RETRY_LIMIT,
    retryDelayMs: RATER_RETRY_DELAY_MS,
  });

  const claimPath = `${root}/run-claim.json`;
  const claimCore = {
    version: CLAIM_VERSION,
    status: "CLAIMED_DIAGNOSTIC_RATER_RUN",
    closureId: plan.closureId,
    toolingHead: head,
    raterMaterialDigest: plan.raterMaterialDigest,
    planDigest: plan.planDigest,
    provider: protocol.raterDiscipline.provider,
    model: modelId,
    claimedAt: null,
  };
  let claim;
  if (existsSync(absolute(claimPath))) {
    claim = readJson(claimPath);
    const requested = { ...claimCore, claimedAt: claim.claimedAt };
    if (canonicalJson(claim) !== canonicalJson(requested)) fail("diagnostic rater run claim drift");
  } else {
    claim = { ...claimCore, claimedAt: new Date().toISOString() };
    writeJsonAtomic(claimPath, claim, { exclusive: true });
  }

  const results = new Map();
  for (const trial of plan.trials) {
    if (trial.diagnostic === "D3" && trial.stage === "memory") {
      if (!calibrationPassed(results, plan)) {
        console.log("D3 calibration is not 5/5 majority-correct; D3 memory attribution will not run.");
        continue;
      }
    }
    const saved = existingResult(root, trial, ready);
    if (saved !== null) {
      results.set(trial.ordinal, { ...saved, reused: true });
      console.log(`✓ trial ${trial.ordinal}/${plan.trials.length} ${trial.diagnostic}${trial.stage ? `/${trial.stage}` : ""} · replayed`);
      continue;
    }
    const { schema, input } = schemaAndInputFor(trial, ready);
    if (digest(input) !== trial.inputDigest || digest(schema) !== trial.schemaDigest || digest(promptFor(trial)) !== trial.promptDigest) {
      fail(`trial ${trial.ordinal} request witness drift`);
    }
    console.log(`→ trial ${trial.ordinal}/${plan.trials.length} ${trial.diagnostic}${trial.stage ? `/${trial.stage}` : ""} · replicate ${trial.replicate}`);
    const response = await invokeWithHeartbeat(adapter, trial, promptFor(trial), input, schema);
    try {
      validateTrialOutput(trial, response.output, ready);
    } catch (validationError) {
      const failure = {
        version: "pr39-diagnostic-rater-validation-failure-v1",
        ordinal: trial.ordinal,
        diagnostic: trial.diagnostic,
        stage: trial.stage ?? null,
        condition: trial.condition ?? null,
        surface: trial.surface ?? null,
        replicate: trial.replicate,
        clientRequestId: trial.clientRequestId,
        requestDigest: trial.requestDigest,
        output: structuredClone(response.output),
        provenance: structuredClone(response.provenance),
        validationError: validationError?.message ?? String(validationError),
        recordedAt: new Date().toISOString(),
      };
      writeJsonAtomic(validationFailurePath(root, trial), failure, { exclusive: true });
      throw validationError;
    }
    const result = {
      version: RESULT_VERSION,
      ordinal: trial.ordinal,
      diagnostic: trial.diagnostic,
      stage: trial.stage ?? null,
      condition: trial.condition ?? null,
      surface: trial.surface ?? null,
      targetIndex: trial.targetIndex ?? null,
      threadIndex: trial.threadIndex ?? null,
      replicate: trial.replicate,
      clientRequestId: trial.clientRequestId,
      requestDigest: trial.requestDigest,
      output: structuredClone(response.output),
      provenance: structuredClone(response.provenance),
      recordedAt: new Date().toISOString(),
    };
    writeJsonAtomic(resultPath(root, trial), result, { exclusive: true });
    results.set(trial.ordinal, result);
    console.log(`✓ trial ${trial.ordinal}/${plan.trials.length} committed`);
  }

  const requiredTrials = plan.trials.filter((trial) =>
    !(trial.diagnostic === "D3" && trial.stage === "memory") || calibrationPassed(results, plan));
  const missing = requiredTrials.filter((trial) => !results.has(trial.ordinal));
  if (missing.length > 0) fail(`diagnostic run incomplete: ${missing.length} required trials missing`);

  const summaryPath = `${root}/summary.json`;
  if (existsSync(absolute(summaryPath))) {
    const existing = readJson(summaryPath);
    console.log("PR39 DIAGNOSTICS: ALREADY COMPLETE");
    console.log(`Summary: ${summaryPath}`);
    console.log(`Summary digest: ${digest(existing)}`);
    return;
  }
  const summary = scoreAll({ plan, results, ready });
  writeJsonAtomic(summaryPath, summary, { exclusive: true });
  console.log("PR39 DIAGNOSTICS: COMPLETE");
  console.log(`D1: ${summary.D1.interpretation} · raw ${summary.D1.raw.majorityCorrectThreads}/5 · normalized ${summary.D1.normalized.majorityCorrectThreads}/5`);
  console.log(`D2: high-concern Threads ${summary.D2.highConcernThreadCount}/${summary.D2.eligibleThreadCount}`);
  console.log(`D3: ${summary.D3.memoryAttribution.interpretation ?? summary.D3.memoryAttribution.status}`);
  console.log(`D4: overplot ${summary.D4.cohort.overplotConcernTriggered ? "TRIGGERED" : "not triggered"} · reinterpretation ${summary.D4.cohort.totalReinterpretationEligible} eligible/${summary.D4.cohort.totalReinterpretationRuns} run/${summary.D4.cohort.totalReinterpretationRevised} revised`);
  console.log(`D5: cohort overreach ${summary.D5.cohortOverreachConcern ? "TRIGGERED" : "not triggered"}`);
  console.log(`Summary: ${summaryPath}`);
  console.log(`Summary digest: ${digest(summary)}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`PR39 DIAGNOSTIC RATER: FAILED\n${error?.code ? `${error.code}: ` : ""}${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}

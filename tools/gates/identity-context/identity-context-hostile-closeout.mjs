import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildFrozenIdentityContextLivePlan,
  summarizeIdentityContextLiveState,
} from "./identity-context-causal-differential-live.mjs";
import {
  FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_V1 as FROZEN,
} from "./frozen-causal-differential-v1.mjs";
import {
  FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_RESULT_V1 as RESULT,
} from "./frozen-causal-differential-result-v1.mjs";

const DEFAULT_STATE_PATH =
  ".fibre/validation/identity-context-causal-differential-v1/live-result.json";

const COMPACT_OUTPUT_KEYS = Object.freeze([
  "modelDecision",
  "proposedAction",
  "participationFit",
  "rationaleDigest",
  "factors",
  "evidenceRefs",
  "normalizations",
]);
const FACTOR_KEYS = Object.freeze(["effect", "evidenceRefs"]);
const FORBIDDEN_LEDGER_KEYS = Object.freeze(new Set([
  "rememberedContent",
  "rememberedMeaning",
  "identityContext",
  "guardianCapsule",
  "modelInput",
  "systemPrompt",
  "input",
  "text",
  "rationale",
]));

function conditionKey(threadId, condition) {
  return `${threadId}:${condition}`;
}

function clientRequestId(threadId, condition) {
  return `identity-context-d-v1:${threadId}:${condition}`;
}

function assertExactKeys(name, value, keys) {
  assert.equal(value !== null && typeof value === "object" && !Array.isArray(value), true, `${name} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${name} keys drifted`);
}

function assertNoForbiddenKeys(value, path = "ledger") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenKeys(item, `${path}[${index}]`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    assert.equal(FORBIDDEN_LEDGER_KEYS.has(key), false, `${path}.${key} is forbidden private/prose material`);
    assertNoForbiddenKeys(item, `${path}.${key}`);
  }
}

function assertCompactOutput(output, key) {
  assertExactKeys(`condition ${key} output`, output, COMPACT_OUTPUT_KEYS);
  assert.match(output.rationaleDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(Array.isArray(output.evidenceRefs), true);
  assert.equal(Array.isArray(output.normalizations), true);
  assert.equal(output.factors !== null && typeof output.factors === "object" && !Array.isArray(output.factors), true);
  for (const [name, factor] of Object.entries(output.factors)) {
    assertExactKeys(`condition ${key} factor ${name}`, factor, FACTOR_KEYS);
    assert.equal(typeof factor.effect, "string");
    assert.equal(Array.isArray(factor.evidenceRefs), true);
  }
}

function compactResultSummary(summary) {
  return {
    completedConditions: summary.completedConditions,
    totalConditions: summary.totalConditions,
    attributablePairCount: summary.attributablePairCount,
    band: summary.band,
    pairs: summary.pairs.map((pair) => ({
      fibreIdentityNumber: pair.fibreIdentityNumber,
      threadId: pair.threadId,
      canonical: structuredClone(pair.canonical),
      counterfactual: structuredClone(pair.counterfactual),
      attributable: pair.evaluation.attributable,
      structuredDifference: pair.evaluation.structuredDifference,
      memoryGrounded: pair.evaluation.memoryGrounded,
      changedFactors: [...pair.evaluation.changedFactors],
    })),
  };
}

function compactFrozenResult() {
  return {
    completedConditions: RESULT.completedConditions,
    totalConditions: RESULT.totalConditions,
    attributablePairCount: RESULT.attributablePairCount,
    band: RESULT.band,
    pairs: RESULT.pairs.map((pair) => ({
      fibreIdentityNumber: pair.fibreIdentityNumber,
      threadId: pair.threadId,
      canonical: structuredClone(pair.canonical),
      counterfactual: structuredClone(pair.counterfactual),
      attributable: pair.attributable,
      structuredDifference: pair.structuredDifference,
      memoryGrounded: pair.memoryGrounded,
      changedFactors: [...pair.changedFactors],
    })),
  };
}

export function assertIdentityContextHostileCloseoutLedger({ state, plan }) {
  assert.equal(state.instrumentId, FROZEN.id);
  assert.equal(state.instrumentId, RESULT.instrumentId);
  assert.equal(state.frozenFromHead, FROZEN.frozenFromHead);
  assert.equal(state.requestFingerprint, FROZEN.requestFingerprint);
  assert.equal(state.guardianPromptHash, FROZEN.guardianPromptHash);
  assert.equal(state.databasePath, plan.databasePath);
  assert.deepEqual(state.selection, plan.verification.selection);
  assert.equal(state.selection.provider, RESULT.provider);
  assert.equal(state.selection.modelId, RESULT.modelId);
  assert.equal(state.scoreMovementPermitted, false);
  assert.equal(Array.isArray(state.conditions), true);
  assert.equal(state.conditions.length, 10);
  assert.equal(plan.conditions.length, 10);

  const seen = new Set();
  for (let index = 0; index < plan.conditions.length; index += 1) {
    const expected = plan.conditions[index];
    const actual = state.conditions[index];
    const expectedKey = conditionKey(expected.threadId, expected.condition);
    assert.ok(actual, `missing condition ${expectedKey}`);
    assert.equal(actual.key, expectedKey, `condition order/substitution drift at index ${index}`);
    assert.equal(seen.has(actual.key), false, `duplicate condition ${actual.key}`);
    seen.add(actual.key);
    assert.equal(actual.status, "completed", `condition ${actual.key} is not completed`);
    assert.equal(actual.pairIndex, expected.pairIndex);
    assert.equal(actual.orderIndex, expected.orderIndex);
    assert.equal(actual.fibreIdentityNumber, expected.fibreIdentityNumber);
    assert.equal(actual.threadId, expected.threadId);
    assert.equal(actual.condition, expected.condition);
    assert.equal(actual.clientRequestId, clientRequestId(expected.threadId, expected.condition));
    assert.equal(actual.capsuleDigest, expected.capsuleDigest);
    assert.equal(actual.modelInputDigest, expected.modelInputDigest);
    assert.equal(actual.responseSchemaHash, expected.responseSchemaHash);
    assert.equal(actual.promptHash, FROZEN.guardianPromptHash);
    assert.equal(actual.responseSchemaHashObserved, expected.responseSchemaHash);
    assert.equal(actual.provenance?.provider, RESULT.provider);
    assert.equal(actual.provenance?.modelId, RESULT.modelId);
    assertCompactOutput(actual.output, actual.key);
  }

  assertNoForbiddenKeys(state);

  const replayed = summarizeIdentityContextLiveState(state);
  assert.equal(replayed.complete, true);
  assert.deepEqual(compactResultSummary(replayed), compactFrozenResult());
  assert.deepEqual(compactResultSummary(state.summary), compactFrozenResult());

  return {
    providerCalls: 0,
    completedConditions: replayed.completedConditions,
    attributablePairCount: replayed.attributablePairCount,
    band: replayed.band,
    frozenInstrumentReproduced: true,
    conditionOrderAndDigestsExact: true,
    providerAndModelExact: true,
    compactPrivacySurface: true,
    scoreMovementPermitted: false,
  };
}

export function runIdentityContextHostileCloseout({
  databasePath,
  statePath = DEFAULT_STATE_PATH,
} = {}) {
  if (databasePath === undefined) throw new TypeError("identity context hostile closeout requires databasePath");
  const absoluteStatePath = resolve(statePath);
  const state = JSON.parse(readFileSync(absoluteStatePath, "utf8"));

  // Intentionally provide no API environment. Building the frozen plan performs
  // only provider-free config selection plus read-only World reconstruction.
  const plan = buildFrozenIdentityContextLivePlan(databasePath, { environment: {} });
  const result = assertIdentityContextHostileCloseoutLedger({ state, plan });
  return {
    ...result,
    statePath: absoluteStatePath,
    databasePath: plan.databasePath,
    canonicalWorldQueryOnly: true,
  };
}

export function formatIdentityContextHostileCloseout(result) {
  return [
    "Identity Context Hostile Closeout: CLEAR",
    "",
    `Provider calls: ${result.providerCalls}`,
    `Offline completed conditions: ${result.completedConditions}/10`,
    `Sealed result: ${result.attributablePairCount}/5 ${result.band.toUpperCase()}`,
    `Frozen instrument reproduced: ${result.frozenInstrumentReproduced}`,
    `Condition order/digests exact: ${result.conditionOrderAndDigestsExact}`,
    `Provider/model exact: ${result.providerAndModelExact}`,
    `Compact privacy surface: ${result.compactPrivacySurface}`,
    `Canonical World query-only: ${result.canonicalWorldQueryOnly}`,
    "",
    `Ledger: ${result.statePath}`,
    "",
  ].join("\n");
}

function parseArgs(argv) {
  let databasePath = null;
  let statePath = DEFAULT_STATE_PATH;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--state") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error("--state requires a path");
      statePath = value;
      index += 1;
    } else if (arg.startsWith("--state=")) statePath = arg.slice("--state=".length);
    else if (arg.startsWith("--")) throw new Error(`unknown option: ${arg}`);
    else if (databasePath === null) databasePath = arg;
    else throw new Error(`unexpected argument: ${arg}`);
  }
  if (databasePath === null) {
    throw new Error("usage: node identity-context-hostile-closeout.mjs <world.sqlite> [--state <live-result.json>]");
  }
  return { databasePath, statePath };
}

async function main() {
  const result = runIdentityContextHostileCloseout(parseArgs(process.argv.slice(2)));
  process.stdout.write(formatIdentityContextHostileCloseout(result));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}

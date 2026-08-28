import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  semanticDignityGuardianV4,
} from "#services/world-kernel/src/dignity-guardian-evaluation.mjs";
import { createModelRuntime } from "#services/world-kernel/src/model-runtime/model-runtime.mjs";
import {
  canonicalJson,
  sha256,
} from "#services/world-kernel/src/persistence-common.mjs";
import { openIdentityContextInspectionContext } from "../../inspect/inspect-identity-context.mjs";
import {
  buildIdentityContextCausalDifferentialPair,
  classifyIdentityContextCausalDifferential,
  evaluateIdentityContextCausalDifferentialPair,
} from "./identity-context-causal-differential.mjs";
import {
  verifyFrozenIdentityContextCausalDifferential,
} from "./identity-context-causal-differential-freeze-check.mjs";
import {
  FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_V1 as FROZEN,
} from "./frozen-causal-differential-v1.mjs";

const LIVE_STATE_VERSION = 1;
const DEFAULT_STATE_PATH =
  ".fibre/validation/identity-context-causal-differential-v1/live-result.json";

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function conditionKey(threadId, condition) {
  return `${threadId}:${condition}`;
}

function clientRequestId(threadId, condition) {
  return `identity-context-d-v1:${threadId}:${condition}`;
}

function frozenPairByThread(threadId) {
  const pair = FROZEN.pairs.find((candidate) => candidate.threadId === threadId);
  if (pair === undefined) throw new TypeError(`Thread ${threadId} is not in the frozen Slice D cohort`);
  return pair;
}

function assertPairStillFrozen(pair, frozenPair) {
  assert.equal(pair.threadId, frozenPair.threadId);
  assert.equal(pair.targetMemoryRef, frozenPair.targetMemoryRef);
  assert.equal(pair.replacementMemoryRef, frozenPair.replacementMemoryRef);
  assert.equal(
    pair.canonical.identityContext.capsuleDigest,
    frozenPair.canonicalCapsuleDigest,
  );
  assert.equal(
    pair.counterfactual.identityContext.capsuleDigest,
    frozenPair.counterfactualCapsuleDigest,
  );
}

export function buildFrozenIdentityContextLivePlan(databasePath, { environment = process.env } = {}) {
  const absoluteDatabasePath = resolve(databasePath);
  const verification = verifyFrozenIdentityContextCausalDifferential(
    absoluteDatabasePath,
    { environment },
  );
  const context = openIdentityContextInspectionContext(absoluteDatabasePath);
  try {
    if (!context.queryOnly()) throw new TypeError("Slice D live plan must read the canonical World query-only");
    const registrations = context.registrations();
    const registrationByThread = new Map(
      registrations.map((registration) => [registration.threadId, registration]),
    );
    const pairs = FROZEN.pairs.map((frozenPair) => {
      const registration = registrationByThread.get(frozenPair.threadId);
      assert.ok(registration, `missing frozen Thread ${frozenPair.threadId}`);
      assert.equal(registration.fibreIdentityNumber, frozenPair.fibreIdentityNumber);
      const pair = buildIdentityContextCausalDifferentialPair({
        threadId: frozenPair.threadId,
        sourceStores: context.sourceStores,
      });
      assertPairStillFrozen(pair, frozenPair);
      return {
        fibreIdentityNumber: frozenPair.fibreIdentityNumber,
        threadId: frozenPair.threadId,
        targetMemoryRef: frozenPair.targetMemoryRef,
        replacementMemoryRef: frozenPair.replacementMemoryRef,
        conditionOrder: [...frozenPair.conditionOrder],
        canonical: pair.canonical,
        counterfactual: pair.counterfactual,
      };
    });
    const conditions = pairs.flatMap((pair, pairIndex) =>
      pair.conditionOrder.map((condition, orderIndex) => ({
        pairIndex,
        orderIndex,
        fibreIdentityNumber: pair.fibreIdentityNumber,
        threadId: pair.threadId,
        condition,
        targetMemoryRef: pair.targetMemoryRef,
        replacementMemoryRef: pair.replacementMemoryRef,
        guardianCapsule: structuredClone(pair[condition].guardianCapsule),
        capsuleDigest: pair[condition].identityContext.capsuleDigest,
        modelInputDigest: pair[condition].modelInputDigest,
        responseSchemaHash: pair[condition].responseSchemaHash,
      })),
    );
    assert.equal(conditions.length, 10);
    return {
      databasePath: absoluteDatabasePath,
      verification,
      pairs,
      conditions,
    };
  } finally {
    context.close();
  }
}

function initialState(plan, statePath) {
  return {
    version: LIVE_STATE_VERSION,
    instrumentId: FROZEN.id,
    frozenFromHead: FROZEN.frozenFromHead,
    requestFingerprint: FROZEN.requestFingerprint,
    guardianPromptHash: FROZEN.guardianPromptHash,
    databasePath: plan.databasePath,
    statePath: resolve(statePath),
    selection: structuredClone(plan.verification.selection),
    scoreMovementPermitted: false,
    createdAt: new Date().toISOString(),
    conditions: [],
    summary: null,
  };
}

function validateState(state, plan, statePath) {
  assert.equal(state.version, LIVE_STATE_VERSION);
  assert.equal(state.instrumentId, FROZEN.id);
  assert.equal(state.frozenFromHead, FROZEN.frozenFromHead);
  assert.equal(state.requestFingerprint, FROZEN.requestFingerprint);
  assert.equal(state.guardianPromptHash, FROZEN.guardianPromptHash);
  assert.equal(state.databasePath, plan.databasePath);
  assert.equal(state.statePath, resolve(statePath));
  assert.deepEqual(state.selection, plan.verification.selection);
  assert.equal(state.scoreMovementPermitted, false);
  if (!Array.isArray(state.conditions)) throw new TypeError("Slice D live state conditions must be an array");
  const keys = state.conditions.map((item) => item.key);
  if (new Set(keys).size !== keys.length) throw new TypeError("Slice D live state contains duplicate conditions");
  for (const item of state.conditions) {
    if (!["started", "completed", "failed"].includes(item.status)) {
      throw new TypeError(`Slice D live state condition ${item.key} has invalid status`);
    }
  }
  return state;
}

function loadState(plan, statePath) {
  const absolute = resolve(statePath);
  if (!existsSync(absolute)) return initialState(plan, absolute);
  return validateState(JSON.parse(readFileSync(absolute, "utf8")), plan, absolute);
}

function writeState(state, statePath) {
  const absolute = resolve(statePath);
  mkdirSync(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  renameSync(temporary, absolute);
}

function compactOutput(result) {
  return {
    modelDecision: result.output.modelDecision,
    proposedAction: result.output.proposedAction,
    participationFit: result.output.participationFit,
    rationaleDigest: digest(result.output.rationale),
    factors: Object.fromEntries(
      Object.entries(result.output.factors).map(([name, factor]) => [
        name,
        {
          effect: factor.effect,
          evidenceRefs: [...factor.evidenceRefs],
        },
      ]),
    ),
    evidenceRefs: [...result.output.evidenceRefs],
    normalizations: [...result.output.normalizations],
  };
}

function completedByKey(state) {
  return new Map(
    state.conditions
      .filter((item) => item.status === "completed")
      .map((item) => [item.key, item]),
  );
}

export function summarizeIdentityContextLiveState(state) {
  const completed = completedByKey(state);
  if (completed.size !== 10) {
    return {
      complete: false,
      completedConditions: completed.size,
      totalConditions: 10,
      attributablePairCount: null,
      band: null,
      pairs: [],
    };
  }
  const pairs = FROZEN.pairs.map((pair) => {
    const canonical = completed.get(conditionKey(pair.threadId, "canonical"));
    const counterfactual = completed.get(conditionKey(pair.threadId, "counterfactual"));
    assert.ok(canonical && counterfactual);
    const evaluation = evaluateIdentityContextCausalDifferentialPair({
      canonicalOutput: canonical.output,
      counterfactualOutput: counterfactual.output,
      targetMemoryRef: pair.targetMemoryRef,
      replacementMemoryRef: pair.replacementMemoryRef,
    });
    return {
      fibreIdentityNumber: pair.fibreIdentityNumber,
      threadId: pair.threadId,
      canonical: {
        proposedAction: canonical.output.proposedAction,
        participationFit: canonical.output.participationFit,
      },
      counterfactual: {
        proposedAction: counterfactual.output.proposedAction,
        participationFit: counterfactual.output.participationFit,
      },
      evaluation,
    };
  });
  const attributablePairCount = pairs.filter((pair) => pair.evaluation.attributable).length;
  return {
    complete: true,
    completedConditions: 10,
    totalConditions: 10,
    attributablePairCount,
    band: classifyIdentityContextCausalDifferential(attributablePairCount),
    pairs,
  };
}

export async function executeIdentityContextLivePlan({
  plan,
  statePath = DEFAULT_STATE_PATH,
  invokeCondition,
  progress = () => {},
}) {
  if (typeof invokeCondition !== "function") throw new TypeError("Slice D live runner requires invokeCondition");
  const state = loadState(plan, statePath);

  for (const condition of plan.conditions) {
    const key = conditionKey(condition.threadId, condition.condition);
    const existing = state.conditions.find((item) => item.key === key);
    if (existing?.status === "completed") {
      progress({ type: "skipped_completed", condition, completed: state.conditions.filter((item) => item.status === "completed").length });
      continue;
    }
    if (existing !== undefined) {
      throw new Error(
        `Slice D refuses to resample ${key}: prior status is ${existing.status}; ` +
        "review the local ledger instead of rerunning an ambiguous or failed condition",
      );
    }

    const record = {
      key,
      pairIndex: condition.pairIndex,
      orderIndex: condition.orderIndex,
      fibreIdentityNumber: condition.fibreIdentityNumber,
      threadId: condition.threadId,
      condition: condition.condition,
      clientRequestId: clientRequestId(condition.threadId, condition.condition),
      capsuleDigest: condition.capsuleDigest,
      modelInputDigest: condition.modelInputDigest,
      responseSchemaHash: condition.responseSchemaHash,
      status: "started",
      startedAt: new Date().toISOString(),
    };
    state.conditions.push(record);
    writeState(state, statePath);
    progress({ type: "started", condition, completed: state.conditions.filter((item) => item.status === "completed").length });

    try {
      const result = await invokeCondition(condition, record.clientRequestId);
      record.status = "completed";
      record.completedAt = new Date().toISOString();
      record.output = compactOutput(result);
      record.provenance = structuredClone(result.provenance);
      record.promptSchemaVersion = result.promptSchemaVersion;
      record.promptHash = result.promptHash;
      record.responseSchemaVersion = result.responseSchemaVersion;
      record.responseSchemaHashObserved = result.responseSchemaHash;
      record.responseSchemaGeneratorHash = result.responseSchemaGeneratorHash;
      assert.equal(record.promptHash, FROZEN.guardianPromptHash);
      assert.equal(record.responseSchemaHashObserved, condition.responseSchemaHash);
      writeState(state, statePath);
      progress({ type: "completed", condition, completed: state.conditions.filter((item) => item.status === "completed").length });
    } catch (error) {
      record.status = "failed";
      record.failedAt = new Date().toISOString();
      record.error = {
        name: error?.name ?? "Error",
        code: error?.code ?? null,
        message: error?.message ?? String(error),
      };
      writeState(state, statePath);
      throw error;
    }
  }

  state.summary = summarizeIdentityContextLiveState(state);
  state.completedAt = state.summary.complete ? new Date().toISOString() : null;
  writeState(state, statePath);
  return state;
}

export async function runFrozenIdentityContextCausalDifferentialLive({
  databasePath,
  statePath = DEFAULT_STATE_PATH,
  environment = process.env,
  progress = () => {},
} = {}) {
  if (databasePath === undefined) throw new TypeError("Slice D live runner requires databasePath");
  const plan = buildFrozenIdentityContextLivePlan(databasePath, { environment });
  const runtime = createModelRuntime({ environment });
  const selection = runtime.selectionForBlock(FROZEN.liveModel.reasoningBlock);
  assert.deepEqual(selection, plan.verification.selection);
  const adapter = runtime.forBlock(FROZEN.liveModel.reasoningBlock);
  return executeIdentityContextLivePlan({
    plan,
    statePath,
    progress,
    invokeCondition(condition, requestId) {
      return semanticDignityGuardianV4(condition.guardianCapsule, adapter, {
        clientRequestId: requestId,
      });
    },
  });
}

export function formatIdentityContextLiveSummary(state) {
  const summary = state.summary ?? summarizeIdentityContextLiveState(state);
  const lines = [
    "Identity Context Causal Differential: LIVE RESULT",
    "",
    `Instrument: ${state.instrumentId}`,
    `Model: ${state.selection.provider}/${state.selection.modelId}`,
    `Completed conditions: ${summary.completedConditions}/${summary.totalConditions}`,
  ];
  if (!summary.complete) {
    lines.push("Result: INCOMPLETE", "");
    return `${lines.join("\n")}\n`;
  }
  lines.push(
    `Attributable pairs: ${summary.attributablePairCount}/5`,
    `Band: ${summary.band.toUpperCase()}`,
    "",
  );
  for (const pair of summary.pairs) {
    lines.push(
      `${pair.fibreIdentityNumber}  ${pair.threadId}`,
      `  canonical=${pair.canonical.proposedAction}/${pair.canonical.participationFit}`,
      `  counterfactual=${pair.counterfactual.proposedAction}/${pair.counterfactual.participationFit}`,
      `  attributable=${pair.evaluation.attributable} structured=${pair.evaluation.structuredDifference} memory-grounded=${pair.evaluation.memoryGrounded}`,
      `  changed-factors=${pair.evaluation.changedFactors.join(",") || "none"}`,
    );
  }
  lines.push("", `Local ledger: ${state.statePath}`, "");
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  let databasePath = null;
  let statePath = DEFAULT_STATE_PATH;
  let authorized = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--authorized") authorized = true;
    else if (arg === "--state") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error("--state requires a path");
      statePath = value;
      index += 1;
    } else if (arg.startsWith("--state=")) statePath = arg.slice("--state=".length);
    else if (arg.startsWith("--")) throw new Error(`unknown option: ${arg}`);
    else if (databasePath === null) databasePath = arg;
    else throw new Error(`unexpected argument: ${arg}`);
  }
  if (!authorized) {
    throw new Error("live provider use requires explicit --authorized");
  }
  if (databasePath === null) {
    throw new Error("usage: node identity-context-causal-differential-live.mjs <world.sqlite> --authorized [--state <result.json>]");
  }
  return { databasePath, statePath };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const state = await runFrozenIdentityContextCausalDifferentialLive({
    ...options,
    progress(event) {
      if (event.type === "started") {
        process.stderr.write(
          `Slice D · ${event.completed + 1}/10 · ${event.condition.fibreIdentityNumber} · ${event.condition.condition} · calling frozen Guardian\n`,
        );
      } else if (event.type === "completed") {
        process.stderr.write(
          `Slice D · ${event.completed}/10 · ${event.condition.fibreIdentityNumber} · ${event.condition.condition} · completed\n`,
        );
      }
    },
  });
  process.stdout.write(formatIdentityContextLiveSummary(state));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}

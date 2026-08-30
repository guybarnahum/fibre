import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createGoogleModelAdapter } from "#integrations/ai/reasoning/google.mjs";
import { selectReasoningIntegration } from "../../../infra/deployments/integration-selection.mjs";
import {
  semanticDignityGuardianV4,
} from "#services/world-kernel/src/dignity-guardian-evaluation.mjs";
import {
  canonicalJson,
  sha256,
} from "#services/world-kernel/src/persistence-common.mjs";
import { openIdentityContextInspectionContext } from "../../inspect/inspect-identity-context.mjs";
import {
  buildIdentityContextCausalDifferentialPair,
  IDENTITY_CONTEXT_CAUSAL_REQUEST,
} from "../identity-context/identity-context-causal-differential.mjs";
import {
  frozenLiveModelIntegration,
} from "../identity-context/identity-context-causal-differential-freeze-check.mjs";
import {
  evaluateM2StandingReplacement,
  evaluateM2StandingStability,
} from "./m2-standing-stability-replacement.mjs";
import {
  verifyFrozenM2StandingPreflight,
} from "./m2-standing-freeze-check.mjs";
import {
  FROZEN_M2_STANDING_PREFLIGHT_V1 as FROZEN,
} from "./frozen-m2-standing-preflight-v1.mjs";

const LIVE_STATE_VERSION = 1;
const DEFAULT_STATE_PATH =
  ".fibre/validation/m2-standing-stability-replacement-v1/live-result.json";

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function databaseDigest(databasePath) {
  return `sha256:${createHash("sha256").update(readFileSync(databasePath)).digest("hex")}`;
}

function conditionKey(phase, threadId, trialIndex = null) {
  return phase === "stability"
    ? `stability:${threadId}:${String(trialIndex).padStart(2, "0")}`
    : `replacement:${threadId}`;
}

function clientRequestId(condition) {
  return `m2-standing-v1:${condition.key}`;
}

function compactThread(thread) {
  return {
    fibreIdentityNumber: thread.fibreIdentityNumber,
    threadId: thread.threadId,
    canonicalCapsuleDigest: thread.canonicalCapsuleDigest,
    modelInputDigest: thread.modelInputDigest,
    responseSchemaHash: thread.responseSchemaHash,
    expected: structuredClone(thread.expected),
    canonicalIdentityMemoryRefs: [...thread.canonicalIdentityMemoryRefs],
  };
}

function assertCanonicalThread(thread, frozen) {
  assert.equal(thread.fibreIdentityNumber, frozen.fibreIdentityNumber);
  assert.equal(thread.threadId, frozen.threadId);
  assert.equal(thread.canonicalCapsuleDigest, frozen.canonicalCapsuleDigest);
  assert.equal(thread.modelInputDigest, frozen.modelInputDigest);
  assert.equal(thread.responseSchemaHash, frozen.responseSchemaHash);
  assert.deepEqual(thread.expected, frozen.expected);
  assert.deepEqual(thread.canonicalIdentityMemoryRefs, frozen.canonicalIdentityMemoryRefs);
}

export function buildFrozenM2StandingLivePlan(databasePath) {
  const absoluteDatabasePath = resolve(databasePath);
  const bytesBefore = databaseDigest(absoluteDatabasePath);
  const verification = verifyFrozenM2StandingPreflight(absoluteDatabasePath);
  const context = openIdentityContextInspectionContext(absoluteDatabasePath);
  try {
    assert.equal(context.queryOnly(), true, "#41 live plan must read the canonical World query-only");
    const registrations = new Map(
      context.registrations().map((registration) => [registration.threadId, registration]),
    );
    const threads = FROZEN.threads.map((frozen) => {
      const registration = registrations.get(frozen.threadId);
      assert.ok(registration, `missing frozen #41 Thread ${frozen.threadId}`);
      assert.equal(registration.fibreIdentityNumber, frozen.fibreIdentityNumber);
      const pair = buildIdentityContextCausalDifferentialPair({
        threadId: frozen.threadId,
        sourceStores: context.sourceStores,
        request: IDENTITY_CONTEXT_CAUSAL_REQUEST,
      });
      const canonicalIdentityMemoryRefs = pair.canonical.identityContext.evidence
        .filter((item) => item.kind === "identity" || item.kind === "memory")
        .map((item) => item.ref)
        .sort();
      const thread = {
        fibreIdentityNumber: frozen.fibreIdentityNumber,
        threadId: frozen.threadId,
        canonicalCapsuleDigest: pair.canonical.identityContext.capsuleDigest,
        modelInputDigest: pair.canonical.modelInputDigest,
        responseSchemaHash: pair.canonical.responseSchemaHash,
        expected: structuredClone(frozen.expected),
        canonicalIdentityMemoryRefs,
        guardianCapsule: structuredClone(pair.canonical.guardianCapsule),
      };
      assertCanonicalThread(thread, frozen);
      return thread;
    });

    const conditions = [];
    for (let trialIndex = 1; trialIndex <= FROZEN.stability.trialsPerThread; trialIndex += 1) {
      for (const thread of threads) {
        conditions.push({
          key: conditionKey("stability", thread.threadId, trialIndex),
          phase: "stability",
          trialIndex,
          fibreIdentityNumber: thread.fibreIdentityNumber,
          threadId: thread.threadId,
          provider: FROZEN.stability.provider,
          modelId: FROZEN.stability.modelId,
          canonicalCapsuleDigest: thread.canonicalCapsuleDigest,
          modelInputDigest: thread.modelInputDigest,
          responseSchemaHash: thread.responseSchemaHash,
          expected: structuredClone(thread.expected),
          canonicalIdentityMemoryRefs: [...thread.canonicalIdentityMemoryRefs],
          guardianCapsule: structuredClone(thread.guardianCapsule),
        });
      }
    }
    for (const thread of threads) {
      conditions.push({
        key: conditionKey("replacement", thread.threadId),
        phase: "replacement",
        trialIndex: 1,
        fibreIdentityNumber: thread.fibreIdentityNumber,
        threadId: thread.threadId,
        provider: FROZEN.replacement.provider,
        modelId: FROZEN.replacement.modelId,
        canonicalCapsuleDigest: thread.canonicalCapsuleDigest,
        modelInputDigest: thread.modelInputDigest,
        responseSchemaHash: thread.responseSchemaHash,
        expected: structuredClone(thread.expected),
        canonicalIdentityMemoryRefs: [...thread.canonicalIdentityMemoryRefs],
        guardianCapsule: structuredClone(thread.guardianCapsule),
      });
    }
    assert.equal(conditions.length, FROZEN.plannedSubstantiveCalls);
    assert.equal(databaseDigest(absoluteDatabasePath), bytesBefore, "#41 plan construction changed canonical World bytes");
    return {
      databasePath: absoluteDatabasePath,
      databaseByteDigest: bytesBefore,
      verification,
      threads,
      conditions,
    };
  } finally {
    context.close();
  }
}

function publicCondition(condition) {
  return {
    key: condition.key,
    phase: condition.phase,
    trialIndex: condition.trialIndex,
    fibreIdentityNumber: condition.fibreIdentityNumber,
    threadId: condition.threadId,
    provider: condition.provider,
    modelId: condition.modelId,
    canonicalCapsuleDigest: condition.canonicalCapsuleDigest,
    modelInputDigest: condition.modelInputDigest,
    responseSchemaHash: condition.responseSchemaHash,
  };
}

function initialState(plan, statePath) {
  return {
    version: LIVE_STATE_VERSION,
    instrumentId: FROZEN.id,
    frozenFromHead: FROZEN.frozenFromHead,
    requestFingerprint: FROZEN.requestFingerprint,
    guardianPromptHash: FROZEN.guardianPromptHash,
    databasePath: plan.databasePath,
    databaseByteDigestBefore: plan.databaseByteDigest,
    statePath: resolve(statePath),
    routes: {
      stability: structuredClone(FROZEN.stability),
      replacement: structuredClone(FROZEN.replacement),
    },
    plannedSubstantiveCalls: FROZEN.plannedSubstantiveCalls,
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
  assert.equal(state.databaseByteDigestBefore, plan.databaseByteDigest);
  assert.equal(state.statePath, resolve(statePath));
  assert.deepEqual(state.routes.stability, FROZEN.stability);
  assert.deepEqual(state.routes.replacement, FROZEN.replacement);
  assert.equal(state.plannedSubstantiveCalls, FROZEN.plannedSubstantiveCalls);
  if (!Array.isArray(state.conditions)) throw new TypeError("#41 live state conditions must be an array");
  assert.ok(
    state.conditions.length <= plan.conditions.length,
    "#41 live state has more conditions than the frozen plan",
  );
  const expectedPrefix = plan.conditions.slice(0, state.conditions.length).map((item) => item.key);
  assert.deepEqual(
    state.conditions.map((item) => item.key),
    expectedPrefix,
    "#41 live state conditions must be an exact frozen-order prefix",
  );
  const planByKey = new Map(plan.conditions.map((condition) => [condition.key, condition]));
  for (const item of state.conditions) {
    if (!["started", "completed", "failed"].includes(item.status)) {
      throw new TypeError(`#41 live state condition ${item.key} has invalid status`);
    }
    const planned = planByKey.get(item.key);
    assert.ok(planned);
    for (const key of [
      "phase", "trialIndex", "fibreIdentityNumber", "threadId", "provider", "modelId",
      "canonicalCapsuleDigest", "modelInputDigest", "responseSchemaHash",
    ]) {
      assert.equal(item[key], planned[key], `#41 live state ${item.key} ${key} drifted`);
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
        { effect: factor.effect, evidenceRefs: [...factor.evidenceRefs] },
      ]),
    ),
    evidenceRefs: [...result.output.evidenceRefs],
    normalizations: [...result.output.normalizations],
  };
}

function assertResultBinding(result, condition) {
  assert.equal(result.promptHash, FROZEN.guardianPromptHash);
  assert.equal(result.responseSchemaHash, condition.responseSchemaHash);
  assert.equal(result.provenance.provider, condition.provider);
  assert.equal(result.provenance.modelId, condition.modelId);
}

function completedRecords(state) {
  return state.conditions.filter((item) => item.status === "completed");
}

export function summarizeM2StandingLiveState(state) {
  const completed = completedRecords(state);
  if (completed.length !== FROZEN.plannedSubstantiveCalls) {
    return {
      complete: false,
      completedConditions: completed.length,
      totalConditions: FROZEN.plannedSubstantiveCalls,
      stability: null,
      replacement: null,
      combinedPassed: false,
    };
  }

  const stabilityResultThreads = FROZEN.threads.map((thread) => ({
    fibreIdentityNumber: thread.fibreIdentityNumber,
    threadId: thread.threadId,
    trials: completed
      .filter((item) => item.phase === "stability" && item.threadId === thread.threadId)
      .sort((left, right) => left.trialIndex - right.trialIndex)
      .map((item) => structuredClone(item.output)),
  }));
  const replacementResults = FROZEN.threads.map((thread) => {
    const item = completed.find(
      (candidate) => candidate.phase === "replacement" && candidate.threadId === thread.threadId,
    );
    assert.ok(item, `missing replacement result for ${thread.threadId}`);
    return {
      fibreIdentityNumber: item.fibreIdentityNumber,
      threadId: item.threadId,
      provider: item.provenance.provider,
      modelId: item.provenance.modelId,
      canonicalCapsuleDigest: item.canonicalCapsuleDigest,
      modelInputDigest: item.modelInputDigest,
      responseSchemaHash: item.responseSchemaHash,
      outputValidated: item.outputValidated,
      worldUnchanged: item.worldUnchanged,
    };
  });

  const stability = evaluateM2StandingStability({
    planThreads: FROZEN.threads,
    resultThreads: stabilityResultThreads,
  });
  const replacement = evaluateM2StandingReplacement({
    planThreads: FROZEN.threads,
    results: replacementResults,
  });
  return {
    complete: true,
    completedConditions: completed.length,
    totalConditions: FROZEN.plannedSubstantiveCalls,
    stability,
    replacement,
    combinedPassed: stability.passed && replacement.passed,
  };
}

export async function executeM2StandingLivePlan({
  plan,
  statePath = DEFAULT_STATE_PATH,
  invokeCondition,
  worldDigest = databaseDigest,
  verifyLogicalWorld = verifyFrozenM2StandingPreflight,
  progress = () => {},
}) {
  if (typeof invokeCondition !== "function") throw new TypeError("#41 live runner requires invokeCondition");
  const state = loadState(plan, statePath);
  assert.equal(worldDigest(plan.databasePath), plan.databaseByteDigest, "canonical World bytes changed before #41 execution");

  for (const condition of plan.conditions) {
    const existing = state.conditions.find((item) => item.key === condition.key);
    if (existing?.status === "completed") {
      progress({ type: "skipped_completed", condition, completed: completedRecords(state).length });
      continue;
    }
    if (existing !== undefined) {
      throw new Error(
        `#41 refuses to resample ${condition.key}: prior status is ${existing.status}; ` +
        "inspect the local ledger instead of rerunning an ambiguous or failed condition",
      );
    }

    const record = {
      ...publicCondition(condition),
      clientRequestId: clientRequestId(condition),
      status: "started",
      startedAt: new Date().toISOString(),
    };
    state.conditions.push(record);
    writeState(state, statePath);
    progress({ type: "started", condition, completed: completedRecords(state).length });

    try {
      const result = await invokeCondition(condition, record.clientRequestId);
      assertResultBinding(result, condition);
      const unchanged = worldDigest(plan.databasePath) === plan.databaseByteDigest;
      assert.equal(unchanged, true, `canonical World bytes changed during ${condition.key}`);
      record.status = "completed";
      record.completedAt = new Date().toISOString();
      record.output = compactOutput(result);
      record.provenance = structuredClone(result.provenance);
      record.promptSchemaVersion = result.promptSchemaVersion;
      record.promptHash = result.promptHash;
      record.responseSchemaVersion = result.responseSchemaVersion;
      record.responseSchemaHashObserved = result.responseSchemaHash;
      record.responseSchemaGeneratorHash = result.responseSchemaGeneratorHash;
      record.outputValidated = true;
      record.worldUnchanged = true;
      writeState(state, statePath);
      progress({ type: "completed", condition, completed: completedRecords(state).length });
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

  assert.equal(worldDigest(plan.databasePath), plan.databaseByteDigest, "canonical World bytes changed after #41 execution");
  try {
    verifyLogicalWorld(plan.databasePath);
    state.worldCloseout = {
      bytesUnchanged: true,
      logicalFrozenPreflightReverified: true,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    state.worldCloseout = {
      bytesUnchanged: true,
      logicalFrozenPreflightReverified: false,
      checkedAt: new Date().toISOString(),
      error: { name: error?.name ?? "Error", message: error?.message ?? String(error) },
    };
    writeState(state, statePath);
    throw error;
  }
  state.summary = summarizeM2StandingLiveState(state);
  state.completedAt = state.summary.complete ? new Date().toISOString() : null;
  writeState(state, statePath);
  return state;
}

function createPinnedAdapters(environment) {
  const stability = selectReasoningIntegration(frozenLiveModelIntegration(), { environment });
  assert.equal(stability.provider, FROZEN.stability.provider);
  assert.equal(stability.modelId, FROZEN.stability.modelId);
  const replacement = createGoogleModelAdapter({
    environment,
    modelId: FROZEN.replacement.modelId,
  });
  assert.equal(replacement.provider, FROZEN.replacement.provider);
  assert.equal(replacement.modelId, FROZEN.replacement.modelId);
  return { stability, replacement };
}

export async function runFrozenM2StandingLive({
  databasePath,
  statePath = DEFAULT_STATE_PATH,
  environment = process.env,
  authorized = false,
  progress = () => {},
} = {}) {
  if (authorized !== true) {
    throw new Error("#41 live provider use requires explicit authorization");
  }
  if (databasePath === undefined) throw new TypeError("#41 live runner requires databasePath");
  const plan = buildFrozenM2StandingLivePlan(databasePath);
  const adapters = createPinnedAdapters(environment);
  return executeM2StandingLivePlan({
    plan,
    statePath,
    progress,
    invokeCondition(condition, requestId) {
      const adapter = condition.phase === "stability" ? adapters.stability : adapters.replacement;
      return semanticDignityGuardianV4(condition.guardianCapsule, adapter, {
        clientRequestId: requestId,
      });
    },
  });
}

export function formatM2StandingLiveSummary(state) {
  const summary = state.summary ?? summarizeM2StandingLiveState(state);
  const lines = [
    "M2 STANDING STABILITY + REPLACEMENT: LIVE RESULT",
    "",
    `Instrument: ${state.instrumentId}`,
    `Completed conditions: ${summary.completedConditions}/${summary.totalConditions}`,
  ];
  if (!summary.complete) {
    lines.push("Result: INCOMPLETE", "");
    return `${lines.join("\n")}\n`;
  }
  lines.push(
    `Stability: ${summary.stability.passed ? "PASS" : "NOT ESTABLISHED"}`,
    `Cognition replacement: ${summary.replacement.passed ? "PASS" : "NOT ESTABLISHED"}`,
    `Combined experiment: ${summary.combinedPassed ? "PASS" : "NOT ESTABLISHED"}`,
    "",
  );
  for (const thread of summary.stability.threads) {
    const replacement = summary.replacement.threads.find((item) => item.threadId === thread.threadId);
    lines.push(
      `${thread.fibreIdentityNumber}  ${thread.threadId}`,
      `  stability exact=${thread.exactTopLevelMatches}/5 grounded=${thread.groundedTrials}/5 pass=${thread.passed}`,
      `  replacement pass=${replacement?.passed === true}`,
    );
  }
  lines.push(
    "",
    `World bytes unchanged: ${state.worldCloseout?.bytesUnchanged === true}`,
    `Frozen logical preflight reverified: ${state.worldCloseout?.logicalFrozenPreflightReverified === true}`,
    `Local ledger: ${state.statePath}`,
    "",
  );
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
  if (!authorized) throw new Error("#41 live provider use requires explicit --authorized");
  if (databasePath === null) {
    throw new Error(
      "usage: node tools/gates/m2/m2-standing-stability-replacement-live.mjs <world.sqlite> --authorized [--state <result.json>]",
    );
  }
  return { databasePath, statePath, authorized: true };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const state = await runFrozenM2StandingLive({
    ...options,
    progress(event) {
      if (event.type === "started") {
        process.stderr.write(
          `#41 · ${event.completed + 1}/${FROZEN.plannedSubstantiveCalls} · ${event.condition.fibreIdentityNumber} · ${event.condition.phase}` +
          `${event.condition.phase === "stability" ? `#${event.condition.trialIndex}` : ""} · calling frozen route\n`,
        );
      } else if (event.type === "completed") {
        process.stderr.write(
          `#41 · ${event.completed}/${FROZEN.plannedSubstantiveCalls} · ${event.condition.fibreIdentityNumber} · ${event.condition.phase} · completed\n`,
        );
      }
    },
  });
  process.stdout.write(formatM2StandingLiveSummary(state));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}

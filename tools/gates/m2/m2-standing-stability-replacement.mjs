import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildIdentityContextCausalDifferentialPair,
  IDENTITY_CONTEXT_CAUSAL_REQUEST,
} from "../identity-context/identity-context-causal-differential.mjs";
import { FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_V1 } from "../identity-context/frozen-causal-differential-v1.mjs";
import { FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_RESULT_V1 } from "../identity-context/frozen-causal-differential-result-v1.mjs";
import { openIdentityContextInspectionContext } from "../../inspect/inspect-identity-context.mjs";

const IDENTITY_SENSITIVE_FACTORS = Object.freeze([
  "identityAlignment",
  "individualizedAdvantage",
  "interchangeability",
  "obligationsAndOpportunityCost",
]);

export const M2_STANDING_STABILITY_REPLACEMENT = Object.freeze({
  id: "m2_standing_stability_replacement_v1",
  evidenceClass: "prospective_m2_standing_confirmation",
  cohort: "canonical_pr39_born_threads",
  requestFingerprint: FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_V1.requestFingerprint,
  guardianPromptHash: FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_V1.guardianPromptHash,
  stability: Object.freeze({
    provider: "openai",
    modelId: "gpt-5.1-2025-11-13",
    trialsPerThread: 5,
    minimumExactTopLevelMatches: 4,
    minimumGroundedTrials: 4,
  }),
  replacement: Object.freeze({
    provider: "google",
    modelId: "gemini-3.6-flash",
    trialsPerThread: 1,
  }),
  threadCount: 5,
  plannedSubstantiveCalls: 30,
  providerCallsAtPreflight: 0,
  scenarioSearchAfterProvider: false,
  rerunAfterSubstantiveResult: false,
  providerShoppingAfterProvider: false,
});

function byThread(items, label) {
  const map = new Map();
  for (const item of items) {
    assert.equal(typeof item?.threadId, "string", `${label} threadId is required`);
    assert.equal(map.has(item.threadId), false, `${label} has duplicate Thread ${item.threadId}`);
    map.set(item.threadId, item);
  }
  return map;
}

function exactThreadSet(actual, expected, label) {
  assert.deepEqual([...actual.keys()].sort(), [...expected.keys()].sort(), `${label} Thread set mismatch`);
}

function groundingRefs(trial) {
  const refs = new Set();
  for (const factor of IDENTITY_SENSITIVE_FACTORS) {
    const values = trial?.factors?.[factor]?.evidenceRefs;
    if (!Array.isArray(values)) continue;
    for (const ref of values) refs.add(ref);
  }
  return refs;
}

function topLevelMatches(trial, expected) {
  return trial?.proposedAction === expected.proposedAction &&
    trial?.participationFit === expected.participationFit;
}

function trialGrounded(trial, allowedRefs) {
  const cited = groundingRefs(trial);
  return [...cited].some((ref) => allowedRefs.has(ref));
}

export function evaluateM2StandingStability({ planThreads, resultThreads }) {
  const plan = byThread(planThreads, "stability plan");
  const results = byThread(resultThreads, "stability results");
  exactThreadSet(results, plan, "stability results");

  const threads = [];
  for (const [threadId, planned] of plan) {
    const result = results.get(threadId);
    assert.equal(
      result.fibreIdentityNumber,
      planned.fibreIdentityNumber,
      `stability FIN mismatch for ${threadId}`,
    );
    assert.equal(
      result.trials.length,
      M2_STANDING_STABILITY_REPLACEMENT.stability.trialsPerThread,
      `stability requires exactly five substantive trials for ${threadId}`,
    );
    const allowedRefs = new Set(planned.canonicalIdentityMemoryRefs);
    const exactTopLevelMatches = result.trials.filter((trial) => topLevelMatches(trial, planned.expected)).length;
    const groundedTrials = result.trials.filter((trial) => trialGrounded(trial, allowedRefs)).length;
    const passed =
      exactTopLevelMatches >= M2_STANDING_STABILITY_REPLACEMENT.stability.minimumExactTopLevelMatches &&
      groundedTrials >= M2_STANDING_STABILITY_REPLACEMENT.stability.minimumGroundedTrials;
    threads.push({
      threadId,
      fibreIdentityNumber: planned.fibreIdentityNumber,
      exactTopLevelMatches,
      groundedTrials,
      trialCount: result.trials.length,
      passed,
    });
  }

  return {
    claim: "stable_non_interchangeability",
    passed: threads.every((thread) => thread.passed),
    threads,
  };
}

export function evaluateM2StandingReplacement({ planThreads, results }) {
  const plan = byThread(planThreads, "replacement plan");
  const actual = byThread(results, "replacement results");
  exactThreadSet(actual, plan, "replacement results");

  const threads = [];
  for (const [threadId, planned] of plan) {
    const result = actual.get(threadId);
    const passed =
      result.fibreIdentityNumber === planned.fibreIdentityNumber &&
      result.provider === M2_STANDING_STABILITY_REPLACEMENT.replacement.provider &&
      result.modelId === M2_STANDING_STABILITY_REPLACEMENT.replacement.modelId &&
      result.canonicalCapsuleDigest === planned.canonicalCapsuleDigest &&
      result.modelInputDigest === planned.modelInputDigest &&
      result.responseSchemaHash === planned.responseSchemaHash &&
      result.outputValidated === true &&
      result.worldUnchanged === true;
    threads.push({
      threadId,
      fibreIdentityNumber: planned.fibreIdentityNumber,
      passed,
    });
  }

  return {
    claim: "cognition_replaceability",
    passed: threads.every((thread) => thread.passed),
    threads,
  };
}

export function runM2StandingStabilityReplacementPreflight(databasePath) {
  const context = openIdentityContextInspectionContext(resolve(databasePath));
  try {
    assert.equal(context.queryOnly(), true, "#41 preflight must open the canonical World query-only");

    const registrations = context.registrations();
    assert.equal(
      registrations.length,
      M2_STANDING_STABILITY_REPLACEMENT.threadCount,
      `#41 preflight expected ${M2_STANDING_STABILITY_REPLACEMENT.threadCount} civil-registered Threads`,
    );

    const frozenPairs = byThread(FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_V1.pairs, "frozen #40 pairs");
    const frozenResults = byThread(FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_RESULT_V1.pairs, "frozen #40 results");
    const registrationMap = byThread(registrations, "canonical registrations");
    exactThreadSet(registrationMap, frozenPairs, "canonical registrations");
    exactThreadSet(frozenResults, frozenPairs, "frozen #40 results");

    const threads = registrations.map((registration) => {
      const frozen = frozenPairs.get(registration.threadId);
      const sealed = frozenResults.get(registration.threadId);
      assert.equal(
        registration.fibreIdentityNumber,
        frozen.fibreIdentityNumber,
        `#41 preflight FIN mismatch for ${registration.threadId}`,
      );

      const pair = buildIdentityContextCausalDifferentialPair({
        threadId: registration.threadId,
        sourceStores: context.sourceStores,
        request: IDENTITY_CONTEXT_CAUSAL_REQUEST,
      });

      assert.equal(pair.requestFingerprint, M2_STANDING_STABILITY_REPLACEMENT.requestFingerprint);
      assert.equal(pair.targetMemoryRef, frozen.targetMemoryRef);
      assert.equal(pair.replacementMemoryRef, frozen.replacementMemoryRef);
      assert.equal(pair.canonical.identityContext.capsuleDigest, frozen.canonicalCapsuleDigest);
      assert.equal(pair.counterfactual.identityContext.capsuleDigest, frozen.counterfactualCapsuleDigest);

      const canonicalIdentityMemoryRefs = pair.canonical.identityContext.evidence
        .filter((item) => item.kind === "identity" || item.kind === "memory")
        .map((item) => item.ref)
        .sort();
      assert.ok(canonicalIdentityMemoryRefs.length > 0, `#41 preflight requires identity/memory evidence for ${registration.threadId}`);

      return {
        fibreIdentityNumber: registration.fibreIdentityNumber,
        threadId: registration.threadId,
        canonicalCapsuleDigest: pair.canonical.identityContext.capsuleDigest,
        modelInputDigest: pair.canonical.modelInputDigest,
        responseSchemaHash: pair.canonical.responseSchemaHash,
        canonicalIdentityMemoryRefs,
        expected: {
          proposedAction: sealed.canonical.proposedAction,
          participationFit: sealed.canonical.participationFit,
        },
        stabilityTrials: M2_STANDING_STABILITY_REPLACEMENT.stability.trialsPerThread,
        replacementTrials: M2_STANDING_STABILITY_REPLACEMENT.replacement.trialsPerThread,
      };
    }).sort((left, right) => left.fibreIdentityNumber.localeCompare(right.fibreIdentityNumber));

    const plannedCalls = threads.reduce(
      (total, thread) => total + thread.stabilityTrials + thread.replacementTrials,
      0,
    );
    assert.equal(plannedCalls, M2_STANDING_STABILITY_REPLACEMENT.plannedSubstantiveCalls);

    return {
      protocol: structuredClone(M2_STANDING_STABILITY_REPLACEMENT),
      providerCalls: 0,
      worldQueryOnly: true,
      plannedSubstantiveCalls: plannedCalls,
      structurallyReady: true,
      threads,
    };
  } finally {
    context.close();
  }
}

export function formatM2StandingStabilityReplacementPreflight(report) {
  const lines = [
    `M2 STANDING PREFLIGHT: ${report.structurallyReady ? "CLEAR" : "FAILED"}`,
    "",
    `Threads: ${report.threads.length}`,
    `Provider calls: ${report.providerCalls}`,
    `Planned substantive calls: ${report.plannedSubstantiveCalls}`,
    `World query-only: ${report.worldQueryOnly}`,
    `Stability route: ${report.protocol.stability.provider}/${report.protocol.stability.modelId} × ${report.protocol.stability.trialsPerThread} per Thread`,
    `Replacement route: ${report.protocol.replacement.provider}/${report.protocol.replacement.modelId} × ${report.protocol.replacement.trialsPerThread} per Thread`,
    "",
  ];
  for (const thread of report.threads) {
    lines.push(`${thread.fibreIdentityNumber}  ${thread.threadId}`);
    lines.push(`  capsule=${thread.canonicalCapsuleDigest}`);
    lines.push(`  model-input=${thread.modelInputDigest}`);
    lines.push(`  schema=${thread.responseSchemaHash}`);
    lines.push(`  expected=${thread.expected.proposedAction}/${thread.expected.participationFit}`);
    lines.push(`  identity-memory-refs=${thread.canonicalIdentityMemoryRefs.join(",")}`);
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const databasePath = process.argv[2];
  if (databasePath === undefined) {
    throw new TypeError("usage: node tools/gates/m2/m2-standing-stability-replacement.mjs <world.sqlite>");
  }
  const report = runM2StandingStabilityReplacementPreflight(databasePath);
  process.stdout.write(formatM2StandingStabilityReplacementPreflight(report));
  if (!report.structurallyReady) process.exitCode = 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 1;
  });
}

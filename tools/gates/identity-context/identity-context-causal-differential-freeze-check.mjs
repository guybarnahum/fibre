import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import {
  runIdentityContextCausalDifferentialPreflight,
} from "./identity-context-causal-differential.mjs";
import {
  FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_V1 as FROZEN,
} from "./frozen-causal-differential-v1.mjs";

function compactPair(pair) {
  return {
    fibreIdentityNumber: pair.fibreIdentityNumber,
    threadId: pair.threadId,
    conditionOrder: [...pair.conditionOrder],
    targetMemoryRef: pair.targetMemoryRef,
    replacementMemoryRef: pair.replacementMemoryRef,
    canonicalCapsuleDigest: pair.canonicalCapsuleDigest,
    counterfactualCapsuleDigest: pair.counterfactualCapsuleDigest,
  };
}

export function assertFrozenIdentityContextCausalDifferential(report) {
  assert.equal(report.structurallyReady, true);
  assert.equal(report.providerCalls, 0);
  assert.equal(report.request.requestFingerprint, FROZEN.requestFingerprint);
  assert.equal(report.guardian.promptHash, FROZEN.guardianPromptHash);
  assert.equal(report.protocol.id, FROZEN.id);
  assert.equal(report.protocol.callsPerCondition, FROZEN.callsPerCondition);
  assert.equal(report.protocol.rerunAfterSubstantiveResult, FROZEN.rerunAfterSubstantiveResult);
  assert.equal(report.protocol.scenarioSearchAfterProvider, FROZEN.scenarioSearchAfterProvider);
  assert.equal(report.protocol.scoreMovementPermitted, FROZEN.scoreMovementPermitted);
  assert.deepEqual(report.protocol.standingBands, FROZEN.standingBands);
  assert.deepEqual(report.pairs.map(compactPair), FROZEN.pairs.map(compactPair));
  return true;
}

export function verifyFrozenIdentityContextCausalDifferential(databasePath) {
  const report = runIdentityContextCausalDifferentialPreflight(databasePath);
  assertFrozenIdentityContextCausalDifferential(report);
  return {
    frozenInstrumentId: FROZEN.id,
    frozenFromHead: FROZEN.frozenFromHead,
    pairCount: FROZEN.pairs.length,
    providerCalls: 0,
    verified: true,
  };
}

function format(result) {
  return [
    "Identity Context Causal Differential: FROZEN INSTRUMENT VERIFIED",
    "",
    `Instrument: ${result.frozenInstrumentId}`,
    `Frozen from: ${result.frozenFromHead}`,
    `Pairs: ${result.pairCount}`,
    `Provider calls: ${result.providerCalls}`,
    "",
  ].join("\n");
}

async function main() {
  const databasePath = process.argv[2];
  if (databasePath === undefined) {
    throw new Error("usage: node identity-context-causal-differential-freeze-check.mjs <world.sqlite>");
  }
  process.stdout.write(format(verifyFrozenIdentityContextCausalDifferential(databasePath)));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}

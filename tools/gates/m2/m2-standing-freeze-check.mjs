import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import { runM2StandingStabilityReplacementPreflight } from "./m2-standing-stability-replacement.mjs";
import { FROZEN_M2_STANDING_PREFLIGHT_V1 as FROZEN } from "./frozen-m2-standing-preflight-v1.mjs";

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

export function assertFrozenM2StandingPreflight(report) {
  assert.equal(report.structurallyReady, true);
  assert.equal(report.providerCalls, FROZEN.providerCallsAtFreeze);
  assert.equal(report.worldQueryOnly, FROZEN.worldQueryOnlyAtFreeze);
  assert.equal(report.plannedSubstantiveCalls, FROZEN.plannedSubstantiveCalls);
  assert.equal(report.protocol.id, FROZEN.id);
  assert.equal(report.protocol.requestFingerprint, FROZEN.requestFingerprint);
  assert.equal(report.protocol.guardianPromptHash, FROZEN.guardianPromptHash);
  assert.deepEqual(report.protocol.stability, FROZEN.stability);
  assert.deepEqual(report.protocol.replacement, FROZEN.replacement);
  assert.equal(report.protocol.threadCount, FROZEN.threads.length);
  assert.equal(report.protocol.plannedSubstantiveCalls, FROZEN.plannedSubstantiveCalls);
  assert.equal(report.protocol.providerCallsAtPreflight, FROZEN.providerCallsAtFreeze);
  assert.equal(report.protocol.scenarioSearchAfterProvider, false);
  assert.equal(report.protocol.rerunAfterSubstantiveResult, false);
  assert.equal(report.protocol.providerShoppingAfterProvider, false);
  assert.deepEqual(report.threads.map(compactThread), FROZEN.threads.map(compactThread));
  return true;
}

export function verifyFrozenM2StandingPreflight(databasePath) {
  const report = runM2StandingStabilityReplacementPreflight(databasePath);
  assertFrozenM2StandingPreflight(report);
  return {
    instrumentId: FROZEN.id,
    frozenFromHead: FROZEN.frozenFromHead,
    providerCalls: 0,
    worldQueryOnly: true,
    plannedSubstantiveCalls: FROZEN.plannedSubstantiveCalls,
    stability: structuredClone(FROZEN.stability),
    replacement: structuredClone(FROZEN.replacement),
    threads: FROZEN.threads.map(compactThread),
    verified: true,
  };
}

function format(result) {
  return [
    "M2 STANDING PREFLIGHT: FROZEN WITNESSES VERIFIED",
    "",
    `Instrument: ${result.instrumentId}`,
    `Frozen from: ${result.frozenFromHead}`,
    `Threads: ${result.threads.length}`,
    `Provider calls: ${result.providerCalls}`,
    `Planned substantive calls: ${result.plannedSubstantiveCalls}`,
    `World query-only: ${result.worldQueryOnly}`,
    `Stability: ${result.stability.provider}/${result.stability.modelId} × ${result.stability.trialsPerThread}`,
    `Replacement: ${result.replacement.provider}/${result.replacement.modelId} × ${result.replacement.trialsPerThread}`,
    "",
  ].join("\n");
}

async function main() {
  const databasePath = process.argv[2];
  if (databasePath === undefined) {
    throw new Error("usage: node tools/gates/m2/m2-standing-freeze-check.mjs <world.sqlite>");
  }
  process.stdout.write(format(verifyFrozenM2StandingPreflight(databasePath)));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}

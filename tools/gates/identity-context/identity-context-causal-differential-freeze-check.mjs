import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  parseDeploymentManifest,
  resolveServiceDeployment,
} from "../../../infra/deployments/manifest.mjs";
import {
  runIdentityContextCausalDifferentialPreflight,
} from "./identity-context-causal-differential.mjs";
import {
  FROZEN_IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL_V1 as FROZEN,
} from "./frozen-causal-differential-v1.mjs";

const LOCAL_DEPLOYMENT = parseDeploymentManifest(
  readFileSync(new URL("../../../infra/deployments/environments/local.yaml", import.meta.url), "utf8"),
);
const WORLD_KERNEL_DEPLOYMENT = resolveServiceDeployment(LOCAL_DEPLOYMENT, "world-kernel");

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

export function frozenLiveModelIntegration() {
  const integration = WORLD_KERNEL_DEPLOYMENT.integrations.dignityGuardian;
  assert.ok(integration, "world-kernel deployment must select dignityGuardian reasoning");
  assert.equal(integration.kind, "ai.reasoning");
  assert.equal(integration.provider, FROZEN.liveModel.provider);
  assert.equal(integration.config.model, FROZEN.liveModel.modelId);
  return integration;
}

export function frozenLiveModelSelection() {
  const integration = frozenLiveModelIntegration();
  return Object.freeze({
    provider: integration.provider,
    modelId: integration.config.model,
  });
}

export function verifyFrozenIdentityContextCausalDifferential(databasePath) {
  const report = runIdentityContextCausalDifferentialPreflight(databasePath);
  assertFrozenIdentityContextCausalDifferential(report);
  const selection = frozenLiveModelSelection();
  return {
    frozenInstrumentId: FROZEN.id,
    frozenFromHead: FROZEN.frozenFromHead,
    pairCount: FROZEN.pairs.length,
    providerCalls: 0,
    selection,
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
    `Live model: ${result.selection.provider}/${result.selection.modelId}`,
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

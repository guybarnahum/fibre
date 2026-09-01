import test from "node:test";
import assert from "node:assert/strict";

import {
  CLOUDFLARE_DEPLOYMENT_EVIDENCE_VERSION,
  createCloudflareDeploymentEvidence,
  deployCloudflareStackWithEvidence,
} from "./deploy-cloudflare-evidence.mjs";

const SHA = "1234567890abcdef1234567890abcdef12345678";

function deploymentResult() {
  return {
    environment: "staging",
    deployments: [
      { serviceId: "asset-generator", workerName: "fibre-asset-generator-staging", baseUrl: "https://asset.example.workers.dev", health: { ok: true, service: "asset-generator" } },
      { serviceId: "thread-presentation", workerName: "fibre-thread-presentation-staging", baseUrl: "https://api.staging.insidefibre.com", health: { ok: true, service: "thread-presentation" } },
      { serviceId: "world-kernel", workerName: "fibre-world-kernel-staging", baseUrl: "https://world.example.workers.dev", health: { ok: true, service: "world-kernel" } },
      { serviceId: "birth-center", workerName: "fibre-birth-center-staging", baseUrl: "https://birth.example.workers.dev", health: { ok: true, service: "birth-center" } },
    ],
    acceptance: { threads: [] },
    viewer: { ok: true, status: 200 },
    externalViewerOrigin: "https://staging.insidefibre.com",
  };
}

test("cloud deployment evidence binds accepted remote topology to an exact clean Git SHA without secrets", () => {
  const evidence = createCloudflareDeploymentEvidence({
    environment: "staging",
    source: { gitSha: SHA, workingTreeClean: true },
    deployment: deploymentResult(),
    recordedAt: "2026-09-01T00:00:00.000Z",
  });
  assert.equal(evidence.contract, CLOUDFLARE_DEPLOYMENT_EVIDENCE_VERSION);
  assert.equal(evidence.sourceGitSha, SHA);
  assert.equal(evidence.sourceTreeClean, true);
  assert.equal(evidence.deployments.length, 4);
  assert.equal(evidence.externalViewerOrigin, "https://staging.insidefibre.com");
  assert.equal(JSON.stringify(evidence).includes("TOKEN"), false);
  assert.equal(JSON.stringify(evidence).includes("API_KEY"), false);
});

test("cloud deployment evidence wrapper resolves source before deployment and retains the resulting record", async () => {
  const calls = [];
  let retained = null;
  const result = await deployCloudflareStackWithEvidence({
    repoRoot: "/repo",
    environment: "staging",
    sourceResolver: async (repoRoot) => {
      calls.push(`source:${repoRoot}`);
      return { gitSha: SHA, workingTreeClean: true };
    },
    deploy: async ({ repoRoot, environment, marker }) => {
      calls.push(`deploy:${repoRoot}:${environment}:${marker}`);
      return deploymentResult();
    },
    writeEvidence: async ({ repoRoot, environment, evidence }) => {
      calls.push(`write:${repoRoot}:${environment}`);
      retained = structuredClone(evidence);
      return "/repo/.fibre/cloudflare/staging/deployment.json";
    },
    now: () => "2026-09-01T00:01:00.000Z",
    marker: "fixture",
  });
  assert.deepEqual(calls, [
    "source:/repo",
    "deploy:/repo:staging:fixture",
    "write:/repo:staging",
  ]);
  assert.equal(retained.sourceGitSha, SHA);
  assert.equal(result.evidencePath, "/repo/.fibre/cloudflare/staging/deployment.json");
});

test("deployment evidence rejects dirty or abbreviated source identity", () => {
  assert.throws(() => createCloudflareDeploymentEvidence({
    environment: "staging",
    source: { gitSha: SHA, workingTreeClean: false },
    deployment: deploymentResult(),
  }), /clean working tree/);
  assert.throws(() => createCloudflareDeploymentEvidence({
    environment: "staging",
    source: { gitSha: "1234", workingTreeClean: true },
    deployment: deploymentResult(),
  }), /40-character/);
});

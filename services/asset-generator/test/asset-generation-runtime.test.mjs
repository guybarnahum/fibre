import test from "node:test";
import assert from "node:assert/strict";

import {
  INFRA_DRIVER_VERSION,
  assertInfraDriver,
} from "#packages/infra/src/infra-driver.mjs";
import {
  AssetGenerationAttemptFailed,
  createAssetGenerationRuntime,
} from "../src/asset-generation-runtime.mjs";

function infra(sent = []) {
  return assertInfraDriver({
    driverId: "asset-runtime-test",
    driverVersion: INFRA_DRIVER_VERSION,
    capabilities: ["objects", "queues"],
    objects: {
      async putImmutable() {},
      async get() { return null; },
      async head() { return null; },
    },
    queues: {
      async send(queueName, message) { sent.push({ queueName, message }); },
    },
  });
}

test("asset generation runtime receives InfraDriver rather than selecting an infrastructure provider", async () => {
  const sent = [];
  const runtime = createAssetGenerationRuntime({
    infra: infra(sent),
    provider: { providerId: "fixture" },
    credentialSigner: { signerId: "fixture" },
    executeJob: async ({ infra: injected, provider, credentialSigner, job }) => {
      assert.equal(injected.driverId, "asset-runtime-test");
      assert.equal(provider.providerId, "fixture");
      assert.equal(credentialSigner.signerId, "fixture");
      return {
        receipt: { jobId: job.jobId },
        receiptObjectRef: "receipt_1",
        receiptDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        generationRecordObjectRef: "record_1",
        generationRecordDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        providerOutputDigest: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        finalAssetDigest: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      };
    },
  });

  const generated = await runtime.execute({ jobId: "job_1" });
  assert.equal(generated.receipt.jobId, "job_1");
  await runtime.publishCompletion({
    completionVersion: "asset-generation-completion-v0.1",
    jobId: "job_1",
    receiptObjectRef: "receipt_1",
    receiptDigest: generated.receiptDigest,
  });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].queueName, "asset_generation_completions");
});

test("execution failures carry provider-neutral no-implicit-retry semantics", async () => {
  const runtime = createAssetGenerationRuntime({
    infra: infra(),
    provider: {},
    credentialSigner: {},
    executeJob: async () => { throw new Error("provider call failed"); },
  });

  await assert.rejects(
    () => runtime.execute({ jobId: "job_1" }),
    (error) => error instanceof AssetGenerationAttemptFailed
      && error.retryable === false
      && error.message === "provider call failed",
  );
});

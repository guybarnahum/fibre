import test from "node:test";
import assert from "node:assert/strict";

import {
  INFRA_DRIVER_VERSION,
  assertInfraDriver,
} from "#packages/infra/src/infra-driver.mjs";
import {
  ASSET_GENERATION_COMPLETION_QUEUE,
  ASSET_GENERATION_COMPLETION_VERSION,
  createAssetGenerationCompletion,
  normalizeAssetGenerationCompletion,
  publishAssetGenerationCompletion,
} from "../src/asset-generation-completion.mjs";

const digest = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function completion() {
  return createAssetGenerationCompletion({
    jobId: "assetjob_1",
    receiptObjectRef: "assetreceipt_1",
    receiptDigest: digest,
  });
}

test("asset generation completion is a minimal immutable-receipt pointer", () => {
  const value = completion();
  assert.deepEqual(value, {
    completionVersion: ASSET_GENERATION_COMPLETION_VERSION,
    jobId: "assetjob_1",
    receiptObjectRef: "assetreceipt_1",
    receiptDigest: digest,
  });
  assert.equal(Object.isFrozen(value), true);
  assert.equal("threadId" in value, false);
  assert.equal("mediaId" in value, false);
  assert.equal("status" in value, false);
});

test("completion contract rejects semantic payload and malformed receipt digests", () => {
  assert.throws(() => normalizeAssetGenerationCompletion({
    completionVersion: ASSET_GENERATION_COMPLETION_VERSION,
    jobId: "assetjob_1",
    receiptObjectRef: "assetreceipt_1",
    receiptDigest: digest,
    threadId: "thr_1",
  }), /threadId is not allowed/);
  assert.throws(() => createAssetGenerationCompletion({
    jobId: "assetjob_1",
    receiptObjectRef: "assetreceipt_1",
    receiptDigest: "sha256:not-a-digest",
  }), /receiptDigest/);
});

test("completion publication depends only on the InfraDriver queues port", async () => {
  const sent = [];
  const infra = assertInfraDriver({
    driverId: "asset-completion-test",
    driverVersion: INFRA_DRIVER_VERSION,
    capabilities: ["queues"],
    queues: {
      async send(queueName, message) {
        sent.push({ queueName, message: structuredClone(message) });
        return { queueName };
      },
    },
  });

  const value = completion();
  const published = await publishAssetGenerationCompletion({ infra, completion: value });
  assert.deepEqual(published, value);
  assert.deepEqual(sent, [{
    queueName: ASSET_GENERATION_COMPLETION_QUEUE,
    message: value,
  }]);
});

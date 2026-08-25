import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSET_GENERATION_COMPLETION_VERSION,
  createAssetGenerationCompletion,
  normalizeAssetGenerationCompletion,
} from "../src/asset-generation-completion.mjs";

const digest = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

test("asset generation completion is a minimal immutable-receipt pointer", () => {
  const value = createAssetGenerationCompletion({
    jobId: "assetjob_1",
    receiptObjectRef: "assetreceipt_1",
    receiptDigest: digest,
  });
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

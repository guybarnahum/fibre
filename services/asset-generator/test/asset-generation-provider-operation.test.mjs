import test from "node:test";
import assert from "node:assert/strict";

import { ASSET_GENERATION_JOB_VERSION } from "../src/asset-generation-domain.mjs";
import {
  PROVIDER_OPERATION_STATUS_ACCEPTED,
  PROVIDER_OPERATION_VERSION,
  createProviderOperationCheckpoint,
  normalizeProviderOperationCheckpoint,
  providerOperationObjectRef,
} from "../src/asset-generation-provider-operation.mjs";

function job() {
  return {
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: "assetjob_provider_operation_fixture",
    assetKind: "image",
    role: "place",
    variant: "default",
    brief: {
      description: "Generated reconstruction of a market.",
      constraints: ["Not documentary evidence."],
    },
    inputReferences: ["presentation_1"],
    referenceObjectRefs: [],
    outputObjectRef: "asset_provider_operation_fixture",
    receiptObjectRef: "assetreceipt_provider_operation_fixture",
    requestedAt: "2026-08-26T23:00:00Z",
    providerProfile: "bfl-flux-2-pro-v1",
    context: {},
  };
}

const JOB_DIGEST = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const REQUEST_DIGEST = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

test("provider operation checkpoint binds one accepted async task to exact job digest and attempt", () => {
  const checkpoint = createProviderOperationCheckpoint({
    job: job(),
    jobDigest: JOB_DIGEST,
    attemptNumber: 2,
    providerAdapterId: "bfl-flux-image-v1",
    providerRequestWitness: {
      mediaType: "application/json",
      body: { prompt: "fixture", width: 1024, height: 1024 },
      secretsRemoved: true,
    },
    providerRequestDigest: REQUEST_DIGEST,
    operation: {
      provider: "bfl",
      model: "flux-2-pro",
      providerRequestId: "bfl_task_fixture",
      continuation: { pollingUrl: "https://api.bfl.ai/v1/get_result?id=bfl_task_fixture" },
      secretsRemoved: true,
    },
    acceptedAt: "2026-08-26T23:00:01Z",
  });

  assert.equal(checkpoint.operationVersion, PROVIDER_OPERATION_VERSION);
  assert.equal(checkpoint.status, PROVIDER_OPERATION_STATUS_ACCEPTED);
  assert.equal(checkpoint.operationId, providerOperationObjectRef(JOB_DIGEST, 2));
  assert.equal(checkpoint.jobId, job().jobId);
  assert.equal(checkpoint.providerProfile, "bfl-flux-2-pro-v1");
  assert.equal(checkpoint.providerAdapterId, "bfl-flux-image-v1");
  assert.equal(checkpoint.operation.providerRequestId, "bfl_task_fixture");
  assert.equal(checkpoint.operation.secretsRemoved, true);
  assert.deepEqual(normalizeProviderOperationCheckpoint(checkpoint), checkpoint);
});

test("provider operation checkpoint rejects continuation handles that are not explicitly secret-stripped", () => {
  assert.throws(
    () => createProviderOperationCheckpoint({
      job: job(),
      jobDigest: JOB_DIGEST,
      attemptNumber: 1,
      providerAdapterId: "bfl-flux-image-v1",
      providerRequestWitness: {
        mediaType: "application/json",
        body: { prompt: "fixture" },
        secretsRemoved: true,
      },
      providerRequestDigest: REQUEST_DIGEST,
      operation: {
        provider: "bfl",
        model: "flux-2-pro",
        providerRequestId: "bfl_task_fixture",
        continuation: { pollingUrl: "https://api.bfl.ai/v1/get_result?id=bfl_task_fixture" },
        secretsRemoved: false,
      },
      acceptedAt: "2026-08-26T23:00:01Z",
    }),
    /secretsRemoved must be true/,
  );
});

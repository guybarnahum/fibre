import assert from "node:assert/strict";
import test from "node:test";

import { INFRA_DRIVER_VERSION } from "#infra";
import { createMemoryInfraDriver } from "#infra/providers/local";
import {
  persistAssetGenerationFailure,
  readAssetGenerationFailure,
  settleAssetGenerationFailure,
} from "../src/asset-generation-failure.mjs";
import { createAssetGenerationControlService } from "../src/asset-generation-control-service.mjs";
import { ASSET_GENERATION_JOB_VERSION } from "../src/asset-generation-domain.mjs";

function job() {
  return {
    jobVersion:ASSET_GENERATION_JOB_VERSION,
    jobId:"asset_terminal_job_1",
    assetKind:"image",
    role:"canonical_identity_portrait",
    variant:"canonical",
    brief:{ description:"Synthetic canonical portrait.", constraints:[] },
    inputReferences:["evt_terminal"],
    referenceObjectRefs:[],
    outputObjectRef:"asset_terminal_output_1",
    receiptObjectRef:"asset_terminal_receipt_1",
    requestedAt:"2026-09-30T17:00:00Z",
    providerProfile:"openai-gpt-image-2-medium-v1",
    context:{ kind:"thread_embodiment_canonical_visual_identity", threadId:"thr_terminal" },
  };
}

test("terminal asset settlement persists Fibre truth before emitting its wake hint", async () => {
  const objects = new Map();
  const events = [];
  const infra = {
    driverId:"failure-test",
    driverVersion:INFRA_DRIVER_VERSION,
    capabilities:["objects","queues"],
    objects:{
      async putImmutable(objectRef, bytes, digest, metadata) {
        objects.set(objectRef, { bytes, digest, metadata });
        events.push("persist");
        return { objectRef, digest, duplicate:false };
      },
      async get(objectRef) { return objects.get(objectRef) ?? null; },
      async head(objectRef) { return objects.get(objectRef) ?? null; },
    },
    queues:{
      async send(_queueName, message) {
        assert.equal(objects.has(message.failureObjectRef), true, "settlement hint outran failure authority");
        events.push("signal");
        return {};
      },
    },
  };

  const settlement = await settleAssetGenerationFailure({
    infra,
    job:job(),
    error:new Error("provider retry limit reached"),
  });

  assert.deepEqual(events, ["persist","signal"]);
  assert.equal(settlement.state, "failed");
  assert.equal(settlement.context.threadId, "thr_terminal");
});

test("Asset control sees persisted terminal failure even while workflow status is not yet errored", async () => {
  const infra = createMemoryInfraDriver();
  await persistAssetGenerationFailure({
    infra,
    job:job(),
    error:new Error("provider retry limit reached"),
  });

  const control = createAssetGenerationControlService({ infra });
  await assert.rejects(
    control.reconcile(job()),
    (error) => (
      error?.code === "ASSET_GENERATION_TERMINAL"
      && error?.retryable === false
      && /provider retry limit reached/u.test(error.message)
    ),
    "terminal Fibre outcome remained pending on provider workflow timing",
  );

  const stored = await readAssetGenerationFailure({ infra, jobId:job().jobId });
  assert.equal(stored.failure.status, "failed");
});

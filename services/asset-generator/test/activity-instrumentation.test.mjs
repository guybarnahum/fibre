import assert from "node:assert/strict";
import test from "node:test";

import { INFRA_DRIVER_VERSION, assertInfraDriver } from "#infra";
import { createActivityRecorder } from "#infra/telemetry";
import { createLocalActivityTelemetryPort } from "#infra/providers/local/telemetry";
import { createAssetGenerationCompletion } from "../src/asset-generation-completion.mjs";
import { ASSET_GENERATION_JOB_VERSION } from "../src/asset-generation-domain.mjs";
import { createAssetGenerationRuntime } from "../src/asset-generation-runtime.mjs";

function infra() {
  return assertInfraDriver({
    driverId: "asset-activity-test",
    driverVersion: INFRA_DRIVER_VERSION,
    capabilities: ["objects", "queues"],
    objects: {
      async putImmutable() {},
      async get() { return null; },
      async head() { return null; },
    },
    queues: {
      async send() {},
    },
  });
}

function job(overrides = {}) {
  return {
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: "job_activity_001",
    assetKind: "image",
    role: "portrait",
    variant: "canonical",
    brief: {
      description: "Synthetic canonical portrait for activity instrumentation.",
      constraints: ["Synthetic reconstruction."],
    },
    inputReferences: ["presentation_activity_001"],
    referenceObjectRefs: [],
    outputObjectRef: "asset_activity_001",
    receiptObjectRef: "receipt_activity_001",
    requestedAt: "2026-09-01T01:00:00Z",
    providerProfile: "fixture",
    context: {
      requestId: "req_activity_001",
      genesisId: "gen_activity_001",
      threadId: "thr_activity_001",
      embodimentId: "emb_activity_001",
    },
    ...overrides,
  };
}

function generatedResult(injectedJob) {
  return {
    receipt: { jobId: injectedJob.jobId },
    receiptObjectRef: injectedJob.receiptObjectRef,
    receiptDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    generationRecordObjectRef: "record_activity_001",
    generationRecordDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    providerOutputDigest: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    finalAssetDigest: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  };
}

function recorder(telemetry, prefix = "asset") {
  let id = 0;
  return createActivityRecorder({
    telemetry,
    environment: "test",
    service: "asset-generator",
    now: () => "2026-09-01T01:00:00.000Z",
    activityIdFactory: () => `act_${prefix}_${String(++id).padStart(3, "0")}`,
  });
}

test("asset activity log identifies a failed attempt followed by an explicit successful retry", async () => {
  const telemetry = createLocalActivityTelemetryPort();
  let calls = 0;
  const runtime = createAssetGenerationRuntime({
    infra: infra(),
    provider: { providerId: "fixture" },
    credentialSigner: { signerId: "fixture" },
    activityRecorder: recorder(telemetry),
    executeJob: async ({ job: injectedJob }) => {
      calls += 1;
      if (calls === 1) throw new Error("simulated provider boundary failure");
      return generatedResult(injectedJob);
    },
  });

  await assert.rejects(
    () => runtime.execute(job(), { attemptNumber: 1 }),
    /simulated provider boundary failure/u,
  );
  const result = await runtime.execute(job(), { attemptNumber: 2 });
  assert.equal(result.receipt.jobId, "job_activity_001");

  const records = await telemetry.query({ requestId: "req_activity_001" });
  assert.deepEqual(
    records
      .filter((record) => record.stage === "asset.request.execute")
      .map((record) => [record.status, record.attempt]),
    [
      ["started", 1],
      ["failed", 1],
      ["retrying", 2],
      ["started", 2],
      ["succeeded", 2],
    ],
  );
  assert.equal(records.every((record) => record.genesisId === "gen_activity_001"), true);
  assert.equal(records.every((record) => record.threadId === "thr_activity_001"), true);
  assert.equal(records.every((record) => record.causationId === "emb_activity_001"), true);
  assert.equal(records.every((record) => record.evidence.objectRef === "asset_activity_001"), true);
  assert.equal(records.every((record) => record.evidence.embodimentId === "emb_activity_001"), true);
  const failure = records.find((record) => record.status === "failed");
  assert.deepEqual(failure.error, {
    category: "unknown",
    code: "ASSET_UNKNOWN",
    retryable: true,
  });
});

test("derived Thread media names its canonical reference as cause and keeps completion in the Thread trail", async () => {
  const telemetry = createLocalActivityTelemetryPort();
  const runtime = createAssetGenerationRuntime({
    infra: infra(),
    provider: { providerId: "fixture" },
    credentialSigner: { signerId: "fixture" },
    activityRecorder: recorder(telemetry, "derived_asset"),
    executeJob: async ({ job: injectedJob }) => generatedResult(injectedJob),
  });
  const derived = job({
    jobId: "job_derived_activity_001",
    role: "official_id_photo",
    referenceObjectRefs: ["visual_identity_reference_activity_001"],
    outputObjectRef: "official_photo_activity_001",
    receiptObjectRef: "receipt_derived_activity_001",
    context: {
      kind: "thread_presentation_media",
      threadId: "thr_derived_activity_001",
      mediaId: "media_derived_activity_001",
    },
  });

  const generated = await runtime.execute(derived);
  const execute = (await telemetry.query({ threadId: "thr_derived_activity_001" }))
    .find((record) => record.stage === "asset.request.execute" && record.status === "succeeded");
  assert.equal(execute?.causationId, "visual_identity_reference_activity_001");
  assert.equal(execute?.evidence?.objectRef, "official_photo_activity_001");

  const completion = createAssetGenerationCompletion({
    jobId: derived.jobId,
    receiptObjectRef: generated.receiptObjectRef,
    receiptDigest: generated.receiptDigest,
  });
  await runtime.publishCompletion(completion, {
    activityContext: {
      threadId: derived.context.threadId,
      causationId: derived.jobId,
    },
  });
  const completionRecord = (await telemetry.query({ threadId: derived.context.threadId }))
    .find((record) => record.stage === "asset.completion.publish" && record.status === "succeeded");
  assert.equal(completionRecord?.causationId, derived.jobId);
  assert.equal(completionRecord?.evidence?.objectRef, derived.receiptObjectRef);
});

test("non-Thread asset scopes never become Thread activity identities by inference", async () => {
  const telemetry = createLocalActivityTelemetryPort();
  const runtime = createAssetGenerationRuntime({
    infra: infra(),
    provider: { providerId: "fixture" },
    credentialSigner: { signerId: "fixture" },
    activityRecorder: recorder(telemetry, "place_asset"),
    executeJob: async ({ job: injectedJob }) => generatedResult(injectedJob),
  });
  const placeJob = job({
    jobId: "job_place_activity_001",
    context: {
      requestId: "req_place_activity_001",
      entityKind: "place",
      entityRef: "place_market_001",
    },
  });
  await runtime.execute(placeJob);
  const records = await telemetry.query({ requestId: "req_place_activity_001" });
  assert.equal(records.length, 2);
  assert.equal(records.every((record) => record.threadId === null), true);
  assert.equal(records.every((record) => record.causationId === null), true);
});

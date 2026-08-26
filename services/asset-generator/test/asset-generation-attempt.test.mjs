import test from "node:test";
import assert from "node:assert/strict";

import { ASSET_GENERATION_JOB_VERSION } from "../src/asset-generation-domain.mjs";
import {
  GENERATION_ATTEMPT_VERSION,
  assetGenerationJobDigest,
  createGenerationAttempt,
  generationAttemptObjectRef,
  normalizeGenerationAttempt,
  stagedProviderOutputObjectRef,
} from "../src/asset-generation-attempt.mjs";

function job() {
  return {
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: "assetjob_attempt_fixture",
    assetKind: "image",
    role: "memory",
    variant: "default",
    brief: { description: "A remembered pair of sandals.", constraints: ["Generated reconstruction."] },
    inputReferences: ["memory_1"],
    referenceObjectRefs: [],
    outputObjectRef: "asset_attempt_fixture",
    receiptObjectRef: "assetreceipt_attempt_fixture",
    requestedAt: "2026-08-26T21:05:00Z",
    providerProfile: "image-provider-default",
    context: { kind: "thread_presentation_media", mediaId: "media_memory_sandals" },
  };
}

const requestWitness = {
  mediaType: "application/json",
  body: { model: "fixture-image", prompt: "sandals" },
  secretsRemoved: true,
};
const requestDigest = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const outputDigest = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

test("GenerationAttempt has identity distinct from AssetGenerationJob and binds exact job content", async () => {
  const currentJob = job();
  const jobDigest = await assetGenerationJobDigest(currentJob);
  const attempt = createGenerationAttempt({
    job: currentJob,
    jobDigest,
    attemptNumber: 2,
    providerAdapterId: "fixture-image-provider-v2",
    providerRequestWitness: requestWitness,
    providerRequestDigest: requestDigest,
    providerOutputDigest: outputDigest,
    providerOutput: { mediaType: "image/png", width: 1024, height: 1024, durationMs: null },
    generation: {
      provider: "fixture",
      model: "fixture-image",
      providerRequestId: "req_attempt_2",
      generatedAt: "2026-08-26T21:05:01Z",
      configuration: { quality: "medium" },
    },
    createdAt: "2026-08-26T21:05:02Z",
  });

  assert.equal(attempt.attemptVersion, GENERATION_ATTEMPT_VERSION);
  assert.notEqual(attempt.attemptId, currentJob.jobId);
  assert.equal(attempt.attemptId, generationAttemptObjectRef(jobDigest, 2));
  assert.equal(attempt.providerOutputObjectRef, stagedProviderOutputObjectRef(jobDigest, 2));
  assert.equal(attempt.jobId, currentJob.jobId);
  assert.equal(attempt.jobDigest, jobDigest);
  assert.equal(attempt.attemptNumber, 2);
});

test("GenerationAttempt identity changes with attempt number and rejects forged output location", async () => {
  const jobDigest = await assetGenerationJobDigest(job());
  assert.notEqual(generationAttemptObjectRef(jobDigest, 1), generationAttemptObjectRef(jobDigest, 2));
  assert.notEqual(stagedProviderOutputObjectRef(jobDigest, 1), stagedProviderOutputObjectRef(jobDigest, 2));

  const valid = createGenerationAttempt({
    job: job(),
    jobDigest,
    attemptNumber: 1,
    providerAdapterId: "fixture-image-provider-v2",
    providerRequestWitness: requestWitness,
    providerRequestDigest: requestDigest,
    providerOutputDigest: outputDigest,
    providerOutput: { mediaType: "image/png", width: 1024, height: 1024, durationMs: null },
    generation: {
      provider: "fixture",
      model: "fixture-image",
      providerRequestId: null,
      generatedAt: "2026-08-26T21:05:01Z",
      configuration: {},
    },
    createdAt: "2026-08-26T21:05:02Z",
  });
  assert.throws(
    () => normalizeGenerationAttempt({ ...valid, providerOutputObjectRef: "provideroutput_wrong" }),
    /providerOutputObjectRef/,
  );
});

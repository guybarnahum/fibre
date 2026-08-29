import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "#infra/memory";
import { ASSET_GENERATION_JOB_VERSION } from "../src/asset-generation-domain.mjs";
import {
  AssetGenerationError,
  assetGenerationRetryDecision,
} from "../src/asset-generation-error.mjs";
import {
  CONTENT_CREDENTIAL_SIGNER_VERSION,
  WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
} from "../src/asset-provenance-domain.mjs";
import { executeCredentialedAssetGenerationJob } from "../src/credentialed-asset-generation-service.mjs";

const encoder = new TextEncoder();

function job(overrides = {}) {
  return {
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: "asset_job_error_fixture",
    assetKind: "image",
    role: "memory",
    variant: "default",
    brief: {
      description: "Generated reconstruction of a remembered scene.",
      constraints: ["Not documentary evidence."],
    },
    inputReferences: ["presentation_1"],
    referenceObjectRefs: [],
    outputObjectRef: "asset_object_error_fixture",
    receiptObjectRef: "asset_receipt_error_fixture",
    requestedAt: "2026-08-26T20:00:00Z",
    providerProfile: "fixture-profile",
    context: { kind: "fixture" },
    ...overrides,
  };
}

function provider(onGenerate = () => {}) {
  return {
    providerVersion: WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
    providerId: "fixture-image-provider",
    capabilities: ["image"],
    async generate() {
      onGenerate();
      return {
        requestWitness: {
          mediaType: "application/json",
          body: { model: "fixture-model", prompt: "fixture prompt" },
          secretsRemoved: true,
        },
        result: {
          assetKind: "image",
          bytes: encoder.encode("fixture-provider-output"),
          mediaType: "image/png",
          width: 64,
          height: 64,
          durationMs: null,
          provider: "fixture",
          model: "fixture-model",
          providerRequestId: "req_fixture_error",
          generatedAt: "2026-08-26T20:00:01Z",
          configuration: {},
        },
      };
    },
  };
}

function failingSigner() {
  return {
    signerVersion: CONTENT_CREDENTIAL_SIGNER_VERSION,
    signerId: "fixture-signer",
    format: "c2pa",
    async embed() { throw new Error("fixture signer unavailable"); },
    async verify() { throw new Error("unused"); },
  };
}

test("missing reference is terminal before the generation provider is called", async () => {
  let providerCalls = 0;
  await assert.rejects(
    () => executeCredentialedAssetGenerationJob({
      infra: createMemoryInfraDriver(),
      provider: provider(() => { providerCalls += 1; }),
      credentialSigner: failingSigner(),
      job: job({ referenceObjectRefs: ["missing_reference_object"] }),
    }),
    (error) => error instanceof AssetGenerationError
      && error.phase === "reference_loading"
      && error.category === "missing_reference"
      && error.retryable === false
      && error.providerOutputDurable === false,
  );
  assert.equal(providerCalls, 0);
});

test("post-provider signer failure is retryable only because the provider output was staged first", async () => {
  let providerCalls = 0;
  const infra = createMemoryInfraDriver();
  await assert.rejects(
    () => executeCredentialedAssetGenerationJob({
      infra,
      provider: provider(() => { providerCalls += 1; }),
      credentialSigner: failingSigner(),
      job: job(),
      attemptNumber: 1,
      now: () => "2026-08-26T20:00:02Z",
    }),
    (error) => {
      assert.equal(error instanceof AssetGenerationError, true);
      assert.equal(error.phase, "credential_signing");
      assert.equal(error.category, "unknown");
      assert.equal(error.retryable, true);
      assert.equal(error.providerOutputDurable, true);
      const decision = assetGenerationRetryDecision(error, { attempt: 1 });
      assert.equal(decision.retry, true);
      assert.equal(decision.reason, "retryable");
      return true;
    },
  );
  assert.equal(providerCalls, 1, "the portable service stages provider output but never loops provider calls internally");
});

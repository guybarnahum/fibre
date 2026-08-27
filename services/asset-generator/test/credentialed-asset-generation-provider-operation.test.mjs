import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "#packages/infra/src/memory-driver.mjs";
import { ASSET_GENERATION_JOB_VERSION } from "../src/asset-generation-domain.mjs";
import { assetGenerationJobDigest } from "../src/asset-generation-attempt.mjs";
import {
  AssetGenerationError,
  assetGenerationRetryDecision,
} from "../src/asset-generation-error.mjs";
import { providerOperationObjectRef } from "../src/asset-generation-provider-operation.mjs";
import { createAssetGenerationRuntime } from "../src/asset-generation-runtime.mjs";
import {
  CONTENT_CREDENTIAL_SIGNER_VERSION,
  WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
  normalizeEmbeddedAssetProvenance,
} from "../src/asset-provenance-domain.mjs";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DELIMITER = "\n--FIBRE-PROVIDER-OP-CREDENTIAL--\n";

async function sha256(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : encoder.encode(bytes);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function concatBytes(...parts) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function job() {
  return {
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: "assetjob_provider_operation_resume",
    assetKind: "image",
    role: "place",
    variant: "default",
    brief: {
      description: "Generated reconstruction of a riverside market.",
      constraints: ["Not documentary evidence."],
    },
    inputReferences: ["presentation_market"],
    referenceObjectRefs: [],
    outputObjectRef: "asset_provider_operation_resume",
    receiptObjectRef: "assetreceipt_provider_operation_resume",
    requestedAt: "2026-08-26T23:10:00Z",
    providerProfile: "fixture-async-image-v1",
    context: {},
  };
}

function resumableProvider(counters, { failFirstResume = false } = {}) {
  return {
    providerVersion: WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
    providerId: "fixture-async-image-v1",
    capabilities: ["image"],
    async generate() {
      throw new Error("runtime should wrap resumable provider generation");
    },
    async startOperation(request) {
      counters.starts += 1;
      return {
        requestWitness: {
          mediaType: "application/json",
          body: { prompt: request.brief.description, provider: "fixture-async" },
          secretsRemoved: true,
        },
        operation: {
          provider: "fixture-async",
          model: "fixture-async-image",
          providerRequestId: "fixture_async_task_1",
          continuation: { taskRef: "fixture_async_task_1" },
          secretsRemoved: true,
        },
      };
    },
    async resumeOperation(operation) {
      counters.resumes += 1;
      assert.equal(operation.providerRequestId, "fixture_async_task_1");
      if (failFirstResume && counters.resumes === 1) {
        throw new AssetGenerationError("fixture async poll timed out", {
          phase: "provider_generation",
          category: "provider_timeout",
          retryable: true,
          provider: "fixture-async",
          model: "fixture-async-image",
          providerRequestId: operation.providerRequestId,
        });
      }
      return {
        assetKind: "image",
        bytes: encoder.encode("fixture-async-provider-output"),
        mediaType: "image/png",
        width: 1024,
        height: 1024,
        durationMs: null,
        provider: "fixture-async",
        model: "fixture-async-image",
        providerRequestId: operation.providerRequestId,
        generatedAt: "2026-08-26T23:10:02Z",
        configuration: { asyncResult: true },
      };
    },
  };
}

function signer() {
  return {
    signerVersion: CONTENT_CREDENTIAL_SIGNER_VERSION,
    signerId: "fixture-provider-op-signer",
    format: "fixture-content-credential",
    async embed({ bytes, assertion }) {
      const normalized = normalizeEmbeddedAssetProvenance(assertion);
      const manifestBytes = encoder.encode(JSON.stringify(normalized));
      return {
        bytes: concatBytes(bytes, encoder.encode(DELIMITER), manifestBytes),
        format: "fixture-content-credential",
        signerId: "fixture-provider-op-signer",
        manifestDigest: await sha256(manifestBytes),
        embeddedAt: "2026-08-26T23:10:03Z",
      };
    },
    async verify({ bytes }) {
      const text = decoder.decode(bytes);
      const index = text.lastIndexOf(DELIMITER);
      if (index < 0) throw new Error("credential delimiter missing");
      const assertion = normalizeEmbeddedAssetProvenance(JSON.parse(text.slice(index + DELIMITER.length)));
      return {
        valid: true,
        format: "fixture-content-credential",
        signerId: "fixture-provider-op-signer",
        manifestDigest: await sha256(encoder.encode(JSON.stringify(assertion))),
        assertion,
        verifiedAt: "2026-08-26T23:10:04Z",
        failureReason: null,
      };
    },
  };
}

function failProviderOperationCheckpoint(base) {
  return {
    ...base,
    objects: {
      async putImmutable(objectRef, bytes, digest, metadata) {
        if (metadata?.kind === "provider_operation_checkpoint") {
          throw new Error("fixture provider operation store unavailable");
        }
        return base.objects.putImmutable(objectRef, bytes, digest, metadata);
      },
      get: base.objects.get,
      head: base.objects.head,
    },
  };
}

test("runtime checkpoints accepted async provider task and resumes it after process-style recreation", async () => {
  const infra = createMemoryInfraDriver();
  const counters = { starts: 0, resumes: 0 };
  const firstRuntime = createAssetGenerationRuntime({
    infra,
    provider: resumableProvider(counters, { failFirstResume: true }),
    credentialSigner: signer(),
  });

  await assert.rejects(
    () => firstRuntime.execute(job(), { attemptNumber: 1 }),
    (error) => error instanceof AssetGenerationError
      && error.phase === "provider_generation"
      && error.category === "provider_timeout"
      && error.providerOperationDurable === true
      && error.providerOutputDurable === false
      && assetGenerationRetryDecision(error, { attempt: 1 }).retry === true,
  );
  assert.equal(counters.starts, 1);
  assert.equal(counters.resumes, 1);

  const jobDigest = await assetGenerationJobDigest(job());
  const operationRef = providerOperationObjectRef(jobDigest, 1);
  const checkpoint = await infra.objects.get(operationRef);
  assert.notEqual(checkpoint, null, "accepted provider task must be durable before polling can escape the invocation");
  assert.equal(checkpoint.metadata.kind, "provider_operation_checkpoint");
  assert.equal(checkpoint.metadata.providerRequestId, "fixture_async_task_1");

  const secondRuntime = createAssetGenerationRuntime({
    infra,
    provider: resumableProvider(counters, { failFirstResume: true }),
    credentialSigner: signer(),
  });
  const result = await secondRuntime.execute(job(), { attemptNumber: 2 });

  assert.equal(counters.starts, 1, "retry must not submit a second provider task");
  assert.equal(counters.resumes, 2);
  assert.equal(result.providerOperationResumed, true);
  assert.equal(result.providerOperationObjectRef, operationRef);
  assert.equal(result.providerOperation.operation.providerRequestId, "fixture_async_task_1");
  assert.equal(result.generationAttempt.attemptNumber, 1,
    "GenerationAttempt identity stays attached to the workflow attempt that accepted the provider task");
  assert.equal(result.generationAttempt.generation.providerRequestId, "fixture_async_task_1");
});

test("accepted async provider task is not replayable when its durable checkpoint cannot be committed", async () => {
  const base = createMemoryInfraDriver();
  const infra = failProviderOperationCheckpoint(base);
  const counters = { starts: 0, resumes: 0 };
  const runtime = createAssetGenerationRuntime({
    infra,
    provider: resumableProvider(counters),
    credentialSigner: signer(),
  });

  await assert.rejects(
    () => runtime.execute(job(), { attemptNumber: 1 }),
    (error) => {
      const decision = assetGenerationRetryDecision(error, { attempt: 1 });
      return error instanceof AssetGenerationError
        && error.phase === "provider_operation_staging"
        && error.category === "storage_transient"
        && error.providerOperationDurable === false
        && decision.retry === false
        && decision.reason === "provider_operation_not_staged";
    },
  );
  assert.equal(counters.starts, 1);
  assert.equal(counters.resumes, 0, "polling must not start before the accepted operation is durable");
});

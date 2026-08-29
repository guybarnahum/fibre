import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { ASSET_GENERATION_JOB_VERSION } from "../src/asset-generation-domain.mjs";
import {
  AssetGenerationError,
  assetGenerationRetryDecision,
} from "../src/asset-generation-error.mjs";
import {
  CONTENT_CREDENTIAL_SIGNER_VERSION,
  WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
  normalizeEmbeddedAssetProvenance,
} from "../src/asset-provenance-domain.mjs";
import {
  executeCredentialedAssetGenerationJob,
  verifyCredentialedAssetForPublication,
} from "../src/credentialed-asset-generation.mjs";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DELIMITER = "\n--FIBRE-SLICE-B-CREDENTIAL--\n";

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
    jobId: "assetjob_slice_b_resume",
    assetKind: "image",
    role: "memory",
    variant: "default",
    brief: {
      description: "Generated reconstruction of blue and red sandals.",
      constraints: ["Do not imply documentary evidence."],
    },
    inputReferences: ["memory_sandals"],
    referenceObjectRefs: [],
    outputObjectRef: "asset_slice_b_resume",
    receiptObjectRef: "assetreceipt_slice_b_resume",
    requestedAt: "2026-08-26T21:05:00Z",
    providerProfile: "openai-gpt-image-2-medium-v1",
    context: { kind: "thread_presentation_media", mediaId: "media_memory_sandals" },
  };
}

function provider({ failFirst = false } = {}) {
  let calls = 0;
  return {
    get calls() { return calls; },
    providerVersion: WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
    providerId: "fixture-image-provider-v2",
    capabilities: ["image"],
    async generate(request) {
      calls += 1;
      if (failFirst && calls === 1) {
        throw new AssetGenerationError("fixture provider unavailable", {
          phase: "provider_generation",
          category: "provider_unavailable",
          provider: "fixture",
          model: "fixture-image-v2",
        });
      }
      return {
        requestWitness: {
          mediaType: "application/json",
          body: { model: "fixture-image-v2", prompt: request.brief.description, call: calls },
          secretsRemoved: true,
        },
        result: {
          assetKind: "image",
          bytes: encoder.encode(`raw-provider-output-${calls}`),
          mediaType: "image/png",
          width: 1024,
          height: 1024,
          durationMs: null,
          provider: "fixture",
          model: "fixture-image-v2",
          providerRequestId: `req_fixture_${calls}`,
          generatedAt: "2026-08-26T21:05:01Z",
          configuration: { quality: "medium" },
        },
      };
    },
  };
}

function signer({ failFirstEmbed = false } = {}) {
  let embedCalls = 0;
  let verifyCalls = 0;
  return {
    get embedCalls() { return embedCalls; },
    get verifyCalls() { return verifyCalls; },
    signerVersion: CONTENT_CREDENTIAL_SIGNER_VERSION,
    signerId: "fixture-content-credential-signer",
    format: "fixture-content-credential",
    async embed({ bytes, assertion }) {
      embedCalls += 1;
      if (failFirstEmbed && embedCalls === 1) throw new Error("fixture signer unavailable");
      const normalized = normalizeEmbeddedAssetProvenance(assertion);
      const manifestBytes = encoder.encode(JSON.stringify(normalized));
      return {
        bytes: concatBytes(bytes, encoder.encode(DELIMITER), manifestBytes),
        format: "fixture-content-credential",
        signerId: "fixture-content-credential-signer",
        manifestDigest: await sha256(manifestBytes),
        embeddedAt: "2026-08-26T21:05:03Z",
      };
    },
    async verify({ bytes }) {
      verifyCalls += 1;
      const text = decoder.decode(bytes);
      const index = text.lastIndexOf(DELIMITER);
      if (index < 0) throw new Error("credential delimiter missing");
      const manifestText = text.slice(index + DELIMITER.length);
      const assertion = normalizeEmbeddedAssetProvenance(JSON.parse(manifestText));
      return {
        valid: true,
        format: "fixture-content-credential",
        signerId: "fixture-content-credential-signer",
        manifestDigest: await sha256(encoder.encode(JSON.stringify(assertion))),
        assertion,
        verifiedAt: "2026-08-26T21:05:04Z",
        failureReason: null,
      };
    },
  };
}

function failReceiptOnce(base, receiptObjectRef) {
  let failed = false;
  return {
    ...base,
    objects: {
      async putImmutable(objectRef, bytes, digest, metadata) {
        if (objectRef === receiptObjectRef && !failed) {
          failed = true;
          throw new Error("fixture receipt store unavailable");
        }
        return base.objects.putImmutable(objectRef, bytes, digest, metadata);
      },
      get: base.objects.get,
      head: base.objects.head,
    },
  };
}

async function copyObject(source, target, objectRef) {
  const stored = await source.objects.get(objectRef);
  assert.notEqual(stored, null);
  await target.objects.putImmutable(objectRef, stored.bytes, stored.digest, stored.metadata);
}

test("post-provider signer retry resumes staged output without a second provider call", async () => {
  const infra = createMemoryInfraDriver();
  const imageProvider = provider();
  const credentialSigner = signer({ failFirstEmbed: true });

  await assert.rejects(
    () => executeCredentialedAssetGenerationJob({
      infra,
      provider: imageProvider,
      credentialSigner,
      job: job(),
      attemptNumber: 1,
      now: () => "2026-08-26T21:05:02Z",
    }),
    (error) => error instanceof AssetGenerationError
      && error.phase === "credential_signing"
      && error.providerOutputDurable === true
      && assetGenerationRetryDecision(error, { attempt: 1 }).retry === true,
  );
  assert.equal(imageProvider.calls, 1);

  const result = await executeCredentialedAssetGenerationJob({
    infra,
    provider: imageProvider,
    credentialSigner,
    job: job(),
    attemptNumber: 2,
    now: () => "2026-08-26T21:05:10Z",
  });
  assert.equal(imageProvider.calls, 1, "retry after staging must not call the image provider again");
  assert.equal(result.providerOutputResumed, true);
  assert.equal(result.generationAttempt.attemptNumber, 1);
  assert.notEqual(result.generationAttempt.attemptId, job().jobId);
  assert.notEqual(await infra.objects.head(result.generationAttemptObjectRef), null,
    "one physical immutable attempt bundle must exist");
  assert.equal(await infra.objects.head(result.providerOutputObjectRef), null,
    "raw provider output is virtualized from the attempt bundle rather than stored as a second object");

  const proof = await verifyCredentialedAssetForPublication({
    infra,
    credentialSigner,
    receipt: result.receipt,
  });
  assert.equal(proof.generationAttempt.attempt.attemptId, result.generationAttempt.attemptId);
  assert.equal(proof.generationAttempt.attemptDigest, result.generationAttemptDigest);
});

test("provider failure creates no staged attempt; the next provider call becomes GenerationAttempt 2", async () => {
  const infra = createMemoryInfraDriver();
  const imageProvider = provider({ failFirst: true });
  const credentialSigner = signer();

  await assert.rejects(
    () => executeCredentialedAssetGenerationJob({
      infra,
      provider: imageProvider,
      credentialSigner,
      job: job(),
      attemptNumber: 1,
    }),
    (error) => error instanceof AssetGenerationError
      && error.phase === "provider_generation"
      && error.providerOutputDurable === false,
  );

  const result = await executeCredentialedAssetGenerationJob({
    infra,
    provider: imageProvider,
    credentialSigner,
    job: job(),
    attemptNumber: 2,
    now: () => "2026-08-26T21:05:12Z",
  });
  assert.equal(imageProvider.calls, 2);
  assert.equal(result.generationAttempt.attemptNumber, 2);
  assert.equal(result.providerOutputResumed, false);
});

test("receipt-storage retry reuses both staged provider output and already credentialed final asset", async () => {
  const base = createMemoryInfraDriver();
  const infra = failReceiptOnce(base, job().receiptObjectRef);
  const imageProvider = provider();
  const credentialSigner = signer();

  await assert.rejects(
    () => executeCredentialedAssetGenerationJob({
      infra,
      provider: imageProvider,
      credentialSigner,
      job: job(),
      attemptNumber: 1,
      now: () => "2026-08-26T21:05:20Z",
    }),
    (error) => error instanceof AssetGenerationError
      && error.phase === "storage_finalization"
      && error.providerOutputDurable === true
      && assetGenerationRetryDecision(error, { attempt: 1 }).retry === true,
  );
  assert.equal(imageProvider.calls, 1);
  assert.equal(credentialSigner.embedCalls, 1);
  assert.notEqual(await base.objects.head(job().outputObjectRef), null, "final credentialed bytes were already committed");

  const result = await executeCredentialedAssetGenerationJob({
    infra,
    provider: imageProvider,
    credentialSigner,
    job: job(),
    attemptNumber: 2,
    now: () => "2026-08-26T21:05:30Z",
  });
  assert.equal(imageProvider.calls, 1);
  assert.equal(credentialSigner.embedCalls, 1, "existing final asset must be verified, not embedded again");
  assert.equal(result.providerOutputResumed, true);
  assert.equal(result.finalAssetReused, true);
});

test("publication verification fails closed when the GenerationAttempt/staged-output lineage is missing", async () => {
  const source = createMemoryInfraDriver();
  const imageProvider = provider();
  const credentialSigner = signer();
  const result = await executeCredentialedAssetGenerationJob({
    infra: source,
    provider: imageProvider,
    credentialSigner,
    job: job(),
    attemptNumber: 1,
    now: () => "2026-08-26T21:05:40Z",
  });

  const target = createMemoryInfraDriver();
  await copyObject(source, target, result.generationRecordObjectRef);
  await copyObject(source, target, result.receipt.objectRef);
  await copyObject(source, target, result.receiptObjectRef);

  await assert.rejects(
    () => verifyCredentialedAssetForPublication({
      infra: target,
      credentialSigner,
      receipt: result.receipt,
    }),
    /missing generation attempt/,
  );
});

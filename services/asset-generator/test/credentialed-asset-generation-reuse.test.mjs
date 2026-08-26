import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "#packages/infra/src/memory-driver.mjs";
import { ASSET_GENERATION_JOB_VERSION } from "../src/asset-generation-domain.mjs";
import {
  assetGenerationJobDigest,
  generationAttemptObjectRef,
} from "../src/asset-generation-attempt.mjs";
import { AssetGenerationError } from "../src/asset-generation-error.mjs";
import {
  CONTENT_CREDENTIAL_SIGNER_VERSION,
  WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
  normalizeEmbeddedAssetProvenance,
} from "../src/asset-provenance-domain.mjs";
import { executeCredentialedAssetGenerationJob } from "../src/credentialed-asset-generation.mjs";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DELIMITER = "\n--FIBRE-REUSE-CREDENTIAL--\n";

async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
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

function job({
  suffix = "reuse_1",
  requestedAt = "2026-08-26T21:00:00Z",
  description = "Generated reconstruction of the remembered market.",
} = {}) {
  return {
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: `assetjob_${suffix}`,
    assetKind: "image",
    role: "memory",
    variant: "default",
    brief: {
      description,
      constraints: ["This is a reconstruction, not documentary evidence."],
    },
    inputReferences: ["presentation_1", "memory_1"],
    referenceObjectRefs: [],
    outputObjectRef: `asset_${suffix}`,
    receiptObjectRef: `assetreceipt_${suffix}`,
    requestedAt,
    providerProfile: "fixture-image-profile",
    context: {
      kind: "thread_presentation_media",
      threadId: "thr_1",
      mediaId: "media_memory_1",
      provenanceRef: "prov_memory_1",
    },
  };
}

function provider(counter) {
  return {
    providerVersion: WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
    providerId: "fixture-image-provider",
    capabilities: ["image"],
    async generate(request) {
      counter.calls += 1;
      return {
        requestWitness: {
          mediaType: "application/json",
          body: {
            model: "fixture-model",
            prompt: request.brief.description,
          },
          secretsRemoved: true,
        },
        result: {
          assetKind: "image",
          bytes: encoder.encode(`provider-output-${counter.calls}`),
          mediaType: "image/png",
          width: 64,
          height: 64,
          durationMs: null,
          provider: "fixture",
          model: "fixture-model",
          providerRequestId: `req_${counter.calls}`,
          generatedAt: `2026-08-26T21:00:0${counter.calls}Z`,
          configuration: {},
        },
      };
    },
  };
}

function signer(counter, { failFirstEmbed = false } = {}) {
  return {
    signerVersion: CONTENT_CREDENTIAL_SIGNER_VERSION,
    signerId: "fixture-reuse-signer",
    format: "fixture-content-credential",
    async embed({ bytes, assertion }) {
      counter.embed += 1;
      if (failFirstEmbed && counter.embed === 1) throw new Error("fixture signer temporarily unavailable");
      const normalized = normalizeEmbeddedAssetProvenance(assertion);
      const manifestBytes = encoder.encode(JSON.stringify(normalized));
      return {
        bytes: concatBytes(bytes, encoder.encode(DELIMITER), manifestBytes),
        format: "fixture-content-credential",
        signerId: "fixture-reuse-signer",
        manifestDigest: await sha256(manifestBytes),
        embeddedAt: "2026-08-26T21:01:00Z",
      };
    },
    async verify({ bytes }) {
      counter.verify += 1;
      try {
        const text = decoder.decode(bytes);
        const index = text.lastIndexOf(DELIMITER);
        if (index < 0) throw new Error("credential delimiter missing");
        const assertion = normalizeEmbeddedAssetProvenance(JSON.parse(text.slice(index + DELIMITER.length)));
        return {
          valid: true,
          format: "fixture-content-credential",
          signerId: "fixture-reuse-signer",
          manifestDigest: await sha256(encoder.encode(JSON.stringify(assertion))),
          assertion,
          verifiedAt: "2026-08-26T21:01:01Z",
          failureReason: null,
        };
      } catch (error) {
        return {
          valid: false,
          format: "fixture-content-credential",
          signerId: "fixture-reuse-signer",
          manifestDigest: null,
          assertion: null,
          verifiedAt: "2026-08-26T21:01:01Z",
          failureReason: error.message,
        };
      }
    },
  };
}

test("exact completed job reuse performs no second provider call or credential embed", async () => {
  const infra = createMemoryInfraDriver();
  const providerCounter = { calls: 0 };
  const signerCounter = { embed: 0, verify: 0 };
  const exactJob = job();
  const dependencies = {
    infra,
    provider: provider(providerCounter),
    credentialSigner: signer(signerCounter),
    job: exactJob,
    now: () => "2026-08-26T21:02:00Z",
  };

  const first = await executeCredentialedAssetGenerationJob(dependencies);
  const second = await executeCredentialedAssetGenerationJob({ ...dependencies, attemptNumber: 2 });

  assert.equal(first.reuse.mode, "none");
  assert.equal(first.reuse.providerGenerationPerformed, true);
  assert.equal(second.reuse.mode, "completed_asset");
  assert.equal(second.reuse.cacheScope, "exact_job_digest");
  assert.equal(second.reuse.providerGenerationPerformed, false);
  assert.equal(second.receiptDigest, first.receiptDigest);
  assert.equal(second.finalAssetDigest, first.finalAssetDigest);
  assert.equal(providerCounter.calls, 1);
  assert.equal(signerCounter.embed, 1);
  assert.equal(signerCounter.verify, 2, "completed reuse re-verifies the credential but does not re-embed it");

  const jobDigest = await assetGenerationJobDigest(exactJob);
  assert.equal(await infra.objects.head(generationAttemptObjectRef(jobDigest, 2)), null);
});

test("same short refs with a different full job witness fail closed before provider reuse or regeneration", async () => {
  const infra = createMemoryInfraDriver();
  const providerCounter = { calls: 0 };
  const signerCounter = { embed: 0, verify: 0 };
  const mediaProvider = provider(providerCounter);
  const credentialSigner = signer(signerCounter);
  await executeCredentialedAssetGenerationJob({
    infra,
    provider: mediaProvider,
    credentialSigner,
    job: job(),
    now: () => "2026-08-26T21:02:00Z",
  });

  await assert.rejects(
    () => executeCredentialedAssetGenerationJob({
      infra,
      provider: mediaProvider,
      credentialSigner,
      job: job({ requestedAt: "2026-08-26T22:00:00Z" }),
      now: () => "2026-08-26T22:02:00Z",
    }),
    (error) => error instanceof AssetGenerationError
      && error.phase === "reuse_lookup"
      && error.category === "immutable_conflict",
  );
  assert.equal(providerCounter.calls, 1);
  assert.equal(signerCounter.embed, 1);
});

test("completed asset cannot be silently reused under a different prompt-disclosure policy", async () => {
  const infra = createMemoryInfraDriver();
  const providerCounter = { calls: 0 };
  const signerCounter = { embed: 0, verify: 0 };
  const mediaProvider = provider(providerCounter);
  const credentialSigner = signer(signerCounter);
  const exactJob = job();
  await executeCredentialedAssetGenerationJob({
    infra,
    provider: mediaProvider,
    credentialSigner,
    job: exactJob,
    now: () => "2026-08-26T21:02:00Z",
  });

  await assert.rejects(
    () => executeCredentialedAssetGenerationJob({
      infra,
      provider: mediaProvider,
      credentialSigner,
      job: exactJob,
      promptDisclosurePolicy: {
        mode: "public_text",
        authorizationRef: "prompt_disclosure_authorization_1",
      },
    }),
    (error) => error instanceof AssetGenerationError
      && error.phase === "reuse_lookup"
      && error.category === "immutable_conflict",
  );
  assert.equal(providerCounter.calls, 1);
  assert.equal(signerCounter.embed, 1);
  assert.equal(signerCounter.verify, 2, "policy mismatch is detected from verified existing provenance");
});

test("post-provider retry reports staged-output reuse and makes no second provider call", async () => {
  const infra = createMemoryInfraDriver();
  const providerCounter = { calls: 0 };
  const signerCounter = { embed: 0, verify: 0 };
  const mediaProvider = provider(providerCounter);
  const credentialSigner = signer(signerCounter, { failFirstEmbed: true });
  const exactJob = job({ suffix: "resume_1" });

  await assert.rejects(
    () => executeCredentialedAssetGenerationJob({
      infra,
      provider: mediaProvider,
      credentialSigner,
      job: exactJob,
      attemptNumber: 1,
      now: () => "2026-08-26T21:02:00Z",
    }),
    (error) => error instanceof AssetGenerationError
      && error.phase === "credential_signing"
      && error.providerOutputDurable === true,
  );

  const resumed = await executeCredentialedAssetGenerationJob({
    infra,
    provider: mediaProvider,
    credentialSigner,
    job: exactJob,
    attemptNumber: 2,
    now: () => "2026-08-26T21:03:00Z",
  });

  assert.equal(resumed.reuse.mode, "staged_provider_output");
  assert.equal(resumed.reuse.providerGenerationPerformed, false);
  assert.equal(resumed.providerOutputResumed, true);
  assert.equal(providerCounter.calls, 1);
  assert.equal(signerCounter.embed, 2);
});

test("different exact jobs do not share provider output merely because their briefs look equivalent", async () => {
  const infra = createMemoryInfraDriver();
  const providerCounter = { calls: 0 };
  const signerCounter = { embed: 0, verify: 0 };
  const mediaProvider = provider(providerCounter);
  const credentialSigner = signer(signerCounter);

  const first = await executeCredentialedAssetGenerationJob({
    infra,
    provider: mediaProvider,
    credentialSigner,
    job: job({ suffix: "distinct_a" }),
    now: () => "2026-08-26T21:02:00Z",
  });
  const second = await executeCredentialedAssetGenerationJob({
    infra,
    provider: mediaProvider,
    credentialSigner,
    job: job({ suffix: "distinct_b" }),
    now: () => "2026-08-26T21:03:00Z",
  });

  assert.equal(first.reuse.mode, "none");
  assert.equal(second.reuse.mode, "none");
  assert.equal(providerCounter.calls, 2);
  assert.equal(signerCounter.embed, 2);
  assert.notEqual(first.reuse.jobDigest, second.reuse.jobDigest);
});

import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import {
  ASSET_GENERATION_JOB_VERSION,
  CONTENT_CREDENTIAL_SIGNER_VERSION,
  WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
  createAssetGenerationControlService,
  normalizeEmbeddedAssetProvenance,
} from "#services/asset-generator/src/index.mjs";
import { createAssetGenerationControlApi } from "#services/asset-generator/src/http/asset-generation-control-api.mjs";
import { createLocalAssetGenerationWorker } from "../../asset-generator/local/worker-harness.mjs";
import { createCanonicalVisualRootHttpBoundary } from "./canonical-visual-root-http-boundary.mjs";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DELIMITER = "\n--FIBRE-SLICE-C-TEST-CREDENTIAL--\n";

async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function concatBytes(...parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function credentialSigner() {
  return {
    signerVersion: CONTENT_CREDENTIAL_SIGNER_VERSION,
    signerId: "slice-c-fixture-signer",
    format: "slice-c-fixture-credential",
    async embed({ bytes, assertion }) {
      const normalized = normalizeEmbeddedAssetProvenance(assertion);
      const manifestBytes = encoder.encode(JSON.stringify(normalized));
      return {
        bytes: concatBytes(bytes, encoder.encode(DELIMITER), manifestBytes),
        format: "slice-c-fixture-credential",
        signerId: "slice-c-fixture-signer",
        manifestDigest: await sha256(manifestBytes),
        embeddedAt: "2026-08-31T01:40:01Z",
      };
    },
    async verify({ bytes }) {
      try {
        const text = decoder.decode(bytes);
        const index = text.lastIndexOf(DELIMITER);
        if (index < 0) throw new Error("credential delimiter missing");
        const assertion = normalizeEmbeddedAssetProvenance(JSON.parse(text.slice(index + DELIMITER.length)));
        return {
          valid: true,
          format: "slice-c-fixture-credential",
          signerId: "slice-c-fixture-signer",
          manifestDigest: await sha256(encoder.encode(JSON.stringify(assertion))),
          assertion,
          verifiedAt: "2026-08-31T01:40:02Z",
          failureReason: null,
        };
      } catch (error) {
        return {
          valid: false,
          format: "slice-c-fixture-credential",
          signerId: "slice-c-fixture-signer",
          manifestDigest: null,
          assertion: null,
          verifiedAt: "2026-08-31T01:40:02Z",
          failureReason: error.message,
        };
      }
    },
  };
}

function provider() {
  return {
    providerVersion: WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
    providerId: "slice-c-root-provider",
    capabilities: ["image"],
    async generate(request) {
      assert.equal(request.context.kind, "thread_embodiment_canonical_visual_identity");
      assert.deepEqual(request.referenceObjects, []);
      return {
        requestWitness: {
          mediaType: "application/json",
          body: { model: "fixture-root-v1", prompt: request.brief.description },
          secretsRemoved: true,
        },
        result: {
          assetKind: "image",
          bytes: encoder.encode("slice-c-canonical-root-image"),
          mediaType: "image/webp",
          width: 1024,
          height: 1024,
          durationMs: null,
          provider: "fixture",
          model: "fixture-root-v1",
          providerRequestId: "slice-c-root-request-1",
          generatedAt: "2026-08-31T01:40:00Z",
          configuration: { size: "1024x1024" },
        },
      };
    },
  };
}

function job() {
  return {
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: "asset_slice_c_remote_root_job",
    assetKind: "image",
    role: "canonical_identity_portrait",
    variant: "canonical",
    brief: {
      description: "A canonical synthetic portrait for a Fibre Thread.",
      constraints: ["Synthetic representation only."],
    },
    inputReferences: ["evt_seed_thr_slice_c"],
    referenceObjectRefs: [],
    outputObjectRef: "asset_slice_c_remote_root",
    receiptObjectRef: "asset_slice_c_remote_root_receipt",
    requestedAt: "2026-08-31T01:39:00Z",
    providerProfile: "openai-gpt-image-2-medium-v1",
    context: {
      kind: "thread_embodiment_canonical_visual_identity",
      threadId: "thr_slice_c",
      embodimentId: "emb_slice_c",
    },
  };
}

test("World remote root handoff converges from durable pending workflow to verified ready proof", async () => {
  const infra = createMemoryInfraDriver();
  const signer = credentialSigner();
  const controlService = createAssetGenerationControlService({ infra, credentialSigner: signer });
  const api = createAssetGenerationControlApi({
    privateToken: "slice-c-private-token",
    controlService,
  });
  const boundary = createCanonicalVisualRootHttpBoundary({
    baseUrl: "https://asset.example",
    privateToken: "slice-c-private-token",
    fetchImpl(url, init) { return api.fetch(new Request(url, init)); },
  });

  const pending = await boundary.reconcile({ job: job() });
  assert.equal(pending.state, "pending");
  assert.equal(pending.duplicate, false);

  const worker = createLocalAssetGenerationWorker({
    infra,
    selectProvider() { return provider(); },
    credentialSigner: signer,
  });
  await worker.run({ jobId: job().jobId });

  const ready = await boundary.reconcile({ job: job() });
  assert.equal(ready.state, "ready");
  assert.equal(ready.recordedAt, "2026-08-31T01:40:02Z");
  assert.equal(ready.proof.receipt.jobId, job().jobId);
  assert.equal(ready.proof.receipt.objectRef, job().outputObjectRef);
  assert.equal(ready.proof.verification.valid, true);
  assert.equal(ready.proof.generationRecord.job.context.kind, "thread_embodiment_canonical_visual_identity");

  const replay = await boundary.reconcile({ job: job() });
  assert.deepEqual(replay, ready);
});

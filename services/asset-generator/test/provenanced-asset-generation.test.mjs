import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { ASSET_GENERATION_JOB_VERSION } from "../src/asset-generation-domain.mjs";
import {
  WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
} from "../src/asset-provenance-domain.mjs";
import {
  PROVENANCED_ASSET_RECEIPT_VERSION,
  executeProvenancedAssetGenerationJob,
  verifyProvenancedAssetForPublication,
} from "../src/provenanced-asset-generation.mjs";

function job() {
  return {
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: "job_provenanced_native_001",
    assetKind: "image",
    role: "official_id_photo",
    variant: "reference-conditioned",
    brief: {
      description: "Generate an ordinary identity-preserving portrait.",
      constraints: ["Preserve the supplied identity anchor."],
    },
    inputReferences: ["thr_provenanced_native_001"],
    referenceObjectRefs: [],
    outputObjectRef: "asset_provenanced_native_001",
    receiptObjectRef: "receipt_provenanced_native_001",
    requestedAt: "2026-09-01T02:50:00Z",
    providerProfile: "fixture-image-provider",
    context: {
      kind: "thread_presentation_media",
      threadId: "thr_provenanced_native_001",
      mediaId: "media_provenanced_native_001",
      provenanceRef: "prov_provenanced_native_001",
    },
  };
}

function provider(calls) {
  const bytes = new TextEncoder().encode("provider-output-native");
  return {
    providerVersion: WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
    providerId: "fixture-image-provider",
    capabilities: ["image"],
    async generate(request) {
      calls.push(structuredClone(request));
      return {
        requestWitness: {
          mediaType: "application/json",
          body: { model: "fixture-image-v1", request: "redacted" },
          secretsRemoved: true,
        },
        result: {
          assetKind: "image",
          bytes,
          mediaType: "image/png",
          width: 1024,
          height: 1024,
          durationMs: null,
          provider: "fixture",
          model: "fixture-image-v1",
          providerRequestId: "provider-request-native-001",
          generatedAt: "2026-09-01T02:51:00Z",
          configuration: { mode: "fixture" },
        },
      };
    },
  };
}

test("Fibre-native generation retains durable provider provenance and exact final-byte integrity", async () => {
  const infra = createMemoryInfraDriver();
  const calls = [];
  const first = await executeProvenancedAssetGenerationJob({
    infra,
    provider: provider(calls),
    job: job(),
    now: () => "2026-09-01T02:52:00Z",
  });

  assert.equal(calls.length, 1);
  assert.equal(first.receipt.receiptVersion, PROVENANCED_ASSET_RECEIPT_VERSION);
  assert.equal(first.receipt.sha256, first.receipt.providerOutputDigest);
  assert.equal(first.generationRecord.generation.providerRequestId, "provider-request-native-001");

  const proof = await verifyProvenancedAssetForPublication({
    infra,
    receipt: first.receipt,
  });
  assert.equal(proof.generationRecord.generation.providerRequestId, "provider-request-native-001");
  assert.equal(proof.receipt.sha256, proof.generationRecord.providerOutputDigest);

  const replay = await executeProvenancedAssetGenerationJob({
    infra,
    provider: provider(calls),
    job: job(),
    now: () => "2026-09-01T02:53:00Z",
  });
  assert.equal(calls.length, 1);
  assert.equal(replay.finalAssetReused, true);
  assert.equal(replay.receipt.sha256, first.receipt.sha256);
  assert.equal(replay.receipt.generationRecordDigest, first.receipt.generationRecordDigest);
});

import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "#infra/memory";
import { ASSET_GENERATION_JOB_VERSION } from "../src/asset-generation-domain.mjs";
import {
  CONTENT_CREDENTIAL_SIGNER_VERSION,
  WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
  generationRecordObjectRef,
  generationRecordObjectRefs,
  normalizeEmbeddedAssetProvenance,
  normalizePromptDisclosurePolicy,
} from "../src/asset-provenance-domain.mjs";
import {
  executeCredentialedAssetGenerationJob,
  verifyCredentialedAssetForPublication,
} from "../src/credentialed-asset-generation-service.mjs";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DELIMITER = "\n--FIBRE-FIXTURE-CREDENTIAL--\n";

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

function job() {
  return {
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: "asset_job_credentialed_1",
    assetKind: "image",
    role: "place",
    variant: "default",
    brief: {
      description: "Generated environmental reconstruction of a neighborhood market.",
      constraints: ["Do not imply documentary evidence."],
    },
    inputReferences: ["presentation_1", "place_1"],
    referenceObjectRefs: [],
    outputObjectRef: "asset_object_credentialed_1",
    receiptObjectRef: "asset_receipt_credentialed_1",
    requestedAt: "2026-08-21T21:10:50Z",
    providerProfile: "presentation-image-default-v1",
    context: {
      kind: "thread_presentation_media",
      threadId: "thr_1",
      presentationId: "presentation_1",
      mediaPacketId: "media_packet_1",
      mediaId: "media_place_market",
      provenanceRef: "prov_generated_reconstruction",
      snapshotObjectRef: "snapshot_1",
      snapshotDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  };
}

function provider({ prefix = "COMPILED" } = {}) {
  return {
    providerVersion: WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION,
    providerId: "fixture-image-provider-v2",
    capabilities: ["image"],
    async generate(request) {
      return {
        requestWitness: {
          mediaType: "application/json",
          body: {
            model: "fixture-image-v2",
            prompt: `${prefix}: ${request.brief.description}`,
            size: "1024x1024",
          },
          secretsRemoved: true,
        },
        result: {
          assetKind: "image",
          bytes: encoder.encode("fixture-provider-raw-image-bytes"),
          mediaType: "image/webp",
          width: 1024,
          height: 1024,
          durationMs: null,
          provider: "fixture",
          model: "fixture-image-v2",
          providerRequestId: "req_fixture_credentialed_1",
          generatedAt: "2026-08-21T21:11:00Z",
          configuration: { quality: "standard" },
        },
      };
    },
  };
}

function fixtureCredentialSigner({ failEmbed = false, onEmbed = null } = {}) {
  return {
    signerVersion: CONTENT_CREDENTIAL_SIGNER_VERSION,
    signerId: "fixture-content-credential-signer",
    format: "fixture-content-credential",
    async embed({ bytes, assertion }) {
      if (onEmbed) onEmbed(assertion);
      if (failEmbed) throw new Error("fixture embed failure");
      const normalized = normalizeEmbeddedAssetProvenance(assertion);
      const manifestBytes = encoder.encode(JSON.stringify(normalized));
      return {
        bytes: concatBytes(bytes, encoder.encode(DELIMITER), manifestBytes),
        format: "fixture-content-credential",
        signerId: "fixture-content-credential-signer",
        manifestDigest: await sha256(manifestBytes),
        embeddedAt: "2026-08-21T21:11:01Z",
      };
    },
    async verify({ bytes }) {
      try {
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
          verifiedAt: "2026-08-21T21:11:02Z",
          failureReason: null,
        };
      } catch (error) {
        return {
          valid: false,
          format: "fixture-content-credential",
          signerId: "fixture-content-credential-signer",
          manifestDigest: null,
          assertion: null,
          verifiedAt: "2026-08-21T21:11:02Z",
          failureReason: error.message,
        };
      }
    },
  };
}

test("credentialed generation retains exact brief/request privately while default embedded provenance is digest-only", async () => {
  const infra = createMemoryInfraDriver();
  const result = await executeCredentialedAssetGenerationJob({
    infra,
    provider: provider(),
    credentialSigner: fixtureCredentialSigner(),
    job: job(),
    now: () => "2026-08-21T21:11:03Z",
  });

  assert.deepEqual(result.generationRecord.semanticBrief, job().brief);
  assert.equal(result.generationRecord.providerRequestWitness.body.prompt.startsWith("COMPILED:"), true);
  assert.notEqual(result.generationRecord.semanticBriefDigest, result.generationRecord.providerRequestDigest);
  assert.notEqual(result.providerOutputDigest, result.finalAssetDigest);
  assert.match(result.generationRecordObjectRef, /^generationrecord_[0-9a-f]{12}$/);
  assert.equal(result.generationRecordObjectRef, generationRecordObjectRef(result.generationRecordDigest));

  const generationStored = await infra.objects.get(result.generationRecordObjectRef);
  const generationText = decoder.decode(generationStored.bytes);
  assert.match(generationText, /Generated environmental reconstruction/);
  assert.match(generationText, /COMPILED:/);

  const assetStored = await infra.objects.get(result.receipt.objectRef);
  const finalText = decoder.decode(assetStored.bytes);
  assert.equal(finalText.includes("Generated environmental reconstruction of a neighborhood market."), false);
  assert.equal(finalText.includes("COMPILED:"), false);
  assert.match(finalText, /generationRecordDigest/);

  const proof = await verifyCredentialedAssetForPublication({
    infra,
    credentialSigner: fixtureCredentialSigner(),
    receipt: result.receipt,
  });
  assert.equal(proof.verification.valid, true);
  assert.equal(proof.verification.assertion.promptDisclosure.mode, "digest_only");
});

test("generation record short ID collision advances to the next deterministic candidate", async () => {
  const baseline = await executeCredentialedAssetGenerationJob({
    infra: createMemoryInfraDriver(),
    provider: provider(),
    credentialSigner: fixtureCredentialSigner(),
    job: job(),
    now: () => "2026-08-21T21:11:03Z",
  });
  const candidates = generationRecordObjectRefs(baseline.generationRecordDigest);
  assert.equal(candidates.length > 1, true);

  const infra = createMemoryInfraDriver();
  const occupied = encoder.encode("different generation record occupying the same 12-hex candidate");
  await infra.objects.putImmutable(candidates[0], occupied, await sha256(occupied), {
    kind: "collision_fixture",
  });

  const result = await executeCredentialedAssetGenerationJob({
    infra,
    provider: provider(),
    credentialSigner: fixtureCredentialSigner(),
    job: job(),
    now: () => "2026-08-21T21:11:03Z",
  });

  assert.equal(result.generationRecordDigest, baseline.generationRecordDigest);
  assert.equal(result.generationRecordObjectRef, candidates[1]);
  assert.match(result.generationRecordObjectRef, /^generationrecord_[0-9a-f]{12}$/);
  assert.equal(result.receipt.generationRecordObjectRef, candidates[1]);
});

test("public_text prompt embedding requires explicit authorization and then embeds both semantic brief and provider request", async () => {
  assert.throws(
    () => normalizePromptDisclosurePolicy({ mode: "public_text", authorizationRef: null }),
    /authorizationRef/,
  );

  const infra = createMemoryInfraDriver();
  const result = await executeCredentialedAssetGenerationJob({
    infra,
    provider: provider(),
    credentialSigner: fixtureCredentialSigner(),
    job: job(),
    promptDisclosurePolicy: { mode: "public_text", authorizationRef: "public_prompt_auth_1" },
    now: () => "2026-08-21T21:11:03Z",
  });
  const assetStored = await infra.objects.get(result.receipt.objectRef);
  const finalText = decoder.decode(assetStored.bytes);
  assert.match(finalText, /Generated environmental reconstruction of a neighborhood market/);
  assert.match(finalText, /COMPILED:/);
  assert.match(finalText, /public_prompt_auth_1/);
});

test("provider request witness digest changes when provider compilation changes while semantic brief digest remains stable", async () => {
  const first = await executeCredentialedAssetGenerationJob({
    infra: createMemoryInfraDriver(),
    provider: provider({ prefix: "COMPILED-A" }),
    credentialSigner: fixtureCredentialSigner(),
    job: job(),
    now: () => "2026-08-21T21:11:03Z",
  });
  const second = await executeCredentialedAssetGenerationJob({
    infra: createMemoryInfraDriver(),
    provider: provider({ prefix: "COMPILED-B" }),
    credentialSigner: fixtureCredentialSigner(),
    job: job(),
    now: () => "2026-08-21T21:11:03Z",
  });
  assert.equal(first.generationRecord.semanticBriefDigest, second.generationRecord.semanticBriefDigest);
  assert.notEqual(first.generationRecord.providerRequestDigest, second.generationRecord.providerRequestDigest);
});

test("credential corruption blocks publication even when a caller supplies a matching final-byte digest", async () => {
  const infra = createMemoryInfraDriver();
  const result = await executeCredentialedAssetGenerationJob({
    infra,
    provider: provider(),
    credentialSigner: fixtureCredentialSigner(),
    job: job(),
    now: () => "2026-08-21T21:11:03Z",
  });
  const stored = await infra.objects.get(result.receipt.objectRef);
  const tamperedBytes = stored.bytes.slice();
  tamperedBytes[tamperedBytes.length - 1] ^= 1;
  const tamperedDigest = await sha256(tamperedBytes);
  await infra.objects.putImmutable("asset_object_tampered", tamperedBytes, tamperedDigest, { kind: "tampered_fixture" });
  const tamperedReceipt = {
    ...structuredClone(result.receipt),
    objectRef: "asset_object_tampered",
    sha256: tamperedDigest,
  };
  await assert.rejects(
    () => verifyCredentialedAssetForPublication({
      infra,
      credentialSigner: fixtureCredentialSigner(),
      receipt: tamperedReceipt,
    }),
    /content credential verification failed/,
  );
});

test("generation record is committed before credential embedding and no final asset/receipt appears if embedding fails", async () => {
  const infra = createMemoryInfraDriver();
  let capturedGenerationRecordDigest = null;
  await assert.rejects(
    () => executeCredentialedAssetGenerationJob({
      infra,
      provider: provider(),
      credentialSigner: fixtureCredentialSigner({
        failEmbed: true,
        onEmbed: (assertion) => { capturedGenerationRecordDigest = assertion.generationRecordDigest; },
      }),
      job: job(),
      now: () => "2026-08-21T21:11:03Z",
    }),
    /fixture embed failure/,
  );
  assert.equal(await infra.objects.head(job().outputObjectRef), null);
  assert.equal(await infra.objects.head(job().receiptObjectRef), null);
  assert.match(capturedGenerationRecordDigest, /^sha256:[0-9a-f]{64}$/);
  const generationRecordRef = generationRecordObjectRef(capturedGenerationRecordDigest);
  assert.match(generationRecordRef, /^generationrecord_[0-9a-f]{12}$/);
  assert.notEqual(await infra.objects.head(generationRecordRef), null);
});

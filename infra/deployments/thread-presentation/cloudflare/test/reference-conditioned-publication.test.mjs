import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createMemoryInfraDriver } from "#infra/providers/local";
import {
  createAssetGenerationCompletion,
  createAssetGenerationRuntime,
} from "#services/asset-generator/src/index.mjs";
import { createPresentationAssetCompletionService } from "#services/world-kernel/src/presentation-asset-completion-service.mjs";
import { createPresentationAssetDemandService } from "#services/world-kernel/src/presentation-asset-demand-service.mjs";
import { planThreadPresentationAssetSlots } from "#services/world-kernel/src/thread-presentation-asset-planner.mjs";
import { createThreadPresentationAssetPublisher } from "#services/world-kernel/src/thread-presentation-asset-publisher.mjs";
import { createThreadPresentationIdentityMediaRewriteService } from "#services/world-kernel/src/thread-presentation-identity-media-rewrite-service.mjs";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";
import {
  selectContentCredentialIntegration,
  selectImageIntegration,
  selectImageProviderProfile,
} from "../../../integration-selection.mjs";
import {
  parseDeploymentManifest,
  resolveServiceDeployment,
} from "../../../manifest.mjs";

const THREAD_ID = "thr_pr39_g2_04";
const CHANNEL_ID = `presentation:${THREAD_ID}`;
const CANONICAL_ROOT = "asset_slice_f_canonical_visual_identity_root";
const PRODUCTION_SIGNER_ID = "fibre-c2pa-production-v1";
const MANIFEST_DIGEST = `sha256:${"e".repeat(64)}`;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function sha256(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get() { return null; } },
    async json() { return payload; },
  };
}

function binaryResponse(bytes, mediaType = "image/png") {
  const copied = bytes.slice();
  return {
    ok: true,
    status: 200,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-type" ? mediaType : null;
      },
    },
    async arrayBuffer() {
      return copied.buffer.slice(copied.byteOffset, copied.byteOffset + copied.byteLength);
    },
  };
}

async function deployment() {
  const yaml = await readFile(new URL("../../../environments/cloudflare.yaml", import.meta.url), "utf8");
  return parseDeploymentManifest(yaml);
}

async function admittedPresentationBundle() {
  const base = new URL("../../../../../fixtures/thread-presentation/can-tho/", import.meta.url);
  const presentation = JSON.parse(await readFile(new URL("presentation.json", base), "utf8"));
  const media = JSON.parse(await readFile(new URL("media.json", base), "utf8"));
  const provenance = JSON.parse(await readFile(new URL("provenance.json", base), "utf8"));

  presentation.schemaVersion = "thread-presentation-packet-v0.2";
  presentation.manifest = {
    ...presentation.manifest,
    lifecycleStatus: "active",
    fixture: false,
    generatedAt: "2026-08-30T18:20:00Z",
  };
  presentation.civilIdentity = {
    fibreIdentityNumber: "7K3M-2Q-8W5R",
    registrationId: "registration_slice_f",
    registeredAt: "2026-08-30T18:00:00Z",
    birthEventRef: "birth_slice_f",
    worldRef: "world_slice_f",
    issuer: "fibre_civil_registry",
    sourceReferences: ["registration_slice_f", "birth_slice_f", "world_slice_f"],
    provenanceRef: "prov_slice_f_civil",
  };
  presentation.visualIdentity = {
    projectionVersion: "thread-visual-identity-projection-v0.1",
    authority: "authorized_embodiment_projection",
    embodimentId: "embodiment_slice_f_visual_identity",
    embodimentRevision: 2,
    specificationDigest: `sha256:${"a".repeat(64)}`,
    subjectDescription: "A stable canonical facial identity with explicit face geometry, eye spacing, brow asymmetry, nose proportions, mouth shape, jaw and chin structure, hairline, skin detail, ear landmarks, build, and a small distinctive cheek mark.",
    renderDescription: "Natural photographic rendering that preserves the same recognizable person across ordinary aging, expression, grooming, clothing, weight variation, and scene changes without glamour or identity drift.",
    sourceReferences: ["embodiment_slice_f_visual_identity", "visual_identity_spec_slice_f"],
    permissionReferences: ["permission_slice_f_visual_identity"],
    referenceObjectRefs: [CANONICAL_ROOT],
    provenanceRef: "prov_slice_f_visual_identity",
  };
  presentation.identityCard = null;
  provenance.entries.push(
    {
      provenanceId: "prov_slice_f_civil",
      kind: "authoritative_fact",
      sourceReferences: ["registration_slice_f", "birth_slice_f", "world_slice_f"],
      note: "Authoritative civil identity projection for Slice F.",
    },
    {
      provenanceId: "prov_slice_f_visual_identity",
      kind: "fibre_projection",
      sourceReferences: [
        "embodiment_slice_f_visual_identity",
        "visual_identity_spec_slice_f",
        "permission_slice_f_visual_identity",
        CANONICAL_ROOT,
      ],
      note: "Admitted canonical visual identity projection for Slice F.",
    },
  );
  return { presentation, media, provenance };
}

function createBflFixtureFetch({ expectedReferenceBase64 }) {
  const calls = [];
  const providerBytes = encoder.encode("slice-f-bfl-derived-image-bytes");
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (init.method === "POST") {
      const body = JSON.parse(init.body);
      assert.equal(body.input_image, expectedReferenceBase64);
      assert.equal(body.input_image_2, undefined);
      assert.match(body.prompt, /canonical reference image as the identity anchor/i);
      return jsonResponse({
        id: "bfl_slice_f_reference_task",
        polling_url: "https://api.bfl.ai/v1/get_result?id=bfl_slice_f_reference_task",
      });
    }
    if (url.startsWith("https://api.bfl.ai/")) {
      return jsonResponse({
        status: "Ready",
        result: { sample: "https://delivery.eu.bfl.ai/slice-f-reference.png" },
      });
    }
    if (url === "https://delivery.eu.bfl.ai/slice-f-reference.png") {
      return binaryResponse(providerBytes);
    }
    throw new Error(`unexpected BFL fixture URL ${url}`);
  };
  return { calls, providerBytes, fetchImpl };
}

function createC2paFixtureFetch() {
  const calls = [];
  let embeddedAssertion = null;
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    assert.equal(init.headers.Authorization, "Bearer slice-f-c2pa-token");
    const body = JSON.parse(init.body);
    if (url.endsWith("/embed")) {
      embeddedAssertion = structuredClone(body.assertion);
      const raw = Buffer.from(body.bytesBase64, "base64");
      const credentialed = Buffer.concat([raw, Buffer.from("--slice-f-c2pa--")]);
      return jsonResponse({
        bytesBase64: credentialed.toString("base64"),
        format: "c2pa",
        signerId: PRODUCTION_SIGNER_ID,
        manifestDigest: MANIFEST_DIGEST,
        embeddedAt: "2026-08-30T18:31:00Z",
      });
    }
    if (url.endsWith("/verify")) {
      assert.ok(embeddedAssertion, "C2PA verify must follow embed in the Slice F fixture");
      return jsonResponse({
        valid: true,
        format: "c2pa",
        signerId: PRODUCTION_SIGNER_ID,
        manifestDigest: MANIFEST_DIGEST,
        assertion: structuredClone(embeddedAssertion),
        verifiedAt: "2026-08-30T18:31:01Z",
        failureReason: null,
        trust: { policy: "c2pa_trust_list", trusted: true },
      });
    }
    throw new Error(`unexpected C2PA fixture URL ${url}`);
  };
  return { calls, fetchImpl };
}

test("Slice F reference-capable generation converges through C2PA verification into one admitted media.ready publication", async () => {
  const infra = createMemoryInfraDriver();
  const presentationServer = createThreadPresentationServer({ infra });
  await presentationServer.publishSnapshot({
    channelId: CHANNEL_ID,
    objectRef: "snapshot_slice_f_admitted_visual_identity",
    snapshotVersion: "slice-f-admitted-visual-identity",
    bundle: await admittedPresentationBundle(),
    expectedSequence: 0,
    catalog: { publiclyVisible: true },
  });

  const rootBytes = encoder.encode("slice-f-canonical-root-image-bytes");
  const rootDigest = await sha256(rootBytes);
  await infra.objects.putImmutable(CANONICAL_ROOT, rootBytes, rootDigest, {
    kind: "credentialed_generated_media",
    mediaType: "image/png",
    role: "canonical_visual_identity_reference",
  });

  const identityMedia = createThreadPresentationIdentityMediaRewriteService({ presentationServer });
  const issued = await identityMedia.ensureOfficialIdentityMedia({
    channelId: CHANNEL_ID,
    issuedAt: "2026-08-30T18:25:00Z",
  });
  const current = await presentationServer.getSnapshot(CHANNEL_ID);
  const slotPlan = planThreadPresentationAssetSlots({
    bundle: {
      presentation: current.snapshot.presentation,
      media: current.snapshot.media,
      provenance: current.snapshot.provenance,
    },
    snapshotObjectRef: current.pointer.objectRef,
    snapshotDigest: current.pointer.snapshotDigest,
  });
  const official = slotPlan.slots.find((slot) => slot.mediaId === issued.identityCard.officialPhotoMediaRef);
  assert.ok(official);
  assert.equal(official.status, "missing");
  assert.deepEqual(official.referenceObjectRefs, [CANONICAL_ROOT]);

  const manifest = await deployment();
  const assetDeployment = resolveServiceDeployment(manifest, "asset-generator");
  const providerProfile = selectImageProviderProfile(assetDeployment, {
    requiresReferenceObjects: official.referenceObjectRefs.length > 0,
  });
  assert.equal(providerProfile, "bfl-flux-2-pro-v1");

  const demandService = createPresentationAssetDemandService({ infra });
  const reconciled = await demandService.reconcile({
    scope: { entityKind: "thread", entityRef: THREAD_ID },
    slots: [official],
    requestedAt: "2026-08-30T18:30:00Z",
    providerProfile,
  });
  assert.equal(reconciled.reconciliation.jobs.length, 1);
  const [job] = reconciled.reconciliation.jobs;
  assert.equal(job.providerProfile, "bfl-flux-2-pro-v1");
  assert.deepEqual(job.referenceObjectRefs, [CANONICAL_ROOT]);

  const bfl = createBflFixtureFetch({
    expectedReferenceBase64: Buffer.from(rootBytes).toString("base64"),
  });
  const c2pa = createC2paFixtureFetch();
  const provider = selectImageIntegration(assetDeployment.integrations[providerProfile], {
    environment: { BFL_API_KEY: "slice-f-bfl-key" },
    fetchImpl: bfl.fetchImpl,
  });
  const signer = selectContentCredentialIntegration(assetDeployment.integrations.contentCredentials, {
    environment: {
      C2PA_SIGNER_URL: "https://signer.example.test",
      C2PA_SIGNER_ID: PRODUCTION_SIGNER_ID,
      C2PA_TRUST_POLICY: "c2pa_trust_list",
      C2PA_SIGNER_TOKEN: "slice-f-c2pa-token",
    },
    fetchImpl: c2pa.fetchImpl,
  });
  assert.equal(signer.trustPolicy, "c2pa_trust_list");

  const runtime = createAssetGenerationRuntime({
    infra,
    provider,
    credentialSigner: signer,
  });
  const generated = await runtime.execute(job);
  assert.equal(generated.receipt.role, "official_id_photo");
  assert.equal(generated.receipt.credential.format, "c2pa");
  assert.equal(generated.receipt.credential.signerId, PRODUCTION_SIGNER_ID);
  assert.notEqual(generated.providerOperationObjectRef, null, "accepted BFL task must be durably checkpointed");

  const generationRecordStored = await infra.objects.get(generated.generationRecordObjectRef);
  const generationRecord = JSON.parse(decoder.decode(generationRecordStored.bytes));
  assert.deepEqual(generationRecord.providerRequestWitness.body.referenceInputs, [
    {
      inputField: "input_image",
      objectRef: CANONICAL_ROOT,
      digest: rootDigest,
      mediaType: "image/png",
      kind: "credentialed_generated_media",
    },
  ]);
  assert.equal(
    JSON.stringify(generationRecord.providerRequestWitness).includes(Buffer.from(rootBytes).toString("base64")),
    false,
    "durable provider witness must retain reference identity/digest but not copy reference bytes",
  );
  assert.equal(bfl.calls.filter((call) => call.init.method === "POST").length, 1);

  const publisher = createThreadPresentationAssetPublisher({
    infra,
    credentialSigner: signer,
    presentationServer,
  });
  const completions = createPresentationAssetCompletionService({
    infra,
    credentialSigner: signer,
    async publishReady({ scope, receipt }) {
      assert.deepEqual(scope, { entityKind: "thread", entityRef: THREAD_ID });
      return publisher.publishReady({ receipt, channelId: CHANNEL_ID });
    },
  });
  const completion = createAssetGenerationCompletion({
    jobId: generated.receipt.jobId,
    receiptObjectRef: generated.receiptObjectRef,
    receiptDigest: generated.receiptDigest,
  });
  const accepted = await completions.consume(completion);
  assert.equal(accepted.handled, true);
  assert.equal(accepted.duplicate, false);
  assert.equal(accepted.stale, false);
  assert.equal(accepted.demand.state, "ready");
  assert.equal(accepted.proof.verification.valid, true);
  assert.equal(accepted.publication.event.kind, "media.ready");
  assert.equal(accepted.publication.event.payload.mediaId, issued.identityCard.officialPhotoMediaRef);
  assert.equal(accepted.publication.event.payload.objectRef, generated.receipt.objectRef);

  const publicMedia = await infra.catalog.get(`media:${generated.receipt.objectRef}`);
  assert.equal(publicMedia.publiclyVisible, true);
  assert.equal(publicMedia.identityCredentialMedia, true);
  assert.equal(publicMedia.threadId, THREAD_ID);
  assert.equal(publicMedia.mediaId, issued.identityCard.officialPhotoMediaRef);
  assert.equal(publicMedia.digest, generated.receipt.sha256);
  assert.equal(publicMedia.provenanceClass, "generated_reconstruction");

  const eventsAfterFirst = await presentationServer.readEvents({ channelId: CHANNEL_ID, after: 0, limit: 20 });
  assert.equal(eventsAfterFirst.filter((event) => event.kind === "media.ready").length, 1);

  const duplicate = await completions.consume(completion);
  assert.equal(duplicate.handled, true);
  assert.equal(duplicate.duplicate, true);
  const eventsAfterDuplicate = await presentationServer.readEvents({ channelId: CHANNEL_ID, after: 0, limit: 20 });
  assert.equal(eventsAfterDuplicate.filter((event) => event.kind === "media.ready").length, 1);
  assert.ok(c2pa.calls.some((call) => call.url.endsWith("/embed")));
  assert.ok(c2pa.calls.some((call) => call.url.endsWith("/verify")));

  const c2paBodies = c2pa.calls.map((call) => JSON.parse(call.init.body));
  assert.equal(
    JSON.stringify(c2paBodies).includes("slice-f-c2pa-token"),
    false,
    "C2PA authorization token must never enter signer request bodies",
  );
  assert.equal(
    JSON.stringify({
      generationRecord,
      receipt: generated.receipt,
      proof: accepted.proof,
      publicMedia,
      presentationEvents: eventsAfterDuplicate,
    }).includes("slice-f-c2pa-token"),
    false,
    "C2PA authorization token must never enter persisted generation, credential, catalog, or presentation provenance",
  );
});
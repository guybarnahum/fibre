import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { createThreadPresentationVisualPublicationReconciler } from "#services/thread-presentation/src/visual-publication-reconciler.mjs";
import { createVisualPublicationWriteApi } from "#services/thread-presentation/src/http/visual-publication-write-api.mjs";
import { createPresentationAssetDemandService } from "#services/world-kernel/src/presentation-asset-demand-service.mjs";
import {
  embodimentId,
  embodimentSpecificationDigest,
} from "#services/world-kernel/src/embodiment-domain.mjs";
import { planThreadPresentationAssetSlots } from "#services/world-kernel/src/thread-presentation-asset-planner.mjs";
import { createThreadPresentationEmbodimentRewriteService } from "#services/world-kernel/src/thread-presentation-embodiment-rewrite-service.mjs";
import { createThreadPresentationIdentityMediaRewriteService } from "#services/world-kernel/src/thread-presentation-identity-media-rewrite-service.mjs";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";
import { createThreadPresentationVisualHttpBoundary } from "./thread-presentation-visual-http-boundary.mjs";

const THREAD_ID = "thr_slice_b_remote_visual_handoff";
const CHANNEL_ID = `presentation:${THREAD_ID}`;
const ROOT_OBJECT_REF = "asset_slice_b_canonical_visual_root";
const PRIVATE_TOKEN = "slice-b-private-token";

async function initialPresentationBundle() {
  const base = new URL("../../../../fixtures/thread-presentation/can-tho/", import.meta.url);
  const presentation = JSON.parse(await readFile(new URL("presentation.json", base), "utf8"));
  const media = JSON.parse(await readFile(new URL("media.json", base), "utf8"));
  const provenance = JSON.parse(await readFile(new URL("provenance.json", base), "utf8"));

  presentation.schemaVersion = "thread-presentation-packet-v0.2";
  presentation.manifest = {
    ...presentation.manifest,
    threadId: THREAD_ID,
    presentationId: "presentation_slice_b_remote_visual_handoff",
    lifecycleStatus: "active",
    fixture: false,
    generatedAt: "2026-08-31T00:40:00Z",
  };
  presentation.civilIdentity = {
    fibreIdentityNumber: "7K3M-2Q-8W5R",
    registrationId: "registration_slice_b",
    registeredAt: "2026-08-31T00:35:00Z",
    birthEventRef: "birth_slice_b",
    worldRef: "world_slice_b",
    issuer: "fibre_civil_registry",
    sourceReferences: ["registration_slice_b", "birth_slice_b", "world_slice_b"],
    provenanceRef: "prov_slice_b_civil",
  };
  presentation.visualIdentity = null;
  presentation.identityCard = null;
  media.threadId = THREAD_ID;
  media.generatedAt = "2026-08-31T00:40:00Z";
  provenance.threadId = THREAD_ID;
  provenance.generatedAt = "2026-08-31T00:40:00Z";
  provenance.entries = [
    ...provenance.entries.filter((entry) => entry.provenanceId !== "prov_slice_b_civil"),
    {
      provenanceId: "prov_slice_b_civil",
      kind: "authoritative_fact",
      sourceReferences: ["registration_slice_b", "birth_slice_b", "world_slice_b"],
      note: "Authoritative civil identity projection for Slice B handoff proof.",
    },
  ];
  return { presentation, media, provenance };
}

function admittedEmbodiment() {
  const specification = {
    subject: {
      partyId: THREAD_ID,
      description: "A person with a softly angular oval face, warm medium-brown skin with natural texture, wide-set dark brown almond-shaped eyes, straight brows with a slightly higher left arch, a narrow straight nose with rounded tip, defined cupid's bow, tapered jaw, rounded chin, thick dark-brown wavy hair, and a small pale diagonal scar above the outer left eyebrow.",
    },
    method: "canonical synthetic portrait specification",
    description: "Preserve natural facial asymmetry, hairline, ear landmarks, skin detail, and stable proportions. Use ordinary photographic perspective and neutral presentation so the canonical identity remains recognizable across later age, expression, clothing, grooming, and scene variation.",
    model: "replaceable-renderer",
  };
  const id = embodimentId({ threadId: THREAD_ID, kind: "portrait", lineage: "canonical" });
  return {
    embodimentId: id,
    revision: 2,
    supersedesRevision: 1,
    threadId: THREAD_ID,
    kind: "portrait",
    representationKind: "synthetic_generation",
    truthStatus: "synthetic_representation_not_historical_evidence",
    rightsBasis: "thread_self_owned",
    permissionReferences: [],
    sourceReferences: [`evt_seed_${THREAD_ID}`],
    specification,
    specificationDigest: embodimentSpecificationDigest(specification),
    respecification: null,
    status: "available",
    unavailableReason: null,
    asset: {
      assetRef: `asset://${ROOT_OBJECT_REF}`,
      referenceObjectRef: ROOT_OBJECT_REF,
      sha256: `sha256:${"a".repeat(64)}`,
      mediaType: "image/webp",
      width: 1024,
      height: 1024,
      durationMs: null,
    },
    visibility: "public",
    recordedAt: "2026-08-31T00:45:00Z",
  };
}

test("World hands admitted Embodiment to deployed Presentation contract without shared World storage", async () => {
  const infra = createMemoryInfraDriver();
  const presentationServer = createThreadPresentationServer({ infra });
  await presentationServer.publishSnapshot({
    channelId: CHANNEL_ID,
    objectRef: "snapshot_slice_b_genesis_projection",
    snapshotVersion: "slice-b-genesis",
    bundle: await initialPresentationBundle(),
    expectedSequence: 0,
    catalog: { publiclyVisible: true },
  });

  const reconciler = createThreadPresentationVisualPublicationReconciler({
    presentationServer,
    infra,
    selectProviderProfile({ requiresReferenceObjects }) {
      assert.equal(requiresReferenceObjects, true);
      return "bfl-flux-2-pro-v1";
    },
    createDemandService: createPresentationAssetDemandService,
    createVisualRewrite: createThreadPresentationEmbodimentRewriteService,
    createIdentityRewrite: createThreadPresentationIdentityMediaRewriteService,
    planSlots: planThreadPresentationAssetSlots,
  });
  const api = createVisualPublicationWriteApi({ reconciler, privateToken: PRIVATE_TOKEN });
  const boundary = createThreadPresentationVisualHttpBoundary({
    baseUrl: "https://presentation.example",
    privateToken: PRIVATE_TOKEN,
    fetchImpl(url, init) {
      return api.fetch(new Request(url, init));
    },
  });
  const embodiment = admittedEmbodiment();

  const first = await boundary.reconcileAvailableEmbodiment({
    threadId: THREAD_ID,
    embodiment,
    observedAt: "2026-08-31T00:50:00Z",
  });
  assert.equal(first.complete, false);
  assert.equal(first.stage, "official_photo_pending");
  assert.equal(first.detail.providerProfile, "bfl-flux-2-pro-v1");

  const current = await presentationServer.getSnapshot(CHANNEL_ID);
  assert.deepEqual(current.snapshot.presentation.visualIdentity.referenceObjectRefs, [ROOT_OBJECT_REF]);
  assert.equal(current.snapshot.presentation.visualIdentity.embodimentId, embodiment.embodimentId);
  assert.ok(current.snapshot.presentation.identityCard);
  const photoMediaId = current.snapshot.presentation.identityCard.officialPhotoMediaRef;
  const officialPhoto = current.snapshot.media.assets.find((asset) => asset.mediaId === photoMediaId);
  assert.ok(officialPhoto);
  assert.equal(officialPhoto.status, "placeholder");

  const workflow = await infra.workflows.get("asset_generation_v1", first.detail.jobId);
  assert.ok(workflow);
  assert.equal(workflow.status, "queued");
  assert.deepEqual(workflow.input.referenceObjectRefs, [ROOT_OBJECT_REF]);
  assert.equal(workflow.input.context.kind, "thread_presentation_media");
  assert.equal(workflow.input.context.threadId, THREAD_ID);
  assert.equal(workflow.input.context.mediaId, photoMediaId);

  const replay = await boundary.reconcileAvailableEmbodiment({
    threadId: THREAD_ID,
    embodiment,
    observedAt: "2026-08-31T00:51:00Z",
  });
  assert.equal(replay.complete, false);
  assert.equal(replay.stage, "official_photo_pending");
  assert.equal(replay.detail.jobId, first.detail.jobId);
  assert.equal(replay.detail.visualReused, true);
  assert.equal(replay.detail.identityReused, true);
});
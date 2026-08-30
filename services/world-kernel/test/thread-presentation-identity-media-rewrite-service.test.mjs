import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { createPresentationAssetDemandService } from "../src/presentation-asset-demand-service.mjs";
import { planThreadPresentationAssetSlots } from "../src/thread-presentation-asset-planner.mjs";
import { createThreadPresentationAssetDemandTrigger } from "../src/thread-presentation-asset-demand.mjs";
import {
  createThreadPresentationIdentityMediaRewriteService,
} from "../src/thread-presentation-identity-media-rewrite-service.mjs";
import { createThreadPresentationServer } from "../src/thread-presentation-server.mjs";
import { CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS } from "../src/visual-identity-reference-domain.mjs";

const THREAD_ID = "thr_pr39_g2_04";
const CHANNEL_ID = `presentation:${THREAD_ID}`;
const CANONICAL_ROOT = "asset_visual_identity_root_slice_e";

async function visualIdentityBundle() {
  const base = new URL("../../../fixtures/thread-presentation/can-tho/", import.meta.url);
  const presentation = JSON.parse(await readFile(new URL("presentation.json", base), "utf8"));
  const media = JSON.parse(await readFile(new URL("media.json", base), "utf8"));
  const provenance = JSON.parse(await readFile(new URL("provenance.json", base), "utf8"));

  presentation.schemaVersion = "thread-presentation-packet-v0.2";
  presentation.manifest = {
    ...presentation.manifest,
    lifecycleStatus: "active",
    fixture: false,
    generatedAt: "2026-08-30T05:30:00Z",
  };
  presentation.civilIdentity = {
    fibreIdentityNumber: "7K3M-2Q-8W5R",
    registrationId: "registration_slice_e",
    registeredAt: "2026-08-30T05:10:00Z",
    birthEventRef: "birth_slice_e",
    worldRef: "world_slice_e",
    issuer: "fibre_civil_registry",
    sourceReferences: ["registration_slice_e", "birth_slice_e", "world_slice_e"],
    provenanceRef: "prov_slice_e_civil",
  };
  presentation.visualIdentity = {
    projectionVersion: "thread-visual-identity-projection-v0.1",
    authority: "authorized_embodiment_projection",
    embodimentId: "embodiment_slice_e_visual_identity",
    embodimentRevision: 2,
    specificationDigest: `sha256:${"a".repeat(64)}`,
    subjectDescription: "A stable canonical facial identity with explicitly recorded proportions, asymmetries, hairline, skin detail, eye spacing, nose geometry, jaw shape, ear landmarks, and a small distinctive cheek mark.",
    renderDescription: "Natural photographic rendering that preserves the same person's recognizable identity across ordinary aging, expression, clothing, grooming, and scene changes without glamour or stylization drift.",
    sourceReferences: ["embodiment_slice_e_visual_identity", "visual_identity_spec_slice_e"],
    permissionReferences: ["permission_slice_e_visual_identity"],
    referenceObjectRefs: [CANONICAL_ROOT],
    provenanceRef: "prov_slice_e_visual_identity",
  };
  presentation.identityCard = null;
  provenance.entries.push(
    {
      provenanceId: "prov_slice_e_civil",
      kind: "authoritative_fact",
      sourceReferences: ["registration_slice_e", "birth_slice_e", "world_slice_e"],
      note: "Authoritative civil identity projection for Slice E.",
    },
    {
      provenanceId: "prov_slice_e_visual_identity",
      kind: "fibre_projection",
      sourceReferences: [
        "embodiment_slice_e_visual_identity",
        "visual_identity_spec_slice_e",
        "permission_slice_e_visual_identity",
        CANONICAL_ROOT,
      ],
      note: "Admitted canonical visual identity projection for Slice E.",
    },
  );

  return { presentation, media, provenance };
}

async function fixture() {
  const infra = createMemoryInfraDriver();
  const server = createThreadPresentationServer({ infra });
  const bundle = await visualIdentityBundle();
  await server.publishSnapshot({
    channelId: CHANNEL_ID,
    objectRef: "snapshot_slice_e_visual_identity",
    snapshotVersion: "slice-e-visual-identity",
    bundle,
    expectedSequence: 0,
    catalog: {
      publiclyVisible: true,
      genesisId: "genesis_slice_e",
      publicationDigest: `sha256:${"b".repeat(64)}`,
      projectionKind: "embodiment_visual_identity",
      visualIdentityEmbodimentId: presentationVisualId(bundle),
    },
  });
  const rewrite = createThreadPresentationIdentityMediaRewriteService({ presentationServer: server });
  return { infra, server, bundle, rewrite };
}

function presentationVisualId(bundle) {
  return bundle.presentation.visualIdentity.embodimentId;
}

function asBundle(snapshot) {
  return {
    presentation: snapshot.presentation,
    media: snapshot.media,
    provenance: snapshot.provenance,
  };
}

test("Slice E issues a bounded public Fibre Identity Card and official-photo placeholder from admitted authority", async () => {
  const current = await fixture();
  const before = await current.server.getSnapshot(CHANNEL_ID);
  const result = await current.rewrite.ensureOfficialIdentityMedia({
    channelId: CHANNEL_ID,
    issuedAt: "2026-08-30T05:40:00Z",
  });

  assert.equal(result.rewritten, true);
  assert.equal(result.reused, false);
  assert.equal(result.identityCard.credentialVersion, "fibre-identity-card-credential-v0.1");
  assert.equal(result.identityCard.registrationId, "registration_slice_e");
  assert.equal(result.identityCard.visibility, "public");
  assert.equal(result.identityCard.status, "active");
  assert.equal(result.identityCard.dateField.kind, "birth_date");
  assert.equal(result.identityCard.dateField.value, "2004-08-20");
  assert.ok(result.identityCard.sourceReferences.includes(CANONICAL_ROOT));
  assert.ok(result.identityCard.sourceReferences.includes("prov_slice_e_visual_identity"));

  assert.equal(result.officialPhoto.mediaId, result.identityCard.officialPhotoMediaRef);
  assert.equal(result.officialPhoto.role, "official_id_photo");
  assert.equal(result.officialPhoto.status, "placeholder");
  assert.equal(result.officialPhoto.locator, null);
  assert.equal(result.officialPhoto.generation, null);

  const after = await current.server.getSnapshot(CHANNEL_ID);
  assert.notEqual(after.pointer.objectRef, before.pointer.objectRef);
  assert.deepEqual(after.snapshot.presentation.visualIdentity, before.snapshot.presentation.visualIdentity);
  assert.equal(after.snapshot.media.assets.length, before.snapshot.media.assets.length + 1);
  assert.deepEqual(after.snapshot.presentation.identityCard, result.identityCard);

  const catalog = await current.infra.catalog.get(CHANNEL_ID);
  assert.equal(catalog.publiclyVisible, true, "identity-media rewrite preserves public discovery state");
  assert.equal(catalog.genesisId, "genesis_slice_e");
  assert.equal(catalog.publicationDigest, `sha256:${"b".repeat(64)}`);
  assert.equal(catalog.projectionKind, "identity_card_official_photo");
  assert.equal(catalog.identityCardCredentialId, result.identityCard.credentialId);
  assert.equal(catalog.officialPhotoMediaId, result.identityCard.officialPhotoMediaRef);
});

test("identity-media reconciliation is idempotent and does not mint a second credential/root binding", async () => {
  const current = await fixture();
  const first = await current.rewrite.ensureOfficialIdentityMedia({
    channelId: CHANNEL_ID,
    issuedAt: "2026-08-30T05:40:00Z",
  });
  const firstPointer = (await current.server.getSnapshot(CHANNEL_ID)).pointer;
  const replay = await current.rewrite.ensureOfficialIdentityMedia({
    channelId: CHANNEL_ID,
    issuedAt: "2026-08-30T06:40:00Z",
  });
  const replayPointer = (await current.server.getSnapshot(CHANNEL_ID)).pointer;

  assert.equal(first.rewritten, true);
  assert.equal(replay.rewritten, false);
  assert.equal(replay.reused, true);
  assert.equal(replay.identityCard.credentialId, first.identityCard.credentialId);
  assert.equal(replay.officialPhoto.mediaId, first.officialPhoto.mediaId);
  assert.deepEqual(replayPointer, firstPointer);
});

test("official-photo demand carries the canonical root, reference age, credential witness, and issuance-derived target age", async () => {
  const current = await fixture();
  const issuance = await current.rewrite.ensureOfficialIdentityMedia({
    channelId: CHANNEL_ID,
    issuedAt: "2026-08-30T05:40:00Z",
  });
  const demandService = createPresentationAssetDemandService({ infra: current.infra });
  const trigger = createThreadPresentationAssetDemandTrigger({
    presentationServer: current.server,
    demandService,
  });
  const demand = await trigger.reconcileCurrent({
    channelId: CHANNEL_ID,
    requestedAt: "2026-08-30T05:41:00Z",
  });
  const official = demand.demand.reconciliation.jobs.find((job) => job.role === "official_id_photo");

  assert.ok(official, "official identity-photo placeholder must produce durable asset demand");
  assert.deepEqual(official.referenceObjectRefs, [CANONICAL_ROOT]);
  assert.equal(official.context.referenceAgeYears, CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS);
  assert.equal(official.context.referenceAgeYears, 25);
  assert.equal(official.context.targetAgeYears, 22);
  assert.equal(official.context.identityCardCredentialId, issuance.identityCard.credentialId);
  assert.equal(official.context.identityCardRevision, 1);
  assert.ok(official.inputReferences.includes(issuance.identityCard.credentialId));
  assert.ok(official.inputReferences.includes(CANONICAL_ROOT));
  assert.match(official.brief.description, /22 years old/);
  assert.match(official.brief.description, /normalized reference age 25/);
});

test("self-depicting memory demand uses the same canonical root and event-derived age while place imagery stays reference-free", async () => {
  const current = await fixture();
  await current.rewrite.ensureOfficialIdentityMedia({
    channelId: CHANNEL_ID,
    issuedAt: "2026-08-30T05:40:00Z",
  });
  const admitted = await current.server.getSnapshot(CHANNEL_ID);
  const plan = planThreadPresentationAssetSlots({
    bundle: asBundle(admitted.snapshot),
    snapshotObjectRef: admitted.pointer.objectRef,
    snapshotDigest: admitted.pointer.snapshotDigest,
  });
  const memory = plan.slots.find((slot) => slot.mediaId === "media_memory_tomatoes");
  const place = plan.slots.find((slot) => slot.mediaId === "media_place_market");

  assert.equal(memory.status, "missing");
  assert.deepEqual(memory.referenceObjectRefs, [CANONICAL_ROOT]);
  assert.equal(memory.context.referenceAgeYears, 25);
  assert.equal(memory.context.targetAgeYears, 10);
  assert.ok(memory.inputReferences.includes("epi_thr_pr39_g2_04_0004"));
  assert.match(memory.brief.description, /10 years old/);
  assert.match(memory.brief.constraints.join(" "), /participation record establishes that the Thread is present/);

  assert.equal(place.status, "missing");
  assert.deepEqual(place.referenceObjectRefs, []);
  assert.equal(Object.hasOwn(place.context, "referenceAgeYears"), false);
});

test("memory ownership alone never implies that the Thread is depicted", async () => {
  const current = await fixture();
  await current.rewrite.ensureOfficialIdentityMedia({
    channelId: CHANNEL_ID,
    issuedAt: "2026-08-30T05:40:00Z",
  });
  const admitted = await current.server.getSnapshot(CHANNEL_ID);
  const bundle = structuredClone(asBundle(admitted.snapshot));
  const event = bundle.presentation.life.timeline.find((item) => item.eventRef === "epi_thr_pr39_g2_04_0004");
  event.participantRefs = event.participantRefs.filter((reference) => reference !== THREAD_ID);

  const plan = planThreadPresentationAssetSlots({
    bundle,
    snapshotObjectRef: "snapshot_slice_e_nonself_memory",
    snapshotDigest: `sha256:${"c".repeat(64)}`,
  });
  const memory = plan.slots.find((slot) => slot.mediaId === "media_memory_tomatoes");

  assert.equal(memory.status, "missing");
  assert.deepEqual(memory.referenceObjectRefs, []);
  assert.equal(Object.hasOwn(memory.context, "referenceAgeYears"), false);
  assert.match(memory.brief.constraints.join(" "), /does not establish the Thread as depicted/);
});

test("self-depicting memory without admitted visual identity defers instead of inventing a face", async () => {
  const bundle = await visualIdentityBundle();
  bundle.presentation.visualIdentity = null;
  const plan = planThreadPresentationAssetSlots({
    bundle,
    snapshotObjectRef: "snapshot_slice_e_missing_visual_identity",
    snapshotDigest: `sha256:${"d".repeat(64)}`,
  });
  const memory = plan.slots.find((slot) => slot.mediaId === "media_memory_tomatoes");

  assert.equal(memory.status, "deferred");
  assert.equal(memory.deferredReason, "deferred_missing_embodiment");
  assert.deepEqual(memory.referenceObjectRefs, []);
});

test("multi-event self memory keeps the canonical identity anchor but omits an unsupported exact age", async () => {
  const current = await fixture();
  await current.rewrite.ensureOfficialIdentityMedia({
    channelId: CHANNEL_ID,
    issuedAt: "2026-08-30T05:40:00Z",
  });
  const admitted = await current.server.getSnapshot(CHANNEL_ID);
  const plan = planThreadPresentationAssetSlots({
    bundle: asBundle(admitted.snapshot),
    snapshotObjectRef: admitted.pointer.objectRef,
    snapshotDigest: admitted.pointer.snapshotDigest,
  });
  const memory = plan.slots.find((slot) => slot.mediaId === "media_memory_rice_english");

  assert.equal(memory.status, "missing");
  assert.deepEqual(memory.referenceObjectRefs, [CANONICAL_ROOT]);
  assert.equal(memory.context.referenceAgeYears, 25);
  assert.equal(memory.context.targetAgeYears, null);
  assert.match(memory.brief.description, /without asserting an unsupported exact scene age/);
});

test("an official-photo-shaped slot without a Fibre Identity Card is not generation authority", async () => {
  const bundle = await visualIdentityBundle();
  bundle.media.assets = bundle.media.assets.map((asset) =>
    asset.mediaId === "media_portrait_primary" ? { ...asset, role: "official_id_photo" } : asset);
  const plan = planThreadPresentationAssetSlots({
    bundle,
    snapshotObjectRef: "snapshot_slice_e_unbound_official_photo",
    snapshotDigest: `sha256:${"e".repeat(64)}`,
  });
  const official = plan.slots.find((slot) => slot.mediaId === "media_portrait_primary");

  assert.equal(official.status, "deferred");
  assert.equal(official.deferredReason, "deferred_missing_identity_card");
  assert.deepEqual(official.referenceObjectRefs, []);
});

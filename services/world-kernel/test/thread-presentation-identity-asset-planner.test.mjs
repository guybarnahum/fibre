import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAssetGenerationJob } from "#services/asset-generator/src/index.mjs";
import { planThreadPresentationAssetGeneration } from "../src/thread-presentation-asset-planner.mjs";

function bundle({ visualIdentity = true, photoStatus = "placeholder", cardRevision = 1 } = {}) {
  const cardId = `card_demo_${cardRevision}`;
  const priorCardId = cardRevision === 1 ? null : `card_demo_${cardRevision - 1}`;
  return {
    provenance: {
      schemaVersion: "presentation-provenance-v0.1",
      provenancePacketId: "prov_identity_asset",
      threadId: "thr_identity_asset",
      generatedAt: "2026-08-25T12:00:00Z",
      entries: [
        { provenanceId: "prov_subject", kind: "authoritative_fact", sourceReferences: ["registration_demo"], note: null },
        { provenanceId: "prov_intro", kind: "editorial", sourceReferences: ["registration_demo"], note: null },
        { provenanceId: "prov_civil", kind: "authoritative_fact", sourceReferences: ["registration_demo", "birth_demo", "world_demo"], note: null },
        { provenanceId: "prov_visual", kind: "fibre_projection", sourceReferences: ["emb_demo", "permission_demo"], note: "Authorized embodiment projection." },
        { provenanceId: "prov_card", kind: "fibre_projection", sourceReferences: ["registration_demo", cardId], note: "Replaceable card projection." },
        { provenanceId: "prov_photo", kind: "generated_reconstruction", sourceReferences: ["emb_demo", "registration_demo"], note: "Derived ID photograph, not embodiment authority." },
      ],
    },
    media: {
      schemaVersion: "thread-media-packet-v0.1",
      mediaPacketId: `media_identity_asset_${cardRevision}`,
      threadId: "thr_identity_asset",
      generatedAt: "2026-08-25T12:00:00Z",
      assets: [{
        mediaId: "media_official_id_photo",
        kind: "image",
        role: "official_id_photo",
        status: photoStatus,
        locator: null,
        mediaType: null,
        sha256: null,
        width: null,
        height: null,
        durationMs: null,
        posterRef: null,
        unavailableReason: null,
        sourceReferences: ["emb_demo", "registration_demo"],
        provenanceRef: "prov_photo",
        generation: null,
      }],
    },
    presentation: {
      schemaVersion: "thread-presentation-packet-v0.2",
      manifest: {
        presentationId: `presentation_identity_asset_${cardRevision}`,
        threadId: "thr_identity_asset",
        lifecycleStatus: "active",
        fixture: false,
        generatedAt: "2026-08-25T12:00:00Z",
        mediaPacketId: `media_identity_asset_${cardRevision}`,
        provenancePacketId: "prov_identity_asset",
      },
      subject: {
        displayName: "Mira Vale",
        birthDate: "2026-08-25",
        languages: ["English"],
        homePlaceRef: null,
        provenanceRef: "prov_subject",
      },
      introduction: {
        headline: "Identity credential asset-demand fixture.",
        summary: "Presentation-only fixture for official ID photography.",
        sourceReferences: ["registration_demo"],
        provenanceRef: "prov_intro",
        mediaRefs: [],
      },
      origins: [], places: [], relationships: [], life: { timeline: [] }, memories: [], meanings: [],
      civilIdentity: {
        fibreIdentityNumber: "7K3M-2Q-8W5R",
        registrationId: "registration_demo",
        registeredAt: "2026-08-25T10:00:00Z",
        birthEventRef: "birth_demo",
        worldRef: "world_demo",
        issuer: "fibre_civil_registry",
        sourceReferences: ["registration_demo", "birth_demo", "world_demo"],
        provenanceRef: "prov_civil",
      },
      visualIdentity: visualIdentity ? {
        projectionVersion: "thread-visual-identity-projection-v0.1",
        authority: "authorized_embodiment_projection",
        embodimentId: "emb_demo",
        embodimentRevision: 2,
        specificationDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        subjectDescription: "A stable authorized visual likeness with an oval face, dark wavy hair, and warm brown eyes.",
        renderDescription: "Preserve facial proportions, hair texture, and the ordinary appearance of the admitted portrait embodiment.",
        sourceReferences: ["emb_demo", "permission_demo"],
        permissionReferences: ["permission_demo"],
        referenceObjectRefs: [],
        provenanceRef: "prov_visual",
      } : null,
      identityCard: {
        credentialVersion: "fibre-identity-card-credential-v0.1",
        credentialId: `fibre_${cardId}`,
        cardSerial: `FIC-${cardRevision}-DEMO`,
        revision: cardRevision,
        supersedesCredentialId: priorCardId === null ? null : `fibre_${priorCardId}`,
        registrationId: "registration_demo",
        displayName: "Mira Vale",
        dateField: { kind: "birth_date", value: "2026-08-25" },
        issuedAt: cardRevision === 1 ? "2026-08-25T10:05:00Z" : "2026-09-01T10:05:00Z",
        expiresAt: null,
        status: "active",
        officialPhotoMediaRef: "media_official_id_photo",
        machineReadableCredentialRef: null,
        sourceReferences: ["registration_demo", cardId],
        provenanceRef: "prov_card",
      },
    },
  };
}

function plan(inputBundle, overrides = {}) {
  return planThreadPresentationAssetGeneration({
    bundle: inputBundle,
    snapshotObjectRef: overrides.snapshotObjectRef ?? "snapshot_identity_1",
    snapshotDigest: overrides.snapshotDigest ?? "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    requestedAt: "2026-08-25T12:01:00Z",
    providerProfile: "presentation-image-default-v1",
  });
}

test("official ID photo is explicitly deferred when admitted embodiment projection is missing", () => {
  const result = plan(bundle({ visualIdentity: false }));
  assert.equal(result.jobs.length, 0);
  assert.deepEqual(result.deferred, [{ mediaId: "media_official_id_photo", reason: "deferred_missing_embodiment" }]);
});

test("sufficient visual authority creates exactly one deterministic official ID photo job", () => {
  const result = plan(bundle());
  assert.equal(result.jobs.length, 1);
  assert.equal(result.deferred.length, 0);
  const job = result.jobs[0];
  assert.doesNotThrow(() => normalizeAssetGenerationJob(job));
  assert.equal(job.role, "official_id_photo");
  assert.equal(job.context.kind, "thread_presentation_media");
  assert.equal(job.context.role, "official_id_photo");
  assert.match(job.context.visualIdentityDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.deepEqual(job.referenceObjectRefs, []);
  assert.match(job.brief.description, /authorized Thread visual-identity projection/u);
  assert.match(job.brief.description, /Authorized subject appearance/u);
  assert.equal(job.brief.description.includes("7K3M-2Q-8W5R"), false, "FIN must not enter the image prompt");
  assert.equal(job.brief.description.includes("FIC-1-DEMO"), false, "card serial must not enter the image prompt");
  assert.equal(job.brief.constraints.some((text) => /administrative ID-photo framing/u.test(text)), true);
  assert.equal(job.brief.constraints.some((text) => /plain neutral background/u.test(text)), true);
  assert.equal(job.brief.constraints.some((text) => /No cinematic depth of field, glamour treatment/u.test(text)), true);
  assert.equal(job.brief.constraints.some((text) => /subtle, affectionate, natural, and dignity-preserving/u.test(text)), true);
  assert.equal(job.brief.constraints.some((text) => /not embodiment, identity, historical, or autobiographical evidence/u.test(text)), true);
});

test("card reissue and unrelated snapshot change do not change the official-photo workflow input", () => {
  const first = plan(bundle({ cardRevision: 1 }), {
    snapshotObjectRef: "snapshot_identity_1",
    snapshotDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  }).jobs[0];
  const reissued = plan(bundle({ cardRevision: 2 }), {
    snapshotObjectRef: "snapshot_identity_2",
    snapshotDigest: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  }).jobs[0];
  assert.deepEqual(reissued, first, "same admitted embodiment must reuse exactly the same idempotent generation input");
});

test("pending official-photo demand is not duplicated", () => {
  const result = plan(bundle({ photoStatus: "pending" }));
  assert.equal(result.jobs.length, 0);
  assert.deepEqual(result.deferred, [{ mediaId: "media_official_id_photo", reason: "generation_pending" }]);
});

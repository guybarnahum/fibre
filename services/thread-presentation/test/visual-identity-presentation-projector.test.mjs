import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFibreCivilRegistration,
  fibreIdentityNumberFromPayload,
} from "#core/src/fibre-civil-identity.mjs";
import { planThreadPresentationAssetSlots } from "#services/world-kernel/src/thread-presentation-asset-planner.mjs";
import { projectNewbornThreadPresentation } from "../src/newborn-presentation-projector.mjs";
import { projectVisualIdentityThreadPresentation } from "../src/visual-identity-presentation-projector.mjs";

const DIGEST_A = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DIGEST_B = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const CANONICAL_REFERENCE = "visual_identity_reference_thr_visual_identity_projection_001";

function newborn() {
  const threadId = "thr_visual_identity_projection_001";
  const publishedAt = "2026-08-30T04:30:00Z";
  const worldRef = "world_visual_identity_projection_001";
  const civilRegistration = buildFibreCivilRegistration({
    threadId,
    fibreIdentityNumber: fibreIdentityNumberFromPayload("7K3M2Q8W5"),
    registeredAt: publishedAt,
    birthEventRef: "evt_seed_thr_visual_identity_projection_001",
    worldRef,
  });
  return projectNewbornThreadPresentation({
    thread: {
      threadId,
      version: 1,
      status: "active",
      identity: {
        name: "Mina Park",
        originOrientation: "original",
        selfDescription: "I am a careful infrastructure reviewer who values family continuity and practical help.",
        birthDate: "2004-08-20",
        portraitRef: "fixture://legacy-portrait-must-not-cross",
      },
    },
    manifest: {
      genesisId: "gen_visual_identity_projection_001",
      threadId,
      worldSpecRef: worldRef,
      publication: { status: "published", publishedAt, civilRegistration },
    },
    civilRegistration,
  });
}

function visualIdentity({ revision = 1, digest = DIGEST_A } = {}) {
  return {
    projectionVersion: "thread-visual-identity-projection-v0.1",
    authority: "authorized_embodiment_projection",
    embodimentId: "emb_visual_identity_projection_001",
    embodimentRevision: revision,
    specificationDigest: digest,
    subjectDescription: "A young adult with an oval face, warm brown eyes, dark wavy hair, and a small scar above the left eyebrow.",
    renderDescription: revision === 1
      ? "Natural head-and-shoulders portrait with neutral expression and faithful facial proportions."
      : "Natural head-and-shoulders portrait of the same person with age-significant appearance changes faithfully preserved.",
    sourceReferences: ["emb_visual_identity_projection_001", "evt_seed_thr_visual_identity_projection_001"],
    permissionReferences: [],
    referenceObjectRefs: [CANONICAL_REFERENCE],
    provenanceRef: `prov_visual_identity_projection_r${revision}`,
  };
}

test("authorized visual identity atomically creates identity card and reference-conditioned official-photo slot", () => {
  const input = newborn();
  const projected = projectVisualIdentityThreadPresentation({
    bundle: input,
    threadId: "thr_visual_identity_projection_001",
    visualIdentity: visualIdentity(),
    projectedAt: "2026-08-30T04:40:00Z",
  });

  assert.equal(projected.presentation.visualIdentity.embodimentId, "emb_visual_identity_projection_001");
  assert.deepEqual(projected.presentation.visualIdentity.referenceObjectRefs, [CANONICAL_REFERENCE]);
  assert.equal(projected.presentation.identityCard.revision, 1);
  assert.equal(projected.presentation.identityCard.visibility, "public");
  assert.equal(projected.presentation.identityCard.displayName, "Mina Park");
  assert.deepEqual(projected.presentation.identityCard.dateField, { kind: "birth_date", value: "2004-08-20" });

  const mediaId = projected.presentation.identityCard.officialPhotoMediaRef;
  const photo = projected.media.assets.find((asset) => asset.mediaId === mediaId);
  assert.ok(photo);
  assert.equal(photo.role, "official_id_photo");
  assert.equal(photo.kind, "image");
  assert.equal(photo.status, "placeholder");
  assert.equal(photo.locator, null);
  assert.equal(JSON.stringify(projected).includes("fixture://legacy-portrait-must-not-cross"), false);

  const plan = planThreadPresentationAssetSlots({
    bundle: projected,
    snapshotObjectRef: "snapshot_visual_identity_projection_001",
    snapshotDigest: DIGEST_B,
  });
  const official = plan.slots.find((slot) => slot.mediaId === mediaId);
  assert.ok(official);
  assert.equal(official.status, "missing");
  assert.equal(official.role, "official_id_photo");
  assert.deepEqual(official.referenceObjectRefs, [CANONICAL_REFERENCE]);
  assert.equal(official.context.referenceAgeYears, 25);
  assert.equal(official.context.targetAgeYears, 22);
  assert.match(official.brief.description, /oval face/);
  assert.match(official.brief.description, /head-and-shoulders portrait/);
  assert.match(official.brief.description, /25/);
  assert.match(official.brief.description, /22 years old/);
  assert.equal(official.inputReferences.includes("emb_visual_identity_projection_001"), true);
});

test("exact visual identity replay is idempotent and cannot roll back or mutate one embodiment revision", () => {
  const first = projectVisualIdentityThreadPresentation({
    bundle: newborn(),
    threadId: "thr_visual_identity_projection_001",
    visualIdentity: visualIdentity(),
    projectedAt: "2026-08-30T04:40:00Z",
  });
  const replay = projectVisualIdentityThreadPresentation({
    bundle: first,
    threadId: "thr_visual_identity_projection_001",
    visualIdentity: visualIdentity(),
    projectedAt: "2026-08-30T04:41:00Z",
  });
  assert.deepEqual(replay, first);

  const second = projectVisualIdentityThreadPresentation({
    bundle: first,
    threadId: "thr_visual_identity_projection_001",
    visualIdentity: visualIdentity({ revision: 2, digest: DIGEST_B }),
    projectedAt: "2026-08-30T04:42:00Z",
  });
  assert.equal(second.presentation.identityCard.revision, 2);
  assert.equal(
    second.presentation.identityCard.supersedesCredentialId,
    first.presentation.identityCard.credentialId,
  );

  assert.throws(() => projectVisualIdentityThreadPresentation({
    bundle: second,
    threadId: "thr_visual_identity_projection_001",
    visualIdentity: visualIdentity(),
    projectedAt: "2026-08-30T04:43:00Z",
  }), /roll back embodiment revision/);

  assert.throws(() => projectVisualIdentityThreadPresentation({
    bundle: first,
    threadId: "thr_visual_identity_projection_001",
    visualIdentity: visualIdentity({ digest: DIGEST_B }),
    projectedAt: "2026-08-30T04:41:00Z",
  }), /same embodiment revision cannot project different/);
});

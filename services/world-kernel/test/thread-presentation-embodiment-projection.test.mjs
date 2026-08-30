import assert from "node:assert/strict";
import test from "node:test";

import {
  embodimentId,
  embodimentSpecificationDigest,
} from "../src/embodiment-domain.mjs";
import { projectPublicEmbodimentVisualIdentity } from "../src/thread-presentation-embodiment-projection.mjs";

function portrait({ visibility = "public", status = "pending_generation", revision = 1 } = {}) {
  const threadId = "thr_embodiment_projection_001";
  const specification = {
    subject: {
      partyId: threadId,
      description: "A young adult with an oval face, warm brown eyes, dark wavy hair, and a small scar above the left eyebrow.",
    },
    method: "canonical synthetic portrait specification",
    description: "Natural head-and-shoulders portrait with neutral expression, even frontal lighting, and faithful facial proportions.",
    model: "replaceable-renderer",
  };
  return {
    embodimentId: embodimentId({ threadId, kind: "portrait", lineage: "canonical" }),
    revision,
    threadId,
    kind: "portrait",
    representationKind: "synthetic_generation",
    truthStatus: "synthetic_representation_not_historical_evidence",
    rightsBasis: "thread_self_owned",
    permissionReferences: [],
    sourceReferences: ["evt_seed_thr_embodiment_projection_001"],
    specification,
    specificationDigest: embodimentSpecificationDigest(specification),
    respecification: null,
    status,
    unavailableReason: status === "unavailable_with_reason" ? "No valid current representation." : null,
    asset: null,
    visibility,
    recordedAt: "2026-08-30T04:40:00Z",
  };
}

test("public canonical portrait becomes a bounded visual identity authority projection", () => {
  const embodiment = portrait();
  const projected = projectPublicEmbodimentVisualIdentity(embodiment, {
    provenanceRef: "prov_visual_identity_projection_001",
  });

  assert.ok(projected);
  assert.equal(projected.authority, "authorized_embodiment_projection");
  assert.equal(projected.embodimentId, embodiment.embodimentId);
  assert.equal(projected.embodimentRevision, 1);
  assert.equal(projected.specificationDigest, embodiment.specificationDigest);
  assert.equal(projected.subjectDescription, embodiment.specification.subject.description);
  assert.equal(projected.renderDescription, embodiment.specification.description);
  assert.deepEqual(projected.sourceReferences, [
    embodiment.embodimentId,
    "evt_seed_thr_embodiment_projection_001",
  ]);
  assert.deepEqual(projected.permissionReferences, []);
  assert.deepEqual(projected.referenceObjectRefs, []);
});

test("private, restricted, unavailable, and non-portrait embodiment cannot become public visual identity", () => {
  assert.equal(projectPublicEmbodimentVisualIdentity(portrait({ visibility: "private" }), {
    provenanceRef: "prov_private",
  }), null);
  assert.equal(projectPublicEmbodimentVisualIdentity(portrait({ visibility: "restricted" }), {
    provenanceRef: "prov_restricted",
  }), null);
  assert.equal(projectPublicEmbodimentVisualIdentity(portrait({ status: "unavailable_with_reason" }), {
    provenanceRef: "prov_unavailable",
  }), null);

  const voice = {
    ...portrait(),
    embodimentId: "emb_voice_projection_001",
    kind: "voice",
    specification: {
      subject: {
        partyId: "thr_embodiment_projection_001",
        description: "The same Thread represented through a canonical synthetic voice identity specification for later speech rendering.",
      },
      method: "canonical synthetic voice specification",
      description: "A calm mid-range speaking voice with measured pacing and clear articulation.",
      model: "replaceable-voice-renderer",
    },
  };
  voice.specificationDigest = embodimentSpecificationDigest(voice.specification);
  assert.equal(projectPublicEmbodimentVisualIdentity(voice, {
    provenanceRef: "prov_voice",
  }), null);
});

test("World-owned embodiment asset locator is not reinterpreted as a presentation object reference", () => {
  const embodiment = portrait({ status: "available" });
  embodiment.asset = {
    assetRef: "asset://embodiment/canonical-portrait-001",
    sha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    mediaType: "image/webp",
    width: 1024,
    height: 1024,
    durationMs: null,
  };
  const projected = projectPublicEmbodimentVisualIdentity(embodiment, {
    provenanceRef: "prov_visual_identity_projection_asset",
  });
  assert.deepEqual(projected.referenceObjectRefs, []);
  assert.equal(JSON.stringify(projected).includes("asset://"), false);
});

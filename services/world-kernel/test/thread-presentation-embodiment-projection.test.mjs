import assert from "node:assert/strict";
import test from "node:test";

import {
  embodimentId,
  embodimentSpecificationDigest,
} from "../src/embodiment-domain.mjs";
import { projectPublicEmbodimentVisualIdentity } from "../src/thread-presentation-embodiment-projection.mjs";

function portrait({
  visibility = "public",
  status = "available",
  revision = 1,
  referenceObjectRef = "asset_visual_identity_reference_001",
} = {}) {
  const threadId = "thr_embodiment_projection_001";
  const specification = {
    subject: {
      partyId: threadId,
      description: "adult male person; broad family appearance prior: medium-brown skin and tightly curled dark hair occur in the extended family; softly angular oval face; wide-set deep-brown almond-shaped eyes; small pale diagonal scar above the outer left eyebrow",
    },
    method: "canonical synthetic portrait specification",
    description: "Preserve sex and the listed geometry, proportions, stable marks, asymmetries, hairline, and other identity cues across age transformations. When a broad family appearance prior is present, use it only to bound plausible skin/hair/appearance variation; do not infer culture, religion, nationality, heritage, personality or worth from appearance. Treat age, grooming, hairstyle, clothing, expression, weight variation, and temporary injury as time-local appearance rather than replacements for canonical identity. Render a neutral head-and-shoulders reference at normalized age 25.",
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
    asset: status === "available" ? {
      assetRef: "asset://embodiment/canonical-portrait-001",
      referenceObjectRef,
      sha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      mediaType: "image/webp",
      width: 1024,
      height: 1024,
      durationMs: null,
    } : null,
    visibility,
    recordedAt: "2026-08-30T04:40:00Z",
  };
}

test("verified public canonical portrait image becomes the visual identity reference", () => {
  const embodiment = portrait();
  const projected = projectPublicEmbodimentVisualIdentity(embodiment, {
    provenanceRef: "prov_visual_identity_projection_001",
  });

  assert.ok(projected);
  assert.equal(projected.authority, "authorized_embodiment_projection");
  assert.equal(projected.embodimentId, embodiment.embodimentId);
  assert.equal(projected.embodimentRevision, 1);
  assert.equal(projected.specificationDigest, embodiment.specificationDigest);
  assert.match(projected.subjectDescription, /softly angular oval face/);
  assert.match(projected.subjectDescription, /small pale diagonal scar/);
  assert.doesNotMatch(projected.subjectDescription, /broad family appearance prior/);
  assert.doesNotMatch(projected.renderDescription, /culture, religion, nationality, heritage/);
  assert.match(projected.renderDescription, /Preserve sex and the listed geometry/);
  assert.deepEqual(projected.sourceReferences, [
    embodiment.embodimentId,
    "evt_seed_thr_embodiment_projection_001",
  ]);
  assert.deepEqual(projected.permissionReferences, []);
  assert.deepEqual(projected.referenceObjectRefs, ["asset_visual_identity_reference_001"]);
  assert.equal(JSON.stringify(projected).includes("asset://"), false);
});

test("text-only pending embodiment cannot masquerade as an available visual reference", () => {
  assert.equal(projectPublicEmbodimentVisualIdentity(portrait({ status: "pending_generation" }), {
    provenanceRef: "prov_pending",
  }), null);
});

test("private, restricted, unavailable, reference-less, and non-portrait embodiment cannot become public visual identity", () => {
  assert.equal(projectPublicEmbodimentVisualIdentity(portrait({ visibility: "private" }), {
    provenanceRef: "prov_private",
  }), null);
  assert.equal(projectPublicEmbodimentVisualIdentity(portrait({ visibility: "restricted" }), {
    provenanceRef: "prov_restricted",
  }), null);
  assert.equal(projectPublicEmbodimentVisualIdentity(portrait({ status: "unavailable_with_reason" }), {
    provenanceRef: "prov_unavailable",
  }), null);
  assert.equal(projectPublicEmbodimentVisualIdentity(portrait({ referenceObjectRef: null }), {
    provenanceRef: "prov_reference_less",
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
      method: "canonical synthetic speech specification",
      description: "A calm mid-range speaking style with measured pacing and clear articulation.",
      model: "replaceable-speech-renderer",
    },
    asset: {
      assetRef: "asset://embodiment/canonical-voice-001",
      referenceObjectRef: "asset_voice_reference_001",
      sha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      mediaType: "audio/wav",
      width: null,
      height: null,
      durationMs: 1000,
    },
  };
  voice.specificationDigest = embodimentSpecificationDigest(voice.specification);
  assert.equal(projectPublicEmbodimentVisualIdentity(voice, {
    provenanceRef: "prov_voice",
  }), null);
});

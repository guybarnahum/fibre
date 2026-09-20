import assert from "node:assert/strict";
import test from "node:test";

import { PROVENANCED_ASSET_RECEIPT_VERSION } from "#services/asset-generator/src/index.mjs";
import {
  embodimentId,
  embodimentSpecificationDigest,
} from "../src/embodiment-domain.mjs";
import {
  bindVerifiedCanonicalVisualIdentityProof,
  planCanonicalVisualIdentityGeneration,
} from "../src/canonical-visual-identity-generation.mjs";
import { projectPublicEmbodimentVisualIdentity } from "../src/thread-presentation-embodiment-projection.mjs";
import { CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS } from "../src/visual-identity-reference-domain.mjs";

const DIGEST_A = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DIGEST_B = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function pendingEmbodiment({ rich = true } = {}) {
  const threadId = "thr_canonical_visual_identity_001";
  const specification = {
    subject: {
      partyId: threadId,
      description: rich
        ? "An individual with a softly angular oval face; medium warm-brown skin with subtle natural texture; wide-set dark brown almond-shaped eyes; straight medium-width brows with a small asymmetry in the left arch; a narrow straight nose with a rounded tip; a defined cupid's bow and fuller lower lip; a tapered jaw; attached earlobes; thick dark-brown wavy hair with a slightly uneven natural hairline; and a small pale diagonal scar just above the outer left eyebrow. Facial proportions and asymmetries should remain recognizable across age transformations."
        : "Oval face, brown eyes, and dark hair with a small eyebrow scar.",
    },
    method: "canonical synthetic portrait specification",
    description: rich
      ? "Identity anchor should preserve natural asymmetry and ordinary skin detail rather than idealizing the face. Build is lean-to-average with relaxed shoulders and a long neck. Reference composition is head-and-shoulders, mostly frontal, with both ears and the hairline legible, neutral mouth, relaxed eyes, no cosmetics that alter facial structure, no eyewear, no jewelry obscuring landmarks, even daylight-balanced illumination, and ordinary perspective without wide-angle distortion."
      : "Neutral front-facing portrait with ordinary lighting.",
    model: "replaceable-renderer",
  };
  return {
    embodimentId: embodimentId({ threadId, kind: "portrait", lineage: "canonical" }),
    revision: 1,
    threadId,
    kind: "portrait",
    representationKind: "synthetic_generation",
    truthStatus: "synthetic_representation_not_historical_evidence",
    rightsBasis: "thread_self_owned",
    permissionReferences: [],
    sourceReferences: ["evt_seed_thr_canonical_visual_identity_001"],
    specification,
    specificationDigest: embodimentSpecificationDigest(specification),
    respecification: null,
    status: "pending_generation",
    unavailableReason: null,
    asset: null,
    visibility: "public",
    recordedAt: "2026-08-30T05:05:00Z",
  };
}

function provenancedReceipt(job, overrides = {}) {
  return {
    receiptVersion: PROVENANCED_ASSET_RECEIPT_VERSION,
    jobId: job.jobId,
    status: "ready",
    assetKind: "image",
    role: job.role,
    variant: job.variant,
    objectRef: job.outputObjectRef,
    sha256: DIGEST_A,
    mediaType: "image/webp",
    width: 1024,
    height: 1024,
    durationMs: null,
    completedAt: "2026-08-30T05:06:00Z",
    generationRecordObjectRef: "generation_record_visual_identity_001",
    generationRecordDigest: DIGEST_B,
    providerOutputDigest: DIGEST_A,
    inputReferences: job.inputReferences,
    context: job.context,
    ...overrides,
  };
}

test("canonical visual identity root image is planned once from rich text with no reference image", () => {
  const embodiment = pendingEmbodiment();
  const job = planCanonicalVisualIdentityGeneration({
    embodiment,
    requestedAt: "2026-08-30T05:05:10Z",
  });

  assert.equal(job.role, "canonical_visual_identity_reference");
  assert.equal(job.referenceObjectRefs.length, 0);
  assert.equal(job.context.referenceAgeYears, CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS);
  assert.equal(CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS, 25);
  assert.match(job.brief.description, /single canonical visual-identity reference portrait/);
  assert.match(job.brief.description, /normalization anchor/);
  assert.match(job.brief.description, /small pale diagonal scar/);
  assert.equal(job.brief.constraints.some((value) => /no prior reference image/.test(value)), true);

  const replay = planCanonicalVisualIdentityGeneration({
    embodiment,
    requestedAt: "2026-08-30T05:05:10Z",
  });
  assert.deepEqual(replay, job);
});

test("canonical visual identity planning does not depend on Node Buffer globals", () => {
  const previous = globalThis.Buffer;
  try {
    globalThis.Buffer = undefined;
    const job = planCanonicalVisualIdentityGeneration({
      embodiment: pendingEmbodiment(),
      requestedAt: "2026-08-30T05:05:10Z",
    });
    assert.equal(job.role, "canonical_visual_identity_reference");
  } finally {
    globalThis.Buffer = previous;
  }
});

test("canonical generation requires a sufficiently rich identity specification", () => {
  assert.throws(() => planCanonicalVisualIdentityGeneration({
    embodiment: pendingEmbodiment({ rich: false }),
    requestedAt: "2026-08-30T05:05:10Z",
  }), /concrete appearance detail/);
});

test("verified Fibre provenance binds the immutable canonical reference into Embodiment", () => {
  const pending = pendingEmbodiment();
  const job = planCanonicalVisualIdentityGeneration({
    embodiment: pending,
    requestedAt: "2026-08-30T05:05:10Z",
  });
  const receipt = provenancedReceipt(job);
  const available = bindVerifiedCanonicalVisualIdentityProof({
    embodiment: pending,
    proof: {
      receipt,
      generationRecord: { job },
    },
    recordedAt: "2026-08-30T05:06:01Z",
  });

  assert.equal(available.revision, 2);
  assert.equal(available.supersedesRevision, 1);
  assert.equal(available.status, "available");
  assert.equal(available.asset.referenceObjectRef, job.outputObjectRef);
  assert.equal(available.asset.assetRef, `asset://${job.outputObjectRef}`);

  const visualIdentity = projectPublicEmbodimentVisualIdentity(available, {
    provenanceRef: "prov_canonical_visual_identity_001",
  });
  assert.ok(visualIdentity);
  assert.deepEqual(visualIdentity.referenceObjectRefs, [job.outputObjectRef]);
});

test("canonical root admission rejects provenance for a different generation job", () => {
  const pending = pendingEmbodiment();
  const job = planCanonicalVisualIdentityGeneration({
    embodiment: pending,
    requestedAt: "2026-08-30T05:05:10Z",
  });
  assert.throws(() => bindVerifiedCanonicalVisualIdentityProof({
    embodiment: pending,
    proof: {
      receipt: provenancedReceipt(job),
      generationRecord: {
        job: { ...job, jobId: "asset_job_other" },
      },
    },
    recordedAt: "2026-08-30T05:06:01Z",
  }), /proof job does not match the stored receipt/);
});

test("canonical root admission rejects a receipt that does not match pending embodiment authority", () => {
  const pending = pendingEmbodiment();
  const job = planCanonicalVisualIdentityGeneration({
    embodiment: pending,
    requestedAt: "2026-08-30T05:05:10Z",
  });
  const context = { ...job.context, embodimentRevision: job.context.embodimentRevision + 1 };
  assert.throws(() => bindVerifiedCanonicalVisualIdentityProof({
    embodiment: pending,
    proof: {
      receipt: provenancedReceipt(job, { context }),
      generationRecord: { job: { ...job, context } },
    },
    recordedAt: "2026-08-30T05:06:01Z",
  }), /receipt does not match the pending embodiment authority/);
});

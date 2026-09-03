import assert from "node:assert/strict";
import test from "node:test";

import {
  PROVENANCED_ASSET_RECEIPT_VERSION,
  STORED_ASSET_RECEIPT_VERSION,
} from "#services/asset-generator/src/index.mjs";
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
const DIGEST_C = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const DIGEST_D = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

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

function storedReceipt(job) {
  return {
    receiptVersion: STORED_ASSET_RECEIPT_VERSION,
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
    providerOutputDigest: DIGEST_C,
    credential: {
      format: "fixture-content-credential",
      signerId: "fixture-signer",
      manifestDigest: DIGEST_D,
      embeddedAt: "2026-08-30T05:05:58Z",
      verifiedAt: "2026-08-30T05:05:59Z",
    },
    inputReferences: job.inputReferences,
    context: job.context,
  };
}

function provenancedReceipt(job) {
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
    credential: null,
    inputReferences: job.inputReferences,
    context: job.context,
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

test("verified credentialed root-image proof binds immutable reference object into Embodiment", () => {
  const pending = pendingEmbodiment();
  const job = planCanonicalVisualIdentityGeneration({
    embodiment: pending,
    requestedAt: "2026-08-30T05:05:10Z",
  });
  const receipt = storedReceipt(job);
  const available = bindVerifiedCanonicalVisualIdentityProof({
    embodiment: pending,
    proof: {
      receipt,
      generationRecord: { job },
      verification: { valid: true },
      credentialMode: "content_credential",
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

test("legacy credentialed proof remains recognizable from credentialed receipt plus valid verification", () => {
  const pending = pendingEmbodiment();
  const job = planCanonicalVisualIdentityGeneration({
    embodiment: pending,
    requestedAt: "2026-08-30T05:05:10Z",
  });
  const available = bindVerifiedCanonicalVisualIdentityProof({
    embodiment: pending,
    proof: {
      receipt: storedReceipt(job),
      generationRecord: { job },
      verification: { valid: true },
    },
    recordedAt: "2026-08-30T05:06:01Z",
  });
  assert.equal(available.status, "available");
});

test("verified durable provenance admits canonical root when content credentials are disabled", () => {
  const pending = pendingEmbodiment();
  const job = planCanonicalVisualIdentityGeneration({
    embodiment: pending,
    requestedAt: "2026-08-30T05:05:10Z",
  });
  const available = bindVerifiedCanonicalVisualIdentityProof({
    embodiment: pending,
    proof: {
      receipt: provenancedReceipt(job),
      generationRecord: { job },
      verification: null,
      credentialMode: "disabled",
    },
    recordedAt: "2026-08-30T05:06:01Z",
  });
  assert.equal(available.status, "available");
  assert.equal(available.asset.referenceObjectRef, job.outputObjectRef);
});

test("canonical root admission rejects ambiguous or dishonest proof modes", () => {
  const pending = pendingEmbodiment();
  const job = planCanonicalVisualIdentityGeneration({
    embodiment: pending,
    requestedAt: "2026-08-30T05:05:10Z",
  });
  assert.throws(() => bindVerifiedCanonicalVisualIdentityProof({
    embodiment: pending,
    proof: {
      receipt: provenancedReceipt(job),
      generationRecord: { job },
      verification: { valid: true },
      credentialMode: "disabled",
    },
    recordedAt: "2026-08-30T05:06:01Z",
  }), /must not claim credential verification/);
  assert.throws(() => bindVerifiedCanonicalVisualIdentityProof({
    embodiment: pending,
    proof: {
      receipt: provenancedReceipt(job),
      generationRecord: { job },
      verification: null,
    },
    recordedAt: "2026-08-30T05:06:01Z",
  }), /recognized verified generation proof mode/);
});

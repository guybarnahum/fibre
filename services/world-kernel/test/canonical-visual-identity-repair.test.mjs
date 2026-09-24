import assert from "node:assert/strict";
import test from "node:test";

import {
  embodimentSpecificationDigest,
  normalizeEmbodimentRepresentation,
} from "../src/embodiment-domain.mjs";
import { repairCanonicalVisualIdentity } from "../src/canonical-visual-identity-repair.mjs";

const THREAD_ID = "thr_visual_identity_repair_001";
const EMBODIMENT_ID = "emb_visual_identity_repair_001";

function specification(subjectDescription) {
  return {
    subject: {
      partyId: THREAD_ID,
      description: subjectDescription,
    },
    method: "canonical synthetic portrait specification from authoritative textual phenotype",
    description: "Preserve stable facial geometry, proportions, skin, hair, asymmetries, and identity landmarks across age transformations while keeping time-local appearance separate.",
    model: "replaceable-renderer",
  };
}

function currentEmbodiment() {
  const currentSpecification = specification(
    "adult male person; softly angular oval face; medium-set dark-brown eyes; narrow straight nasal bridge; medium-width mouth; tapered jaw; medium warm-beige skin; dense near-black loosely curled hair; attached earlobes; lean frame; small pale scar above the left eyebrow",
  );
  return normalizeEmbodimentRepresentation({
    embodimentId: EMBODIMENT_ID,
    revision: 2,
    supersedesRevision: 1,
    threadId: THREAD_ID,
    kind: "portrait",
    representationKind: "synthetic_generation",
    truthStatus: "synthetic_representation_not_historical_evidence",
    rightsBasis: "thread_self_owned",
    permissionReferences: [],
    sourceReferences: ["evt_visual_identity_origin_001"],
    specification: currentSpecification,
    specificationDigest: embodimentSpecificationDigest(currentSpecification),
    respecification: null,
    status: "available",
    unavailableReason: null,
    asset: {
      assetRef: "asset://visual_identity_reference_old",
      referenceObjectRef: "visual_identity_reference_old",
      sha256: `sha256:${"a".repeat(64)}`,
      mediaType: "image/png",
      width: 1024,
      height: 1024,
      durationMs: null,
    },
    visibility: "public",
    recordedAt: "2026-09-24T04:00:00.000Z",
  });
}

test("canonical correction preserves lineage and reopens root generation", () => {
  const current = currentEmbodiment();
  const correctedSpecification = specification(
    "adult male person; long oval face with gently tapered cheeks; deep-brown almond-shaped eyes; medium-width nose with a softly rounded tip; full balanced lips; softly defined jaw and rounded chin; warm medium-brown skin with ordinary tonal variation; dense tightly curled near-black hair with a natural rounded hairline; medium detached earlobes; lean-to-average frame; subtle left-right brow asymmetry",
  );

  const repaired = repairCanonicalVisualIdentity({
    currentEmbodiment: current,
    correctedSpecification,
    reason: "Correct the admitted canonical visual identity after the prior root failed to faithfully realize the authoritative appearance specification.",
    evidenceReferences: ["evt_visual_identity_correction_001"],
    recordedAt: "2026-09-24T05:00:00.000Z",
  });

  assert.equal(repaired.embodimentId, current.embodimentId);
  assert.equal(repaired.threadId, current.threadId);
  assert.equal(repaired.revision, current.revision + 1);
  assert.equal(repaired.supersedesRevision, current.revision);
  assert.equal(repaired.status, "pending_generation");
  assert.equal(repaired.asset, null);
  assert.notEqual(repaired.specificationDigest, current.specificationDigest);
  assert.equal(repaired.respecification.priorSpecificationDigest, current.specificationDigest);
  assert.deepEqual(repaired.respecification.evidenceReferences, ["evt_visual_identity_correction_001"]);
  assert.equal(current.status, "available");
  assert.equal(current.asset.referenceObjectRef, "visual_identity_reference_old");
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFibreCivilRegistration,
  fibreCivilRegistrationDigest,
  fibreIdentityNumberFromPayload,
} from "#core/src/fibre-civil-identity.mjs";
import {
  buildFidIssuanceWorkflowRecord,
} from "../src/fid-card-issuance-domain.mjs";
import { buildFidPhotoAdmission } from "../src/fid-photo-admission.mjs";
import {
  createFidCardTemplate,
  fidRenderPhotoDigest,
  renderFidCard,
} from "../src/fid-card-renderer.mjs";

function registration() {
  return buildFibreCivilRegistration({
    threadId: "thread_fid_render_001",
    fibreIdentityNumber: fibreIdentityNumberFromPayload("012345678"),
    registeredAt: "2026-09-01T12:00:00.000Z",
    birthEventRef: "birth_fid_render_001",
    worldRef: "world_fibre",
  });
}

function workflow({ requestedAt = "2026-09-09T20:00:00.000Z" } = {}) {
  return buildFidIssuanceWorkflowRecord({
    request: {
      threadId: "thread_fid_render_001",
      reason: "initial",
      idempotencyKey: "fid-render-001",
    },
    civilRegistration: registration(),
    proposedRevision: 1,
    requestedAt,
  });
}

function photo(seed = 17) {
  const width = 80;
  const height = 100;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      rgba[i] = (seed + x * 2) % 256;
      rgba[i + 1] = (80 + y * 2) % 256;
      rgba[i + 2] = (160 + x + y) % 256;
      rgba[i + 3] = 255;
    }
  }
  return { width, height, rgba };
}

const goodInspection = Object.freeze({
  faceCount: 1,
  faceVisible: true,
  occlusionAcceptable: true,
  cropCompliant: true,
  dimensionsCompliant: true,
  poseCompliant: true,
  framingCompliant: true,
  visualIdentityConsistent: true,
  ageConsistent: true,
});

function admission(forWorkflow, admittedPhoto) {
  return buildFidPhotoAdmission({
    workflow: forWorkflow,
    source: {
      role: "official_id_photo",
      threadId: forWorkflow.threadId,
      candidatePhotoRef: `media_${fidRenderPhotoDigest(admittedPhoto).slice(-16)}`,
      candidatePhotoDigest: fidRenderPhotoDigest(admittedPhoto),
      canonicalVisualReferenceRef: "media_canonical_fid_render_001",
      canonicalVisualReferenceDigest: `sha256:${"1".repeat(64)}`,
      derivationReceiptRef: "derivation_fid_render_001",
      sourceReferences: ["media_canonical_fid_render_001"],
      targetAgeYears: 24,
    },
    inspection: goodInspection,
    admittedAt: "2026-09-09T20:01:00.000Z",
  });
}

test("Slice C renders identical front/back PNG bytes from the same authorized issuance material", () => {
  const w = workflow();
  const p = photo();
  const a = admission(w, p);

  const first = renderFidCard({ workflow: w, photoAdmission: a, photo: p });
  const second = renderFidCard({ workflow: w, photoAdmission: a, photo: p });

  assert.deepEqual(Object.keys(first.files).sort(), ["back.png", "front.png"]);
  assert.deepEqual(first.files["front.png"], second.files["front.png"]);
  assert.deepEqual(first.files["back.png"], second.files["back.png"]);
  assert.equal(first.frontRenderDigest, second.frontRenderDigest);
  assert.equal(first.backRenderDigest, second.backRenderDigest);
  assert.deepEqual([...first.files["front.png"].subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});

test("Slice C render digests move when authorized identity, admitted photo, or template version moves", () => {
  const w = workflow();
  const p = photo();
  const baseline = renderFidCard({ workflow: w, photoAdmission: admission(w, p), photo: p });

  const movedIdentity = workflow({ requestedAt: "2026-09-09T20:00:01.000Z" });
  const identityRender = renderFidCard({
    workflow: movedIdentity,
    photoAdmission: admission(movedIdentity, p),
    photo: p,
  });
  assert.notEqual(identityRender.frontRenderDigest, baseline.frontRenderDigest);
  assert.notEqual(identityRender.backRenderDigest, baseline.backRenderDigest);

  const p2 = photo(18);
  const photoRender = renderFidCard({ workflow: w, photoAdmission: admission(w, p2), photo: p2 });
  assert.notEqual(photoRender.frontRenderDigest, baseline.frontRenderDigest);
  assert.notEqual(photoRender.backRenderDigest, baseline.backRenderDigest);

  const templateRender = renderFidCard({
    workflow: w,
    photoAdmission: admission(w, p),
    photo: p,
    template: createFidCardTemplate({ version: "fid-card-template-v0.2" }),
  });
  assert.notEqual(templateRender.backRenderDigest, baseline.backRenderDigest);
});

test("Slice C refuses an unadmitted or substituted portrait", () => {
  const w = workflow();
  const admitted = photo();
  const a = admission(w, admitted);

  assert.throws(
    () => renderFidCard({ workflow: w, photoAdmission: a, photo: photo(99) }),
    /does not match the admitted photo digest/,
  );

  const rejected = buildFidPhotoAdmission({
    workflow: w,
    source: {
      role: "official_id_photo",
      threadId: w.threadId,
      candidatePhotoRef: null,
      candidatePhotoDigest: null,
      canonicalVisualReferenceRef: "media_canonical_fid_render_001",
      canonicalVisualReferenceDigest: `sha256:${"1".repeat(64)}`,
      derivationReceiptRef: null,
      sourceReferences: ["media_canonical_fid_render_001"],
      targetAgeYears: 24,
    },
    admittedAt: "2026-09-09T20:01:00.000Z",
  });
  assert.throws(
    () => renderFidCard({ workflow: w, photoAdmission: rejected, photo: admitted }),
    /requires an accepted photo admission/,
  );
});

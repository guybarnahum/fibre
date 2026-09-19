import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFibreCivilRegistration,
  fibreIdentityNumberFromPayload,
} from "#core/src/fibre-civil-identity.mjs";
import { buildFidIssuanceWorkflowRecord } from "../src/fid-card-issuance-domain.mjs";
import { buildFidPhotoAdmission } from "../src/fid-photo-admission.mjs";
import { decodePngRgba } from "../src/fid-photo-surface.mjs";
import {
  FID_CARD_SIZE,
  fidRenderPhotoDigest,
  renderFidCard,
} from "../src/fid-card-renderer.mjs";
import { oceanFidTemplate } from "./fid-card-test-template.mjs";

function registration() {
  return buildFibreCivilRegistration({
    threadId:"thread_fid_render_001",
    fibreIdentityNumber:fibreIdentityNumberFromPayload("012345678"),
    registeredAt:"2026-09-01T12:00:00.000Z",
    birthEventRef:"birth_fid_render_001",
    worldRef:"world_fibre",
  });
}

function workflow({ requestedAt = "2026-09-09T20:00:00.000Z" } = {}) {
  return buildFidIssuanceWorkflowRecord({
    request:{ threadId:"thread_fid_render_001", reason:"initial", idempotencyKey:"fid-render-001" },
    civilRegistration:registration(),
    proposedRevision:1,
    requestedAt,
  });
}

function photo(seed = 17) {
  const width = 80;
  const height = 100;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const index = (y * width + x) * 4;
    rgba[index] = (seed + x * 2) % 256;
    rgba[index + 1] = (80 + y * 2) % 256;
    rgba[index + 2] = (160 + x + y) % 256;
    rgba[index + 3] = 255;
  }
  return { width, height, rgba };
}

const goodInspection = Object.freeze({
  faceCount:1,
  faceVisible:true,
  occlusionAcceptable:true,
  cropCompliant:true,
  dimensionsCompliant:true,
  poseCompliant:true,
  framingCompliant:true,
  visualIdentityConsistent:true,
  ageConsistent:true,
});

function admission(forWorkflow, admittedPhoto) {
  return buildFidPhotoAdmission({
    workflow:forWorkflow,
    source:{
      role:"official_id_photo",
      threadId:forWorkflow.threadId,
      candidatePhotoRef:`media_${fidRenderPhotoDigest(admittedPhoto).slice(-16)}`,
      candidatePhotoDigest:fidRenderPhotoDigest(admittedPhoto),
      canonicalVisualReferenceRef:"media_canonical_fid_render_001",
      canonicalVisualReferenceDigest:`sha256:${"1".repeat(64)}`,
      derivationReceiptRef:"derivation_fid_render_001",
      sourceReferences:["media_canonical_fid_render_001"],
      targetAgeYears:24,
    },
    inspection:goodInspection,
    admittedAt:"2026-09-09T20:01:00.000Z",
  });
}

function identity(displayName = "Mira Vale") {
  return {
    threadId:"thread_fid_render_001",
    fibreIdentityNumber:registration().fibreIdentityNumber,
    displayName,
    birthDate:"1996-03-18",
  };
}

function pngDimensions(bytes) {
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return { width:bytes.readUInt32BE(16), height:bytes.readUInt32BE(20) };
}

test("FID card rendering is deterministic for the same authorized identity", async () => {
  const w = workflow();
  const p = photo();
  const a = admission(w, p);
  const template = await oceanFidTemplate();
  const first = renderFidCard({ workflow:w, photoAdmission:a, photo:p, authorizedIdentity:identity(), template });
  const second = renderFidCard({ workflow:w, photoAdmission:a, photo:p, authorizedIdentity:identity(), template });

  assert.deepEqual(first.files["front.png"], second.files["front.png"], "front render changed");
  assert.deepEqual(first.files["back.png"], second.files["back.png"], "back render changed");
  assert.deepEqual(pngDimensions(first.files["front.png"]), FID_CARD_SIZE);
  assert.deepEqual(pngDimensions(first.files["back.png"]), FID_CARD_SIZE);
});

test("FID card presents the admitted portrait in black and white without changing photo identity", async () => {
  const w = workflow();
  const p = photo();
  const rendered = renderFidCard({
    workflow:w,
    photoAdmission:admission(w, p),
    photo:p,
    authorizedIdentity:identity(),
    template:await oceanFidTemplate(),
  });
  const front = await decodePngRgba(rendered.files["front.png"]);
  const x = 45 + Math.floor(264 / 2);
  const y = 106 + Math.floor(340 / 2);
  const index = (y * front.width + x) * 4;
  assert.equal(front.rgba[index], front.rgba[index + 1], "portrait is not grayscale");
  assert.equal(front.rgba[index + 1], front.rgba[index + 2], "portrait is not grayscale");
  assert.equal(fidRenderPhotoDigest(p), admission(w, p).candidatePhotoDigest, "presentation changed admitted photo identity");
});

test("FID render identity changes when authorized material changes", async () => {
  const w = workflow();
  const p = photo();
  const template = await oceanFidTemplate();
  const baseline = renderFidCard({ workflow:w, photoAdmission:admission(w, p), photo:p, authorizedIdentity:identity(), template });

  const p2 = photo(18);
  const photoRender = renderFidCard({
    workflow:w,
    photoAdmission:admission(w, p2),
    photo:p2,
    authorizedIdentity:identity(),
    template,
  });
  assert.notEqual(photoRender.frontRenderDigest, baseline.frontRenderDigest, "photo change did not move front render");

  const identityRender = renderFidCard({
    workflow:w,
    photoAdmission:admission(w, p),
    photo:p,
    authorizedIdentity:identity("Mira Vele"),
    template,
  });
  assert.notEqual(identityRender.frontRenderDigest, baseline.frontRenderDigest, "identity change did not move front render");

  const versionedTemplate = await oceanFidTemplate({ version:"fid-card-template-v0.3-ocean-test" });
  const versionRender = renderFidCard({
    workflow:w,
    photoAdmission:admission(w, p),
    photo:p,
    authorizedIdentity:identity(),
    template:versionedTemplate,
  });
  assert.notEqual(versionRender.backRenderDigest, baseline.backRenderDigest, "template version did not move back render");
});

function region(surface, { x, y, width, height }) {
  const bytes = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const from = ((y + row) * surface.width + x) * 4;
    bytes.set(surface.rgba.subarray(from, from + width * 4), row * width * 4);
  }
  return bytes;
}

test("FID card visibly preserves the authorized spelling and case of a Thread name", async () => {
  const w = workflow();
  const p = photo();
  const a = admission(w, p);
  const template = await oceanFidTemplate();
  const mixed = await decodePngRgba(renderFidCard({
    workflow:w,
    photoAdmission:a,
    photo:p,
    authorizedIdentity:identity("Mira Vale"),
    template,
  }).files["front.png"]);
  const upper = await decodePngRgba(renderFidCard({
    workflow:w,
    photoAdmission:a,
    photo:p,
    authorizedIdentity:identity("MIRA VALE"),
    template,
  }).files["front.png"]);
  const field = template.layout.front.name;
  const bounds = { x:field.valueX, y:field.valueY, width:field.width, height:40 };
  assert.notDeepEqual(region(mixed, bounds), region(upper, bounds), "name case disappeared from card");
});

test("FID card rejects identity text that cannot fit its designed field", async () => {
  const w = workflow();
  const p = photo();
  const template = await oceanFidTemplate();
  assert.throws(
    () => renderFidCard({
      workflow:w,
      photoAdmission:admission(w, p),
      photo:p,
      authorizedIdentity:identity("A".repeat(80)),
      template,
    }),
    /FID name does not fit/,
  );
});

test("FID renderer refuses a substituted or unadmitted portrait", async () => {
  const w = workflow();
  const admitted = photo();
  const a = admission(w, admitted);
  const template = await oceanFidTemplate();

  assert.throws(
    () => renderFidCard({ workflow:w, photoAdmission:a, photo:photo(99), authorizedIdentity:identity(), template }),
    /does not match the admitted photo digest/,
  );

  const rejected = buildFidPhotoAdmission({
    workflow:w,
    source:{
      role:"official_id_photo",
      threadId:w.threadId,
      candidatePhotoRef:null,
      candidatePhotoDigest:null,
      canonicalVisualReferenceRef:"media_canonical_fid_render_001",
      canonicalVisualReferenceDigest:`sha256:${"1".repeat(64)}`,
      derivationReceiptRef:null,
      sourceReferences:["media_canonical_fid_render_001"],
      targetAgeYears:24,
    },
    admittedAt:"2026-09-09T20:01:00.000Z",
  });
  assert.throws(
    () => renderFidCard({ workflow:w, photoAdmission:rejected, photo:admitted, authorizedIdentity:identity(), template }),
    /requires an accepted photo admission/,
  );
});

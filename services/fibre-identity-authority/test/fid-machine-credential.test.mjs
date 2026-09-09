import assert from "node:assert/strict";
import {
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  randomBytes,
  sign as nodeSign,
  verify as nodeVerify,
} from "node:crypto";
import test from "node:test";

import { buildFibreCivilRegistration } from "#core/src/fibre-civil-identity.mjs";
import { buildFidIssuanceWorkflowRecord } from "../src/fid-card-issuance-domain.mjs";
import {
  FIBRE_IDENTITY_AUTHORITY_ID,
  buildFidMachineCredentialPayload,
  buildFidPhotoAdmission,
  createFidCardTemplate,
  fidMachineCredentialBytes,
  fidRenderPhotoDigest,
  openFidMachineCredential,
  renderFidCard,
  sealFidMachineCredential,
  signFidMachineCredentialPayload,
  verifyFidMachineCredentialSignature,
} from "../src/index.mjs";

function signer(keyId = "fia-test-key-1") {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    profile: {
      authorityId: FIBRE_IDENTITY_AUTHORITY_ID,
      keyId,
      publicKeyRef: `test:${keyId}`,
      trustPolicy: "fid-test-trust-v1",
    },
    sign: async (message) => nodeSign(null, Buffer.from(message), privateKey),
    verify: async (message, signature) => nodeVerify(null, Buffer.from(message), publicKey, Buffer.from(signature)),
  };
}

function protector(key = randomBytes(32)) {
  return {
    profile: { policyId: "fid-private-test-v1", keyId: "fid-reader-test-1" },
    async seal({ plaintext, aad }) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(Buffer.from(aad));
      const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final(), cipher.getAuthTag()]);
      return { ciphertext, parameters: { ivBase64: iv.toString("base64") } };
    },
    async open({ ciphertext, parameters, aad }) {
      const packed = Buffer.from(ciphertext);
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parameters.ivBase64, "base64"));
      decipher.setAAD(Buffer.from(aad));
      decipher.setAuthTag(packed.subarray(-16));
      return Buffer.concat([decipher.update(packed.subarray(0, -16)), decipher.final()]);
    },
  };
}

function fixture(issuer) {
  const registration = buildFibreCivilRegistration({
    threadId: "thr_mira",
    fibreIdentityNumber: "8PKH-A4-VH5R",
    registeredAt: "2026-09-01T12:00:00.000Z",
    birthEventRef: "evt_birth_mira",
    worldRef: "world_d1",
  });
  const workflow = buildFidIssuanceWorkflowRecord({
    request: { threadId: "thr_mira", reason: "initial", idempotencyKey: "d1_mira" },
    civilRegistration: registration,
    proposedRevision: 1,
    requestedAt: "2026-09-09T20:00:00.000Z",
  });
  const photo = {
    width: 8,
    height: 8,
    rgba: new Uint8Array(8 * 8 * 4).map((_, index) => (index * 29) % 256),
  };
  const admission = buildFidPhotoAdmission({
    workflow,
    source: {
      role: "official_id_photo",
      threadId: workflow.threadId,
      candidatePhotoRef: "obj_fid_photo_mira",
      candidatePhotoDigest: fidRenderPhotoDigest(photo),
      canonicalVisualReferenceRef: "obj_visual_mira",
      canonicalVisualReferenceDigest: `sha256:${"b".repeat(64)}`,
      derivationReceiptRef: "assetreceipt_fid_photo_mira",
      sourceReferences: ["obj_visual_mira"],
      targetAgeYears: 34,
    },
    inspection: {
      faceCount: 1,
      faceVisible: true,
      occlusionAcceptable: true,
      cropCompliant: true,
      dimensionsCompliant: true,
      poseCompliant: true,
      framingCompliant: true,
      visualIdentityConsistent: true,
      ageConsistent: true,
    },
    admittedAt: "2026-09-09T20:01:00.000Z",
  });
  const render = renderFidCard({ workflow, photoAdmission: admission, photo, template: createFidCardTemplate() });
  const payload = buildFidMachineCredentialPayload({
    workflow,
    photoAdmission: admission,
    photo,
    render,
    issuer: issuer.profile,
    issuedAt: "2026-09-09T20:02:00.000Z",
  });
  return { admission, payload, photo };
}

test("D1 canonical credential bytes are stable and issuer signature rejects payload tampering", async () => {
  const issuer = signer();
  const { payload } = fixture(issuer);
  const reordered = Object.fromEntries(Object.entries(payload).reverse());
  assert.deepEqual(fidMachineCredentialBytes(reordered), fidMachineCredentialBytes(payload));

  const signed = await signFidMachineCredentialPayload(payload, issuer);
  assert.equal(await verifyFidMachineCredentialSignature(signed, issuer), true);
  assert.equal(signed.signature.authorityId, FIBRE_IDENTITY_AUTHORITY_ID);
  assert.equal(signed.signature.keyId, issuer.profile.keyId);

  const tampered = structuredClone(signed);
  tampered.payload.threadId = "thr_other";
  assert.equal(await verifyFidMachineCredentialSignature(tampered, issuer), false);
});

test("D1 envelope hides private identity and authorized open recovers the exact admitted portrait", async () => {
  const issuer = signer();
  const reader = protector();
  const { admission, payload, photo } = fixture(issuer);
  const envelope = await sealFidMachineCredential({ payload, issuerSigner: issuer, credentialProtector: reader });

  assert.equal("fin" in envelope.routing, false);
  assert.equal("threadId" in envelope.routing, false);
  assert.equal("photo" in envelope.routing, false);
  assert.equal(envelope.routing.issuerAuthorityId, FIBRE_IDENTITY_AUTHORITY_ID);
  assert.equal(envelope.routing.issuerKeyId, issuer.profile.keyId);

  const opened = await openFidMachineCredential(envelope, { issuerSigner: issuer, credentialProtector: reader });
  assert.deepEqual(opened.photo.rgba, photo.rgba);
  assert.equal(opened.payload.photo.digest, admission.candidatePhotoDigest);
  assert.equal(opened.payload.photo.admissionId, admission.admissionId);

  await assert.rejects(() => openFidMachineCredential(envelope, {
    issuerSigner: issuer,
    credentialProtector: protector(),
  }));
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildFibreCivilRegistration } from "#core/src/fibre-civil-identity.mjs";
import { createMemoryInfraDriver } from "#infra/providers/local";
import { buildFidIssuanceWorkflowRecord } from "../src/fid-card-issuance-domain.mjs";
import {
  FIBRE_IDENTITY_AUTHORITY_ID,
  FID_C2PA_ASSERTION_LABEL,
  buildFidMachineCredentialPayload,
  buildFidPhotoAdmission,
  credentialAndStoreFidCard,
  fidRenderPhotoDigest,
  renderFidCard,
  sealFidMachineCredential,
  verifyFidC2paSide,
} from "../src/index.mjs";

function sha256(value) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }

function issuer() {
  const key = Buffer.from("d2-fia-test-key");
  return {
    profile: {
      authorityId: FIBRE_IDENTITY_AUTHORITY_ID,
      keyId: "fia-d2-test-key",
      publicKeyRef: "test:fia-d2-test-key",
      trustPolicy: "fid-test-trust-v1",
    },
    async sign(message) { return createHash("sha256").update(key).update(message).digest(); },
    async verify(message, signature) {
      const expected = createHash("sha256").update(key).update(message).digest();
      return Buffer.from(signature).equals(expected);
    },
  };
}

function protector() {
  return {
    profile: { policyId: "fid-d2-private-test", keyId: "fid-d2-reader" },
    async seal({ plaintext }) { return { ciphertext: Buffer.from(plaintext).reverse(), parameters: {} }; },
    async open({ ciphertext }) { return Buffer.from(ciphertext).reverse(); },
  };
}

function contentSigner({ rejectSide = null } = {}) {
  return {
    signerId: "fid-c2pa-test",
    format: "c2pa",
    trustPolicy: "fid-test-trust-v1",
    async embed({ bytes, assertion, assertionLabel }) {
      assert.equal(assertionLabel, FID_C2PA_ASSERTION_LABEL);
      const credentialed = Buffer.from(JSON.stringify({
        assertionLabel,
        assertion,
        assetBase64: Buffer.from(bytes).toString("base64"),
        assetDigest: sha256(bytes),
      }));
      return {
        bytes: credentialed,
        format: "c2pa",
        signerId: "fid-c2pa-test",
        manifestDigest: sha256(credentialed),
        embeddedAt: "2026-09-09T20:03:00.000Z",
      };
    },
    async verify({ bytes, assertionLabel }) {
      try {
        const credentialed = JSON.parse(Buffer.from(bytes).toString("utf8"));
        const valid = credentialed.assertionLabel === assertionLabel
          && credentialed.assetDigest === sha256(Buffer.from(credentialed.assetBase64, "base64"))
          && credentialed.assertion?.side !== rejectSide;
        return {
          valid,
          format: "c2pa",
          signerId: "fid-c2pa-test",
          manifestDigest: valid ? sha256(bytes) : null,
          assertion: valid ? credentialed.assertion : null,
          verifiedAt: "2026-09-09T20:04:00.000Z",
          failureReason: valid ? null : "credential rejected",
        };
      } catch {
        return {
          valid: false,
          format: "c2pa",
          signerId: "fid-c2pa-test",
          manifestDigest: null,
          assertion: null,
          verifiedAt: "2026-09-09T20:04:00.000Z",
          failureReason: "credential unreadable",
        };
      }
    },
  };
}

async function fixture({ revision = 1, idempotencyKey = "d2_mira" } = {}) {
  const registration = buildFibreCivilRegistration({
    threadId: "thr_mira",
    fibreIdentityNumber: "8PKH-A4-VH5R",
    registeredAt: "2026-09-01T12:00:00.000Z",
    birthEventRef: "evt_birth_mira",
    worldRef: "world_d2",
  });
  const workflow = buildFidIssuanceWorkflowRecord({
    request: { threadId: "thr_mira", reason: revision === 1 ? "initial" : "replacement", idempotencyKey },
    civilRegistration: registration,
    proposedRevision: revision,
    requestedAt: "2026-09-09T20:00:00.000Z",
  });
  const photo = {
    width: 8,
    height: 8,
    rgba: new Uint8Array(8 * 8 * 4).map((_, index) => (index * 31) % 256),
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
  const render = renderFidCard({ workflow, photoAdmission: admission, photo });
  const issuerSigner = issuer();
  const payload = buildFidMachineCredentialPayload({
    workflow,
    photoAdmission: admission,
    photo,
    render,
    issuer: issuerSigner.profile,
    issuedAt: "2026-09-09T20:02:00.000Z",
  });
  const machineCredential = await sealFidMachineCredential({
    payload,
    issuerSigner,
    credentialProtector: protector(),
  });
  return { render, machineCredential };
}

test("D2 verifies both FID sides before storing only post-C2PA bytes", async () => {
  const infra = createMemoryInfraDriver();
  const signer = contentSigner();
  const { render, machineCredential } = await fixture();
  const result = await credentialAndStoreFidCard({ infra, contentCredentialSigner: signer, render, machineCredential });

  const front = await infra.objects.get(result.front.objectRef);
  const back = await infra.objects.get(result.back.objectRef);
  assert.equal(front.digest, result.front.finalDigest);
  assert.equal(back.digest, result.back.finalDigest);
  assert.notEqual(front.digest, render.frontRenderDigest);
  assert.notEqual(back.digest, render.backRenderDigest);
  assert.equal(front.metadata.side, "front");
  assert.equal(back.metadata.side, "back");
  assert.equal(front.metadata.rawRenderDigest, render.frontRenderDigest);
  assert.equal(back.metadata.rawRenderDigest, render.backRenderDigest);
  assert.equal(front.metadata.machineCredentialDigest, back.metadata.machineCredentialDigest);

  await verifyFidC2paSide({ contentCredentialSigner: signer, bytes: front.bytes, side: "front", machineCredential });
  await verifyFidC2paSide({ contentCredentialSigner: signer, bytes: back.bytes, side: "back", machineCredential });
});

test("D2 rejects tampering, cross-issuance pairing, and stores nothing before both sides verify", async () => {
  const signer = contentSigner();
  const first = await fixture();
  const infra = createMemoryInfraDriver();
  const stored = await credentialAndStoreFidCard({ infra, contentCredentialSigner: signer, ...first });
  const front = await infra.objects.get(stored.front.objectRef);

  const tampered = front.bytes.slice();
  tampered[0] ^= 1;
  await assert.rejects(() => verifyFidC2paSide({
    contentCredentialSigner: signer,
    bytes: tampered,
    side: "front",
    machineCredential: first.machineCredential,
  }), /verification failed/);

  const second = await fixture({ revision: 2, idempotencyKey: "d2_mira_2" });
  await assert.rejects(() => verifyFidC2paSide({
    contentCredentialSigner: signer,
    bytes: front.bytes,
    side: "front",
    machineCredential: second.machineCredential,
  }), /assertion does not match issuance/);

  const rejectedInfra = createMemoryInfraDriver();
  await assert.rejects(() => credentialAndStoreFidCard({
    infra: rejectedInfra,
    contentCredentialSigner: contentSigner({ rejectSide: "back" }),
    ...first,
  }), /verification failed/);
  assert.equal(await rejectedInfra.objects.head(`fidcard_${first.machineCredential.routing.credentialId}_front`), null);
  assert.equal(await rejectedInfra.objects.head(`fidcard_${first.machineCredential.routing.credentialId}_back`), null);
});

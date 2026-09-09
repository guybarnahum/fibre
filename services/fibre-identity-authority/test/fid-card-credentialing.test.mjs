import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildFibreCivilRegistration } from "#core/src/fibre-civil-identity.mjs";
import { createMemoryInfraDriver } from "#infra/providers/local";
import { createSqliteStateInfraDriver } from "#infra/providers/local/sqlite-state";
import { buildFidIssuanceWorkflowRecord } from "../src/fid-card-issuance-domain.mjs";
import {
  FIBRE_IDENTITY_AUTHORITY_ID,
  FID_C2PA_ASSERTION_LABEL,
  FidCardRegistry,
  buildFidMachineCredentialPayload,
  buildFidPhotoAdmission,
  credentialAndStoreFidCard,
  fidRenderPhotoDigest,
  finalizeFidCardIssuance,
  renderFidCard,
  sealFidMachineCredential,
  verifyFidCard,
  verifyFidC2paSide,
} from "../src/index.mjs";

const FIN = "8PKH-A4-VH5R";

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

async function fixture({ revision = 1, idempotencyKey = "d2_mira", priorActiveCredentialId = null } = {}) {
  const registration = buildFibreCivilRegistration({
    threadId: "thr_mira",
    fibreIdentityNumber: FIN,
    registeredAt: "2026-09-01T12:00:00.000Z",
    birthEventRef: "evt_birth_mira",
    worldRef: "world_d2",
  });
  const workflow = buildFidIssuanceWorkflowRecord({
    request: { threadId: "thr_mira", reason: revision === 1 ? "initial" : "replacement", idempotencyKey },
    civilRegistration: registration,
    proposedRevision: revision,
    priorActiveCredentialId,
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
  const credentialProtector = protector();
  const payload = buildFidMachineCredentialPayload({
    workflow,
    photoAdmission: admission,
    photo,
    render,
    issuer: issuerSigner.profile,
    issuedAt: "2026-09-09T20:02:00.000Z",
  });
  const machineCredential = await sealFidMachineCredential({ payload, issuerSigner, credentialProtector });
  return { workflow, render, machineCredential, issuerSigner, credentialProtector };
}

async function storedBytes(infra, storedCard) {
  const front = await infra.objects.get(storedCard.front.objectRef);
  const back = await infra.objects.get(storedCard.back.objectRef);
  return { front, back };
}

async function withRegistry(run) {
  const root = mkdtempSync(join(tmpdir(), "fibre-fid-e1-"));
  const registry = new FidCardRegistry({
    infraDriver: createSqliteStateInfraDriver({ scopes: { fid: join(root, "fid.sqlite") } }),
    stateScopeId: "fid",
  });
  try { return await run(registry); }
  finally {
    registry.close();
    rmSync(root, { recursive: true, force: true });
  }
}

test("D2 admits only a verified, paired post-C2PA card", async () => {
  const infra = createMemoryInfraDriver();
  const signer = contentSigner();
  const { render, machineCredential } = await fixture();
  const storedCard = await credentialAndStoreFidCard({ infra, contentCredentialSigner: signer, render, machineCredential });
  const { front, back } = await storedBytes(infra, storedCard);

  assert.equal(front.digest, storedCard.front.finalDigest);
  assert.equal(back.digest, storedCard.back.finalDigest);
  assert.notEqual(front.digest, render.frontRenderDigest);
  assert.notEqual(back.digest, render.backRenderDigest);
  await verifyFidC2paSide({ contentCredentialSigner: signer, bytes: front.bytes, side: "front", machineCredential });
  await verifyFidC2paSide({ contentCredentialSigner: signer, bytes: back.bytes, side: "back", machineCredential });
});

test("D2 rejects altered or mismatched cards and never stores a half-verified pair", async () => {
  const signer = contentSigner();
  const first = await fixture();
  const infra = createMemoryInfraDriver();
  const storedCard = await credentialAndStoreFidCard({ infra, contentCredentialSigner: signer, ...first });
  const { front } = await storedBytes(infra, storedCard);

  const tampered = Buffer.from(front.bytes);
  tampered[0] ^= 1;
  await assert.rejects(() => verifyFidC2paSide({
    contentCredentialSigner: signer,
    bytes: tampered,
    side: "front",
    machineCredential: first.machineCredential,
  }));

  const second = await fixture({ revision: 2, idempotencyKey: "d2_mira_2" });
  await assert.rejects(() => verifyFidC2paSide({
    contentCredentialSigner: signer,
    bytes: front.bytes,
    side: "front",
    machineCredential: second.machineCredential,
  }));

  const rejectedInfra = createMemoryInfraDriver();
  await assert.rejects(() => credentialAndStoreFidCard({
    infra: rejectedInfra,
    contentCredentialSigner: contentSigner({ rejectSide: "back" }),
    ...first,
  }));
  assert.equal(await rejectedInfra.objects.head(`fidcard_${first.machineCredential.routing.credentialId}_front`), null);
  assert.equal(await rejectedInfra.objects.head(`fidcard_${first.machineCredential.routing.credentialId}_back`), null);
});

test("E1 preserves an authentic history while active status moves atomically", async () => withRegistry(async (registry) => {
  const infra = createMemoryInfraDriver();
  const signer = contentSigner();
  const first = await fixture();
  const firstStored = await credentialAndStoreFidCard({ infra, contentCredentialSigner: signer, ...first });

  await finalizeFidCardIssuance({
    infra,
    registry,
    workflow: first.workflow,
    storedCard: firstStored,
    machineCredential: first.machineCredential,
    contentCredentialSigner: signer,
    issuerSigner: first.issuerSigner,
    credentialProtector: first.credentialProtector,
    activatedAt: "2026-09-09T20:05:00.000Z",
  });
  assert.equal(registry.getActiveByFin(FIN).credential.credentialId, first.machineCredential.routing.credentialId);
  assert.equal(registry.getIssuanceByCredentialId(first.machineCredential.routing.credentialId).record.front.objectRef, firstStored.front.objectRef);

  const firstBytes = await storedBytes(infra, firstStored);
  const offline = await verifyFidCard({
    contentCredentialSigner: signer,
    machineCredential: first.machineCredential,
    frontBytes: firstBytes.front.bytes,
    backBytes: firstBytes.back.bytes,
  });
  assert.equal(offline.authenticity.valid, true);
  assert.equal(offline.currentValidity.known, false);

  const second = await fixture({
    revision: 2,
    idempotencyKey: "e1_mira_2",
    priorActiveCredentialId: first.machineCredential.routing.credentialId,
  });
  const secondStored = await credentialAndStoreFidCard({ infra, contentCredentialSigner: signer, ...second });
  await assert.rejects(() => finalizeFidCardIssuance({
    infra,
    registry,
    workflow: second.workflow,
    storedCard: { ...secondStored, back: { ...secondStored.back, objectRef: "fidcard_missing_back" } },
    machineCredential: second.machineCredential,
    contentCredentialSigner: signer,
    issuerSigner: second.issuerSigner,
    credentialProtector: second.credentialProtector,
    activatedAt: "2026-09-09T20:06:00.000Z",
  }));
  assert.equal(registry.getActiveByFin(FIN).credential.credentialId, first.machineCredential.routing.credentialId);

  await finalizeFidCardIssuance({
    infra,
    registry,
    workflow: second.workflow,
    storedCard: secondStored,
    machineCredential: second.machineCredential,
    contentCredentialSigner: signer,
    issuerSigner: second.issuerSigner,
    credentialProtector: second.credentialProtector,
    activatedAt: "2026-09-09T20:07:00.000Z",
  });
  assert.equal(registry.getByCredentialId(first.machineCredential.routing.credentialId).status, "superseded");
  assert.equal(registry.getActiveByFin(FIN).credential.credentialId, second.machineCredential.routing.credentialId);
  assert.equal(registry.listByFin(FIN).length, 2);

  const oldOnline = await verifyFidCard({
    contentCredentialSigner: signer,
    machineCredential: first.machineCredential,
    frontBytes: firstBytes.front.bytes,
    backBytes: firstBytes.back.bytes,
    issuerSigner: first.issuerSigner,
    credentialProtector: first.credentialProtector,
    statusAuthority: registry,
  });
  assert.equal(oldOnline.authenticity.valid, true);
  assert.deepEqual(oldOnline.currentValidity, { known: true, status: "superseded", active: false });

  registry.revokeCredential({
    credentialId: second.machineCredential.routing.credentialId,
    reason: "operator_revocation",
    occurredAt: "2026-09-09T20:08:00.000Z",
  });
  assert.equal(registry.getActiveByFin(FIN), null);

  const secondBytes = await storedBytes(infra, secondStored);
  const revokedOnline = await verifyFidCard({
    contentCredentialSigner: signer,
    machineCredential: second.machineCredential,
    frontBytes: secondBytes.front.bytes,
    backBytes: secondBytes.back.bytes,
    issuerSigner: second.issuerSigner,
    credentialProtector: second.credentialProtector,
    statusAuthority: registry,
  });
  assert.equal(revokedOnline.authenticity.valid, true);
  assert.deepEqual(revokedOnline.currentValidity, { known: true, status: "revoked", active: false });
}));

import assert from "node:assert/strict";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign as nodeSign,
  verify as nodeVerify,
} from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildFibreCivilRegistration } from "#core/src/fibre-civil-identity.mjs";
import { createMemoryInfraDriver } from "#infra/providers/local";
import { createSqliteStateInfraDriver } from "#infra/providers/local/sqlite-state";
import { buildFidIssuanceWorkflowRecord } from "../src/fid-card-issuance-domain.mjs";
import {
  FidCardRegistry,
  buildFidMachineCredentialPayload,
  buildFidPhotoAdmission,
  fidRenderPhotoDigest,
  finalizeFidCardIssuance,
  protectAndStoreFidCard,
  renderFidCard,
  sealFidMachineCredential,
  verifyFidCardProofPair,
} from "../src/index.mjs";
import { oceanFidTemplate } from "./fid-card-test-template.mjs";

const FIN = "8PKH-A4-VH5R";

function issuer({ rejectBack = false } = {}) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    profile:{
      authorityId:"fibre_identity_authority",
      keyId:"fia-native-proof-test",
      algorithm:"Ed25519",
      publicKeyRef:"test:fia-native-proof-test",
      trustPolicy:"fid-test-trust-v1",
    },
    async sign(message) {
      return nodeSign(null, Buffer.from(message), privateKey);
    },
    async verify(message, signature) {
      if (rejectBack) {
        try {
          const parsed = JSON.parse(Buffer.from(message).toString("utf8"));
          if (parsed?.side === "back") return false;
        } catch {}
      }
      return nodeVerify(null, Buffer.from(message), publicKey, Buffer.from(signature));
    },
  };
}

function protector(key = randomBytes(32)) {
  return {
    profile:{ policyId:"fid-native-private-test", keyId:"fid-native-reader-test" },
    async seal({ plaintext, aad }) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(Buffer.from(aad));
      const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final(), cipher.getAuthTag()]);
      return { ciphertext, parameters:{ ivBase64:iv.toString("base64") } };
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

async function fixture({ issuerSigner = issuer(), credentialProtector = protector() } = {}) {
  const registration = buildFibreCivilRegistration({
    threadId:"thr_native_proof",
    fibreIdentityNumber:FIN,
    registeredAt:"2026-09-20T01:00:00.000Z",
    birthEventRef:"evt_native_proof",
    worldRef:"world_native_proof",
  });
  const workflow = buildFidIssuanceWorkflowRecord({
    request:{ threadId:"thr_native_proof", reason:"initial", idempotencyKey:"native_proof_1" },
    civilRegistration:registration,
    proposedRevision:1,
    requestedAt:"2026-09-20T01:01:00.000Z",
  });
  const photo = {
    width:8,
    height:8,
    rgba:new Uint8Array(8 * 8 * 4).map((_, index) => (index * 23) % 256),
  };
  const admission = buildFidPhotoAdmission({
    workflow,
    source:{
      role:"official_id_photo",
      threadId:workflow.threadId,
      candidatePhotoRef:"obj_native_photo",
      candidatePhotoDigest:fidRenderPhotoDigest(photo),
      canonicalVisualReferenceRef:"obj_native_visual",
      canonicalVisualReferenceDigest:`sha256:${"b".repeat(64)}`,
      derivationReceiptRef:"receipt_native_photo",
      sourceReferences:["obj_native_visual"],
      targetAgeYears:31,
    },
    inspection:{
      faceCount:1,
      faceVisible:true,
      occlusionAcceptable:true,
      cropCompliant:true,
      dimensionsCompliant:true,
      poseCompliant:true,
      framingCompliant:true,
      visualIdentityConsistent:true,
      ageConsistent:true,
    },
    admittedAt:"2026-09-20T01:02:00.000Z",
  });
  const issuedAt = "2026-09-20T01:03:00.000Z";
  const render = renderFidCard({
    workflow,
    photoAdmission:admission,
    photo,
    authorizedIdentity:{
      threadId:workflow.threadId,
      fibreIdentityNumber:FIN,
      displayName:"Mira Vale",
      birthDate:"1995-04-12",
    },
    issuedAt,
    template:await oceanFidTemplate(),
  });
  const payload = buildFidMachineCredentialPayload({
    workflow,
    photoAdmission:admission,
    photo,
    render,
    issuer:issuerSigner.profile,
    issuedAt,
  });
  const machineCredential = await sealFidMachineCredential({
    payload,
    issuerSigner,
    credentialProtector,
  });
  return {
    workflow,
    render,
    payload,
    machineCredential,
    issuerSigner,
    credentialProtector,
  };
}

async function withRegistry(run) {
  const root = mkdtempSync(join(tmpdir(), "fibre-native-proof-e-"));
  const registry = new FidCardRegistry({
    infraDriver:createSqliteStateInfraDriver({ scopes:{ fid:join(root, "fid.sqlite") } }),
    stateScopeId:"fid",
  });
  try { return await run(registry); }
  finally {
    registry.close();
    rmSync(root, { recursive:true, force:true });
  }
}

test("native FIN proof protects both sides, stores them, and finalizes only after re-verification", async () => withRegistry(async (registry) => {
  const infra = createMemoryInfraDriver();
  const prepared = await fixture();
  const storedCard = await protectAndStoreFidCard({
    infra,
    render:prepared.render,
    machineCredential:prepared.machineCredential,
    machineCredentialPayload:prepared.payload,
    issuerSigner:prepared.issuerSigner,
  });

  const [front, back] = await Promise.all([
    infra.objects.get(storedCard.front.objectRef),
    infra.objects.get(storedCard.back.objectRef),
  ]);
  assert.notEqual(front, null);
  assert.notEqual(back, null);
  assert.notEqual(front.digest, prepared.render.frontRenderDigest);
  assert.notEqual(back.digest, prepared.render.backRenderDigest);
  assert.match(storedCard.front.proofAssertionDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.match(storedCard.back.proofAssertionDigest, /^sha256:[0-9a-f]{64}$/u);

  const pair = await verifyFidCardProofPair({
    frontPngBytes:front.bytes,
    backPngBytes:back.bytes,
    issuerSigner:prepared.issuerSigner,
  });
  assert.equal(pair.verified, true);

  const finalized = await finalizeFidCardIssuance({
    infra,
    registry,
    workflow:prepared.workflow,
    storedCard,
    machineCredential:prepared.machineCredential,
    contentCredentialMode:"native",
    issuerSigner:prepared.issuerSigner,
    credentialProtector:prepared.credentialProtector,
    activatedAt:"2026-09-20T01:04:00.000Z",
  });
  assert.equal(finalized.status, "active");
  assert.equal(finalized.credential.credentialId, prepared.payload.credentialId);
  assert.equal(registry.getActiveByFin(FIN).credential.credentialId, prepared.payload.credentialId);

  const issuance = registry.getIssuanceByCredentialId(prepared.payload.credentialId).record;
  assert.equal(issuance.front.manifestDigest, null);
  assert.equal(issuance.back.manifestDigest, null);
  assert.deepEqual(issuance.c2pa, {
    signerId:null,
    trustPolicy:null,
    validationStatus:"disabled",
  });
}));

test("native FIN proof verifies both sides before storing either object", async () => {
  const infra = createMemoryInfraDriver();
  const issuerSigner = issuer({ rejectBack:true });
  const prepared = await fixture({ issuerSigner });

  await assert.rejects(
    () => protectAndStoreFidCard({
      infra,
      render:prepared.render,
      machineCredential:prepared.machineCredential,
      machineCredentialPayload:prepared.payload,
      issuerSigner,
    }),
    /back verification failed: invalid_signature/u,
  );

  assert.equal(await infra.objects.head(`fidcard_${prepared.payload.credentialId}_front`), null);
  assert.equal(await infra.objects.head(`fidcard_${prepared.payload.credentialId}_back`), null);
});

test("finalization refuses stored native proof bytes that no longer match the admitted proof evidence", async () => withRegistry(async (registry) => {
  const infra = createMemoryInfraDriver();
  const prepared = await fixture();
  const storedCard = await protectAndStoreFidCard({
    infra,
    render:prepared.render,
    machineCredential:prepared.machineCredential,
    machineCredentialPayload:prepared.payload,
    issuerSigner:prepared.issuerSigner,
  });

  const changed = {
    ...storedCard,
    front:{
      ...storedCard.front,
      proofAssertionDigest:`sha256:${"0".repeat(64)}`,
    },
  };
  await assert.rejects(
    () => finalizeFidCardIssuance({
      infra,
      registry,
      workflow:prepared.workflow,
      storedCard:changed,
      machineCredential:prepared.machineCredential,
      contentCredentialMode:"native",
      issuerSigner:prepared.issuerSigner,
      credentialProtector:prepared.credentialProtector,
      activatedAt:"2026-09-20T01:04:00.000Z",
    }),
    /stored native proof identity changed/u,
  );
  assert.equal(registry.getActiveByFin(FIN), null);
}));

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildFibreCivilRegistration } from "#core/src/fibre-civil-identity.mjs";
import { createMemoryInfraDriver } from "#infra/providers/local";
import { createSqliteStateInfraDriver } from "#infra/providers/local/sqlite-state";
import { createCivilRegistryReadService } from "#services/world-kernel/public/civil-registry-service.mjs";
import {
  FIBRE_IDENTITY_AUTHORITY_ID,
  FID_C2PA_ASSERTION_LABEL,
  FidCardIssuanceStore,
  FidCardRegistry,
  FidPhotoAdmissionStore,
  createFibreIdentityAuthority,
  createFidCardIssuanceExecutor,
  fidRenderPhotoDigest,
} from "../src/index.mjs";

const FIN = "8PKH-A4-VH5R";
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

function issuer() {
  const key = Buffer.from("fid-cut-test-key");
  return {
    profile: { authorityId: FIBRE_IDENTITY_AUTHORITY_ID, keyId: "fid-cut", publicKeyRef: "test:fid-cut", trustPolicy: "fid-test-v1" },
    async sign(bytes) { return createHash("sha256").update(key).update(bytes).digest(); },
    async verify(bytes, signature) { return Buffer.from(signature).equals(createHash("sha256").update(key).update(bytes).digest()); },
  };
}

function protector() {
  return {
    profile: { policyId: "fid-test-private", keyId: "fid-test-reader" },
    async seal({ plaintext }) { return { ciphertext: Buffer.from(plaintext).reverse(), parameters: {} }; },
    async open({ ciphertext }) { return Buffer.from(ciphertext).reverse(); },
  };
}

function c2pa() {
  return {
    signerVersion: "content-credential-signer-v0.1",
    signerId: "fid-cut-c2pa",
    format: "c2pa",
    trustPolicy: "fid-test-v1",
    async embed({ bytes, assertion, assertionLabel }) {
      assert.equal(assertionLabel, FID_C2PA_ASSERTION_LABEL, "FID assertion label changed");
      const embedded = Buffer.from(JSON.stringify({ assertionLabel, assertion, bytes: Buffer.from(bytes).toString("base64") }));
      return { bytes: embedded, format: "c2pa", signerId: "fid-cut-c2pa", manifestDigest: sha256(embedded), embeddedAt: "2026-09-18T20:00:00.000Z" };
    },
    async verify({ bytes, assertionLabel }) {
      const embedded = JSON.parse(Buffer.from(bytes).toString("utf8"));
      const valid = embedded.assertionLabel === assertionLabel;
      return { valid, format: "c2pa", signerId: "fid-cut-c2pa", manifestDigest: valid ? sha256(bytes) : null, assertion: valid ? embedded.assertion : null, verifiedAt: "2026-09-18T20:00:01.000Z", failureReason: valid ? null : "wrong assertion" };
    },
  };
}

test("cutting by Thread then FIN reissues one civil identity and preserves card history", async () => {
  const root = mkdtempSync(join(tmpdir(), "fibre-fid-cut-"));
  const storage = {
    infraDriver: createSqliteStateInfraDriver({ scopes: { fid: join(root, "fid.sqlite") } }),
    stateScopeId: "fid",
  };
  const registry = new FidCardRegistry(storage);
  const issuanceStore = new FidCardIssuanceStore(storage);
  const admissions = new FidPhotoAdmissionStore(storage);
  try {
    const registration = buildFibreCivilRegistration({
      threadId: "thr_mira",
      fibreIdentityNumber: FIN,
      registeredAt: "2026-09-01T12:00:00.000Z",
      birthEventRef: "evt_birth_mira",
      worldRef: "world_fid_cut",
    });
    const civilRegistry = createCivilRegistryReadService({
      authority: {
        getCivilRegistrationByThreadId: (id, { required = true } = {}) => id === registration.threadId ? registration : (required ? (() => { throw new Error("missing Thread"); })() : null),
        getCivilRegistrationByFin: (fin, { required = true } = {}) => fin === FIN ? registration : (required ? (() => { throw new Error("missing FIN"); })() : null),
      },
    });
    const photo = { width: 8, height: 8, rgba: new Uint8Array(8 * 8 * 4).map((_, i) => (i * 29) % 256) };
    const source = {
      role: "official_id_photo",
      threadId: registration.threadId,
      candidatePhotoRef: "fid_photo_mira",
      candidatePhotoDigest: fidRenderPhotoDigest(photo),
      canonicalVisualReferenceRef: "visual_mira",
      canonicalVisualReferenceDigest: `sha256:${"b".repeat(64)}`,
      derivationReceiptRef: "receipt_mira",
      sourceReferences: ["visual_mira"],
      targetAgeYears: 22,
    };
    const inspection = {
      faceCount: 1, faceVisible: true, occlusionAcceptable: true, cropCompliant: true,
      dimensionsCompliant: true, poseCompliant: true, framingCompliant: true,
      visualIdentityConsistent: true, ageConsistent: true,
    };
    let tick = 0;
    const now = () => new Date(Date.parse("2026-09-18T20:00:10.000Z") + tick++ * 1000).toISOString();
    const authority = createFibreIdentityAuthority({
      civilRegistry,
      issuanceStore,
      registry,
      photoAdmissionStore: admissions,
      photoSource: { resolveCandidate: async () => source },
      photoExaminer: { inspect: async () => inspection },
      now,
    });
    const executor = createFidCardIssuanceExecutor({
      authority,
      threadRegistry: { get: async () => ({ threadId: "thr_mira", fibreIdentityNumber: FIN, displayName: "Mira Vale", birthDate: "2004-03-18" }) },
      registry,
      infra: createMemoryInfraDriver(),
      contentCredentialSigner: c2pa(),
      issuerSigner: issuer(),
      credentialProtector: protector(),
      loadPhoto: async () => photo,
      now,
    });

    const first = await executor.cut({ threadId: "thr_mira", idempotencyKey: "cut_mira_1" });
    assert.equal(first.state, "active", "first card was not activated");
    assert.equal(first.credential.revision, 1, "first card revision is wrong");
    assert.equal(first.identitySnapshot.displayName, "Mira Vale", "Thread name was not credentialed");
    assert.deepEqual(first.identitySnapshot.dateField, { kind: "birth_date", value: "2004-03-18" }, "Thread birth date was not credentialed");

    const repeated = await executor.cut({ threadId: "thr_mira", idempotencyKey: "cut_mira_1" });
    assert.equal(repeated.reused, true, "same cut did not reuse its credential");
    assert.equal(repeated.credential.credentialId, first.credential.credentialId, "same cut changed credential identity");

    const second = await executor.cut({ fin: FIN, idempotencyKey: "cut_mira_2" });
    assert.equal(second.credential.revision, 2, "reissue did not advance revision");
    assert.equal(second.credential.supersedesCredentialId, first.credential.credentialId, "reissue did not supersede the active card");
    assert.equal(registry.getByCredentialId(first.credential.credentialId).status, "superseded", "old card stayed active");
    assert.equal(registry.getActiveByFin(FIN).credential.credentialId, second.credential.credentialId, "new card is not active");
    assert.equal(registry.listByFin(FIN).length, 2, "card history was not preserved");
  } finally {
    admissions.close();
    issuanceStore.close();
    registry.close();
    rmSync(root, { recursive: true, force: true });
  }
});

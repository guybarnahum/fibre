import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { createFidCredentialCrypto } from "../../../integrations/fid-credentials/webcrypto.mjs";
import {
  FID_CARD_PROOF_ENVELOPE_VERSION,
  FID_CARD_PROOF_SCHEMA,
  FID_CARD_PROOF_SIGNATURE_ALGORITHM,
  FID_MACHINE_CREDENTIAL_SCHEMA,
  buildFidCardProofAssertion,
  fidCardProofAssertionDigest,
  fidCardProofAssertionJson,
  normalizeFidCardProofAssertion,
  normalizeFidCardProofEnvelope,
  signFidCardProofAssertion,
  verifyFidCardProofEnvelope,
} from "../src/index.mjs";

const FRONT_DIGEST = `sha256:${"a".repeat(64)}`;
const BACK_DIGEST = `sha256:${"b".repeat(64)}`;
const CIVIL_DIGEST = `sha256:${"c".repeat(64)}`;
const PHOTO_DIGEST = `sha256:${"d".repeat(64)}`;

function canonical(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function digest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")}`;
}

function payload(overrides = {}) {
  const identitySnapshot = {
    credentialId:"fidc_proof_001",
    revision:2,
    threadId:"thr_proof",
    fibreIdentityNumber:"8PKH-A4-VH5R",
    registrationId:"registration_proof",
    civilRegistrationDigest:CIVIL_DIGEST,
    requestedAt:"2026-09-20T00:00:00.000Z",
    displayName:"Sara Mizrahi",
    dateField:{ kind:"birth_date", value:"2004-08-20" },
  };
  return {
    schema:FID_MACHINE_CREDENTIAL_SCHEMA,
    credentialId:"fidc_proof_001",
    revision:2,
    fin:"8PKH-A4-VH5R",
    threadId:"thr_proof",
    registrationId:"registration_proof",
    civilRegistrationDigest:CIVIL_DIGEST,
    templateVersion:"fid-card-template-v0.3-ocean",
    identitySnapshot,
    photo:{
      encoding:"rgba8",
      width:1,
      height:1,
      bytesBase64:"AAAAAA==",
      digest:PHOTO_DIGEST,
      canonicalVisualReferenceDigest:`sha256:${"e".repeat(64)}`,
      provenanceDigest:`sha256:${"f".repeat(64)}`,
      admissionReceiptDigest:`sha256:${"1".repeat(64)}`,
      admissionId:"photo_admission_proof",
      derivationReceiptRef:"derivation_proof",
    },
    issuedAt:"2026-09-20T00:01:00.000Z",
    expiresAt:null,
    issuer:{
      authorityId:"fibre_identity_authority",
      keyId:"fibre-fia-production-v1",
      publicKeyRef:"urn:fibre:fid-key:fibre-fia-production-v1",
      trustPolicy:"fibre_fid_issuer_v1",
    },
    frontRenderDigest:FRONT_DIGEST,
    backRenderDigest:BACK_DIGEST,
    ...overrides,
  };
}

function realIssuer({ keyId = "fibre-fia-production-v1" } = {}) {
  const { privateKey } = generateKeyPairSync("ed25519");
  const jwk = privateKey.export({ format:"jwk" });
  return createFidCredentialCrypto({
    FIA_ISSUER_JWK:JSON.stringify(jwk),
    FIA_ISSUER_KEY_ID:keyId,
    FIA_CREDENTIAL_KEY_BASE64:Buffer.alloc(32, 9).toString("base64"),
  }).issuerSigner;
}

test("FIN proof exposes only the public FIA facts bound to one rendered side", () => {
  const machinePayload = payload();
  const proof = buildFidCardProofAssertion({ payload:machinePayload, side:"front" });

  assert.deepEqual(proof, {
    schema:FID_CARD_PROOF_SCHEMA,
    credentialId:"fidc_proof_001",
    revision:2,
    side:"front",
    identity:{
      fin:"8PKH-A4-VH5R",
      displayName:"Sara Mizrahi",
      dateField:{ kind:"birth_date", value:"2004-08-20" },
    },
    issuedAt:"2026-09-20T00:01:00.000Z",
    expiresAt:null,
    templateVersion:"fid-card-template-v0.3-ocean",
    registrationId:"registration_proof",
    civilRegistrationDigest:CIVIL_DIGEST,
    identitySnapshotDigest:digest(machinePayload.identitySnapshot),
    photoDigest:PHOTO_DIGEST,
    rawRenderDigest:FRONT_DIGEST,
    issuer:{
      authorityId:"fibre_identity_authority",
      keyId:"fibre-fia-production-v1",
    },
  });

  const json = fidCardProofAssertionJson(proof);
  for (const forbidden of [
    "threadId",
    "bytesBase64",
    "encryptedCredential",
    "trustPolicy",
    "publicKeyRef",
  ]) {
    assert.equal(json.includes(forbidden), false, `public FIN proof leaked ${forbidden}`);
  }
});

test("front and back proofs share issuance facts but bind different raw render bytes", () => {
  const machinePayload = payload();
  const front = buildFidCardProofAssertion({ payload:machinePayload, side:"front" });
  const back = buildFidCardProofAssertion({ payload:machinePayload, side:"back" });

  assert.equal(front.rawRenderDigest, FRONT_DIGEST);
  assert.equal(back.rawRenderDigest, BACK_DIGEST);
  assert.equal(front.credentialId, back.credentialId);
  assert.equal(front.revision, back.revision);
  assert.deepEqual(front.identity, back.identity);
  assert.equal(front.identitySnapshotDigest, back.identitySnapshotDigest);
  assert.notEqual(fidCardProofAssertionDigest(front), fidCardProofAssertionDigest(back));
});

test("FIN proof canonical JSON and digest are deterministic", () => {
  const proof = buildFidCardProofAssertion({ payload:payload(), side:"front" });
  const reordered = Object.fromEntries(Object.entries(proof).reverse());

  assert.equal(fidCardProofAssertionJson(reordered), fidCardProofAssertionJson(proof));
  assert.equal(fidCardProofAssertionDigest(reordered), fidCardProofAssertionDigest(proof));
  assert.match(fidCardProofAssertionDigest(proof), /^sha256:[0-9a-f]{64}$/u);
});

test("FIN proof validation fails closed on malformed or authority-mismatched input", () => {
  const proof = buildFidCardProofAssertion({ payload:payload(), side:"front" });
  assert.throws(
    () => normalizeFidCardProofAssertion({ ...proof, unexpected:true }),
    /must contain exactly/u,
  );
  assert.throws(
    () => buildFidCardProofAssertion({
      payload:payload({
        identitySnapshot:{ ...payload().identitySnapshot, fibreIdentityNumber:"2AAA-AA-AAAA" },
      }),
      side:"front",
    }),
    /identity snapshot does not match/u,
  );
  assert.throws(
    () => buildFidCardProofAssertion({ payload:payload(), side:"edge" }),
    /front or back/u,
  );
});

test("FIN proof envelope signs canonical assertion bytes with the FIA Ed25519 issuer", async () => {
  const issuerSigner = realIssuer();
  const assertion = buildFidCardProofAssertion({ payload:payload(), side:"front" });
  const envelope = await signFidCardProofAssertion({ assertion, issuerSigner });

  assert.equal(envelope.envelopeVersion, FID_CARD_PROOF_ENVELOPE_VERSION);
  assert.equal(envelope.assertionDigest, fidCardProofAssertionDigest(assertion));
  assert.equal(envelope.signature.algorithm, FID_CARD_PROOF_SIGNATURE_ALGORITHM);
  assert.equal(envelope.signature.authorityId, "fibre_identity_authority");
  assert.equal(envelope.signature.keyId, assertion.issuer.keyId);
  assert.match(envelope.signature.bytesBase64, /^[A-Za-z0-9+/]+={0,2}$/u);
  assert.equal(await verifyFidCardProofEnvelope({ envelope, issuerSigner }), true);
});

test("FIN proof envelope verification fails closed on assertion or signature mutation", async () => {
  const issuerSigner = realIssuer();
  const assertion = buildFidCardProofAssertion({ payload:payload(), side:"front" });
  const envelope = await signFidCardProofAssertion({ assertion, issuerSigner });

  const changedAssertion = structuredClone(envelope);
  changedAssertion.assertion.identity.displayName = "Mallory";
  assert.equal(await verifyFidCardProofEnvelope({ envelope:changedAssertion, issuerSigner }), false);

  const changedSignature = structuredClone(envelope);
  const signatureBytes = Buffer.from(changedSignature.signature.bytesBase64, "base64");
  signatureBytes[0] ^= 1;
  changedSignature.signature.bytesBase64 = signatureBytes.toString("base64");
  assert.equal(await verifyFidCardProofEnvelope({ envelope:changedSignature, issuerSigner }), false);

  const changedKeyId = structuredClone(envelope);
  changedKeyId.signature.keyId = "fibre-fia-other-key";
  assert.equal(await verifyFidCardProofEnvelope({ envelope:changedKeyId, issuerSigner }), false);
});

test("FIN proof envelope cannot be verified by a different FIA key", async () => {
  const issuerSigner = realIssuer();
  const wrongSigner = realIssuer();
  const assertion = buildFidCardProofAssertion({ payload:payload(), side:"back" });
  const envelope = await signFidCardProofAssertion({ assertion, issuerSigner });

  assert.equal(await verifyFidCardProofEnvelope({ envelope, issuerSigner }), true);
  assert.equal(await verifyFidCardProofEnvelope({ envelope, issuerSigner:wrongSigner }), false);
});

test("FIN proof envelope rejects non-Ed25519 or issuer-mismatched envelopes", async () => {
  const issuerSigner = realIssuer();
  const assertion = buildFidCardProofAssertion({ payload:payload(), side:"front" });
  const envelope = await signFidCardProofAssertion({ assertion, issuerSigner });

  assert.throws(
    () => normalizeFidCardProofEnvelope({
      ...envelope,
      signature:{ ...envelope.signature, algorithm:"ES256" },
    }),
    /algorithm is unsupported/u,
  );
  await assert.rejects(
    () => signFidCardProofAssertion({
      assertion,
      issuerSigner:realIssuer({ keyId:"different-key" }),
    }),
    /does not match signer profile/u,
  );
});


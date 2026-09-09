import { createHash } from "node:crypto";

import { normalizeFidIssuanceWorkflowRecord } from "./fid-card-issuance-domain.mjs";
import { assertFidPhotoAdmissionReceipt, fidPhotoAdmissionDigest } from "./fid-photo-admission.mjs";
import { fidRenderPhotoDigest } from "./fid-card-renderer.mjs";

export const FID_MACHINE_CREDENTIAL_SCHEMA = "fibre.fid-card.v1";
export const FID_MACHINE_ENVELOPE_VERSION = "fid-card-machine-envelope-v0.1";
export const FIBRE_IDENTITY_AUTHORITY_ID = "fibre_identity_authority";

const DIGEST = /^sha256:[0-9a-f]{64}$/;

function canonical(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function bytes(value) { return Buffer.from(JSON.stringify(canonical(value))); }
function sha256(value) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}
function digest(name, value) {
  if (typeof value !== "string" || !DIGEST.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}
function iso(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new TypeError(`${name} must be an ISO timestamp`);
  return new Date(value).toISOString();
}

function issuerProfile(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("FID issuer profile is required");
  if (value.authorityId !== FIBRE_IDENTITY_AUTHORITY_ID) throw new TypeError("FID issuer must be Fibre Identity Authority");
  return Object.freeze({
    authorityId: value.authorityId,
    keyId: nonEmpty("FID issuer keyId", value.keyId),
    publicKeyRef: value.publicKeyRef == null ? null : nonEmpty("FID issuer publicKeyRef", value.publicKeyRef),
    trustPolicy: nonEmpty("FID issuer trustPolicy", value.trustPolicy),
  });
}

function signer(value) {
  if (!value || typeof value.sign !== "function" || typeof value.verify !== "function") {
    throw new TypeError("FID issuer signer must expose sign() and verify()");
  }
  return { ...value, profile: issuerProfile(value.profile) };
}

function protector(value) {
  if (!value || typeof value.seal !== "function" || typeof value.open !== "function") {
    throw new TypeError("FID credential protector must expose seal() and open()");
  }
  if (!value.profile || typeof value.profile !== "object") throw new TypeError("FID credential protector profile is required");
  return {
    ...value,
    profile: Object.freeze({
      policyId: nonEmpty("FID protection policyId", value.profile.policyId),
      keyId: nonEmpty("FID protection keyId", value.profile.keyId),
    }),
  };
}

function identitySnapshot(workflow) {
  return Object.freeze({
    credentialId: workflow.proposedCredentialId,
    revision: workflow.proposedRevision,
    threadId: workflow.threadId,
    fibreIdentityNumber: workflow.fibreIdentityNumber,
    registrationId: workflow.registrationId,
    civilRegistrationDigest: workflow.civilRegistrationDigest,
    requestedAt: workflow.requestedAt,
  });
}

function renderDigest(value) { return sha256(bytes(value)); }

export function buildFidMachineCredentialPayload({
  workflow: rawWorkflow,
  photoAdmission: rawAdmission,
  photo,
  render,
  issuer,
  issuedAt,
  expiresAt = null,
}) {
  const workflow = normalizeFidIssuanceWorkflowRecord(rawWorkflow);
  const admission = assertFidPhotoAdmissionReceipt(rawAdmission);
  const profile = issuerProfile(issuer);
  if (admission.decision !== "accepted" || admission.workflowId !== workflow.workflowId || admission.threadId !== workflow.threadId) {
    throw new TypeError("FID machine credential requires this issuance's accepted photo admission");
  }
  if (!photo || !(photo.rgba instanceof Uint8Array) || !Number.isSafeInteger(photo.width) || !Number.isSafeInteger(photo.height)
    || photo.rgba.length !== photo.width * photo.height * 4) {
    throw new TypeError("FID machine credential photo must be the normalized RGBA render photo");
  }
  if (fidRenderPhotoDigest(photo) !== admission.candidatePhotoDigest) throw new TypeError("FID machine credential photo does not match admission");

  const snapshot = identitySnapshot(workflow);
  const expectedSnapshotDigest = renderDigest(snapshot);
  if (!render || render.credentialId !== workflow.proposedCredentialId || render.revision !== workflow.proposedRevision
    || render.photoAdmissionId !== admission.admissionId || render.identitySnapshotDigest !== expectedSnapshotDigest) {
    throw new TypeError("FID machine credential render does not match issuance material");
  }
  digest("FID front render digest", render.frontRenderDigest);
  digest("FID back render digest", render.backRenderDigest);

  return Object.freeze({
    schema: FID_MACHINE_CREDENTIAL_SCHEMA,
    credentialId: workflow.proposedCredentialId,
    revision: workflow.proposedRevision,
    fin: workflow.fibreIdentityNumber,
    threadId: workflow.threadId,
    registrationId: workflow.registrationId,
    civilRegistrationDigest: workflow.civilRegistrationDigest,
    identitySnapshot: snapshot,
    photo: Object.freeze({
      encoding: "rgba8",
      width: photo.width,
      height: photo.height,
      bytesBase64: Buffer.from(photo.rgba).toString("base64"),
      digest: admission.candidatePhotoDigest,
      canonicalVisualReferenceDigest: admission.canonicalVisualReferenceDigest,
      provenanceDigest: admission.provenanceDigest,
      admissionReceiptDigest: fidPhotoAdmissionDigest(admission),
      admissionId: admission.admissionId,
      derivationReceiptRef: admission.derivationReceiptRef,
    }),
    issuedAt: iso("FID issuedAt", issuedAt),
    expiresAt: expiresAt == null ? null : iso("FID expiresAt", expiresAt),
    issuer: profile,
    frontRenderDigest: render.frontRenderDigest,
    backRenderDigest: render.backRenderDigest,
  });
}

export function fidMachineCredentialBytes(payload) { return bytes(payload); }

export async function signFidMachineCredentialPayload(payload, issuerSigner) {
  const checkedSigner = signer(issuerSigner);
  const canonicalBytes = fidMachineCredentialBytes(payload);
  const signatureBytes = await checkedSigner.sign(canonicalBytes);
  if (!(signatureBytes instanceof Uint8Array)) throw new TypeError("FID issuer sign() must return Uint8Array");
  return Object.freeze({
    payload,
    payloadDigest: sha256(canonicalBytes),
    signature: Object.freeze({
      authorityId: checkedSigner.profile.authorityId,
      keyId: checkedSigner.profile.keyId,
      bytesBase64: Buffer.from(signatureBytes).toString("base64"),
    }),
  });
}

export async function verifyFidMachineCredentialSignature(signedCredential, issuerSigner) {
  const checkedSigner = signer(issuerSigner);
  if (!signedCredential?.payload || !signedCredential?.signature) return false;
  if (signedCredential.payload.issuer?.authorityId !== checkedSigner.profile.authorityId
    || signedCredential.payload.issuer?.keyId !== checkedSigner.profile.keyId
    || signedCredential.signature.authorityId !== checkedSigner.profile.authorityId
    || signedCredential.signature.keyId !== checkedSigner.profile.keyId) return false;
  const canonicalBytes = fidMachineCredentialBytes(signedCredential.payload);
  if (signedCredential.payloadDigest !== sha256(canonicalBytes)) return false;
  return checkedSigner.verify(canonicalBytes, Buffer.from(signedCredential.signature.bytesBase64, "base64"));
}

function routingFor(payload) {
  return Object.freeze({
    schema: payload.schema,
    credentialId: payload.credentialId,
    revision: payload.revision,
    issuerAuthorityId: payload.issuer.authorityId,
    issuerKeyId: payload.issuer.keyId,
    issuedAt: payload.issuedAt,
    frontRenderDigest: payload.frontRenderDigest,
    backRenderDigest: payload.backRenderDigest,
  });
}

function aadFor(envelope) {
  return bytes({ envelopeVersion: envelope.envelopeVersion, routing: envelope.routing, protection: envelope.protection });
}

export async function sealFidMachineCredential({ payload, issuerSigner, credentialProtector }) {
  const checkedSigner = signer(issuerSigner);
  const checkedProtector = protector(credentialProtector);
  if (payload?.issuer?.authorityId !== checkedSigner.profile.authorityId || payload?.issuer?.keyId !== checkedSigner.profile.keyId) {
    throw new TypeError("FID payload issuer does not match signer profile");
  }
  const signed = await signFidMachineCredentialPayload(payload, checkedSigner);
  const envelope = {
    envelopeVersion: FID_MACHINE_ENVELOPE_VERSION,
    routing: routingFor(payload),
    protection: Object.freeze({
      policyId: checkedProtector.profile.policyId,
      keyId: checkedProtector.profile.keyId,
    }),
  };
  const sealed = await checkedProtector.seal({ plaintext: bytes(signed), aad: aadFor(envelope) });
  if (!(sealed?.ciphertext instanceof Uint8Array)) throw new TypeError("FID credential protector seal() must return ciphertext bytes");
  return Object.freeze({
    ...envelope,
    parameters: structuredClone(sealed.parameters ?? {}),
    encryptedCredentialDigest: sha256(sealed.ciphertext),
    encryptedCredentialBase64: Buffer.from(sealed.ciphertext).toString("base64"),
  });
}

export async function openFidMachineCredential(envelope, { issuerSigner, credentialProtector }) {
  const checkedSigner = signer(issuerSigner);
  const checkedProtector = protector(credentialProtector);
  if (envelope?.envelopeVersion !== FID_MACHINE_ENVELOPE_VERSION) throw new TypeError("FID machine envelope version is unsupported");
  if (envelope.protection?.policyId !== checkedProtector.profile.policyId || envelope.protection?.keyId !== checkedProtector.profile.keyId) {
    throw new TypeError("FID machine envelope protection profile is not authorized");
  }
  const ciphertext = Buffer.from(nonEmpty("FID encrypted credential", envelope.encryptedCredentialBase64), "base64");
  if (sha256(ciphertext) !== digest("FID encrypted credential digest", envelope.encryptedCredentialDigest)) {
    throw new TypeError("FID encrypted credential digest mismatch");
  }
  const plaintext = await checkedProtector.open({ ciphertext, parameters: envelope.parameters ?? {}, aad: aadFor(envelope) });
  const signed = JSON.parse(Buffer.from(plaintext).toString("utf8"));
  if (!(await verifyFidMachineCredentialSignature(signed, checkedSigner))) throw new TypeError("FID issuer signature verification failed");
  const payload = signed.payload;
  const photoBytes = Buffer.from(nonEmpty("FID embedded photo bytes", payload.photo?.bytesBase64), "base64");
  const recoveredPhoto = { width: payload.photo.width, height: payload.photo.height, rgba: new Uint8Array(photoBytes) };
  if (fidRenderPhotoDigest(recoveredPhoto) !== digest("FID embedded photo digest", payload.photo.digest)) {
    throw new TypeError("FID embedded photo digest mismatch");
  }
  const routing = routingFor(payload);
  if (JSON.stringify(canonical(routing)) !== JSON.stringify(canonical(envelope.routing))) throw new TypeError("FID public routing does not match protected credential");
  return Object.freeze({ payload, photo: recoveredPhoto, signedCredential: signed });
}

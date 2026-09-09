import { createHash } from "node:crypto";

import { requireInfraCapabilities } from "#infra";

import { normalizeFidIssuanceWorkflowRecord } from "./fid-card-issuance-domain.mjs";
import { verifyFidC2paSide } from "./fid-card-credentialing.mjs";
import {
  FIBRE_IDENTITY_AUTHORITY_ID,
  openFidMachineCredential,
} from "./fid-machine-credential.mjs";

const DIGEST = /^sha256:[0-9a-f]{64}$/;

function canonical(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function sha256(value) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
function canonicalDigest(value) { return sha256(Buffer.from(JSON.stringify(canonical(value)))); }
function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}
function digest(name, value) {
  if (typeof value !== "string" || !DIGEST.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}
function bytes(name, value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new TypeError(`${name} must be bytes`);
}

function statusReader(value) {
  if (value == null) return null;
  if (typeof value.getByCredentialId !== "function") throw new TypeError("FID status authority must expose getByCredentialId()");
  return value;
}

function assertProtectedLinkage(payload, issuerSigner) {
  for (const [name, value] of [
    ["photo canonical visual reference digest", payload.photo?.canonicalVisualReferenceDigest],
    ["photo provenance digest", payload.photo?.provenanceDigest],
    ["photo admission receipt digest", payload.photo?.admissionReceiptDigest],
    ["civil registration digest", payload.civilRegistrationDigest],
  ]) digest(`FID ${name}`, value);
  nonEmpty("FID photo admissionId", payload.photo?.admissionId);
  if (payload.issuer?.authorityId !== FIBRE_IDENTITY_AUTHORITY_ID
    || payload.issuer.keyId !== issuerSigner.profile?.keyId
    || payload.issuer.trustPolicy !== issuerSigner.profile?.trustPolicy) {
    throw new Error("FID protected credential is not signed under the accepted FIA trust profile");
  }
}

export async function verifyFidCard({
  contentCredentialSigner,
  machineCredential,
  frontBytes,
  backBytes,
  issuerSigner = null,
  credentialProtector = null,
  statusAuthority = null,
}) {
  nonEmpty("FID C2PA trustPolicy", contentCredentialSigner?.trustPolicy);
  if (machineCredential?.routing?.issuerAuthorityId !== FIBRE_IDENTITY_AUTHORITY_ID) {
    throw new Error("FID credential is not routed to Fibre Identity Authority");
  }

  const front = await verifyFidC2paSide({
    contentCredentialSigner,
    bytes: bytes("FID front.png", frontBytes),
    side: "front",
    machineCredential,
  });
  const back = await verifyFidC2paSide({
    contentCredentialSigner,
    bytes: bytes("FID back.png", backBytes),
    side: "back",
    machineCredential,
  });

  if ((issuerSigner == null) !== (credentialProtector == null)) {
    throw new TypeError("FID protected verification requires both issuerSigner and credentialProtector");
  }
  const opened = issuerSigner == null
    ? null
    : await openFidMachineCredential(machineCredential, { issuerSigner, credentialProtector });
  if (opened !== null) assertProtectedLinkage(opened.payload, issuerSigner);

  const status = statusReader(statusAuthority)?.getByCredentialId(
    machineCredential.routing.credentialId,
    { required: false },
  ) ?? null;
  if (status !== null && opened !== null) {
    const credential = status.credential;
    const payload = opened.payload;
    if (credential.credentialId !== payload.credentialId
      || credential.revision !== payload.revision
      || credential.threadId !== payload.threadId
      || credential.fibreIdentityNumber !== payload.fin
      || credential.registrationId !== payload.registrationId) {
      throw new Error("FID status authority identity does not match credential");
    }
  }

  return Object.freeze({
    authenticity: Object.freeze({
      valid: true,
      credentialId: machineCredential.routing.credentialId,
      revision: machineCredential.routing.revision,
      issuerAuthorityId: machineCredential.routing.issuerAuthorityId,
      issuerKeyId: machineCredential.routing.issuerKeyId,
      c2paSignerId: contentCredentialSigner.signerId,
      c2paTrustPolicy: contentCredentialSigner.trustPolicy,
      protectedCredentialVerified: opened !== null,
    }),
    currentValidity: Object.freeze(statusAuthority == null
      ? { known: false, status: null, active: null }
      : { known: true, status: status?.status ?? null, active: status?.status === "active" }),
    manifestDigestBySide: Object.freeze({ front: front.manifestDigest, back: back.manifestDigest }),
    payload: opened?.payload ?? null,
    payloadDigest: opened?.signedCredential?.payloadDigest ?? null,
    photo: opened?.photo ?? null,
  });
}

function assertStoredCard(storedCard, machineCredential) {
  if (!storedCard || storedCard.credentialId !== machineCredential.routing.credentialId
    || storedCard.revision !== machineCredential.routing.revision) {
    throw new TypeError("FID stored card does not identify the machine credential issuance");
  }
  if (storedCard.machineCredentialDigest !== canonicalDigest(machineCredential)) {
    throw new TypeError("FID stored card machine credential digest mismatch");
  }
  for (const side of ["front", "back"]) {
    nonEmpty(`FID ${side} objectRef`, storedCard[side]?.objectRef);
    digest(`FID ${side} final digest`, storedCard[side]?.finalDigest);
    digest(`FID ${side} manifest digest`, storedCard[side]?.manifestDigest);
  }
  return storedCard;
}

export async function finalizeFidCardIssuance({
  infra,
  registry,
  workflow: rawWorkflow,
  storedCard: rawStoredCard,
  machineCredential,
  contentCredentialSigner,
  issuerSigner,
  credentialProtector,
  activatedAt,
}) {
  requireInfraCapabilities(infra, "objects");
  if (typeof registry?.finalizeVerifiedCredential !== "function") {
    throw new TypeError("FID finalization requires a FidCardRegistry");
  }
  const workflow = normalizeFidIssuanceWorkflowRecord(rawWorkflow);
  const storedCard = assertStoredCard(rawStoredCard, machineCredential);
  nonEmpty("FID activatedAt", activatedAt);
  if (!Number.isFinite(Date.parse(activatedAt))) throw new TypeError("FID activatedAt must be an ISO timestamp");

  const stored = {};
  for (const side of ["front", "back"]) {
    stored[side] = await infra.objects.get(storedCard[side].objectRef);
    if (stored[side] === null
      || stored[side].digest !== storedCard[side].finalDigest
      || sha256(stored[side].bytes) !== storedCard[side].finalDigest) {
      throw new Error(`FID ${side} credentialed object is not durably stored as verified`);
    }
  }

  const verification = await verifyFidCard({
    contentCredentialSigner,
    machineCredential,
    frontBytes: stored.front.bytes,
    backBytes: stored.back.bytes,
    issuerSigner,
    credentialProtector,
  });
  if (!verification.authenticity.protectedCredentialVerified) {
    throw new Error("FID finalization requires protected credential verification");
  }
  if (verification.manifestDigestBySide.front !== storedCard.front.manifestDigest
    || verification.manifestDigestBySide.back !== storedCard.back.manifestDigest) {
    throw new Error("FID stored manifest identity changed after credential admission");
  }

  const payload = verification.payload;
  if (payload.credentialId !== workflow.proposedCredentialId
    || payload.revision !== workflow.proposedRevision
    || payload.threadId !== workflow.threadId
    || payload.fin !== workflow.fibreIdentityNumber
    || payload.registrationId !== workflow.registrationId
    || payload.civilRegistrationDigest !== workflow.civilRegistrationDigest) {
    throw new Error("FID verified credential does not match its authority-owned issuance workflow");
  }

  const credential = Object.freeze({
    credentialId: payload.credentialId,
    revision: payload.revision,
    threadId: payload.threadId,
    fibreIdentityNumber: payload.fin,
    registrationId: payload.registrationId,
    supersedesCredentialId: workflow.priorActiveCredentialId,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  });
  const issuance = Object.freeze({
    credentialId: payload.credentialId,
    revision: payload.revision,
    workflowId: workflow.workflowId,
    reason: workflow.reason,
    photoAdmissionId: payload.photo.admissionId,
    photoDigest: payload.photo.digest,
    identitySnapshotDigest: canonicalDigest(payload.identitySnapshot),
    issuer: payload.issuer,
    credentialPayloadDigest: verification.payloadDigest,
    encryptedCredentialDigest: machineCredential.encryptedCredentialDigest,
    machineCredentialDigest: storedCard.machineCredentialDigest,
    front: Object.freeze({
      objectRef: storedCard.front.objectRef,
      finalDigest: storedCard.front.finalDigest,
      manifestDigest: storedCard.front.manifestDigest,
    }),
    back: Object.freeze({
      objectRef: storedCard.back.objectRef,
      finalDigest: storedCard.back.finalDigest,
      manifestDigest: storedCard.back.manifestDigest,
    }),
    c2pa: Object.freeze({
      signerId: contentCredentialSigner.signerId,
      trustPolicy: contentCredentialSigner.trustPolicy,
      validationStatus: "verified",
    }),
  });

  return registry.finalizeVerifiedCredential({
    credential,
    civilIdentity: {
      threadId: workflow.threadId,
      fibreIdentityNumber: workflow.fibreIdentityNumber,
      registrationId: workflow.registrationId,
    },
    issuance,
    expectedPriorActiveCredentialId: workflow.priorActiveCredentialId,
    activatedAt: new Date(activatedAt).toISOString(),
  });
}

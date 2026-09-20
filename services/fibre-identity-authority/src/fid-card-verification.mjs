import { createHash } from "node:crypto";

import { requireInfraCapabilities } from "#infra";

import { normalizeFidIssuanceWorkflowRecord } from "./fid-card-issuance-domain.mjs";
import { verifyFidC2paSide } from "./fid-card-credentialing.mjs";
import {
  buildFidCardProofAssertion,
  fidCardProofAssertionDigest,
  fidCardProofAssertionJson,
} from "./fid-card-proof.mjs";
import { verifyFidCardProofPair } from "./fid-card-proof-verifier.mjs";
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
function normalizeContentCredentialMode(value) {
  const mode = value ?? "native";
  if (mode !== "native" && mode !== "c2pa" && mode !== "disabled") {
    throw new TypeError(`unsupported FID content credential mode ${String(mode)}`);
  }
  return mode;
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
  nonEmpty("FID templateVersion", payload.templateVersion);
  if (payload.issuer?.authorityId !== FIBRE_IDENTITY_AUTHORITY_ID
    || payload.issuer.keyId !== issuerSigner.profile?.keyId
    || payload.issuer.trustPolicy !== issuerSigner.profile?.trustPolicy) {
    throw new Error("FID protected credential is not signed under the accepted FIA trust profile");
  }
}

export async function verifyFidCard({
  contentCredentialSigner = null,
  contentCredentialMode = "native",
  machineCredential,
  frontBytes,
  backBytes,
  issuerSigner = null,
  credentialProtector = null,
  statusAuthority = null,
}) {
  const credentialMode = normalizeContentCredentialMode(contentCredentialMode);
  if (machineCredential?.routing?.issuerAuthorityId !== FIBRE_IDENTITY_AUTHORITY_ID) {
    throw new Error("FID credential is not routed to Fibre Identity Authority");
  }

  const frontAsset = bytes("FID front.png", frontBytes);
  const backAsset = bytes("FID back.png", backBytes);
  let front;
  let back;
  let nativeProof = null;
  if (credentialMode === "native") {
    if (issuerSigner == null) throw new TypeError("native FIN proof verification requires issuerSigner");
    nativeProof = await verifyFidCardProofPair({
      frontPngBytes:frontAsset,
      backPngBytes:backAsset,
      issuerSigner,
    });
    if (!nativeProof.verified) {
      throw new Error(`FID native proof verification failed: ${nativeProof.reason}`);
    }
    front = {
      manifestDigest:null,
      proofAssertionDigest:fidCardProofAssertionDigest(nativeProof.frontAssertion),
    };
    back = {
      manifestDigest:null,
      proofAssertionDigest:fidCardProofAssertionDigest(nativeProof.backAssertion),
    };
  } else if (credentialMode === "c2pa") {
    nonEmpty("FID C2PA trustPolicy", contentCredentialSigner?.trustPolicy);
    front = await verifyFidC2paSide({
      contentCredentialSigner,
      bytes: frontAsset,
      side: "front",
      machineCredential,
    });
    back = await verifyFidC2paSide({
      contentCredentialSigner,
      bytes: backAsset,
      side: "back",
      machineCredential,
    });
  } else {
    if (sha256(frontAsset) !== machineCredential.routing.frontRenderDigest
      || sha256(backAsset) !== machineCredential.routing.backRenderDigest) {
      throw new Error("FID unsigned card bytes do not match protected render digests");
    }
    front = { manifestDigest:null, proofAssertionDigest:null };
    back = { manifestDigest:null, proofAssertionDigest:null };
  }

  if ((issuerSigner == null) !== (credentialProtector == null)) {
    throw new TypeError("FID protected verification requires both issuerSigner and credentialProtector");
  }
  const opened = issuerSigner == null
    ? null
    : await openFidMachineCredential(machineCredential, { issuerSigner, credentialProtector });
  if (opened !== null) assertProtectedLinkage(opened.payload, issuerSigner);

  if (credentialMode === "native") {
    if (opened === null) throw new Error("FID native proof verification requires protected credential verification");
    const expectedFront = buildFidCardProofAssertion({ payload:opened.payload, side:"front" });
    const expectedBack = buildFidCardProofAssertion({ payload:opened.payload, side:"back" });
    if (fidCardProofAssertionJson(nativeProof.frontAssertion) !== fidCardProofAssertionJson(expectedFront)
      || fidCardProofAssertionJson(nativeProof.backAssertion) !== fidCardProofAssertionJson(expectedBack)) {
      throw new Error("FID native proof assertions do not match the protected FIA credential");
    }
  }

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
      proofFormat: credentialMode === "native" ? "fibre-fin-proof" : (credentialMode === "c2pa" ? "c2pa" : "none"),
      nativeProofVerified: credentialMode === "native",
      c2paSignerId: credentialMode === "c2pa" ? contentCredentialSigner.signerId : null,
      c2paTrustPolicy: credentialMode === "c2pa" ? contentCredentialSigner.trustPolicy : null,
      protectedCredentialVerified: opened !== null,
    }),
    currentValidity: Object.freeze(statusAuthority == null
      ? { known: false, status: null, active: null }
      : { known: true, status: status?.status ?? null, active: status?.status === "active" }),
    manifestDigestBySide: Object.freeze({ front: front.manifestDigest, back: back.manifestDigest }),
    proofAssertionDigestBySide: Object.freeze({
      front: front.proofAssertionDigest ?? null,
      back: back.proofAssertionDigest ?? null,
    }),
    payload: opened?.payload ?? null,
    payloadDigest: opened?.signedCredential?.payloadDigest ?? null,
    photo: opened?.photo ?? null,
  });
}

function assertStoredCard(storedCard, machineCredential, contentCredentialMode) {
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
    if (contentCredentialMode === "c2pa") {
      digest(`FID ${side} manifest digest`, storedCard[side]?.manifestDigest);
    } else {
      if (storedCard[side]?.manifestDigest !== null) {
        throw new TypeError(`FID ${side} manifest digest must be null without C2PA`);
      }
      if (contentCredentialMode === "native") {
        digest(`FID ${side} proof assertion digest`, storedCard[side]?.proofAssertionDigest);
      }
    }
  }
  return storedCard;
}

export async function finalizeFidCardIssuance({
  infra,
  registry,
  workflow: rawWorkflow,
  storedCard: rawStoredCard,
  machineCredential,
  contentCredentialSigner = null,
  contentCredentialMode = "c2pa",
  issuerSigner,
  credentialProtector,
  activatedAt,
}) {
  requireInfraCapabilities(infra, "objects");
  if (typeof registry?.finalizeVerifiedCredential !== "function") {
    throw new TypeError("FID finalization requires a FidCardRegistry");
  }
  const workflow = normalizeFidIssuanceWorkflowRecord(rawWorkflow);
  const credentialMode = normalizeContentCredentialMode(contentCredentialMode);
  const storedCard = assertStoredCard(rawStoredCard, machineCredential, credentialMode);
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
    contentCredentialMode:credentialMode,
    machineCredential,
    frontBytes: stored.front.bytes,
    backBytes: stored.back.bytes,
    issuerSigner,
    credentialProtector,
  });
  if (!verification.authenticity.protectedCredentialVerified) {
    throw new Error("FID finalization requires protected credential verification");
  }
  if (credentialMode === "c2pa"
    && (verification.manifestDigestBySide.front !== storedCard.front.manifestDigest
      || verification.manifestDigestBySide.back !== storedCard.back.manifestDigest)) {
    throw new Error("FID stored manifest identity changed after credential admission");
  }
  if (credentialMode === "native"
    && (verification.proofAssertionDigestBySide.front !== storedCard.front.proofAssertionDigest
      || verification.proofAssertionDigestBySide.back !== storedCard.back.proofAssertionDigest)) {
    throw new Error("FID stored native proof identity changed after proof admission");
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
    canonicalVisualReferenceDigest: payload.photo.canonicalVisualReferenceDigest,
    photoProvenanceDigest: payload.photo.provenanceDigest,
    photoAdmissionReceiptDigest: payload.photo.admissionReceiptDigest,
    identitySnapshotDigest: canonicalDigest(payload.identitySnapshot),
    templateVersion: nonEmpty("FID templateVersion", payload.templateVersion),
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
    c2pa: Object.freeze(credentialMode === "c2pa" ? {
      signerId: contentCredentialSigner.signerId,
      trustPolicy: contentCredentialSigner.trustPolicy,
      validationStatus: "verified",
    } : {
      signerId: null,
      trustPolicy: null,
      validationStatus: "disabled",
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

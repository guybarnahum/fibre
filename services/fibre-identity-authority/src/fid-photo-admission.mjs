import { createHash } from "node:crypto";

import { normalizeFidIssuanceWorkflowRecord } from "./fid-card-issuance-domain.mjs";

export const FID_PHOTO_POLICY_VERSION = "fid-photo-policy-v0.1";

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;

function requireId(name, value) {
  if (typeof value !== "string" || !ID.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function requireDigest(name, value) {
  if (typeof value !== "string" || !DIGEST.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function requireIso(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new TypeError(`${name} must be an ISO timestamp`);
  return new Date(value).toISOString();
}

function canonical(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function sha(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")}`;
}

function normalizeSource(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("FID photo source is required");
  const source = {
    threadId: requireId("FID photo source.threadId", value.threadId),
    candidatePhotoRef: value.candidatePhotoRef ?? null,
    candidatePhotoDigest: value.candidatePhotoDigest ?? null,
    canonicalVisualReferenceRef: value.canonicalVisualReferenceRef ?? null,
    canonicalVisualReferenceDigest: value.canonicalVisualReferenceDigest ?? null,
    derivationReceiptRef: value.derivationReceiptRef ?? null,
    sourceReferences: value.sourceReferences,
    targetAgeYears: value.targetAgeYears ?? null,
  };
  if ((source.candidatePhotoRef === null) !== (source.candidatePhotoDigest === null)) {
    throw new TypeError("FID photo source candidate reference and digest must appear together");
  }
  if ((source.canonicalVisualReferenceRef === null) !== (source.canonicalVisualReferenceDigest === null)) {
    throw new TypeError("FID photo source canonical reference and digest must appear together");
  }
  if (source.candidatePhotoRef !== null) {
    requireId("FID photo source.candidatePhotoRef", source.candidatePhotoRef);
    requireDigest("FID photo source.candidatePhotoDigest", source.candidatePhotoDigest);
  }
  if (source.canonicalVisualReferenceRef !== null) {
    requireId("FID photo source.canonicalVisualReferenceRef", source.canonicalVisualReferenceRef);
    requireDigest("FID photo source.canonicalVisualReferenceDigest", source.canonicalVisualReferenceDigest);
  }
  if (source.derivationReceiptRef !== null) requireId("FID photo source.derivationReceiptRef", source.derivationReceiptRef);
  if (!Array.isArray(source.sourceReferences) || !source.sourceReferences.every((ref) => ID.test(ref))) {
    throw new TypeError("FID photo source.sourceReferences must contain Fibre references");
  }
  if (source.targetAgeYears !== null && (!Number.isSafeInteger(source.targetAgeYears) || source.targetAgeYears < 0)) {
    throw new TypeError("FID photo source.targetAgeYears is invalid");
  }
  return Object.freeze(source);
}

function normalizeInspection(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("FID photo inspection is required");
  if (!Number.isSafeInteger(value.faceCount) || value.faceCount < 0) throw new TypeError("FID photo inspection.faceCount is invalid");
  for (const field of ["faceVisible", "occlusionAcceptable", "cropCompliant", "dimensionsCompliant", "poseCompliant", "framingCompliant", "visualIdentityConsistent", "ageConsistent"]) {
    if (typeof value[field] !== "boolean") throw new TypeError(`FID photo inspection.${field} must be boolean`);
  }
  return Object.freeze({
    faceCount: value.faceCount,
    faceVisible: value.faceVisible,
    occlusionAcceptable: value.occlusionAcceptable,
    cropCompliant: value.cropCompliant,
    dimensionsCompliant: value.dimensionsCompliant,
    poseCompliant: value.poseCompliant,
    framingCompliant: value.framingCompliant,
    visualIdentityConsistent: value.visualIdentityConsistent,
    ageConsistent: value.ageConsistent,
  });
}

function reasonsFor(workflow, source, inspection) {
  const reasons = [];
  if (source.threadId !== workflow.threadId) reasons.push("wrong_thread_provenance");
  if (source.candidatePhotoRef === null) return [...reasons, "no_admitted_official_photo"];
  if (source.canonicalVisualReferenceRef === null
    || source.derivationReceiptRef === null
    || !source.sourceReferences.includes(source.canonicalVisualReferenceRef)) {
    reasons.push("canonical_provenance_discontinuous");
  }
  if (inspection.faceCount !== 1) reasons.push("face_count_not_one");
  if (!inspection.faceVisible) reasons.push("face_not_visible");
  if (!inspection.occlusionAcceptable) reasons.push("face_materially_occluded");
  for (const [field, reason] of [
    ["cropCompliant", "crop_noncompliant"],
    ["dimensionsCompliant", "dimensions_noncompliant"],
    ["poseCompliant", "pose_noncompliant"],
    ["framingCompliant", "framing_noncompliant"],
    ["visualIdentityConsistent", "visual_identity_inconsistent"],
    ["ageConsistent", "age_inconsistent"],
  ]) if (!inspection[field]) reasons.push(reason);
  return reasons;
}

export function buildFidPhotoAdmission({ workflow: candidateWorkflow, source: candidateSource, inspection: candidateInspection = null, admittedAt }) {
  const workflow = normalizeFidIssuanceWorkflowRecord(candidateWorkflow);
  const source = normalizeSource(candidateSource);
  const inspection = source.candidatePhotoRef === null ? null : normalizeInspection(candidateInspection);
  const reasons = reasonsFor(workflow, source, inspection);
  const decision = reasons.length === 0 ? "accepted" : "rejected";
  const provenanceDigest = sha({ policyVersion: FID_PHOTO_POLICY_VERSION, workflowId: workflow.workflowId, source, inspection, decision, reasons });

  return Object.freeze({
    admissionId: `fidadm_${provenanceDigest.slice(7)}`,
    workflowId: workflow.workflowId,
    threadId: workflow.threadId,
    candidatePhotoRef: source.candidatePhotoRef,
    candidatePhotoDigest: source.candidatePhotoDigest,
    canonicalVisualReferenceRef: source.canonicalVisualReferenceRef,
    canonicalVisualReferenceDigest: source.canonicalVisualReferenceDigest,
    derivationReceiptRef: source.derivationReceiptRef,
    faceCount: inspection?.faceCount ?? 0,
    policyVersion: FID_PHOTO_POLICY_VERSION,
    decision,
    reasons: Object.freeze(reasons),
    admittedAt: requireIso("FID photo admission.admittedAt", admittedAt),
    provenanceDigest,
  });
}

export function fidPhotoAdmissionDigest(receipt) {
  return sha(receipt);
}

export function assertFidPhotoAdmissionReceipt(receipt) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) throw new TypeError("FID photo admission receipt is invalid");
  requireId("FID photo admission.admissionId", receipt.admissionId);
  requireId("FID photo admission.workflowId", receipt.workflowId);
  requireId("FID photo admission.threadId", receipt.threadId);
  requireDigest("FID photo admission.provenanceDigest", receipt.provenanceDigest);
  requireIso("FID photo admission.admittedAt", receipt.admittedAt);
  if (receipt.policyVersion !== FID_PHOTO_POLICY_VERSION) throw new TypeError("FID photo admission policyVersion is unsupported");
  if (!['accepted', 'rejected'].includes(receipt.decision)) throw new TypeError("FID photo admission decision is invalid");
  if (!Array.isArray(receipt.reasons) || !receipt.reasons.every((reason) => typeof reason === "string")) throw new TypeError("FID photo admission reasons are invalid");
  if ((receipt.decision === "accepted") !== (receipt.reasons.length === 0)) throw new TypeError("FID photo admission decision conflicts with reasons");
  if (receipt.admissionId !== `fidadm_${receipt.provenanceDigest.slice(7)}`) throw new TypeError("FID photo admission identity is invalid");
  return receipt;
}

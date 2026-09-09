import { createHash } from "node:crypto";

import { normalizeFidIssuanceWorkflowRecord } from "./fid-card-issuance-domain.mjs";

export const FID_PHOTO_ADMISSION_VERSION = "fid-photo-admission-v0.1";
export const FID_PHOTO_POLICY_VERSION = "fid-photo-policy-v0.1";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const COMPLIANCE = Object.freeze(["compliant", "noncompliant"]);
const FACE_VISIBILITY = Object.freeze(["clear", "unusable"]);
const OCCLUSION = Object.freeze(["acceptable", "material"]);
const CONTINUITY = Object.freeze(["consistent", "inconsistent"]);
const AGE_CONSISTENCY = Object.freeze(["consistent", "inconsistent", "not_assessable"]);

function exactKeys(name, value, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${name} must contain exactly: ${expected.join(", ")}`);
  }
  return value;
}

function id(name, value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function nullableId(name, value) {
  return value === null ? null : id(name, value);
}

function digest(name, value) {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function nullableDigest(name, value) {
  return value === null ? null : digest(name, value);
}

function iso(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new TypeError(`${name} must be an ISO timestamp`);
  return new Date(value).toISOString();
}

function enumValue(name, value, allowed) {
  if (!allowed.includes(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function refs(name, value) {
  if (!Array.isArray(value) || new Set(value).size !== value.length) throw new TypeError(`${name} must be a unique array`);
  value.forEach((entry, index) => id(`${name}[${index}]`, entry));
  return [...value];
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function canonicalJson(value) { return JSON.stringify(canonicalize(value)); }
function sha256(value) { return createHash("sha256").update(value, "utf8").digest("hex"); }

export function normalizeFidPhotoSource(value) {
  exactKeys("FID photo source", value, [
    "sourceKind",
    "threadId",
    "candidatePhotoRef",
    "candidatePhotoDigest",
    "canonicalVisualReferenceRef",
    "canonicalVisualReferenceDigest",
    "derivationReceiptRef",
    "sourceReferences",
    "targetAgeYears",
  ]);
  const sourceKind = value.sourceKind === null ? null : enumValue("FID photo source.sourceKind", value.sourceKind, ["official_id_photo"]);
  const candidatePhotoRef = nullableId("FID photo source.candidatePhotoRef", value.candidatePhotoRef);
  const candidatePhotoDigest = nullableDigest("FID photo source.candidatePhotoDigest", value.candidatePhotoDigest);
  if ((sourceKind === null) !== (candidatePhotoRef === null) || (candidatePhotoRef === null) !== (candidatePhotoDigest === null)) {
    throw new TypeError("FID photo source candidate identity must be entirely present or absent");
  }
  const canonicalVisualReferenceRef = nullableId(
    "FID photo source.canonicalVisualReferenceRef",
    value.canonicalVisualReferenceRef,
  );
  const canonicalVisualReferenceDigest = nullableDigest(
    "FID photo source.canonicalVisualReferenceDigest",
    value.canonicalVisualReferenceDigest,
  );
  if ((canonicalVisualReferenceRef === null) !== (canonicalVisualReferenceDigest === null)) {
    throw new TypeError("FID photo source canonical visual reference must be entirely present or absent");
  }
  const targetAgeYears = value.targetAgeYears;
  if (targetAgeYears !== null && (!Number.isSafeInteger(targetAgeYears) || targetAgeYears < 0)) {
    throw new TypeError("FID photo source.targetAgeYears must be a non-negative integer or null");
  }
  return Object.freeze({
    sourceKind,
    threadId: id("FID photo source.threadId", value.threadId),
    candidatePhotoRef,
    candidatePhotoDigest,
    canonicalVisualReferenceRef,
    canonicalVisualReferenceDigest,
    derivationReceiptRef: nullableId("FID photo source.derivationReceiptRef", value.derivationReceiptRef),
    sourceReferences: refs("FID photo source.sourceReferences", value.sourceReferences),
    targetAgeYears,
  });
}

export function normalizeFidPhotoInspection(value) {
  exactKeys("FID photo inspection", value, [
    "faceCount",
    "faceVisibility",
    "occlusion",
    "crop",
    "dimensions",
    "pose",
    "framing",
    "visualIdentityContinuity",
    "ageConsistency",
  ]);
  if (!Number.isSafeInteger(value.faceCount) || value.faceCount < 0) {
    throw new TypeError("FID photo inspection.faceCount must be a non-negative integer");
  }
  return Object.freeze({
    faceCount: value.faceCount,
    faceVisibility: enumValue("FID photo inspection.faceVisibility", value.faceVisibility, FACE_VISIBILITY),
    occlusion: enumValue("FID photo inspection.occlusion", value.occlusion, OCCLUSION),
    crop: enumValue("FID photo inspection.crop", value.crop, COMPLIANCE),
    dimensions: enumValue("FID photo inspection.dimensions", value.dimensions, COMPLIANCE),
    pose: enumValue("FID photo inspection.pose", value.pose, COMPLIANCE),
    framing: enumValue("FID photo inspection.framing", value.framing, COMPLIANCE),
    visualIdentityContinuity: enumValue("FID photo inspection.visualIdentityContinuity", value.visualIdentityContinuity, CONTINUITY),
    ageConsistency: enumValue("FID photo inspection.ageConsistency", value.ageConsistency, AGE_CONSISTENCY),
  });
}

function rejectionReasons(workflow, source, inspection) {
  const reasons = [];
  if (source.threadId !== workflow.threadId) reasons.push("wrong_thread_provenance");
  if (source.canonicalVisualReferenceRef === null || source.canonicalVisualReferenceDigest === null) {
    reasons.push("missing_canonical_visual_reference");
  }
  if (source.candidatePhotoRef === null) {
    reasons.push("no_admitted_official_photo");
    return reasons;
  }
  if (source.derivationReceiptRef === null
    || source.canonicalVisualReferenceRef === null
    || !source.sourceReferences.includes(source.canonicalVisualReferenceRef)) {
    reasons.push("canonical_provenance_discontinuous");
  }
  if (inspection.faceCount !== 1) reasons.push("face_count_not_one");
  if (inspection.faceVisibility !== "clear") reasons.push("face_not_visible");
  if (inspection.occlusion !== "acceptable") reasons.push("face_materially_occluded");
  for (const field of ["crop", "dimensions", "pose", "framing"]) {
    if (inspection[field] !== "compliant") reasons.push(`${field}_noncompliant`);
  }
  if (inspection.visualIdentityContinuity !== "consistent") reasons.push("visual_identity_inconsistent");
  if (source.targetAgeYears === null) {
    if (inspection.ageConsistency === "inconsistent") reasons.push("age_inconsistent");
  } else if (inspection.ageConsistency !== "consistent") {
    reasons.push(inspection.ageConsistency === "not_assessable" ? "age_not_assessable" : "age_inconsistent");
  }
  return reasons;
}

export function fidPhotoAdmissionIdentity({ workflow, source, inspection = null }) {
  const normalizedWorkflow = normalizeFidIssuanceWorkflowRecord(workflow);
  const normalizedSource = normalizeFidPhotoSource(source);
  const normalizedInspection = normalizedSource.candidatePhotoRef === null
    ? null
    : normalizeFidPhotoInspection(inspection);
  const reasons = rejectionReasons(normalizedWorkflow, normalizedSource, normalizedInspection);
  const decision = reasons.length === 0 ? "accepted" : "rejected";
  const provenanceDigest = `sha256:${sha256(canonicalJson({
    policyVersion: FID_PHOTO_POLICY_VERSION,
    workflowId: normalizedWorkflow.workflowId,
    threadId: normalizedWorkflow.threadId,
    source: normalizedSource,
    inspection: normalizedInspection,
    decision,
    reasons,
  }))}`;
  return Object.freeze({
    admissionId: `fidadm_${provenanceDigest.slice("sha256:".length)}`,
    provenanceDigest,
    decision,
    reasons: Object.freeze(reasons),
    workflow: normalizedWorkflow,
    source: normalizedSource,
    inspection: normalizedInspection,
  });
}

export function buildFidPhotoAdmissionReceipt({ workflow, source, inspection = null, admittedAt }) {
  const identity = fidPhotoAdmissionIdentity({ workflow, source, inspection });
  return Object.freeze({
    receiptVersion: FID_PHOTO_ADMISSION_VERSION,
    admissionId: identity.admissionId,
    workflowId: identity.workflow.workflowId,
    threadId: identity.workflow.threadId,
    candidatePhotoRef: identity.source.candidatePhotoRef,
    candidatePhotoDigest: identity.source.candidatePhotoDigest,
    canonicalVisualReferenceRef: identity.source.canonicalVisualReferenceRef,
    canonicalVisualReferenceDigest: identity.source.canonicalVisualReferenceDigest,
    derivationReceiptRef: identity.source.derivationReceiptRef,
    targetAgeYears: identity.source.targetAgeYears,
    faceCount: identity.inspection?.faceCount ?? 0,
    policyVersion: FID_PHOTO_POLICY_VERSION,
    decision: identity.decision,
    reasons: [...identity.reasons],
    admittedAt: iso("FID photo admission.admittedAt", admittedAt),
    provenanceDigest: identity.provenanceDigest,
  });
}

export function normalizeFidPhotoAdmissionReceipt(value) {
  exactKeys("FID photo admission", value, [
    "receiptVersion",
    "admissionId",
    "workflowId",
    "threadId",
    "candidatePhotoRef",
    "candidatePhotoDigest",
    "canonicalVisualReferenceRef",
    "canonicalVisualReferenceDigest",
    "derivationReceiptRef",
    "targetAgeYears",
    "faceCount",
    "policyVersion",
    "decision",
    "reasons",
    "admittedAt",
    "provenanceDigest",
  ]);
  if (value.receiptVersion !== FID_PHOTO_ADMISSION_VERSION) throw new TypeError("FID photo admission.receiptVersion is unsupported");
  if (value.policyVersion !== FID_PHOTO_POLICY_VERSION) throw new TypeError("FID photo admission.policyVersion is unsupported");
  if (!Number.isSafeInteger(value.faceCount) || value.faceCount < 0) throw new TypeError("FID photo admission.faceCount is invalid");
  if (value.targetAgeYears !== null && (!Number.isSafeInteger(value.targetAgeYears) || value.targetAgeYears < 0)) {
    throw new TypeError("FID photo admission.targetAgeYears is invalid");
  }
  if (!Array.isArray(value.reasons) || !value.reasons.every((reason) => typeof reason === "string" && reason.length > 0)) {
    throw new TypeError("FID photo admission.reasons is invalid");
  }
  if (new Set(value.reasons).size !== value.reasons.length) throw new TypeError("FID photo admission.reasons must be unique");

  const admissionId = id("FID photo admission.admissionId", value.admissionId);
  const candidatePhotoRef = nullableId("FID photo admission.candidatePhotoRef", value.candidatePhotoRef);
  const candidatePhotoDigest = nullableDigest("FID photo admission.candidatePhotoDigest", value.candidatePhotoDigest);
  const canonicalVisualReferenceRef = nullableId("FID photo admission.canonicalVisualReferenceRef", value.canonicalVisualReferenceRef);
  const canonicalVisualReferenceDigest = nullableDigest("FID photo admission.canonicalVisualReferenceDigest", value.canonicalVisualReferenceDigest);
  const decision = enumValue("FID photo admission.decision", value.decision, ["accepted", "rejected"]);
  const provenanceDigest = digest("FID photo admission.provenanceDigest", value.provenanceDigest);

  if ((candidatePhotoRef === null) !== (candidatePhotoDigest === null)) {
    throw new TypeError("FID photo admission candidate identity must be entirely present or absent");
  }
  if ((canonicalVisualReferenceRef === null) !== (canonicalVisualReferenceDigest === null)) {
    throw new TypeError("FID photo admission canonical visual reference must be entirely present or absent");
  }
  if ((decision === "accepted") !== (value.reasons.length === 0)) {
    throw new TypeError("FID photo admission decision does not match rejection reasons");
  }
  if (decision === "accepted" && candidatePhotoRef === null) {
    throw new TypeError("accepted FID photo admission requires a candidate photo");
  }
  if (admissionId !== `fidadm_${provenanceDigest.slice("sha256:".length)}`) {
    throw new TypeError("FID photo admissionId does not match provenance digest");
  }

  return Object.freeze({
    receiptVersion: value.receiptVersion,
    admissionId,
    workflowId: id("FID photo admission.workflowId", value.workflowId),
    threadId: id("FID photo admission.threadId", value.threadId),
    candidatePhotoRef,
    candidatePhotoDigest,
    canonicalVisualReferenceRef,
    canonicalVisualReferenceDigest,
    derivationReceiptRef: nullableId("FID photo admission.derivationReceiptRef", value.derivationReceiptRef),
    targetAgeYears: value.targetAgeYears,
    faceCount: value.faceCount,
    policyVersion: value.policyVersion,
    decision,
    reasons: [...value.reasons],
    admittedAt: iso("FID photo admission.admittedAt", value.admittedAt),
    provenanceDigest,
  });
}

export function fidPhotoAdmissionJson(receipt) {
  return canonicalJson(normalizeFidPhotoAdmissionReceipt(receipt));
}

export function fidPhotoAdmissionDigest(receipt) {
  return `sha256:${sha256(fidPhotoAdmissionJson(receipt))}`;
}

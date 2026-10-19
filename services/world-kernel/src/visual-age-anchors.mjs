import {CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS} from "./visual-identity-reference-domain.mjs";

export const VISUAL_AGE_ANCHOR_ADMISSION_VERSION = "visual-age-anchor-admission-v0.1";

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;

function id(name, value) {
  if (typeof value !== "string" || !ID.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function digest(name, value) {
  if (typeof value !== "string" || !DIGEST.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function age(name, value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative integer`);
  return value;
}

/** A derived, operator-approved image; never a new canonical identity authority. */
export function normalizeVisualAgeAnchorAdmission(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || value.contract !== VISUAL_AGE_ANCHOR_ADMISSION_VERSION) {
    throw new TypeError("visual age anchor admission is invalid");
  }
  if (!Array.isArray(value.sourceAnchorRefs)) throw new TypeError("visual age anchor sourceAnchorRefs must be an array");
  const sourceAnchorRefs = value.sourceAnchorRefs.map((ref) => id("visual age anchor source", ref));
  if (new Set(sourceAnchorRefs).size !== sourceAnchorRefs.length) {
    throw new TypeError("visual age anchor sources must be distinct");
  }
  const admittedAt = value.admittedAt;
  if (typeof admittedAt !== "string" || !Number.isFinite(Date.parse(admittedAt))) {
    throw new TypeError("visual age anchor admittedAt is invalid");
  }
  const record = {
    contract: VISUAL_AGE_ANCHOR_ADMISSION_VERSION,
    admissionId: id("visual age anchor admissionId", value.admissionId),
    threadId: id("visual age anchor threadId", value.threadId),
    targetAgeYears: age("visual age anchor targetAgeYears", value.targetAgeYears),
    portraitObjectRef: id("visual age anchor portraitObjectRef", value.portraitObjectRef),
    portraitDigest: digest("visual age anchor portraitDigest", value.portraitDigest),
    canonicalReferenceObjectRef: id("visual age anchor canonicalReferenceObjectRef", value.canonicalReferenceObjectRef),
    canonicalReferenceDigest: digest("visual age anchor canonicalReferenceDigest", value.canonicalReferenceDigest),
    sourceAnchorRefs: Object.freeze(sourceAnchorRefs),
    generationReceiptRef: id("visual age anchor generationReceiptRef", value.generationReceiptRef),
    approvalRef: id("visual age anchor approvalRef", value.approvalRef),
    admittedAt: new Date(admittedAt).toISOString(),
  };
  if (record.portraitObjectRef === record.canonicalReferenceObjectRef
    || sourceAnchorRefs.includes(record.portraitObjectRef)
    || sourceAnchorRefs.includes(record.canonicalReferenceObjectRef)) {
    throw new TypeError("visual age anchor cannot reference itself or duplicate the canonical root");
  }
  return Object.freeze(record);
}

/** Lookup is constrained by Thread and by the *current* canonical reference bytes. */
export function admittedVisualAgeAnchors({
  threadId, canonicalReferenceObjectRef, canonicalReferenceDigest, admissions = [],
} = {}) {
  id("threadId", threadId);
  id("canonicalReferenceObjectRef", canonicalReferenceObjectRef);
  digest("canonicalReferenceDigest", canonicalReferenceDigest);
  if (!Array.isArray(admissions)) throw new TypeError("visual age anchor admissions must be an array");
  const byAge = new Map();
  for (const candidate of admissions) {
    const anchor = normalizeVisualAgeAnchorAdmission(candidate);
    if (anchor.threadId !== threadId
      || anchor.canonicalReferenceObjectRef !== canonicalReferenceObjectRef
      || anchor.canonicalReferenceDigest !== canonicalReferenceDigest
      || anchor.targetAgeYears === CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS) continue;
    const previous = byAge.get(anchor.targetAgeYears);
    if (!previous || anchor.admittedAt > previous.admittedAt
      || (anchor.admittedAt === previous.admittedAt && anchor.admissionId > previous.admissionId)) {
      byAge.set(anchor.targetAgeYears, anchor);
    }
  }
  return Object.freeze([...byAge.values()].sort((a, b) => a.targetAgeYears - b.targetAgeYears));
}

/** Always include the root; add at most the exact age or the nearest lower/upper ages. */
export function resolveVisualAgeReferences({
  threadId, targetAgeYears, canonicalReferenceObjectRef, canonicalReferenceDigest, admissions = [],
} = {}) {
  const target = age("targetAgeYears", targetAgeYears);
  const anchors = admittedVisualAgeAnchors({
    threadId, canonicalReferenceObjectRef, canonicalReferenceDigest, admissions,
  });
  const root = Object.freeze({
    targetAgeYears: CANONICAL_VISUAL_IDENTITY_REFERENCE_AGE_YEARS,
    objectRef: canonicalReferenceObjectRef,
    digest: canonicalReferenceDigest,
    admissionId: null,
  });
  const all = [root, ...anchors.map((anchor) => Object.freeze({
    targetAgeYears: anchor.targetAgeYears,
    objectRef: anchor.portraitObjectRef,
    digest: anchor.portraitDigest,
    admissionId: anchor.admissionId,
  }))].sort((a, b) => a.targetAgeYears - b.targetAgeYears);
  const exact = all.find((reference) => reference.targetAgeYears === target);
  const lower = [...all].reverse().find((reference) => reference.targetAgeYears < target);
  const upper = all.find((reference) => reference.targetAgeYears > target);
  const selected = [root, ...(exact ? [exact] : [lower, upper])]
    .filter((reference, index, items) => reference && items.findIndex((item) => item?.objectRef === reference.objectRef) === index);
  return Object.freeze({
    threadId,
    targetAgeYears: target,
    references: Object.freeze(selected),
    referenceObjectRefs: Object.freeze(selected.map((reference) => reference.objectRef)),
  });
}

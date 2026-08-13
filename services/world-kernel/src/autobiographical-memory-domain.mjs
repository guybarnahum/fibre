import {
  assertExactKeys, assertFiniteNumber, assertId, assertIsoTimestamp,
  assertNonEmpty, assertPlainObject, assertStringArray, canonicalJson, sha256,
} from "./persistence-common.mjs";

const MEMORY_ID = /^mem_[0-9a-f]{64}$/;
export const AUTOBIOGRAPHICAL_MEMORY_POLICY = Object.freeze({
  id: "autobiographical_memory_epistemics", version: "1",
});
export const MEMORY_ACCESSIBILITIES = Object.freeze(["accessible", "difficult", "inaccessible"]);
export const MEMORY_RETENTION_STATES = Object.freeze(["retained", "fragmentary", "uncertain", "unavailable"]);
export const MEMORY_STATUSES = Object.freeze(["current", "disputed", "corrected", "retracted"]);
export const MEMORY_AUTHORSHIP_KINDS = Object.freeze([
  "fibre_genesis_authored", "fibre_policy_derived", "imported_recollection",
]);

function refs(name, values, { required = false } = {}) {
  assertStringArray(name, values);
  if (required && values.length === 0) throw new TypeError(`${name} must not be empty`);
  if (new Set(values).size !== values.length) throw new TypeError(`${name} must contain unique references`);
  values.forEach((value, index) => assertId(`${name}[${index}]`, value));
}
function order(name, left, right) {
  if (Date.parse(left) > Date.parse(right)) throw new TypeError(`${name} moves backwards in time`);
}
export function autobiographicalMemoryId({ threadId, originReference, slot }) {
  assertId("threadId", threadId); assertId("originReference", originReference); assertNonEmpty("slot", slot);
  return `mem_${sha256(canonicalJson({ threadId, originReference, slot }))}`;
}

export function normalizeAutobiographicalMemory(candidate) {
  assertPlainObject("autobiographical memory", candidate);
  assertExactKeys("autobiographical memory", candidate, [
    "memoryId", "revision", "threadId", "subjectPeriod", "eventRefs", "rememberedMeaning",
    "rememberedAt", "asOf", "confidence", "uncertainty", "salience", "accessibility",
    "retentionState", "authorship", "supportingEvidenceRefs", "contradictingEvidenceRefs",
    "visibility", "status", "recordedAt", "supersedesRevision",
  ]);
  assertNonEmpty("memoryId", candidate.memoryId);
  if (!MEMORY_ID.test(candidate.memoryId)) throw new TypeError("memoryId must be mem_ followed by 64 lowercase hex characters");
  assertFiniteNumber("revision", candidate.revision, { integer: true, minimum: 1 });
  assertId("threadId", candidate.threadId);
  assertPlainObject("subjectPeriod", candidate.subjectPeriod);
  assertExactKeys("subjectPeriod", candidate.subjectPeriod, ["startAt", "endAt"]);
  assertIsoTimestamp("subjectPeriod.startAt", candidate.subjectPeriod.startAt);
  if (candidate.subjectPeriod.endAt !== null) {
    assertIsoTimestamp("subjectPeriod.endAt", candidate.subjectPeriod.endAt);
    order("subjectPeriod", candidate.subjectPeriod.startAt, candidate.subjectPeriod.endAt);
  }
  refs("eventRefs", candidate.eventRefs, { required: true });
  assertNonEmpty("rememberedMeaning", candidate.rememberedMeaning);
  assertIsoTimestamp("rememberedAt", candidate.rememberedAt);
  assertIsoTimestamp("asOf", candidate.asOf);
  assertIsoTimestamp("recordedAt", candidate.recordedAt);
  if (candidate.subjectPeriod.endAt !== null) order("rememberedAt", candidate.subjectPeriod.endAt, candidate.rememberedAt);
  order("asOf", candidate.rememberedAt, candidate.asOf);
  order("recordedAt", candidate.asOf, candidate.recordedAt);
  assertFiniteNumber("confidence", candidate.confidence, { minimum: 0, maximum: 1 });
  assertStringArray("uncertainty", candidate.uncertainty);
  if (new Set(candidate.uncertainty).size !== candidate.uncertainty.length) throw new TypeError("uncertainty must be unique");
  candidate.uncertainty.forEach((value, index) => assertNonEmpty(`uncertainty[${index}]`, value));
  assertFiniteNumber("salience", candidate.salience, { minimum: 0, maximum: 1 });
  if (!MEMORY_ACCESSIBILITIES.includes(candidate.accessibility)) throw new TypeError("accessibility is invalid");
  if (!MEMORY_RETENTION_STATES.includes(candidate.retentionState)) throw new TypeError("retentionState is invalid");
  assertPlainObject("authorship", candidate.authorship);
  assertExactKeys("authorship", candidate.authorship, ["kind", "entityId", "policy"]);
  if (!MEMORY_AUTHORSHIP_KINDS.includes(candidate.authorship.kind)) throw new TypeError("authorship.kind is invalid");
  assertId("authorship.entityId", candidate.authorship.entityId);
  assertPlainObject("authorship.policy", candidate.authorship.policy);
  assertExactKeys("authorship.policy", candidate.authorship.policy, ["id", "version"]);
  if (candidate.authorship.policy.id !== AUTOBIOGRAPHICAL_MEMORY_POLICY.id || candidate.authorship.policy.version !== AUTOBIOGRAPHICAL_MEMORY_POLICY.version) throw new TypeError("authorship policy is unsupported");
  refs("supportingEvidenceRefs", candidate.supportingEvidenceRefs);
  refs("contradictingEvidenceRefs", candidate.contradictingEvidenceRefs);
  const support = new Set(candidate.supportingEvidenceRefs);
  if (candidate.contradictingEvidenceRefs.some((ref) => support.has(ref))) throw new TypeError("evidence cannot both support and contradict a memory revision");
  if (!["public", "restricted", "private"].includes(candidate.visibility)) throw new TypeError("visibility is invalid");
  if (!MEMORY_STATUSES.includes(candidate.status)) throw new TypeError("status is invalid");
  if (candidate.revision === 1) {
    if (candidate.supersedesRevision !== undefined) throw new TypeError("revision 1 cannot supersede a revision");
  } else {
    assertFiniteNumber("supersedesRevision", candidate.supersedesRevision, { integer: true, minimum: 1 });
    if (candidate.supersedesRevision !== candidate.revision - 1) throw new TypeError("memory must supersede its immediate predecessor");
  }
  const normalized = structuredClone(candidate);
  if (normalized.supersedesRevision === undefined) delete normalized.supersedesRevision;
  return normalized;
}

export function autobiographicalMemoryRecordDigest(record, previousDigest = null) {
  const normalized = normalizeAutobiographicalMemory(record);
  if (previousDigest !== null && !/^sha256:[0-9a-f]{64}$/.test(previousDigest)) throw new TypeError("previous memory digest is invalid");
  return `sha256:${sha256(canonicalJson({ ledgerKind: "autobiographical_memory", previousDigest, record: normalized }))}`;
}
export function autobiographicalMemoryIsCurrent(record) {
  return normalizeAutobiographicalMemory(record).status !== "retracted";
}

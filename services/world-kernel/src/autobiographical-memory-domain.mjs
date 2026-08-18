import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

const MEMORY_ID = /^mem_[0-9a-f]{64}$/;
const MEANING_PART_ID = /^mpart_[0-9a-f]{40}$/;
const LEGACY_MEMORY_KEYS = Object.freeze([
  "memoryId",
  "revision",
  "threadId",
  "subject",
  "subjectPeriod",
  "eventRefs",
  "rememberedMeaning",
  "asOf",
  "confidence",
  "uncertainty",
  "salience",
  "accessibility",
  "retentionState",
  "authorship",
  "supportingEvidenceRefs",
  "contradictingEvidenceRefs",
  "visibility",
  "status",
  "recordedAt",
  "supersedesRevision",
]);
const GENESIS_MEMORY_KEYS = Object.freeze([
  "recordFormat",
  "memoryId",
  "revision",
  "threadId",
  "subject",
  "subjectPeriod",
  "eventRefs",
  "rememberedContent",
  "rememberedMeaning",
  "meaningOutcome",
  "meaningParts",
  "asOf",
  "confidence",
  "uncertainty",
  "salience",
  "accessibility",
  "retentionState",
  "authorship",
  "supportingEvidenceRefs",
  "contradictingEvidenceRefs",
  "visibility",
  "status",
  "recordedAt",
  "supersedesRevision",
]);

export const AUTOBIOGRAPHICAL_MEMORY_POLICY = Object.freeze({
  id: "autobiographical_memory_epistemics",
  version: "1",
});
export const AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2 = "autobiographical_memory_v2";
export const AUTOBIOGRAPHICAL_MEMORY_V2_POLICY = Object.freeze({
  maxRememberedContentBytes: 2048,
  maxRememberedMeaningBytes: 2048,
  maxMeaningParts: 6,
  maxMeaningPartBytes: 1024,
});
export const MEMORY_MEANING_OUTCOMES = Object.freeze(["durable_meaning", "no_durable_meaning"]);
export const MEMORY_ACCESSIBILITIES = Object.freeze(["accessible", "difficult", "inaccessible"]);
export const MEMORY_RETENTION_STATES = Object.freeze(["retained", "fragmentary", "uncertain", "unavailable"]);
export const MEMORY_STATUSES = Object.freeze(["current", "disputed", "corrected", "retracted"]);
export const MEMORY_AUTHORSHIP_KINDS = Object.freeze([
  "fibre_genesis_authored",
  "fibre_policy_derived",
  "imported_recollection",
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

function assertMaterialText(name, value, maxBytes) {
  assertNonEmpty(name, value);
  if (value.trim().length < 12) throw new TypeError(`${name} must contain material autobiographical content`);
  if (Buffer.byteLength(value, "utf8") > maxBytes) throw new TypeError(`${name} exceeds ${maxBytes} UTF-8 bytes`);
  return value;
}

export function autobiographicalMemoryId({ threadId, originReference, slot }) {
  assertId("threadId", threadId);
  assertId("originReference", originReference);
  assertNonEmpty("slot", slot);
  return `mem_${sha256(canonicalJson({ threadId, originReference, slot }))}`;
}

export function autobiographicalMeaningPartId({ memoryId, ordinal }) {
  assertNonEmpty("memoryId", memoryId);
  if (!MEMORY_ID.test(memoryId)) throw new TypeError("meaning-part memoryId must be a canonical autobiographical memory ID");
  assertFiniteNumber("ordinal", ordinal, { integer: true, minimum: 1 });
  return `mpart_${sha256(canonicalJson({ memoryRef: memoryId, ordinal })).slice(0, 40)}`;
}

function normalizeCommon(candidate) {
  assertNonEmpty("memoryId", candidate.memoryId);
  if (!MEMORY_ID.test(candidate.memoryId)) {
    throw new TypeError("memoryId must be mem_ followed by 64 lowercase hex characters");
  }
  assertFiniteNumber("revision", candidate.revision, { integer: true, minimum: 1 });
  assertId("threadId", candidate.threadId);

  assertPlainObject("subject", candidate.subject);
  assertExactKeys("subject", candidate.subject, ["originEventRef", "slot"]);
  assertId("subject.originEventRef", candidate.subject.originEventRef);
  assertNonEmpty("subject.slot", candidate.subject.slot);
  const expectedMemoryId = autobiographicalMemoryId({
    threadId: candidate.threadId,
    originReference: candidate.subject.originEventRef,
    slot: candidate.subject.slot,
  });
  if (candidate.memoryId !== expectedMemoryId) {
    throw new TypeError("memoryId does not match its immutable subject identity");
  }

  assertPlainObject("subjectPeriod", candidate.subjectPeriod);
  assertExactKeys("subjectPeriod", candidate.subjectPeriod, ["startAt", "endAt"]);
  assertIsoTimestamp("subjectPeriod.startAt", candidate.subjectPeriod.startAt);
  if (candidate.subjectPeriod.endAt !== null) {
    assertIsoTimestamp("subjectPeriod.endAt", candidate.subjectPeriod.endAt);
    order("subjectPeriod", candidate.subjectPeriod.startAt, candidate.subjectPeriod.endAt);
  }

  refs("eventRefs", candidate.eventRefs, { required: true });
  if (!candidate.eventRefs.includes(candidate.subject.originEventRef)) {
    throw new TypeError("eventRefs must retain the memory subject origin event");
  }

  assertIsoTimestamp("asOf", candidate.asOf);
  assertIsoTimestamp("recordedAt", candidate.recordedAt);
  order(
    "asOf",
    candidate.subjectPeriod.endAt ?? candidate.subjectPeriod.startAt,
    candidate.asOf,
  );
  order("recordedAt", candidate.asOf, candidate.recordedAt);

  assertFiniteNumber("confidence", candidate.confidence, { minimum: 0 });
  if (candidate.confidence > 1) throw new TypeError("confidence must be at most 1");
  assertStringArray("uncertainty", candidate.uncertainty);
  if (new Set(candidate.uncertainty).size !== candidate.uncertainty.length) {
    throw new TypeError("uncertainty must be unique");
  }
  candidate.uncertainty.forEach((value, index) => assertNonEmpty(`uncertainty[${index}]`, value));
  assertFiniteNumber("salience", candidate.salience, { minimum: 0 });
  if (candidate.salience > 1) throw new TypeError("salience must be at most 1");
  if (!MEMORY_ACCESSIBILITIES.includes(candidate.accessibility)) throw new TypeError("accessibility is invalid");
  if (!MEMORY_RETENTION_STATES.includes(candidate.retentionState)) throw new TypeError("retentionState is invalid");

  assertPlainObject("authorship", candidate.authorship);
  assertExactKeys("authorship", candidate.authorship, ["kind", "entityId", "policy"]);
  if (!MEMORY_AUTHORSHIP_KINDS.includes(candidate.authorship.kind)) throw new TypeError("authorship.kind is invalid");
  assertId("authorship.entityId", candidate.authorship.entityId);
  if (candidate.authorship.entityId === candidate.threadId) {
    throw new TypeError("#38 memory authorship cannot attribute Fibre/imported memory production to the Thread itself");
  }
  assertPlainObject("authorship.policy", candidate.authorship.policy);
  assertExactKeys("authorship.policy", candidate.authorship.policy, ["id", "version"]);
  if (
    candidate.authorship.policy.id !== AUTOBIOGRAPHICAL_MEMORY_POLICY.id ||
    candidate.authorship.policy.version !== AUTOBIOGRAPHICAL_MEMORY_POLICY.version
  ) {
    throw new TypeError("authorship policy is unsupported");
  }

  refs("supportingEvidenceRefs", candidate.supportingEvidenceRefs);
  refs("contradictingEvidenceRefs", candidate.contradictingEvidenceRefs);
  const support = new Set(candidate.supportingEvidenceRefs);
  if (candidate.contradictingEvidenceRefs.some((ref) => support.has(ref))) {
    throw new TypeError("evidence cannot both support and contradict a memory revision");
  }

  if (!["public", "restricted", "private"].includes(candidate.visibility)) throw new TypeError("visibility is invalid");
  if (!MEMORY_STATUSES.includes(candidate.status)) throw new TypeError("status is invalid");
  if (candidate.revision === 1) {
    if (candidate.supersedesRevision !== undefined) throw new TypeError("revision 1 cannot supersede a revision");
  } else {
    assertFiniteNumber("supersedesRevision", candidate.supersedesRevision, { integer: true, minimum: 1 });
    if (candidate.supersedesRevision !== candidate.revision - 1) {
      throw new TypeError("memory must supersede its immediate predecessor");
    }
  }
}

function normalizeLegacyMemory(candidate) {
  assertExactKeys("autobiographical memory", candidate, LEGACY_MEMORY_KEYS);
  normalizeCommon(candidate);
  assertNonEmpty("rememberedMeaning", candidate.rememberedMeaning);
  if (candidate.rememberedMeaning.trim().length < 12) {
    throw new TypeError("rememberedMeaning must contain a material autobiographical interpretation");
  }
  if (Buffer.byteLength(candidate.rememberedMeaning, "utf8") > 2048) {
    throw new TypeError("rememberedMeaning exceeds 2048 UTF-8 bytes");
  }
  const normalized = structuredClone(candidate);
  if (normalized.supersedesRevision === undefined) delete normalized.supersedesRevision;
  return normalized;
}

function normalizeMeaningPart(candidate, index, memoryId) {
  const path = `meaningParts[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, ["meaningPartId", "meaning"]);
  assertNonEmpty(`${path}.meaningPartId`, candidate.meaningPartId);
  if (!MEANING_PART_ID.test(candidate.meaningPartId)) throw new TypeError(`${path}.meaningPartId is invalid`);
  const expectedId = autobiographicalMeaningPartId({ memoryId, ordinal: index + 1 });
  if (candidate.meaningPartId !== expectedId) throw new TypeError(`${path}.meaningPartId is not stable for memory+ordinal`);
  assertMaterialText(`${path}.meaning`, candidate.meaning, AUTOBIOGRAPHICAL_MEMORY_V2_POLICY.maxMeaningPartBytes);
  return structuredClone(candidate);
}

function normalizeGenesisMemory(candidate) {
  assertExactKeys("autobiographical memory", candidate, GENESIS_MEMORY_KEYS);
  if (candidate.recordFormat !== AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2) {
    throw new TypeError(`unsupported autobiographical memory recordFormat ${candidate.recordFormat}`);
  }
  normalizeCommon(candidate);
  assertMaterialText(
    "rememberedContent",
    candidate.rememberedContent,
    AUTOBIOGRAPHICAL_MEMORY_V2_POLICY.maxRememberedContentBytes,
  );
  if (!MEMORY_MEANING_OUTCOMES.includes(candidate.meaningOutcome)) throw new TypeError("meaningOutcome is invalid");
  if (!Array.isArray(candidate.meaningParts)) throw new TypeError("meaningParts must be an array");
  if (candidate.meaningParts.length > AUTOBIOGRAPHICAL_MEMORY_V2_POLICY.maxMeaningParts) {
    throw new TypeError(`meaningParts exceeds ${AUTOBIOGRAPHICAL_MEMORY_V2_POLICY.maxMeaningParts} parts`);
  }
  const meaningParts = candidate.meaningParts.map((part, index) => normalizeMeaningPart(part, index, candidate.memoryId));
  if (candidate.meaningOutcome === "no_durable_meaning") {
    if (candidate.rememberedMeaning !== null) throw new TypeError("no_durable_meaning must use rememberedMeaning=null");
    if (meaningParts.length !== 0) throw new TypeError("no_durable_meaning must use meaningParts=[]");
  } else {
    assertMaterialText(
      "rememberedMeaning",
      candidate.rememberedMeaning,
      AUTOBIOGRAPHICAL_MEMORY_V2_POLICY.maxRememberedMeaningBytes,
    );
    if (meaningParts.length === 0) throw new TypeError("durable_meaning requires at least one independently citable meaning part");
  }
  const normalized = structuredClone({ ...candidate, meaningParts });
  if (normalized.supersedesRevision === undefined) delete normalized.supersedesRevision;
  return normalized;
}

export function normalizeAutobiographicalMemory(candidate) {
  assertPlainObject("autobiographical memory", candidate);
  if (candidate.recordFormat === undefined) return normalizeLegacyMemory(candidate);
  if (candidate.recordFormat === AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2) return normalizeGenesisMemory(candidate);
  throw new TypeError(`unsupported autobiographical memory recordFormat ${candidate.recordFormat}`);
}

export function autobiographicalMemoryRecordDigest(record, previousDigest = null) {
  const normalized = normalizeAutobiographicalMemory(record);
  if (previousDigest !== null && !/^sha256:[0-9a-f]{64}$/.test(previousDigest)) {
    throw new TypeError("previous memory digest is invalid");
  }
  return `sha256:${sha256(canonicalJson({
    ledgerKind: "autobiographical_memory",
    previousDigest,
    record: normalized,
  }))}`;
}

export function autobiographicalMemoryIsCurrent(record) {
  return normalizeAutobiographicalMemory(record).status !== "retracted";
}

import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export const STRUCTURED_OBLIGATION_POLICY = Object.freeze({
  id: "structured_obligation_applicability",
  version: "1",
});

export const OBLIGATION_STATUSES = new Set([
  "active",
  "satisfied",
  "expired",
  "revoked",
  "discharged",
]);

export const OBLIGATION_VISIBILITIES = new Set(["public", "restricted", "private"]);
export const OBLIGATION_PARTY_ROLES = new Set([
  "beneficiary",
  "counterparty",
  "issuer_delegate",
  "witness",
  "institution",
  "other",
]);
export const OBLIGATION_RECURRENCE_KINDS = new Set(["none", "descriptive"]);
export const OBLIGATION_BINDING_KINDS = new Set(["request_fingerprint"]);
export const OBLIGATION_NOMINATION_SOURCES = new Set(["caller", "fibre", "both"]);
export const OBLIGATION_APPLICABILITY_RESULTS = new Set(["applies", "does_not_apply"]);

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const OBLIGATION_ID_PATTERN = /^obl_[0-9a-f]{64}$/;
const ENTITY_KINDS = new Set(["human", "thread", "company", "institution", "other"]);

function assertSha(name, value) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new TypeError(`${name} must be a SHA-256 digest`);
  }
}

function assertObligationId(name, value) {
  assertNonEmpty(name, value);
  if (!OBLIGATION_ID_PATTERN.test(value)) {
    throw new TypeError(`${name} must be obl_ followed by 64 lowercase hex characters`);
  }
}

function assertEntity(name, entity) {
  assertPlainObject(name, entity);
  assertExactKeys(name, entity, ["entityId", "kind", "displayName"]);
  assertId(`${name}.entityId`, entity.entityId);
  if (!ENTITY_KINDS.has(entity.kind)) throw new TypeError(`${name}.kind is invalid`);
  assertNonEmpty(`${name}.displayName`, entity.displayName);
}

function normalizeParty(party, index) {
  const name = `obligation.parties[${index}]`;
  assertPlainObject(name, party);
  assertExactKeys(name, party, ["role", "entity"]);
  if (!OBLIGATION_PARTY_ROLES.has(party.role)) {
    throw new TypeError(`${name}.role is invalid`);
  }
  assertEntity(`${name}.entity`, party.entity);
  return { role: party.role, entity: { ...party.entity } };
}

function normalizeBinding(binding) {
  if (binding === null) return null;
  assertPlainObject("obligation.scope.binding", binding);
  assertExactKeys("obligation.scope.binding", binding, ["kind", "requestFingerprint"]);
  if (!OBLIGATION_BINDING_KINDS.has(binding.kind)) {
    throw new TypeError("obligation.scope.binding.kind is invalid");
  }
  assertSha("obligation.scope.binding.requestFingerprint", binding.requestFingerprint);
  return { kind: binding.kind, requestFingerprint: binding.requestFingerprint };
}

function normalizeRecurrence(recurrence) {
  assertPlainObject("obligation.recurrence", recurrence);
  assertExactKeys("obligation.recurrence", recurrence, ["kind", "description"]);
  if (!OBLIGATION_RECURRENCE_KINDS.has(recurrence.kind)) {
    throw new TypeError("obligation.recurrence.kind is invalid");
  }
  if (recurrence.kind === "none") {
    if (recurrence.description !== undefined) {
      throw new TypeError("obligation.recurrence.description is not allowed for none");
    }
    return { kind: "none" };
  }
  assertNonEmpty("obligation.recurrence.description", recurrence.description);
  return { kind: "descriptive", description: recurrence.description };
}

export function normalizeStructuredObligation(record) {
  assertPlainObject("obligation", record);
  assertExactKeys("obligation", record, [
    "obligationId",
    "revision",
    "threadId",
    "status",
    "issuer",
    "parties",
    "scope",
    "terms",
    "effectiveAt",
    "expiresAt",
    "recurrence",
    "satisfaction",
    "provenance",
    "visibility",
    "legacySourceDigest",
    "supersedesRevision",
  ]);

  assertObligationId("obligation.obligationId", record.obligationId);
  assertFiniteNumber("obligation.revision", record.revision, { integer: true, minimum: 1 });
  assertId("obligation.threadId", record.threadId);
  if (!OBLIGATION_STATUSES.has(record.status)) throw new TypeError("obligation.status is invalid");
  assertEntity("obligation.issuer", record.issuer);

  if (!Array.isArray(record.parties)) throw new TypeError("obligation.parties must be an array");
  const parties = record.parties.map(normalizeParty);
  const partyKeys = parties.map((party) => `${party.role}:${party.entity.kind}:${party.entity.entityId}`);
  if (new Set(partyKeys).size !== partyKeys.length) {
    throw new TypeError("obligation.parties must not contain duplicates");
  }

  assertPlainObject("obligation.scope", record.scope);
  assertExactKeys("obligation.scope", record.scope, ["description", "binding"]);
  assertNonEmpty("obligation.scope.description", record.scope.description);
  const binding = normalizeBinding(record.scope.binding ?? null);

  assertNonEmpty("obligation.terms", record.terms);
  assertIsoTimestamp("obligation.effectiveAt", record.effectiveAt);
  if (record.expiresAt !== undefined) {
    assertIsoTimestamp("obligation.expiresAt", record.expiresAt);
    if (Date.parse(record.expiresAt) <= Date.parse(record.effectiveAt)) {
      throw new TypeError("obligation.expiresAt must be after effectiveAt");
    }
  }

  const recurrence = normalizeRecurrence(record.recurrence);
  assertPlainObject("obligation.satisfaction", record.satisfaction);
  assertExactKeys("obligation.satisfaction", record.satisfaction, ["criteria"]);
  assertNonEmpty("obligation.satisfaction.criteria", record.satisfaction.criteria);

  assertPlainObject("obligation.provenance", record.provenance);
  assertExactKeys("obligation.provenance", record.provenance, [
    "createdBy",
    "createdAt",
    "evidenceReferences",
  ]);
  assertNonEmpty("obligation.provenance.createdBy", record.provenance.createdBy);
  assertIsoTimestamp("obligation.provenance.createdAt", record.provenance.createdAt);
  if (!Array.isArray(record.provenance.evidenceReferences)) {
    throw new TypeError("obligation.provenance.evidenceReferences must be an array");
  }
  record.provenance.evidenceReferences.forEach((reference, index) =>
    assertNonEmpty(`obligation.provenance.evidenceReferences[${index}]`, reference));
  if (new Set(record.provenance.evidenceReferences).size !== record.provenance.evidenceReferences.length) {
    throw new TypeError("obligation.provenance.evidenceReferences must not contain duplicates");
  }

  if (!OBLIGATION_VISIBILITIES.has(record.visibility)) {
    throw new TypeError("obligation.visibility is invalid");
  }
  if (record.legacySourceDigest !== undefined) {
    assertSha("obligation.legacySourceDigest", record.legacySourceDigest);
  }
  if (record.supersedesRevision !== undefined) {
    assertFiniteNumber("obligation.supersedesRevision", record.supersedesRevision, {
      integer: true,
      minimum: 1,
    });
    if (record.supersedesRevision >= record.revision) {
      throw new TypeError("obligation.supersedesRevision must be lower than revision");
    }
  }
  if (record.revision === 1 && record.supersedesRevision !== undefined) {
    throw new TypeError("obligation revision 1 cannot supersede an earlier revision");
  }
  if (record.revision > 1 && record.supersedesRevision === undefined) {
    throw new TypeError("obligation revisions after 1 must identify supersedesRevision");
  }

  return {
    obligationId: record.obligationId,
    revision: record.revision,
    threadId: record.threadId,
    status: record.status,
    issuer: { ...record.issuer },
    parties,
    scope: { description: record.scope.description, binding },
    terms: record.terms,
    effectiveAt: record.effectiveAt,
    ...(record.expiresAt === undefined ? {} : { expiresAt: record.expiresAt }),
    recurrence,
    satisfaction: { criteria: record.satisfaction.criteria },
    provenance: {
      createdBy: record.provenance.createdBy,
      createdAt: record.provenance.createdAt,
      evidenceReferences: [...record.provenance.evidenceReferences],
    },
    visibility: record.visibility,
    ...(record.legacySourceDigest === undefined
      ? {}
      : { legacySourceDigest: record.legacySourceDigest }),
    ...(record.supersedesRevision === undefined
      ? {}
      : { supersedesRevision: record.supersedesRevision }),
  };
}

export function structuredObligationDigest(record) {
  return `sha256:${sha256(canonicalJson(normalizeStructuredObligation(record)))}`;
}

export function legacyObligationReferenceDigest(threadId, reference) {
  assertId("threadId", threadId);
  assertNonEmpty("legacy obligation reference", reference);
  return `sha256:${sha256(canonicalJson({ threadId, reference }))}`;
}

export function legacyObligationTombstoneId(threadId, reference) {
  return `olt_${legacyObligationReferenceDigest(threadId, reference).slice(7)}`;
}

export function deterministicApplicability(record, {
  threadId,
  requestFingerprint,
  decidedAt,
  legacyTombstoned = false,
} = {}) {
  const obligation = normalizeStructuredObligation(record);
  assertId("applicability.threadId", threadId);
  assertSha("applicability.requestFingerprint", requestFingerprint);
  assertIsoTimestamp("applicability.decidedAt", decidedAt);

  if (obligation.threadId !== threadId) {
    return { result: "does_not_apply", reasonCode: "foreign_thread" };
  }
  if (legacyTombstoned) {
    return { result: "does_not_apply", reasonCode: "legacy_authority_spent" };
  }
  if (obligation.status !== "active") {
    return { result: "does_not_apply", reasonCode: `status_${obligation.status}` };
  }
  if (Date.parse(decidedAt) < Date.parse(obligation.effectiveAt)) {
    return { result: "does_not_apply", reasonCode: "not_yet_effective" };
  }
  if (obligation.expiresAt !== undefined && Date.parse(decidedAt) >= Date.parse(obligation.expiresAt)) {
    return { result: "does_not_apply", reasonCode: "expired" };
  }
  if (obligation.scope.binding === null) {
    return { result: "does_not_apply", reasonCode: "no_supported_binding" };
  }
  if (obligation.scope.binding.requestFingerprint !== requestFingerprint) {
    return { result: "does_not_apply", reasonCode: "request_binding_mismatch" };
  }
  return { result: "applies", reasonCode: "request_binding_match" };
}

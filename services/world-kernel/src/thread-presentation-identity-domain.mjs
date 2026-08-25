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

export const THREAD_PRESENTATION_PACKET_CURRENT_VERSION = "thread-presentation-packet-v0.2";
export const THREAD_PRESENTATION_PACKET_LEGACY_VERSION = "thread-presentation-packet-v0.1";
export const THREAD_PRESENTATION_PACKET_VERSIONS = Object.freeze([
  THREAD_PRESENTATION_PACKET_LEGACY_VERSION,
  THREAD_PRESENTATION_PACKET_CURRENT_VERSION,
]);
export const THREAD_VISUAL_IDENTITY_PROJECTION_VERSION = "thread-visual-identity-projection-v0.1";
export const FIBRE_IDENTITY_CARD_CREDENTIAL_VERSION = "fibre-identity-card-credential-v0.1";
export const FIBRE_IDENTITY_CARD_STATUSES = Object.freeze(["active", "replaced", "expired", "revoked"]);
export const FIBRE_IDENTITY_CARD_DATE_KINDS = Object.freeze(["birth_date", "entry_date"]);

const FIN_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const FIN_PATTERN = new RegExp(`^[${FIN_ALPHABET}]{4}-[${FIN_ALPHABET}]{2}-[${FIN_ALPHABET}]{4}$`);

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) throw new TypeError(`${name} is invalid`);
}

function nullableText(name, value) {
  if (value === null) return null;
  assertNonEmpty(name, value);
  return value;
}

function nullableRef(name, value) {
  if (value === null) return null;
  assertId(name, value);
  return value;
}

function stringRefs(name, value, { required = false } = {}) {
  assertStringArray(name, value);
  if (required && value.length === 0) throw new TypeError(`${name} must not be empty`);
  if (new Set(value).size !== value.length) throw new TypeError(`${name} must be unique`);
  value.forEach((ref, index) => assertId(`${name}[${index}]`, ref));
  return [...value];
}

function dateOnly(name, value) {
  assertNonEmpty(name, value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${name} must use YYYY-MM-DD`);
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) {
    throw new TypeError(`${name} must be a valid calendar date`);
  }
  return value;
}

function normalizeCardDateField(value) {
  if (value === null) return null;
  assertPlainObject("presentation.identityCard.dateField", value);
  assertExactKeys("presentation.identityCard.dateField", value, ["kind", "value"]);
  assertEnum("presentation.identityCard.dateField.kind", value.kind, FIBRE_IDENTITY_CARD_DATE_KINDS);
  return { kind: value.kind, value: dateOnly("presentation.identityCard.dateField.value", value.value) };
}

export function assertFibreIdentityNumberFormat(value) {
  assertNonEmpty("fibreIdentityNumber", value);
  if (!FIN_PATTERN.test(value)) {
    throw new TypeError("fibreIdentityNumber must use Fibre XXXX-XX-XXXX display syntax");
  }
  return value;
}

export function normalizePresentationCivilIdentity(value) {
  if (value === null) return null;
  const name = "presentation.civilIdentity";
  assertPlainObject(name, value);
  assertExactKeys(name, value, [
    "fibreIdentityNumber", "registrationId", "registeredAt", "birthEventRef", "worldRef", "issuer",
    "sourceReferences", "provenanceRef",
  ]);
  const fibreIdentityNumber = assertFibreIdentityNumberFormat(value.fibreIdentityNumber);
  assertId(`${name}.registrationId`, value.registrationId);
  assertIsoTimestamp(`${name}.registeredAt`, value.registeredAt);
  assertId(`${name}.birthEventRef`, value.birthEventRef);
  assertId(`${name}.worldRef`, value.worldRef);
  assertNonEmpty(`${name}.issuer`, value.issuer);
  assertId(`${name}.provenanceRef`, value.provenanceRef);
  return {
    fibreIdentityNumber,
    registrationId: value.registrationId,
    registeredAt: value.registeredAt,
    birthEventRef: value.birthEventRef,
    worldRef: value.worldRef,
    issuer: value.issuer,
    sourceReferences: stringRefs(`${name}.sourceReferences`, value.sourceReferences, { required: true }),
    provenanceRef: value.provenanceRef,
  };
}

export function normalizeThreadVisualIdentityProjection(value) {
  if (value === null) return null;
  const name = "presentation.visualIdentity";
  assertPlainObject(name, value);
  assertExactKeys(name, value, [
    "projectionVersion", "authority", "embodimentId", "embodimentRevision", "specificationDigest",
    "subjectDescription", "renderDescription", "sourceReferences", "permissionReferences",
    "referenceObjectRefs", "provenanceRef",
  ]);
  if (value.projectionVersion !== THREAD_VISUAL_IDENTITY_PROJECTION_VERSION) {
    throw new TypeError(`${name}.projectionVersion is unsupported`);
  }
  if (value.authority !== "authorized_embodiment_projection") throw new TypeError(`${name}.authority is invalid`);
  assertId(`${name}.embodimentId`, value.embodimentId);
  assertFiniteNumber(`${name}.embodimentRevision`, value.embodimentRevision, { integer: true, minimum: 1 });
  if (typeof value.specificationDigest !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value.specificationDigest)) {
    throw new TypeError(`${name}.specificationDigest is invalid`);
  }
  assertNonEmpty(`${name}.subjectDescription`, value.subjectDescription);
  assertNonEmpty(`${name}.renderDescription`, value.renderDescription);
  assertId(`${name}.provenanceRef`, value.provenanceRef);
  return {
    projectionVersion: THREAD_VISUAL_IDENTITY_PROJECTION_VERSION,
    authority: "authorized_embodiment_projection",
    embodimentId: value.embodimentId,
    embodimentRevision: value.embodimentRevision,
    specificationDigest: value.specificationDigest,
    subjectDescription: value.subjectDescription,
    renderDescription: value.renderDescription,
    sourceReferences: stringRefs(`${name}.sourceReferences`, value.sourceReferences, { required: true }),
    permissionReferences: stringRefs(`${name}.permissionReferences`, value.permissionReferences),
    referenceObjectRefs: stringRefs(`${name}.referenceObjectRefs`, value.referenceObjectRefs),
    provenanceRef: value.provenanceRef,
  };
}

export function threadVisualIdentityProjectionDigest(value) {
  const normalized = normalizeThreadVisualIdentityProjection(value);
  if (normalized === null) throw new TypeError("visual identity projection is required");
  return `sha256:${sha256(canonicalJson(normalized))}`;
}

export function normalizeFibreIdentityCard(value) {
  if (value === null) return null;
  const name = "presentation.identityCard";
  assertPlainObject(name, value);
  assertExactKeys(name, value, [
    "credentialVersion", "credentialId", "cardSerial", "revision", "supersedesCredentialId",
    "registrationId", "displayName", "dateField", "issuedAt", "expiresAt", "status",
    "officialPhotoMediaRef", "machineReadableCredentialRef", "sourceReferences", "provenanceRef",
  ]);
  if (value.credentialVersion !== FIBRE_IDENTITY_CARD_CREDENTIAL_VERSION) {
    throw new TypeError(`${name}.credentialVersion is unsupported`);
  }
  assertId(`${name}.credentialId`, value.credentialId);
  assertNonEmpty(`${name}.cardSerial`, value.cardSerial);
  assertFiniteNumber(`${name}.revision`, value.revision, { integer: true, minimum: 1 });
  const supersedesCredentialId = nullableRef(`${name}.supersedesCredentialId`, value.supersedesCredentialId);
  if (value.revision === 1 && supersedesCredentialId !== null) {
    throw new TypeError(`${name} revision 1 cannot supersede another credential`);
  }
  if (value.revision > 1 && supersedesCredentialId === null) {
    throw new TypeError(`${name} reissue requires supersedesCredentialId`);
  }
  assertId(`${name}.registrationId`, value.registrationId);
  const displayName = nullableText(`${name}.displayName`, value.displayName);
  const dateField = normalizeCardDateField(value.dateField);
  assertIsoTimestamp(`${name}.issuedAt`, value.issuedAt);
  const expiresAt = value.expiresAt === null ? null : value.expiresAt;
  if (expiresAt !== null) {
    assertIsoTimestamp(`${name}.expiresAt`, expiresAt);
    if (Date.parse(expiresAt) <= Date.parse(value.issuedAt)) throw new TypeError(`${name}.expiresAt must follow issuedAt`);
  }
  assertEnum(`${name}.status`, value.status, FIBRE_IDENTITY_CARD_STATUSES);
  assertId(`${name}.officialPhotoMediaRef`, value.officialPhotoMediaRef);
  const machineReadableCredentialRef = nullableRef(`${name}.machineReadableCredentialRef`, value.machineReadableCredentialRef);
  assertId(`${name}.provenanceRef`, value.provenanceRef);
  return {
    credentialVersion: FIBRE_IDENTITY_CARD_CREDENTIAL_VERSION,
    credentialId: value.credentialId,
    cardSerial: value.cardSerial,
    revision: value.revision,
    supersedesCredentialId,
    registrationId: value.registrationId,
    displayName,
    dateField,
    issuedAt: value.issuedAt,
    expiresAt,
    status: value.status,
    officialPhotoMediaRef: value.officialPhotoMediaRef,
    machineReadableCredentialRef,
    sourceReferences: stringRefs(`${name}.sourceReferences`, value.sourceReferences, { required: true }),
    provenanceRef: value.provenanceRef,
  };
}

export function fibreIdentityCardDisplayData(presentation) {
  assertPlainObject("presentation", presentation);
  const civilIdentity = normalizePresentationCivilIdentity(presentation.civilIdentity ?? null);
  const identityCard = normalizeFibreIdentityCard(presentation.identityCard ?? null);
  if (civilIdentity === null || identityCard === null) return null;
  if (identityCard.registrationId !== civilIdentity.registrationId) {
    throw new TypeError("identity card registrationId must match civil identity registrationId");
  }
  if (identityCard.credentialId === civilIdentity.fibreIdentityNumber || identityCard.cardSerial === civilIdentity.fibreIdentityNumber) {
    throw new TypeError("identity card credential identity must be distinct from FIN");
  }
  return Object.freeze({
    fibreIdentityNumber: civilIdentity.fibreIdentityNumber,
    issuer: civilIdentity.issuer,
    credentialId: identityCard.credentialId,
    cardSerial: identityCard.cardSerial,
    revision: identityCard.revision,
    displayName: identityCard.displayName,
    dateField: identityCard.dateField,
    issuedAt: identityCard.issuedAt,
    expiresAt: identityCard.expiresAt,
    status: identityCard.status,
    officialPhotoMediaRef: identityCard.officialPhotoMediaRef,
    machineReadableCredentialRef: identityCard.machineReadableCredentialRef,
  });
}

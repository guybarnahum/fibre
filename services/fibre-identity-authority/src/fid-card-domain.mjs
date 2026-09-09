import { createHash } from "node:crypto";

import { normalizeFibreIdentityNumber } from "#core/src/fibre-civil-identity.mjs";

export const FID_CREDENTIAL_RECORD_VERSION = "fid-card-credential-record-v0.1";
export const FID_LIFECYCLE_STATUSES = Object.freeze([
  "active",
  "superseded",
  "revoked",
  "expired",
]);

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

function requiredId(name, value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function requiredIso(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${name} must be an ISO timestamp`);
  }
  return new Date(value).toISOString();
}

function optionalIso(name, value) {
  if (value === null || value === undefined) return null;
  return requiredIso(name, value);
}

function exactKeys(name, value, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${name}.${key} is not allowed`);
  }
  return value;
}

export function normalizeFidCivilIdentity(value) {
  exactKeys("civilIdentity", value, ["threadId", "fibreIdentityNumber", "registrationId"]);
  return Object.freeze({
    threadId: requiredId("civilIdentity.threadId", value.threadId),
    fibreIdentityNumber: normalizeFibreIdentityNumber(value.fibreIdentityNumber),
    registrationId: requiredId("civilIdentity.registrationId", value.registrationId),
  });
}

export function normalizeFidCredentialRecord(value, { civilIdentity } = {}) {
  exactKeys("credential", value, [
    "credentialId",
    "revision",
    "threadId",
    "fibreIdentityNumber",
    "registrationId",
    "supersedesCredentialId",
    "issuedAt",
    "expiresAt",
  ]);
  const normalizedCivil = normalizeFidCivilIdentity(civilIdentity);
  const record = {
    recordVersion: FID_CREDENTIAL_RECORD_VERSION,
    credentialId: requiredId("credential.credentialId", value.credentialId),
    revision: value.revision,
    threadId: requiredId("credential.threadId", value.threadId),
    fibreIdentityNumber: normalizeFibreIdentityNumber(value.fibreIdentityNumber),
    registrationId: requiredId("credential.registrationId", value.registrationId),
    supersedesCredentialId: value.supersedesCredentialId === null || value.supersedesCredentialId === undefined
      ? null
      : requiredId("credential.supersedesCredentialId", value.supersedesCredentialId),
    issuedAt: requiredIso("credential.issuedAt", value.issuedAt),
    expiresAt: optionalIso("credential.expiresAt", value.expiresAt),
  };
  if (!Number.isSafeInteger(record.revision) || record.revision < 1) {
    throw new TypeError("credential.revision must be a positive integer");
  }
  if (record.threadId !== normalizedCivil.threadId
    || record.fibreIdentityNumber !== normalizedCivil.fibreIdentityNumber
    || record.registrationId !== normalizedCivil.registrationId) {
    throw new TypeError("FID credential civil identity does not match the authority-resolved registration");
  }
  if (record.supersedesCredentialId === record.credentialId) {
    throw new TypeError("FID credential cannot supersede itself");
  }
  if (record.expiresAt !== null && record.expiresAt <= record.issuedAt) {
    throw new TypeError("credential.expiresAt must be after issuedAt");
  }
  return Object.freeze(record);
}

export function normalizeFidLifecycleStatus(value) {
  if (!FID_LIFECYCLE_STATUSES.includes(value)) {
    throw new TypeError(`FID lifecycle status must be one of ${FID_LIFECYCLE_STATUSES.join(", ")}`);
  }
  return value;
}

export function fidRecordJson(record) {
  return JSON.stringify(record);
}

export function fidRecordDigest(record) {
  return `sha256:${createHash("sha256").update(fidRecordJson(record)).digest("hex")}`;
}

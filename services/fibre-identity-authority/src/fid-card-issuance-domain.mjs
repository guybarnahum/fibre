import { createHash } from "node:crypto";

import {
  normalizeFibreCivilRegistration,
  normalizeFibreIdentityNumber,
} from "#core/src/fibre-civil-identity.mjs";

export const FID_ISSUANCE_WORKFLOW_VERSION = "fid-card-issuance-workflow-v0.1";
export const FID_ISSUANCE_REASONS = Object.freeze([
  "initial",
  "renewal",
  "replacement",
  "correction",
]);
export const FID_ISSUANCE_WORKFLOW_STATES = Object.freeze(["identity_resolved"]);

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

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

function positiveInteger(name, value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer`);
  return value;
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function normalizeFidIssuanceReason(value) {
  if (!FID_ISSUANCE_REASONS.includes(value)) {
    throw new TypeError(`FID issuance reason must be one of ${FID_ISSUANCE_REASONS.join(", ")}`);
  }
  return value;
}

export function normalizeFidIssuanceRequest(value) {
  exactKeys("FID issuance request", value, ["threadId", "reason", "idempotencyKey"]);
  return Object.freeze({
    threadId: requiredId("FID issuance request.threadId", value.threadId),
    reason: normalizeFidIssuanceReason(value.reason),
    idempotencyKey: requiredId("FID issuance request.idempotencyKey", value.idempotencyKey),
  });
}

export function fidIssuanceRequestDigest(value) {
  const request = normalizeFidIssuanceRequest(value);
  return `sha256:${sha256(canonicalJson({ kind: "fid_card_issuance_request", request }))}`;
}

export function fidIssuanceWorkflowId(idempotencyKey) {
  const key = requiredId("FID issuance idempotencyKey", idempotencyKey);
  return `fidreq_${sha256(`${FID_ISSUANCE_WORKFLOW_VERSION}\u0000${key}`)}`;
}

export function fidProposedCredentialId({ registrationId, revision, idempotencyKey }) {
  const normalizedRegistrationId = requiredId("FID issuance registrationId", registrationId);
  const normalizedRevision = positiveInteger("FID issuance revision", revision);
  const key = requiredId("FID issuance idempotencyKey", idempotencyKey);
  return `fidc_${sha256(`${FID_ISSUANCE_WORKFLOW_VERSION}\u0000${normalizedRegistrationId}\u0000${normalizedRevision}\u0000${key}`)}`;
}

export function normalizeFidIssuanceWorkflowState(value) {
  if (!FID_ISSUANCE_WORKFLOW_STATES.includes(value)) {
    throw new TypeError(`FID issuance workflow state must be one of ${FID_ISSUANCE_WORKFLOW_STATES.join(", ")}`);
  }
  return value;
}

export function buildFidIssuanceWorkflowRecord({
  request,
  civilRegistration,
  proposedRevision,
  priorActiveCredentialId = null,
  requestedAt,
}) {
  const normalizedRequest = normalizeFidIssuanceRequest(request);
  const registration = normalizeFibreCivilRegistration(civilRegistration);
  if (registration.threadId !== normalizedRequest.threadId) {
    throw new TypeError("FID issuance Civil Registry registration belongs to a different Thread");
  }
  const revision = positiveInteger("FID issuance proposedRevision", proposedRevision);
  const record = {
    workflowVersion: FID_ISSUANCE_WORKFLOW_VERSION,
    workflowId: fidIssuanceWorkflowId(normalizedRequest.idempotencyKey),
    idempotencyKey: normalizedRequest.idempotencyKey,
    requestDigest: fidIssuanceRequestDigest(normalizedRequest),
    threadId: registration.threadId,
    fibreIdentityNumber: registration.fibreIdentityNumber,
    registrationId: registration.registrationId,
    civilRegistrationDigest: registration.registrationDigest,
    reason: normalizedRequest.reason,
    proposedCredentialId: fidProposedCredentialId({
      registrationId: registration.registrationId,
      revision,
      idempotencyKey: normalizedRequest.idempotencyKey,
    }),
    proposedRevision: revision,
    priorActiveCredentialId: priorActiveCredentialId === null
      ? null
      : requiredId("FID issuance priorActiveCredentialId", priorActiveCredentialId),
    requestedAt: requiredIso("FID issuance requestedAt", requestedAt),
  };
  if (record.priorActiveCredentialId === record.proposedCredentialId) {
    throw new TypeError("FID issuance proposed credential cannot equal the prior active credential");
  }
  return normalizeFidIssuanceWorkflowRecord(record);
}

export function normalizeFidIssuanceWorkflowRecord(value) {
  exactKeys("FID issuance workflow", value, [
    "workflowVersion",
    "workflowId",
    "idempotencyKey",
    "requestDigest",
    "threadId",
    "fibreIdentityNumber",
    "registrationId",
    "civilRegistrationDigest",
    "reason",
    "proposedCredentialId",
    "proposedRevision",
    "priorActiveCredentialId",
    "requestedAt",
  ]);
  if (value.workflowVersion !== FID_ISSUANCE_WORKFLOW_VERSION) {
    throw new TypeError("FID issuance workflow version is unsupported");
  }
  const record = {
    workflowVersion: value.workflowVersion,
    workflowId: requiredId("FID issuance workflow.workflowId", value.workflowId),
    idempotencyKey: requiredId("FID issuance workflow.idempotencyKey", value.idempotencyKey),
    requestDigest: value.requestDigest,
    threadId: requiredId("FID issuance workflow.threadId", value.threadId),
    fibreIdentityNumber: normalizeFibreIdentityNumber(value.fibreIdentityNumber),
    registrationId: requiredId("FID issuance workflow.registrationId", value.registrationId),
    civilRegistrationDigest: value.civilRegistrationDigest,
    reason: normalizeFidIssuanceReason(value.reason),
    proposedCredentialId: requiredId("FID issuance workflow.proposedCredentialId", value.proposedCredentialId),
    proposedRevision: positiveInteger("FID issuance workflow.proposedRevision", value.proposedRevision),
    priorActiveCredentialId: value.priorActiveCredentialId === null
      ? null
      : requiredId("FID issuance workflow.priorActiveCredentialId", value.priorActiveCredentialId),
    requestedAt: requiredIso("FID issuance workflow.requestedAt", value.requestedAt),
  };
  for (const [name, digest] of [
    ["requestDigest", record.requestDigest],
    ["civilRegistrationDigest", record.civilRegistrationDigest],
  ]) {
    if (typeof digest !== "string" || !DIGEST_PATTERN.test(digest)) {
      throw new TypeError(`FID issuance workflow.${name} is invalid`);
    }
  }
  if (record.workflowId !== fidIssuanceWorkflowId(record.idempotencyKey)) {
    throw new TypeError("FID issuance workflowId does not match idempotency identity");
  }
  const expectedRequestDigest = fidIssuanceRequestDigest({
    threadId: record.threadId,
    reason: record.reason,
    idempotencyKey: record.idempotencyKey,
  });
  if (record.requestDigest !== expectedRequestDigest) {
    throw new TypeError("FID issuance requestDigest does not match request content");
  }
  const expectedCredentialId = fidProposedCredentialId({
    registrationId: record.registrationId,
    revision: record.proposedRevision,
    idempotencyKey: record.idempotencyKey,
  });
  if (record.proposedCredentialId !== expectedCredentialId) {
    throw new TypeError("FID issuance proposedCredentialId does not match authority derivation");
  }
  if (record.priorActiveCredentialId === record.proposedCredentialId) {
    throw new TypeError("FID issuance proposed credential cannot equal the prior active credential");
  }
  return Object.freeze(record);
}

export function fidIssuanceWorkflowJson(record) {
  return canonicalJson(normalizeFidIssuanceWorkflowRecord(record));
}

export function fidIssuanceWorkflowDigest(record) {
  return `sha256:${sha256(fidIssuanceWorkflowJson(record))}`;
}

export function fidIssuanceRequestMatchesWorkflow(request, workflow) {
  const normalizedRequest = normalizeFidIssuanceRequest(request);
  const record = normalizeFidIssuanceWorkflowRecord(workflow);
  return record.threadId === normalizedRequest.threadId
    && record.reason === normalizedRequest.reason
    && record.idempotencyKey === normalizedRequest.idempotencyKey
    && record.requestDigest === fidIssuanceRequestDigest(normalizedRequest);
}

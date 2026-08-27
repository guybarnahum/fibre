import { normalizeAssetGenerationJob } from "./asset-generation-domain.mjs";
import { normalizeProviderRequestWitness } from "./asset-provenance-domain.mjs";

export const PROVIDER_OPERATION_VERSION = "provider-operation-v0.1";
export const PROVIDER_OPERATION_STATUS_ACCEPTED = "accepted";

const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;

function fail(message) { throw new TypeError(message); }
function plain(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(`${name} must be a plain object`);
  }
  return value;
}
function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") fail(`${name} must be a non-empty string`);
  return value;
}
function exact(name, value, allowed) {
  const set = new Set(allowed);
  for (const key of Object.keys(value)) if (!set.has(key)) fail(`${name}.${key} is not allowed`);
}
function digest(name, value) {
  if (typeof value !== "string" || !SHA256_DIGEST.test(value)) fail(`${name} must be a sha256 digest`);
  return value;
}
function positiveAttemptNumber(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail("provider operation.attemptNumber must be a positive safe integer");
  return value;
}
function timestamp(name, value) {
  nonEmpty(name, value);
  if (!Number.isFinite(Date.parse(value))) fail(`${name} must be an ISO timestamp`);
  return value;
}
function jsonValue(name, value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object") fail(`${name} must be JSON-compatible`);
  if (seen.has(value)) fail(`${name} contains a cycle`);
  seen.add(value);
  if (Array.isArray(value)) value.forEach((item, index) => jsonValue(`${name}[${index}]`, item, seen));
  else {
    plain(name, value);
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) fail(`${name}.${key} is undefined`);
      jsonValue(`${name}.${key}`, item, seen);
    }
  }
  seen.delete(value);
}

export function providerOperationObjectRef(jobDigest, rawAttemptNumber) {
  const checkedDigest = digest("jobDigest", jobDigest);
  const attemptNumber = positiveAttemptNumber(rawAttemptNumber);
  return `provideroperation_${checkedDigest.slice("sha256:".length)}_${attemptNumber}`;
}

export function normalizeProviderOperationHandle(value) {
  const name = "provider operation handle";
  plain(name, value);
  exact(name, value, ["provider", "model", "providerRequestId", "continuation", "secretsRemoved"]);
  const continuation = plain(`${name}.continuation`, value.continuation);
  jsonValue(`${name}.continuation`, continuation);
  if (value.secretsRemoved !== true) fail(`${name}.secretsRemoved must be true`);
  return {
    provider: nonEmpty(`${name}.provider`, value.provider),
    model: nonEmpty(`${name}.model`, value.model),
    providerRequestId: nonEmpty(`${name}.providerRequestId`, value.providerRequestId),
    continuation: structuredClone(continuation),
    secretsRemoved: true,
  };
}

export function normalizeProviderOperationStart(value) {
  const name = "provider operation start";
  plain(name, value);
  exact(name, value, ["requestWitness", "operation"]);
  return {
    requestWitness: normalizeProviderRequestWitness(value.requestWitness),
    operation: normalizeProviderOperationHandle(value.operation),
  };
}

export function normalizeProviderOperationCheckpoint(value) {
  const name = "provider operation checkpoint";
  plain(name, value);
  exact(name, value, [
    "operationVersion", "operationId", "jobId", "jobDigest", "attemptNumber", "status",
    "providerProfile", "providerAdapterId", "providerRequestWitness", "providerRequestDigest",
    "operation", "acceptedAt",
  ]);
  if (value.operationVersion !== PROVIDER_OPERATION_VERSION) fail(`${name}.operationVersion is unsupported`);
  const checkedJobDigest = digest(`${name}.jobDigest`, value.jobDigest);
  const checkedAttemptNumber = positiveAttemptNumber(value.attemptNumber);
  const expectedOperationId = providerOperationObjectRef(checkedJobDigest, checkedAttemptNumber);
  if (value.operationId !== expectedOperationId) fail(`${name}.operationId does not match jobDigest/attemptNumber`);
  if (value.status !== PROVIDER_OPERATION_STATUS_ACCEPTED) fail(`${name}.status is unsupported`);
  const providerRequestWitness = normalizeProviderRequestWitness(value.providerRequestWitness);
  const operation = normalizeProviderOperationHandle(value.operation);
  return {
    operationVersion: PROVIDER_OPERATION_VERSION,
    operationId: value.operationId,
    jobId: nonEmpty(`${name}.jobId`, value.jobId),
    jobDigest: checkedJobDigest,
    attemptNumber: checkedAttemptNumber,
    status: PROVIDER_OPERATION_STATUS_ACCEPTED,
    providerProfile: nonEmpty(`${name}.providerProfile`, value.providerProfile),
    providerAdapterId: nonEmpty(`${name}.providerAdapterId`, value.providerAdapterId),
    providerRequestWitness,
    providerRequestDigest: digest(`${name}.providerRequestDigest`, value.providerRequestDigest),
    operation,
    acceptedAt: timestamp(`${name}.acceptedAt`, value.acceptedAt),
  };
}

export function createProviderOperationCheckpoint({
  job,
  jobDigest,
  attemptNumber,
  providerAdapterId,
  providerRequestWitness,
  providerRequestDigest,
  operation,
  acceptedAt,
}) {
  const normalizedJob = normalizeAssetGenerationJob(job);
  const checkedAttemptNumber = positiveAttemptNumber(attemptNumber);
  return normalizeProviderOperationCheckpoint({
    operationVersion: PROVIDER_OPERATION_VERSION,
    operationId: providerOperationObjectRef(jobDigest, checkedAttemptNumber),
    jobId: normalizedJob.jobId,
    jobDigest,
    attemptNumber: checkedAttemptNumber,
    status: PROVIDER_OPERATION_STATUS_ACCEPTED,
    providerProfile: normalizedJob.providerProfile,
    providerAdapterId,
    providerRequestWitness,
    providerRequestDigest,
    operation,
    acceptedAt,
  });
}

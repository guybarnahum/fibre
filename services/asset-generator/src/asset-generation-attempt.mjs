import { normalizeAssetGenerationJob } from "./asset-generation-domain.mjs";
import { normalizeProviderRequestWitness } from "./asset-provenance-domain.mjs";

export const GENERATION_ATTEMPT_VERSION = "generation-attempt-v0.1";
export const GENERATION_ATTEMPT_STATUS_PROVIDER_SUCCEEDED = "provider_succeeded";

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
function nullableText(name, value) {
  if (value === null) return null;
  return nonEmpty(name, value);
}
function exact(name, value, allowed) {
  const set = new Set(allowed);
  for (const key of Object.keys(value)) if (!set.has(key)) fail(`${name}.${key} is not allowed`);
}
function digest(name, value) {
  if (typeof value !== "string" || !SHA256_DIGEST.test(value)) fail(`${name} must be a sha256 digest`);
  return value;
}
function attemptNumber(value) {
  if (!Number.isSafeInteger(value) || value < 1) fail("generation attempt.attemptNumber must be a positive safe integer");
  return value;
}
function timestamp(name, value) {
  nonEmpty(name, value);
  if (!Number.isFinite(Date.parse(value))) fail(`${name} must be an ISO timestamp`);
  return value;
}
function positiveIntegerOrNull(name, value) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 1) fail(`${name} must be a positive integer or null`);
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
function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}
async function sha256Text(value) {
  const digestBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return `sha256:${Array.from(new Uint8Array(digestBytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function assetGenerationJobDigest(rawJob) {
  const job = normalizeAssetGenerationJob(rawJob);
  return sha256Text(JSON.stringify(canonicalize(job)));
}

export function generationAttemptObjectRef(jobDigest, rawAttemptNumber) {
  const checkedDigest = digest("jobDigest", jobDigest);
  const checkedAttempt = attemptNumber(rawAttemptNumber);
  return `generationattempt_${checkedDigest.slice("sha256:".length)}_${checkedAttempt}`;
}

export function stagedProviderOutputObjectRef(jobDigest, rawAttemptNumber) {
  const checkedDigest = digest("jobDigest", jobDigest);
  const checkedAttempt = attemptNumber(rawAttemptNumber);
  return `provideroutput_${checkedDigest.slice("sha256:".length)}_${checkedAttempt}`;
}

export function normalizeGenerationAttempt(value) {
  const name = "generation attempt";
  plain(name, value);
  exact(name, value, [
    "attemptVersion", "attemptId", "jobId", "jobDigest", "attemptNumber", "status",
    "providerProfile", "providerAdapterId", "providerRequestWitness", "providerRequestDigest",
    "providerOutputObjectRef", "providerOutputDigest", "providerOutput", "generation", "createdAt",
  ]);
  if (value.attemptVersion !== GENERATION_ATTEMPT_VERSION) fail(`${name}.attemptVersion is unsupported`);
  const checkedJobDigest = digest(`${name}.jobDigest`, value.jobDigest);
  const checkedAttemptNumber = attemptNumber(value.attemptNumber);
  const expectedAttemptId = generationAttemptObjectRef(checkedJobDigest, checkedAttemptNumber);
  if (value.attemptId !== expectedAttemptId) fail(`${name}.attemptId does not match jobDigest/attemptNumber`);
  nonEmpty(`${name}.jobId`, value.jobId);
  if (value.status !== GENERATION_ATTEMPT_STATUS_PROVIDER_SUCCEEDED) fail(`${name}.status is unsupported`);
  nonEmpty(`${name}.providerProfile`, value.providerProfile);
  nonEmpty(`${name}.providerAdapterId`, value.providerAdapterId);
  const providerRequestWitness = normalizeProviderRequestWitness(value.providerRequestWitness);
  digest(`${name}.providerRequestDigest`, value.providerRequestDigest);
  const expectedOutputRef = stagedProviderOutputObjectRef(checkedJobDigest, checkedAttemptNumber);
  if (value.providerOutputObjectRef !== expectedOutputRef) {
    fail(`${name}.providerOutputObjectRef does not match jobDigest/attemptNumber`);
  }
  digest(`${name}.providerOutputDigest`, value.providerOutputDigest);

  plain(`${name}.providerOutput`, value.providerOutput);
  exact(`${name}.providerOutput`, value.providerOutput, ["mediaType", "width", "height", "durationMs"]);
  nonEmpty(`${name}.providerOutput.mediaType`, value.providerOutput.mediaType);
  positiveIntegerOrNull(`${name}.providerOutput.width`, value.providerOutput.width);
  positiveIntegerOrNull(`${name}.providerOutput.height`, value.providerOutput.height);
  positiveIntegerOrNull(`${name}.providerOutput.durationMs`, value.providerOutput.durationMs);

  plain(`${name}.generation`, value.generation);
  exact(`${name}.generation`, value.generation, ["provider", "model", "providerRequestId", "generatedAt", "configuration"]);
  nonEmpty(`${name}.generation.provider`, value.generation.provider);
  nonEmpty(`${name}.generation.model`, value.generation.model);
  nullableText(`${name}.generation.providerRequestId`, value.generation.providerRequestId);
  timestamp(`${name}.generation.generatedAt`, value.generation.generatedAt);
  plain(`${name}.generation.configuration`, value.generation.configuration);
  jsonValue(`${name}.generation.configuration`, value.generation.configuration);
  timestamp(`${name}.createdAt`, value.createdAt);

  return {
    ...structuredClone(value),
    providerRequestWitness,
  };
}

export function createGenerationAttempt({
  job,
  jobDigest,
  attemptNumber: rawAttemptNumber,
  providerAdapterId,
  providerRequestWitness,
  providerRequestDigest,
  providerOutputDigest,
  providerOutput,
  generation,
  createdAt,
}) {
  const normalizedJob = normalizeAssetGenerationJob(job);
  const checkedAttemptNumber = attemptNumber(rawAttemptNumber);
  return normalizeGenerationAttempt({
    attemptVersion: GENERATION_ATTEMPT_VERSION,
    attemptId: generationAttemptObjectRef(jobDigest, checkedAttemptNumber),
    jobId: normalizedJob.jobId,
    jobDigest,
    attemptNumber: checkedAttemptNumber,
    status: GENERATION_ATTEMPT_STATUS_PROVIDER_SUCCEEDED,
    providerProfile: normalizedJob.providerProfile,
    providerAdapterId,
    providerRequestWitness,
    providerRequestDigest,
    providerOutputObjectRef: stagedProviderOutputObjectRef(jobDigest, checkedAttemptNumber),
    providerOutputDigest,
    providerOutput,
    generation,
    createdAt,
  });
}

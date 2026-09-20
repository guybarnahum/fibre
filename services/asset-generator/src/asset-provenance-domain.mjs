import {
  normalizeAssetGenerationBrief,
  normalizeAssetGenerationJob,
  normalizeMediaGenerationResult,
} from "./asset-generation-domain.mjs";
import { fibreShortIdCandidates, fibreShortRef } from "./fibre-short-id.mjs";

export const GENERATION_RECORD_VERSION = "generation-record-v0.1";
export const WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION = "media-generation-provider-v0.2";

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
function timestamp(name, value) {
  nonEmpty(name, value);
  if (!Number.isFinite(Date.parse(value))) fail(`${name} must be an ISO timestamp`);
  return value;
}
function digest(name, value) {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value)) fail(`${name} must be a sha256 digest`);
  return value;
}
function positiveIntegerOrNull(name, value) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 1) fail(`${name} must be a positive integer or null`);
  return value;
}
function stringArray(name, value, { required = false } = {}) {
  if (!Array.isArray(value)) fail(`${name} must be an array`);
  if (required && value.length === 0) fail(`${name} must not be empty`);
  const result = value.map((item, index) => nonEmpty(`${name}[${index}]`, item));
  if (new Set(result).size !== result.length) fail(`${name} must be unique`);
  return result;
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
function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function normalizeProviderRequestWitness(value) {
  const name = "provider request witness";
  plain(name, value);
  exact(name, value, ["mediaType", "body", "secretsRemoved"]);
  nonEmpty(`${name}.mediaType`, value.mediaType);
  jsonValue(`${name}.body`, value.body);
  if (value.secretsRemoved !== true) fail(`${name}.secretsRemoved must be true`);
  return structuredClone(value);
}

export function assertWitnessedMediaGenerationProvider(provider) {
  const name = "witnessed media generation provider";
  plain(name, provider);
  if (provider.providerVersion !== WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION) {
    fail(`${name}.providerVersion is unsupported`);
  }
  nonEmpty(`${name}.providerId`, provider.providerId);
  if (!Array.isArray(provider.capabilities)) fail(`${name}.capabilities must be an array`);
  provider.capabilities.forEach((kind, index) => {
    if (!["image", "audio", "video"].includes(kind)) fail(`${name}.capabilities[${index}] is unsupported`);
  });
  if (new Set(provider.capabilities).size !== provider.capabilities.length) fail(`${name}.capabilities must be unique`);
  if (typeof provider.generate !== "function") fail(`${name}.generate must be a function`);
  return provider;
}

export function normalizeWitnessedMediaGenerationResult(value, { expectedKind } = {}) {
  const name = "witnessed media generation result";
  plain(name, value);
  exact(name, value, ["requestWitness", "result"]);
  return {
    requestWitness: normalizeProviderRequestWitness(value.requestWitness),
    result: normalizeMediaGenerationResult(value.result, { expectedKind }),
  };
}

export function normalizeGenerationRecord(value) {
  const name = "generation record";
  plain(name, value);
  exact(name, value, [
    "recordVersion", "jobId", "job", "semanticBrief", "semanticBriefDigest",
    "providerRequestWitness", "providerRequestDigest", "providerOutputDigest", "providerOutput",
    "generation", "createdAt",
  ]);
  if (value.recordVersion !== GENERATION_RECORD_VERSION) fail(`${name}.recordVersion is unsupported`);
  nonEmpty(`${name}.jobId`, value.jobId);
  const job = normalizeAssetGenerationJob(value.job);
  if (job.jobId !== value.jobId) fail(`${name}.job.jobId does not match record jobId`);
  const semanticBrief = normalizeAssetGenerationBrief(value.semanticBrief);
  if (!sameJson(semanticBrief, job.brief)) fail(`${name}.semanticBrief must match job.brief`);
  const providerRequestWitness = normalizeProviderRequestWitness(value.providerRequestWitness);
  digest(`${name}.semanticBriefDigest`, value.semanticBriefDigest);
  digest(`${name}.providerRequestDigest`, value.providerRequestDigest);
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
    job,
    semanticBrief,
    providerRequestWitness,
  };
}


export function generationRecordObjectRefs(generationRecordDigest) {
  digest("generationRecordDigest", generationRecordDigest);
  return Object.freeze(
    fibreShortIdCandidates(generationRecordDigest).map((suffix) => fibreShortRef("generationrecord_", suffix)),
  );
}

export function generationRecordObjectRef(generationRecordDigest) {
  return generationRecordObjectRefs(generationRecordDigest)[0];
}

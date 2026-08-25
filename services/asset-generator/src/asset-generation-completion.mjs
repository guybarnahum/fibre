import { requireInfraCapabilities } from "../../../packages/infra/src/infra-driver.mjs";

export const ASSET_GENERATION_COMPLETION_VERSION = "asset-generation-completion-v0.1";
export const ASSET_GENERATION_COMPLETION_QUEUE = "asset_generation_completions";

const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;

function plain(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${name} must be a plain object`);
  }
  return value;
}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function exact(name, value, allowed) {
  const keys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!keys.has(key)) throw new TypeError(`${name}.${key} is not allowed`);
  }
}

function digest(name, value) {
  nonEmpty(name, value);
  if (!SHA256_DIGEST.test(value)) {
    throw new TypeError(`${name} must be sha256:<64 lowercase hex>`);
  }
  return value;
}

export function normalizeAssetGenerationCompletion(value) {
  const name = "asset generation completion";
  plain(name, value);
  exact(name, value, [
    "completionVersion",
    "jobId",
    "receiptObjectRef",
    "receiptDigest",
  ]);
  if (value.completionVersion !== ASSET_GENERATION_COMPLETION_VERSION) {
    throw new TypeError(`${name}.completionVersion is unsupported`);
  }
  return Object.freeze({
    completionVersion: ASSET_GENERATION_COMPLETION_VERSION,
    jobId: nonEmpty(`${name}.jobId`, value.jobId),
    receiptObjectRef: nonEmpty(`${name}.receiptObjectRef`, value.receiptObjectRef),
    receiptDigest: digest(`${name}.receiptDigest`, value.receiptDigest),
  });
}

export function createAssetGenerationCompletion({
  jobId,
  receiptObjectRef,
  receiptDigest,
}) {
  return normalizeAssetGenerationCompletion({
    completionVersion: ASSET_GENERATION_COMPLETION_VERSION,
    jobId,
    receiptObjectRef,
    receiptDigest,
  });
}

export async function publishAssetGenerationCompletion({
  infra,
  completion,
  queueName = ASSET_GENERATION_COMPLETION_QUEUE,
}) {
  requireInfraCapabilities(infra, "queues");
  nonEmpty("queueName", queueName);
  const normalized = normalizeAssetGenerationCompletion(completion);
  await infra.queues.send(queueName, normalized);
  return normalized;
}

export const ASSET_GENERATION_REUSE_VERSION = "asset-generation-reuse-v0.1";
export const ASSET_GENERATION_REUSE_MODES = Object.freeze([
  "none",
  "staged_provider_output",
  "completed_asset",
]);

const SHA256_DIGEST = /^sha256:[0-9a-f]{64}$/;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function digest(name, value) {
  nonEmpty(name, value);
  if (!SHA256_DIGEST.test(value)) throw new TypeError(`${name} must be sha256:<64 lowercase hex>`);
  return value;
}

function nullableNonEmpty(name, value) {
  if (value === null) return null;
  return nonEmpty(name, value);
}

export function normalizeAssetGenerationReuse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError("asset generation reuse must be a plain object");
  }
  const allowed = new Set([
    "reuseVersion",
    "cacheScope",
    "mode",
    "jobDigest",
    "generationAttemptId",
    "providerGenerationPerformed",
  ]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`asset generation reuse.${key} is not allowed`);
  }
  if (value.reuseVersion !== ASSET_GENERATION_REUSE_VERSION) {
    throw new TypeError("asset generation reuse.reuseVersion is unsupported");
  }
  if (value.cacheScope !== "exact_job_digest") {
    throw new TypeError("asset generation reuse.cacheScope must be exact_job_digest");
  }
  if (!ASSET_GENERATION_REUSE_MODES.includes(value.mode)) {
    throw new TypeError("asset generation reuse.mode is unsupported");
  }
  const generationAttemptId = nullableNonEmpty(
    "asset generation reuse.generationAttemptId",
    value.generationAttemptId,
  );
  if (value.mode === "staged_provider_output" && generationAttemptId === null) {
    throw new TypeError("staged provider-output reuse requires generationAttemptId");
  }
  const expectedProviderGenerationPerformed = value.mode === "none";
  if (value.providerGenerationPerformed !== expectedProviderGenerationPerformed) {
    throw new TypeError("asset generation reuse.providerGenerationPerformed does not match mode");
  }
  return Object.freeze({
    reuseVersion: ASSET_GENERATION_REUSE_VERSION,
    cacheScope: "exact_job_digest",
    mode: value.mode,
    jobDigest: digest("asset generation reuse.jobDigest", value.jobDigest),
    generationAttemptId,
    providerGenerationPerformed: expectedProviderGenerationPerformed,
  });
}

export function createAssetGenerationReuse({
  mode,
  jobDigest,
  generationAttemptId = null,
}) {
  return normalizeAssetGenerationReuse({
    reuseVersion: ASSET_GENERATION_REUSE_VERSION,
    cacheScope: "exact_job_digest",
    mode,
    jobDigest,
    generationAttemptId,
    providerGenerationPerformed: mode === "none",
  });
}

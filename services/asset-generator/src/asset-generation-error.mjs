import { InfraImmutableObjectConflictError } from "../../../packages/infra/src/infra-driver.mjs";

export const ASSET_GENERATION_ERROR_PHASES = Object.freeze([
  "validation",
  "reuse_lookup",
  "reference_loading",
  "provider_generation",
  "provider_operation_staging",
  "provider_output_staging",
  "credential_signing",
  "credential_verification",
  "storage_finalization",
  "completion_publication",
  "unknown",
]);

export const ASSET_GENERATION_ERROR_CATEGORIES = Object.freeze([
  "rate_limited",
  "provider_timeout",
  "provider_unavailable",
  "network",
  "storage_transient",
  "invalid_request",
  "authentication",
  "unsupported_capability",
  "moderation_rejected",
  "missing_reference",
  "immutable_conflict",
  "quota_exhausted",
  "unknown",
]);

const PHASES = new Set(ASSET_GENERATION_ERROR_PHASES);
const CATEGORIES = new Set(ASSET_GENERATION_ERROR_CATEGORIES);
const RETRYABLE_CATEGORIES = new Set([
  "rate_limited",
  "provider_timeout",
  "provider_unavailable",
  "network",
  "storage_transient",
  "unknown",
]);

const MAX_ATTEMPTS = Object.freeze({
  rate_limited: 5,
  provider_timeout: 3,
  provider_unavailable: 4,
  network: 4,
  storage_transient: 4,
  unknown: 2,
});

const BASE_RETRY_DELAY_MS = Object.freeze({
  rate_limited: 30_000,
  provider_timeout: 2_000,
  provider_unavailable: 5_000,
  network: 2_000,
  storage_transient: 2_000,
  unknown: 2_000,
});

const SAFE_WITHOUT_STAGED_PROVIDER_OUTPUT = new Set([
  "reuse_lookup",
  "reference_loading",
  "provider_generation",
  "completion_publication",
]);

function nullableString(name, value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string or null`);
  return value;
}

function nullableStatus(value) {
  if (value === null || value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 100 || value > 599) {
    throw new TypeError("httpStatus must be an HTTP status integer or null");
  }
  return value;
}

function nullableDelay(value) {
  if (value === null || value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("retryAfterMs must be a non-negative safe integer or null");
  return value;
}

function boundedDetail(value) {
  const text = typeof value === "string" ? value : String(value);
  return text.length <= 2000 ? text : `${text.slice(0, 1999)}…`;
}

function checkPhase(value) {
  if (!PHASES.has(value)) throw new TypeError(`unsupported asset generation error phase ${value}`);
  return value;
}

function checkCategory(value) {
  if (!CATEGORIES.has(value)) throw new TypeError(`unsupported asset generation error category ${value}`);
  return value;
}

export function assetGenerationCategoryRetryable(category) {
  return RETRYABLE_CATEGORIES.has(checkCategory(category));
}

export class AssetGenerationError extends Error {
  constructor(message, {
    phase = "unknown",
    category = "unknown",
    retryable = assetGenerationCategoryRetryable(category),
    provider = null,
    model = null,
    httpStatus = null,
    providerRequestId = null,
    retryAfterMs = null,
    providerOperationDurable = false,
    providerOutputDurable = false,
    safeDetail = message,
    cause = null,
  } = {}) {
    const detail = boundedDetail(safeDetail);
    super(detail, cause === null ? undefined : { cause });
    this.name = "AssetGenerationError";
    this.phase = checkPhase(phase);
    this.category = checkCategory(category);
    if (typeof retryable !== "boolean") throw new TypeError("retryable must be boolean");
    this.retryable = retryable;
    this.provider = nullableString("provider", provider);
    this.model = nullableString("model", model);
    this.httpStatus = nullableStatus(httpStatus);
    this.providerRequestId = nullableString("providerRequestId", providerRequestId);
    this.retryAfterMs = nullableDelay(retryAfterMs);
    if (typeof providerOperationDurable !== "boolean") throw new TypeError("providerOperationDurable must be boolean");
    this.providerOperationDurable = providerOperationDurable;
    if (typeof providerOutputDurable !== "boolean") throw new TypeError("providerOutputDurable must be boolean");
    this.providerOutputDurable = providerOutputDurable;
    this.safeDetail = detail;
  }
}

function categoryForCause(error, phase) {
  if (error instanceof InfraImmutableObjectConflictError) return "immutable_conflict";
  if (error?.name === "AbortError" || error?.name === "TimeoutError") return "provider_timeout";
  if (error instanceof TypeError) return "invalid_request";
  if ([
    "reuse_lookup",
    "reference_loading",
    "provider_operation_staging",
    "provider_output_staging",
    "storage_finalization",
    "completion_publication",
  ].includes(phase)) {
    return "storage_transient";
  }
  return "unknown";
}

function contextualizeExistingError(error, {
  provider = null,
  model = null,
  providerOperationDurable = null,
  providerOutputDurable = null,
} = {}) {
  const resolvedProvider = error.provider ?? provider;
  const resolvedModel = error.model ?? model;
  const resolvedOperationDurable = providerOperationDurable === null
    ? error.providerOperationDurable
    : providerOperationDurable;
  const resolvedOutputDurable = providerOutputDurable === null
    ? error.providerOutputDurable
    : providerOutputDurable;
  if (resolvedProvider === error.provider
    && resolvedModel === error.model
    && resolvedOperationDurable === error.providerOperationDurable
    && resolvedOutputDurable === error.providerOutputDurable) {
    return error;
  }
  return new AssetGenerationError(error.message, {
    phase: error.phase,
    category: error.category,
    retryable: error.retryable,
    provider: resolvedProvider,
    model: resolvedModel,
    httpStatus: error.httpStatus,
    providerRequestId: error.providerRequestId,
    retryAfterMs: error.retryAfterMs,
    providerOperationDurable: resolvedOperationDurable,
    providerOutputDurable: resolvedOutputDurable,
    safeDetail: error.safeDetail,
    cause: error,
  });
}

export function toAssetGenerationError(error, {
  phase = "unknown",
  category = null,
  retryable = null,
  provider = null,
  model = null,
  providerOperationDurable = null,
  providerOutputDurable = null,
  safeDetail = null,
} = {}) {
  if (error instanceof AssetGenerationError) {
    return contextualizeExistingError(error, {
      provider,
      model,
      providerOperationDurable,
      providerOutputDurable,
    });
  }
  const resolvedCategory = category ?? categoryForCause(error, phase);
  return new AssetGenerationError(error instanceof Error ? error.message : String(error), {
    phase,
    category: resolvedCategory,
    retryable: retryable ?? assetGenerationCategoryRetryable(resolvedCategory),
    provider,
    model,
    httpStatus: Number.isSafeInteger(error?.httpStatus) ? error.httpStatus : null,
    providerRequestId: typeof error?.providerRequestId === "string" ? error.providerRequestId : null,
    retryAfterMs: Number.isSafeInteger(error?.retryAfterMs) ? error.retryAfterMs : null,
    providerOperationDurable: providerOperationDurable === true,
    providerOutputDurable: providerOutputDurable === true,
    safeDetail: safeDetail ?? error?.safeDetail ?? (error instanceof Error ? error.message : String(error)),
    cause: error,
  });
}

export function parseRetryAfterMs(value, { nowMs = Date.now() } = {}) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, timestamp - nowMs);
}

export function assetGenerationRetryDecision(error, {
  attempt = 1,
  providerOperationDurable = error?.providerOperationDurable === true,
  providerOutputDurable = error?.providerOutputDurable === true,
} = {}) {
  if (!Number.isSafeInteger(attempt) || attempt < 1) throw new TypeError("attempt must be a positive safe integer");
  if (typeof providerOperationDurable !== "boolean") throw new TypeError("providerOperationDurable must be boolean");
  if (typeof providerOutputDurable !== "boolean") throw new TypeError("providerOutputDurable must be boolean");
  const normalized = error instanceof AssetGenerationError
    ? error
    : toAssetGenerationError(error, {
        retryable: false,
        providerOperationDurable,
        providerOutputDurable,
      });
  const maxAttempts = MAX_ATTEMPTS[normalized.category] ?? 1;
  const providerOperationStaging = normalized.phase === "provider_operation_staging";
  const postProviderPhase = [
    "provider_output_staging",
    "credential_signing",
    "credential_verification",
    "storage_finalization",
  ].includes(normalized.phase);
  const safePhase = SAFE_WITHOUT_STAGED_PROVIDER_OUTPUT.has(normalized.phase)
    || (providerOutputDurable && postProviderPhase);

  let reason = "retryable";
  let retry = true;
  if (!normalized.retryable) {
    reason = "terminal_category";
    retry = false;
  } else if (!safePhase) {
    if (providerOperationStaging && !providerOperationDurable) reason = "provider_operation_not_staged";
    else reason = postProviderPhase ? "provider_output_not_staged" : "unsafe_phase";
    retry = false;
  } else if (attempt >= maxAttempts) {
    reason = "attempt_limit_reached";
    retry = false;
  }

  const baseDelay = BASE_RETRY_DELAY_MS[normalized.category] ?? 2_000;
  const exponentialDelay = Math.min(300_000, baseDelay * (2 ** Math.max(0, attempt - 1)));
  const delayMs = normalized.retryAfterMs === null
    ? exponentialDelay
    : Math.max(exponentialDelay, normalized.retryAfterMs);

  return Object.freeze({
    retry,
    reason,
    attempt,
    maxAttempts,
    delayMs,
    category: normalized.category,
    phase: normalized.phase,
    categoryRetryable: normalized.retryable,
    providerOperationDurable,
    providerOutputDurable,
  });
}

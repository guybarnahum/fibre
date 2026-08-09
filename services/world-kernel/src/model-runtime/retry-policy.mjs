const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const TRANSIENT_TRANSPORT_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENETRESET",
  "EPIPE",
]);
const PROVIDER_CIRCUIT_ERROR_CODES = new Set([
  "MODEL_AUTHENTICATION_ERROR",
  "MODEL_PERMISSION_ERROR",
  "MODEL_BILLING_QUOTA_EXHAUSTED",
]);

export function parseRetryAfterMs(response, now = Date.now()) {
  const raw = response?.headers?.get?.("retry-after");
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const value = raw.trim();
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, timestamp - now);
}

export function httpRetryGuidance(response) {
  const status = Number(response?.status);
  const retryAfterMs = parseRetryAfterMs(response);
  return {
    retryable: retryAfterMs !== null || TRANSIENT_HTTP_STATUSES.has(status),
    retryAfterMs,
  };
}

export function isClearlyTransientTransportError(error) {
  if (error?.name === "AbortError") return true;
  const code = error?.code ?? error?.cause?.code ?? null;
  return typeof code === "string" && TRANSIENT_TRANSPORT_CODES.has(code);
}

export function shouldOpenProviderCircuit(error) {
  return PROVIDER_CIRCUIT_ERROR_CODES.has(error?.code);
}

export function attachRetryGuidance(error, { retryAfterMs = null } = {}) {
  if (retryAfterMs !== null) error.retryAfterMs = retryAfterMs;
  return error;
}

export function retryDelayFor(error, fallbackMs) {
  const providerDelay = Number(error?.retryAfterMs);
  if (Number.isFinite(providerDelay) && providerDelay >= 0) return Math.max(fallbackMs, providerDelay);
  return fallbackMs;
}

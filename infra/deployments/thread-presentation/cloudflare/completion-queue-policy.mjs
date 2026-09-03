export const COMPLETION_QUEUE_MAX_RETRIES = 10;

export function completionQueueFailureDisposition({ attempts, maxRetries = COMPLETION_QUEUE_MAX_RETRIES } = {}) {
  if (!Number.isSafeInteger(attempts) || attempts < 1) throw new TypeError("completion queue attempts must be a positive integer");
  if (!Number.isSafeInteger(maxRetries) || maxRetries < 1) throw new TypeError("completion queue maxRetries must be a positive integer");
  const terminal = attempts >= maxRetries;
  return Object.freeze({
    terminal,
    status: terminal ? "failed" : "retrying",
    code: terminal ? "PRESENTATION_ASSET_COMPLETION_RETRIES_EXHAUSTED" : "PRESENTATION_ASSET_COMPLETION_RETRY",
    retryable: !terminal,
  });
}

export class GuardianModelError extends Error {
  constructor(message, {
    code = "MODEL_ERROR",
    cause,
    retryable = true,
    httpStatus = null,
    providerErrorCode = null,
    providerErrorType = null,
    actionHint = null,
  } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "GuardianModelError";
    this.code = code;
    this.retryable = retryable;
    this.httpStatus = httpStatus;
    this.providerErrorCode = providerErrorCode;
    this.providerErrorType = providerErrorType;
    this.actionHint = actionHint;
  }
}

export function assertReasoningAdapter(adapter, name = "reasoning adapter") {
  if (!adapter || typeof adapter !== "object" || Array.isArray(adapter)) {
    throw new TypeError(`${name} must be an object`);
  }
  if (typeof adapter.provider !== "string" || adapter.provider.trim() === "") {
    throw new TypeError(`${name}.provider must be a non-empty string`);
  }
  if (typeof adapter.modelId !== "string" || adapter.modelId.trim() === "") {
    throw new TypeError(`${name}.modelId must be a non-empty string`);
  }
  if (!adapter.configuration || typeof adapter.configuration !== "object" || Array.isArray(adapter.configuration)) {
    throw new TypeError(`${name}.configuration must be an object`);
  }
  if (typeof adapter.invoke !== "function") throw new TypeError(`${name}.invoke must be a function`);
  return adapter;
}

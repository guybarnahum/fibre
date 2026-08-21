export const ASSET_GENERATION_JOB_VERSION = "asset-generation-job-v0.1";
export const ASSET_GENERATION_RECEIPT_VERSION = "asset-generation-receipt-v0.1";
export const MEDIA_GENERATION_PROVIDER_VERSION = "media-generation-provider-v0.1";
export const ASSET_KINDS = Object.freeze(["image", "audio", "video"]);

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
function stringArray(name, value, { required = false } = {}) {
  if (!Array.isArray(value)) fail(`${name} must be an array`);
  if (required && value.length === 0) fail(`${name} must not be empty`);
  const result = value.map((item, index) => nonEmpty(`${name}[${index}]`, item));
  if (new Set(result).size !== result.length) fail(`${name} must be unique`);
  return result;
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
function positiveIntegerOrNull(name, value) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 1) fail(`${name} must be a positive integer or null`);
  return value;
}

export function normalizeAssetGenerationBrief(value) {
  const name = "asset generation brief";
  plain(name, value);
  exact(name, value, ["description", "constraints"]);
  return {
    description: nonEmpty(`${name}.description`, value.description),
    constraints: stringArray(`${name}.constraints`, value.constraints),
  };
}

export function normalizeAssetGenerationJob(value) {
  const name = "asset generation job";
  plain(name, value);
  exact(name, value, [
    "jobVersion", "jobId", "assetKind", "role", "variant", "brief", "inputReferences",
    "referenceObjectRefs", "outputObjectRef", "receiptObjectRef", "requestedAt", "providerProfile", "context",
  ]);
  if (value.jobVersion !== ASSET_GENERATION_JOB_VERSION) fail(`${name}.jobVersion is unsupported`);
  if (!ASSET_KINDS.includes(value.assetKind)) fail(`${name}.assetKind is unsupported`);
  plain(`${name}.context`, value.context);
  jsonValue(`${name}.context`, value.context);
  return {
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: nonEmpty(`${name}.jobId`, value.jobId),
    assetKind: value.assetKind,
    role: nonEmpty(`${name}.role`, value.role),
    variant: nonEmpty(`${name}.variant`, value.variant),
    brief: normalizeAssetGenerationBrief(value.brief),
    inputReferences: stringArray(`${name}.inputReferences`, value.inputReferences, { required: true }),
    referenceObjectRefs: stringArray(`${name}.referenceObjectRefs`, value.referenceObjectRefs),
    outputObjectRef: nonEmpty(`${name}.outputObjectRef`, value.outputObjectRef),
    receiptObjectRef: nonEmpty(`${name}.receiptObjectRef`, value.receiptObjectRef),
    requestedAt: timestamp(`${name}.requestedAt`, value.requestedAt),
    providerProfile: nonEmpty(`${name}.providerProfile`, value.providerProfile),
    context: structuredClone(value.context),
  };
}

export function assertMediaGenerationProvider(provider) {
  const name = "media generation provider";
  plain(name, provider);
  if (provider.providerVersion !== MEDIA_GENERATION_PROVIDER_VERSION) fail(`${name}.providerVersion is unsupported`);
  nonEmpty(`${name}.providerId`, provider.providerId);
  if (!Array.isArray(provider.capabilities)) fail(`${name}.capabilities must be an array`);
  provider.capabilities.forEach((kind, index) => {
    if (!ASSET_KINDS.includes(kind)) fail(`${name}.capabilities[${index}] is unsupported`);
  });
  if (new Set(provider.capabilities).size !== provider.capabilities.length) fail(`${name}.capabilities must be unique`);
  if (typeof provider.generate !== "function") fail(`${name}.generate must be a function`);
  return provider;
}

export function normalizeMediaGenerationResult(value, { expectedKind } = {}) {
  const name = "media generation result";
  plain(name, value);
  exact(name, value, [
    "assetKind", "bytes", "mediaType", "width", "height", "durationMs",
    "provider", "model", "providerRequestId", "generatedAt", "configuration",
  ]);
  if (!ASSET_KINDS.includes(value.assetKind)) fail(`${name}.assetKind is unsupported`);
  if (expectedKind && value.assetKind !== expectedKind) fail(`${name}.assetKind does not match job`);
  if (!(value.bytes instanceof Uint8Array) && !(value.bytes instanceof ArrayBuffer)) {
    fail(`${name}.bytes must be Uint8Array or ArrayBuffer`);
  }
  plain(`${name}.configuration`, value.configuration);
  jsonValue(`${name}.configuration`, value.configuration);
  return {
    assetKind: value.assetKind,
    bytes: value.bytes instanceof Uint8Array ? value.bytes.slice() : new Uint8Array(value.bytes.slice(0)),
    mediaType: nonEmpty(`${name}.mediaType`, value.mediaType),
    width: positiveIntegerOrNull(`${name}.width`, value.width),
    height: positiveIntegerOrNull(`${name}.height`, value.height),
    durationMs: positiveIntegerOrNull(`${name}.durationMs`, value.durationMs),
    provider: nonEmpty(`${name}.provider`, value.provider),
    model: nonEmpty(`${name}.model`, value.model),
    providerRequestId: nullableText(`${name}.providerRequestId`, value.providerRequestId),
    generatedAt: timestamp(`${name}.generatedAt`, value.generatedAt),
    configuration: structuredClone(value.configuration),
  };
}

export function normalizeAssetGenerationReceipt(value) {
  const name = "asset generation receipt";
  plain(name, value);
  exact(name, value, [
    "receiptVersion", "jobId", "status", "assetKind", "role", "objectRef", "sha256",
    "mediaType", "width", "height", "durationMs", "completedAt", "generation",
    "inputReferences", "context", "unavailableReason",
  ]);
  if (value.receiptVersion !== ASSET_GENERATION_RECEIPT_VERSION) fail(`${name}.receiptVersion is unsupported`);
  if (!["ready", "unavailable"].includes(value.status)) fail(`${name}.status is unsupported`);
  if (!ASSET_KINDS.includes(value.assetKind)) fail(`${name}.assetKind is unsupported`);
  nonEmpty(`${name}.jobId`, value.jobId);
  nonEmpty(`${name}.role`, value.role);
  timestamp(`${name}.completedAt`, value.completedAt);
  stringArray(`${name}.inputReferences`, value.inputReferences, { required: true });
  plain(`${name}.context`, value.context);
  jsonValue(`${name}.context`, value.context);
  if (value.status === "ready") {
    nonEmpty(`${name}.objectRef`, value.objectRef);
    if (typeof value.sha256 !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value.sha256)) fail(`${name}.sha256 is invalid`);
    nonEmpty(`${name}.mediaType`, value.mediaType);
    positiveIntegerOrNull(`${name}.width`, value.width);
    positiveIntegerOrNull(`${name}.height`, value.height);
    positiveIntegerOrNull(`${name}.durationMs`, value.durationMs);
    plain(`${name}.generation`, value.generation);
    exact(`${name}.generation`, value.generation, ["provider", "model", "providerRequestId", "generatedAt", "configuration"]);
    nonEmpty(`${name}.generation.provider`, value.generation.provider);
    nonEmpty(`${name}.generation.model`, value.generation.model);
    nullableText(`${name}.generation.providerRequestId`, value.generation.providerRequestId);
    timestamp(`${name}.generation.generatedAt`, value.generation.generatedAt);
    plain(`${name}.generation.configuration`, value.generation.configuration);
    jsonValue(`${name}.generation.configuration`, value.generation.configuration);
    if (value.unavailableReason !== null) fail(`${name}.unavailableReason must be null when ready`);
  } else {
    if (value.objectRef !== null || value.sha256 !== null || value.mediaType !== null) fail(`${name} unavailable output must not name an object`);
    if (value.width !== null || value.height !== null || value.durationMs !== null) fail(`${name} unavailable output must not carry dimensions`);
    if (value.generation !== null) fail(`${name}.generation must be null when unavailable`);
    nonEmpty(`${name}.unavailableReason`, value.unavailableReason);
  }
  return structuredClone(value);
}

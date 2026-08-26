import {
  normalizeAssetGenerationBrief,
  normalizeAssetGenerationJob,
  normalizeMediaGenerationResult,
} from "./asset-generation-domain.mjs";
import { fibreShortIdCandidates, fibreShortRef } from "./fibre-short-id.mjs";

export const GENERATION_RECORD_VERSION = "generation-record-v0.1";
export const STORED_ASSET_RECEIPT_VERSION = "stored-asset-receipt-v0.1";
export const EMBEDDED_ASSET_PROVENANCE_VERSION = "fibre-embedded-asset-provenance-v0.1";
export const CONTENT_CREDENTIAL_SIGNER_VERSION = "content-credential-signer-v0.1";
export const WITNESSED_MEDIA_GENERATION_PROVIDER_VERSION = "media-generation-provider-v0.2";
export const PROMPT_DISCLOSURE_MODES = Object.freeze(["digest_only", "public_text"]);

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

export function normalizePromptDisclosurePolicy(value = { mode: "digest_only", authorizationRef: null }) {
  const name = "prompt disclosure policy";
  plain(name, value);
  exact(name, value, ["mode", "authorizationRef"]);
  if (!PROMPT_DISCLOSURE_MODES.includes(value.mode)) fail(`${name}.mode is unsupported`);
  if (value.mode === "digest_only") {
    if (value.authorizationRef !== null) fail(`${name}.authorizationRef must be null for digest_only`);
  } else {
    nonEmpty(`${name}.authorizationRef`, value.authorizationRef);
  }
  return structuredClone(value);
}

export function buildEmbeddedAssetProvenance({
  generationRecord,
  generationRecordDigest,
  promptDisclosurePolicy = { mode: "digest_only", authorizationRef: null },
}) {
  const record = normalizeGenerationRecord(generationRecord);
  const policy = normalizePromptDisclosurePolicy(promptDisclosurePolicy);
  digest("generationRecordDigest", generationRecordDigest);

  const promptDisclosure = policy.mode === "public_text"
    ? {
        mode: policy.mode,
        authorizationRef: policy.authorizationRef,
        semanticBrief: record.semanticBrief,
        providerRequest: record.providerRequestWitness,
      }
    : {
        mode: policy.mode,
        authorizationRef: null,
        semanticBrief: null,
        providerRequest: null,
      };

  return {
    schemaVersion: EMBEDDED_ASSET_PROVENANCE_VERSION,
    provenanceClass: "generated_reconstruction",
    assetKind: record.job.assetKind,
    role: record.job.role,
    variant: record.job.variant,
    generationRecordDigest,
    semanticBriefDigest: record.semanticBriefDigest,
    providerRequestDigest: record.providerRequestDigest,
    providerOutputDigest: record.providerOutputDigest,
    provider: record.generation.provider,
    model: record.generation.model,
    generatedAt: record.generation.generatedAt,
    promptDisclosure,
  };
}

export function normalizeEmbeddedAssetProvenance(value) {
  const name = "embedded asset provenance";
  plain(name, value);
  exact(name, value, [
    "schemaVersion", "provenanceClass", "assetKind", "role", "variant",
    "generationRecordDigest", "semanticBriefDigest", "providerRequestDigest", "providerOutputDigest",
    "provider", "model", "generatedAt", "promptDisclosure",
  ]);
  if (value.schemaVersion !== EMBEDDED_ASSET_PROVENANCE_VERSION) fail(`${name}.schemaVersion is unsupported`);
  if (value.provenanceClass !== "generated_reconstruction") fail(`${name}.provenanceClass is invalid`);
  if (!["image", "audio", "video"].includes(value.assetKind)) fail(`${name}.assetKind is unsupported`);
  nonEmpty(`${name}.role`, value.role);
  nonEmpty(`${name}.variant`, value.variant);
  digest(`${name}.generationRecordDigest`, value.generationRecordDigest);
  digest(`${name}.semanticBriefDigest`, value.semanticBriefDigest);
  digest(`${name}.providerRequestDigest`, value.providerRequestDigest);
  digest(`${name}.providerOutputDigest`, value.providerOutputDigest);
  nonEmpty(`${name}.provider`, value.provider);
  nonEmpty(`${name}.model`, value.model);
  timestamp(`${name}.generatedAt`, value.generatedAt);

  plain(`${name}.promptDisclosure`, value.promptDisclosure);
  exact(`${name}.promptDisclosure`, value.promptDisclosure, [
    "mode", "authorizationRef", "semanticBrief", "providerRequest",
  ]);
  if (!PROMPT_DISCLOSURE_MODES.includes(value.promptDisclosure.mode)) fail(`${name}.promptDisclosure.mode is unsupported`);
  if (value.promptDisclosure.mode === "digest_only") {
    if (value.promptDisclosure.authorizationRef !== null
      || value.promptDisclosure.semanticBrief !== null
      || value.promptDisclosure.providerRequest !== null) {
      fail(`${name}.promptDisclosure digest_only must not contain prompt text`);
    }
  } else {
    nonEmpty(`${name}.promptDisclosure.authorizationRef`, value.promptDisclosure.authorizationRef);
    normalizeAssetGenerationBrief(value.promptDisclosure.semanticBrief);
    normalizeProviderRequestWitness(value.promptDisclosure.providerRequest);
  }
  return structuredClone(value);
}

export function assertContentCredentialSigner(signer) {
  const name = "content credential signer";
  plain(name, signer);
  if (signer.signerVersion !== CONTENT_CREDENTIAL_SIGNER_VERSION) fail(`${name}.signerVersion is unsupported`);
  nonEmpty(`${name}.signerId`, signer.signerId);
  nonEmpty(`${name}.format`, signer.format);
  if (typeof signer.embed !== "function") fail(`${name}.embed must be a function`);
  if (typeof signer.verify !== "function") fail(`${name}.verify must be a function`);
  return signer;
}

export function normalizeCredentialEmbedResult(value) {
  const name = "credential embed result";
  plain(name, value);
  exact(name, value, ["bytes", "format", "signerId", "manifestDigest", "embeddedAt"]);
  if (!(value.bytes instanceof Uint8Array) && !(value.bytes instanceof ArrayBuffer)) {
    fail(`${name}.bytes must be Uint8Array or ArrayBuffer`);
  }
  nonEmpty(`${name}.format`, value.format);
  nonEmpty(`${name}.signerId`, value.signerId);
  digest(`${name}.manifestDigest`, value.manifestDigest);
  timestamp(`${name}.embeddedAt`, value.embeddedAt);
  return {
    ...structuredClone(value),
    bytes: value.bytes instanceof Uint8Array ? value.bytes.slice() : new Uint8Array(value.bytes.slice(0)),
  };
}

export function normalizeCredentialVerification(value) {
  const name = "credential verification";
  plain(name, value);
  exact(name, value, [
    "valid", "format", "signerId", "manifestDigest", "assertion", "verifiedAt", "failureReason",
  ]);
  if (typeof value.valid !== "boolean") fail(`${name}.valid must be boolean`);
  nonEmpty(`${name}.format`, value.format);
  nonEmpty(`${name}.signerId`, value.signerId);
  if (value.valid) {
    digest(`${name}.manifestDigest`, value.manifestDigest);
    normalizeEmbeddedAssetProvenance(value.assertion);
    if (value.failureReason !== null) fail(`${name}.failureReason must be null when valid`);
  } else {
    if (value.manifestDigest !== null) digest(`${name}.manifestDigest`, value.manifestDigest);
    if (value.assertion !== null) normalizeEmbeddedAssetProvenance(value.assertion);
    nonEmpty(`${name}.failureReason`, value.failureReason);
  }
  timestamp(`${name}.verifiedAt`, value.verifiedAt);
  return structuredClone(value);
}

export function normalizeStoredAssetReceipt(value) {
  const name = "stored asset receipt";
  plain(name, value);
  exact(name, value, [
    "receiptVersion", "jobId", "status", "assetKind", "role", "variant", "objectRef", "sha256",
    "mediaType", "width", "height", "durationMs", "completedAt",
    "generationRecordObjectRef", "generationRecordDigest", "providerOutputDigest",
    "credential", "inputReferences", "context",
  ]);
  if (value.receiptVersion !== STORED_ASSET_RECEIPT_VERSION) fail(`${name}.receiptVersion is unsupported`);
  if (value.status !== "ready") fail(`${name}.status must be ready`);
  nonEmpty(`${name}.jobId`, value.jobId);
  if (!["image", "audio", "video"].includes(value.assetKind)) fail(`${name}.assetKind is unsupported`);
  nonEmpty(`${name}.role`, value.role);
  nonEmpty(`${name}.variant`, value.variant);
  nonEmpty(`${name}.objectRef`, value.objectRef);
  digest(`${name}.sha256`, value.sha256);
  nonEmpty(`${name}.mediaType`, value.mediaType);
  positiveIntegerOrNull(`${name}.width`, value.width);
  positiveIntegerOrNull(`${name}.height`, value.height);
  positiveIntegerOrNull(`${name}.durationMs`, value.durationMs);
  timestamp(`${name}.completedAt`, value.completedAt);
  nonEmpty(`${name}.generationRecordObjectRef`, value.generationRecordObjectRef);
  digest(`${name}.generationRecordDigest`, value.generationRecordDigest);
  digest(`${name}.providerOutputDigest`, value.providerOutputDigest);

  plain(`${name}.credential`, value.credential);
  exact(`${name}.credential`, value.credential, [
    "format", "signerId", "manifestDigest", "embeddedAt", "verifiedAt",
  ]);
  nonEmpty(`${name}.credential.format`, value.credential.format);
  nonEmpty(`${name}.credential.signerId`, value.credential.signerId);
  digest(`${name}.credential.manifestDigest`, value.credential.manifestDigest);
  timestamp(`${name}.credential.embeddedAt`, value.credential.embeddedAt);
  timestamp(`${name}.credential.verifiedAt`, value.credential.verifiedAt);

  stringArray(`${name}.inputReferences`, value.inputReferences, { required: true });
  plain(`${name}.context`, value.context);
  jsonValue(`${name}.context`, value.context);
  return structuredClone(value);
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

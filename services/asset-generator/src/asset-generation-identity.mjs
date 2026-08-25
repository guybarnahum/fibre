import {
  ASSET_GENERATION_JOB_VERSION,
  normalizeAssetGenerationJob,
} from "./asset-generation-domain.mjs";

const SHA256_DIGEST = /^sha256:([0-9a-f]{64})$/;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

export function assertAssetGenerationIdentityDigest(value) {
  nonEmpty("asset generation identity digest", value);
  const match = SHA256_DIGEST.exec(value);
  if (!match) {
    throw new TypeError("asset generation identity digest must be sha256:<64 lowercase hex>");
  }
  return value;
}

export function createAssetGenerationJobFromIdentity({
  identityDigest,
  assetKind,
  role,
  variant,
  brief,
  inputReferences,
  referenceObjectRefs = [],
  requestedAt,
  providerProfile,
  context,
}) {
  const checkedDigest = assertAssetGenerationIdentityDigest(identityDigest);
  const suffix = checkedDigest.slice("sha256:".length);

  return normalizeAssetGenerationJob({
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: `assetjob_${suffix}`,
    assetKind,
    role,
    variant,
    brief,
    inputReferences,
    referenceObjectRefs,
    outputObjectRef: `asset_${suffix}`,
    receiptObjectRef: `assetreceipt_${suffix}`,
    requestedAt,
    providerProfile,
    context,
  });
}

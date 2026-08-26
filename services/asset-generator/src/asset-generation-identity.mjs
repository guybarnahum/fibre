import { ASSET_GENERATION_JOB_VERSION, normalizeAssetGenerationJob } from "./asset-generation-domain.mjs";
import { assertFibreSha256Digest, assertFibreShortIdSuffix, fibreShortIdCandidates, fibreShortRef } from "./fibre-short-id.mjs";

export function assertAssetGenerationIdentityDigest(value) {
  return assertFibreSha256Digest("asset generation identity digest", value);
}

export function createAssetGenerationJobFromIdentity(options) {
  const {
    identityDigest, idSuffix = null, assetKind, role, variant, brief,
    inputReferences, referenceObjectRefs = [], requestedAt, providerProfile, context,
  } = options;
  const checkedDigest = assertAssetGenerationIdentityDigest(identityDigest);
  const candidates = fibreShortIdCandidates(checkedDigest);
  const suffix = idSuffix === null ? candidates[0] : assertFibreShortIdSuffix("asset generation id suffix", idSuffix);
  if (!candidates.includes(suffix)) throw new TypeError("asset generation id suffix must be derived from the identity digest");
  return normalizeAssetGenerationJob({
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: fibreShortRef("assetjob_", suffix),
    assetKind,
    role,
    variant,
    brief,
    inputReferences,
    referenceObjectRefs,
    outputObjectRef: fibreShortRef("asset_", suffix),
    receiptObjectRef: fibreShortRef("assetreceipt_", suffix),
    requestedAt,
    providerProfile,
    context,
  });
}

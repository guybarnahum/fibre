import { AssetGenerationError } from "#services/asset-generator/src/index.mjs";

export function maybeInjectSliceH2ProviderTransientFailure(job, attemptNumber) {
  if (job?.context?.sliceH2ProviderTransientFailure !== true) return;
  if (attemptNumber !== 1) return;
  throw new AssetGenerationError("Slice H2 injected transient provider unavailability", {
    phase: "provider_generation",
    category: "provider_unavailable",
    retryable: true,
    provider: "slice-h2-injected-provider",
    model: job?.providerProfile ?? null,
    httpStatus: 503,
    safeDetail: "Slice H2 injected transient provider unavailability before real provider invocation",
  });
}

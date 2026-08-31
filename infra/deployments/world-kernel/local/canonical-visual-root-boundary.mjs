import { createAssetGenerationControlService } from "#services/asset-generator/src/index.mjs";

/**
 * In-process deployment adapter for canonical visual-root generation.
 *
 * The semantic boundary stays World-owned, while scheduling and durable proof
 * observation are delegated to the same generic Asset Generator control service
 * used by the remote Cloudflare control API.
 */
export function createCanonicalVisualRootBoundary({
  infra,
  credentialSigner,
  workflowName = "asset_generation_v1",
} = {}) {
  const controlService = createAssetGenerationControlService({
    infra,
    credentialSigner,
    workflowName,
  });
  return Object.freeze({
    reconcile({ job } = {}) {
      return controlService.reconcile(job);
    },
  });
}

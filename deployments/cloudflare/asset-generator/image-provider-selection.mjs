import {
  AssetGenerationError,
  createBflFluxImageProvider,
  createOpenAIImageProvider,
} from "../../../services/asset-generator/src/index.mjs";

export const OPENAI_IMAGE_PROVIDER_PROFILE = "openai-gpt-image-2-medium-v1";
export const BFL_FLUX_IMAGE_PROVIDER_PROFILE = "bfl-flux-2-pro-v1";

const OPENAI_IMAGE_MODEL = "gpt-image-2-2026-04-21";
const BFL_FLUX_MODEL = "flux-2-pro";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

export function createCloudflareAssetImageProvider({ env, job }) {
  if (!env || typeof env !== "object") throw new TypeError("Cloudflare asset generation env is required");
  if (!job || typeof job !== "object" || Array.isArray(job)) throw new TypeError("AssetGenerationJob is required");

  switch (job.providerProfile) {
    case OPENAI_IMAGE_PROVIDER_PROFILE:
      return createOpenAIImageProvider({
        apiKey: nonEmpty("OPENAI_API_KEY", env.OPENAI_API_KEY),
        model: OPENAI_IMAGE_MODEL,
      });
    case BFL_FLUX_IMAGE_PROVIDER_PROFILE:
      return createBflFluxImageProvider({
        apiKey: nonEmpty("BFL_API_KEY", env.BFL_API_KEY),
        model: BFL_FLUX_MODEL,
      });
    default:
      throw new AssetGenerationError(`unsupported asset image provider profile ${String(job.providerProfile)}`, {
        phase: "validation",
        category: "unsupported_capability",
        safeDetail: `unsupported asset image provider profile ${String(job.providerProfile)}`,
      });
  }
}

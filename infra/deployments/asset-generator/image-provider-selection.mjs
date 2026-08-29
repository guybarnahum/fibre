import { createBflFluxImageProvider } from "#integrations/ai/image/bfl.mjs";
import { createOpenAIImageProvider } from "#integrations/ai/image/openai.mjs";
import { AssetGenerationError } from "#services/asset-generator/src/asset-generation-error.mjs";

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

export function selectAssetImageProvider({ profile, secrets } = {}) {
  if (!secrets || typeof secrets !== "object" || Array.isArray(secrets)) {
    throw new TypeError("asset image provider secrets are required");
  }

  switch (profile) {
    case OPENAI_IMAGE_PROVIDER_PROFILE:
      return createOpenAIImageProvider({
        apiKey: nonEmpty("OpenAI image API key", secrets.openAiApiKey),
        model: OPENAI_IMAGE_MODEL,
      });
    case BFL_FLUX_IMAGE_PROVIDER_PROFILE:
      return createBflFluxImageProvider({
        apiKey: nonEmpty("BFL image API key", secrets.bflApiKey),
        model: BFL_FLUX_MODEL,
      });
    default:
      throw new AssetGenerationError(`unsupported asset image provider profile ${String(profile)}`, {
        phase: "validation",
        category: "unsupported_capability",
        safeDetail: `unsupported asset image provider profile ${String(profile)}`,
      });
  }
}

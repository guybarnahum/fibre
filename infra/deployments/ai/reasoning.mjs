import { createGoogleModelAdapter } from "#integrations/ai/reasoning/google.mjs";
import { createOpenAIModelAdapter } from "#integrations/ai/reasoning/openai.mjs";
import { GuardianModelError } from "#services/world-kernel/src/guardian-model-adapter.mjs";

const REASONING_MODELS = Object.freeze({
  dignity_guardian: Object.freeze({ provider: "openai", modelId: "gpt-5.1-2025-11-13" }),
});

function modelOverrideFor(blockName, modelOverrides) {
  const value = modelOverrides?.[blockName];
  if (value === undefined) return null;
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`model override for ${blockName} must be a non-empty string`);
  }
  return value.trim();
}

export function createLocalReasoningRuntime({
  environment = process.env,
  fetchImpl = globalThis.fetch,
  observer = null,
  modelOverrides = null,
} = {}) {
  function selectionForBlock(blockName) {
    const configured = REASONING_MODELS[blockName];
    if (configured === undefined) {
      throw new GuardianModelError(`No model is configured for Fibre reasoning block ${blockName}`, {
        code: "MODEL_UNAVAILABLE",
        retryable: false,
      });
    }
    return Object.freeze({
      provider: configured.provider,
      modelId: modelOverrideFor(blockName, modelOverrides) ?? configured.modelId,
    });
  }

  return Object.freeze({
    selectionForBlock,
    forBlock(blockName) {
      const selection = selectionForBlock(blockName);
      if (selection.provider === "openai") {
        return createOpenAIModelAdapter({
          environment,
          modelId: selection.modelId,
          fetchImpl,
          observer,
        });
      }
      if (selection.provider === "google") {
        return createGoogleModelAdapter({
          environment,
          modelId: selection.modelId,
          fetchImpl,
          observer,
        });
      }
      throw new GuardianModelError(`Unsupported model provider ${selection.provider}`, {
        code: "MODEL_UNAVAILABLE",
        retryable: false,
      });
    },
  });
}

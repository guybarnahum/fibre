import {
  GuardianModelError,
  createOpenAIResponsesGuardianAdapter,
} from "../guardian-model-adapter.mjs";

function apiKey(environment) {
  const value = environment.OPENAI_API_KEY ?? environment.FIBRE_GUARDIAN_OPENAI_API_KEY;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function createOpenAIModelAdapter({ environment = process.env, modelId } = {}) {
  const key = apiKey(environment);
  if (key === null) {
    throw new GuardianModelError("OpenAI model runtime requires OPENAI_API_KEY", {
      code: "MODEL_UNAVAILABLE",
      retryable: false,
      actionHint: "Set OPENAI_API_KEY in the environment or local .env file.",
    });
  }

  const inner = createOpenAIResponsesGuardianAdapter({ apiKey: key, modelId });
  return Object.freeze({
    provider: "openai",
    modelId,
    configuration: inner.configuration,
    async invoke(request) {
      const result = await inner.invoke(request);
      return {
        ...result,
        provenance: {
          ...result.provenance,
          provider: "openai",
          transport: "responses",
        },
      };
    },
  });
}

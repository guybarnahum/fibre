import { createBflFluxImageProvider } from "#integrations/ai/image/bfl.mjs";
import { createOpenAIImageProvider } from "#integrations/ai/image/openai.mjs";
import { createGoogleModelAdapter } from "#integrations/ai/reasoning/google.mjs";
import { createOpenAIModelAdapter } from "#integrations/ai/reasoning/openai.mjs";
import { createHttpContentCredentialSigner } from "#integrations/content-credentials/c2pa-http-signer.mjs";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function selection(name, value, kind) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} selection is required`);
  if (value.kind !== kind) throw new TypeError(`${name} must select integration kind ${kind}`);
  nonEmpty(`${name}.provider`, value.provider);
  return value;
}

function configured(name, value) {
  return nonEmpty(name, value);
}

function environmentName(name, mapping, key, { required = true } = {}) {
  const value = mapping?.[key];
  if (value === undefined && !required) return null;
  return nonEmpty(`${name}.${key}`, value);
}

function environmentValue(name, mapping, key, environment, { required = true } = {}) {
  const variable = environmentName(name, mapping, key, { required });
  if (variable === null) return null;
  const value = environment?.[variable];
  if ((typeof value !== "string" || value.trim() === "") && required) {
    throw new TypeError(`${name}.${key} requires environment variable ${variable}`);
  }
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function selectReasoningIntegration(value, { environment = process.env, fetchImpl = globalThis.fetch, observer = null } = {}) {
  const chosen = selection("reasoning integration", value, "ai.reasoning");
  const modelId = configured("reasoning integration config.model", chosen.config?.model);
  const apiKey = environmentValue("reasoning integration secrets", chosen.secrets, "apiKey", environment);

  if (chosen.provider === "openai") {
    return createOpenAIModelAdapter({
      environment: { ...environment, OPENAI_API_KEY: apiKey },
      modelId,
      fetchImpl,
      observer,
    });
  }
  if (chosen.provider === "google") {
    return createGoogleModelAdapter({
      environment: { ...environment, GEMINI_API_KEY: apiKey },
      modelId,
      fetchImpl,
      observer,
    });
  }
  throw new TypeError(`unsupported reasoning integration provider ${chosen.provider}`);
}

export function selectImageIntegration(value, { environment = process.env, fetchImpl = globalThis.fetch } = {}) {
  const chosen = selection("image integration", value, "ai.image");
  const model = configured("image integration config.model", chosen.config?.model);
  const apiKey = environmentValue("image integration secrets", chosen.secrets, "apiKey", environment);

  if (chosen.provider === "openai") return createOpenAIImageProvider({ apiKey, model, fetchImpl });
  if (chosen.provider === "bfl") return createBflFluxImageProvider({ apiKey, model, fetchImpl });
  throw new TypeError(`unsupported image integration provider ${chosen.provider}`);
}

export function selectContentCredentialIntegration(value, { environment = process.env, fetchImpl = globalThis.fetch } = {}) {
  const chosen = selection("content credential integration", value, "content-credentials");
  if (chosen.provider !== "c2pa-http") {
    throw new TypeError(`unsupported content credential integration provider ${chosen.provider}`);
  }
  return createHttpContentCredentialSigner({
    baseUrl: environmentValue("content credential integration environment", chosen.environment, "baseUrl", environment),
    signerId: environmentValue("content credential integration environment", chosen.environment, "signerId", environment),
    trustPolicy: environmentValue("content credential integration environment", chosen.environment, "trustPolicy", environment),
    authorizationToken: environmentValue(
      "content credential integration environment",
      chosen.environment,
      "authorizationToken",
      environment,
      { required: false },
    ),
    fetchImpl,
  });
}

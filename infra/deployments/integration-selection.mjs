import { createBflFluxImageProvider } from "#integrations/ai/image/bfl.mjs";
import { createOpenAIImageProvider } from "#integrations/ai/image/openai.mjs";
import { createGoogleModelAdapter } from "#integrations/ai/reasoning/google.mjs";
import { createOpenAIModelAdapter } from "#integrations/ai/reasoning/openai.mjs";

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

function imageProfileFlag(profile, integration, key) {
  const value = integration?.config?.[key];
  if (typeof value !== "boolean") {
    throw new TypeError(`asset image provider profile ${profile} config.${key} must be boolean`);
  }
  return value;
}

function optionalImageProfile(name, value) {
  if (value === undefined || value === null) return null;
  return nonEmpty(name, value);
}

export function selectImageProviderRoute(serviceDeployment, {
  primaryProfile,
  requiresReferenceObjects = false,
  mode = "primary",
} = {}) {
  if (!serviceDeployment || typeof serviceDeployment !== "object" || Array.isArray(serviceDeployment)) {
    throw new TypeError("asset-generator service deployment is required");
  }
  if (serviceDeployment.serviceId !== "asset-generator") {
    throw new TypeError("image provider routing requires the asset-generator service deployment");
  }
  const primary = nonEmpty("primary image provider profile", primaryProfile);
  if (typeof requiresReferenceObjects !== "boolean") {
    throw new TypeError("requiresReferenceObjects must be boolean");
  }
  if (!["primary", "secondary"].includes(mode)) {
    throw new TypeError("image provider mode must be primary or secondary");
  }

  const integration = serviceDeployment.integrations?.[primary];
  if (!integration || integration.kind !== "ai.image") {
    throw new TypeError(`asset-generator deployment has no ai.image provider profile ${primary}`);
  }
  if (requiresReferenceObjects && imageProfileFlag(primary, integration, "acceptsReferenceObjects") !== true) {
    throw new TypeError(`image provider profile ${primary} cannot accept reference objects`);
  }

  const secondaryProfile = optionalImageProfile(
    `asset image provider profile ${primary} config.secondaryProfile`,
    integration.config?.secondaryProfile,
  );
  let secondary = null;
  if (secondaryProfile !== null) {
    secondary = serviceDeployment.integrations?.[secondaryProfile];
    if (!secondary || secondary.kind !== "ai.image") {
      throw new TypeError(`asset image provider profile ${primary} names unknown secondary profile ${secondaryProfile}`);
    }
    if (secondaryProfile === primary) {
      throw new TypeError(`asset image provider profile ${primary} cannot use itself as secondary`);
    }
    if (requiresReferenceObjects && imageProfileFlag(secondaryProfile, secondary, "acceptsReferenceObjects") !== true) {
      throw new TypeError(`secondary image provider profile ${secondaryProfile} cannot accept reference objects`);
    }
  }

  if (mode === "secondary" && secondaryProfile === null) {
    throw new TypeError(`asset image provider profile ${primary} has no secondary provider profile`);
  }

  return Object.freeze({
    primaryProfile:primary,
    secondaryProfile,
    selectedProfile:mode === "secondary" ? secondaryProfile : primary,
    mode,
  });
}

export function selectImageProviderProfile(serviceDeployment, {
  requiresReferenceObjects = false,
} = {}) {
  if (!serviceDeployment || typeof serviceDeployment !== "object" || Array.isArray(serviceDeployment)) {
    throw new TypeError("asset-generator service deployment is required");
  }
  if (serviceDeployment.serviceId !== "asset-generator") {
    throw new TypeError("image provider profile selection requires the asset-generator service deployment");
  }
  if (typeof requiresReferenceObjects !== "boolean") {
    throw new TypeError("requiresReferenceObjects must be boolean");
  }

  const images = Object.entries(serviceDeployment.integrations ?? {})
    .filter(([, integration]) => integration?.kind === "ai.image")
    .map(([profile, integration]) => ({
      profile,
      integration,
      acceptsReferenceObjects: imageProfileFlag(profile, integration, "acceptsReferenceObjects"),
      presentationDefault: imageProfileFlag(profile, integration, "presentationDefault"),
      presentationReferenceDefault: imageProfileFlag(profile, integration, "presentationReferenceDefault"),
    }));
  if (images.length === 0) throw new TypeError("asset-generator deployment has no ai.image provider profiles");

  if (!requiresReferenceObjects) {
    const defaults = images.filter((candidate) => candidate.presentationDefault);
    if (defaults.length !== 1) {
      throw new TypeError("asset-generator deployment must declare exactly one default presentation image profile");
    }
    return defaults[0].profile;
  }

  const capable = images.filter((candidate) => candidate.acceptsReferenceObjects);
  if (capable.length === 0) {
    throw new TypeError("asset-generator deployment has no image profile capable of reference objects");
  }
  if (capable.length === 1) return capable[0].profile;
  const defaults = capable.filter((candidate) => candidate.presentationReferenceDefault);
  if (defaults.length !== 1) {
    throw new TypeError("asset-generator deployment must declare exactly one default reference-capable presentation image profile");
  }
  return defaults[0].profile;
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
      temperature: chosen.config?.temperature,
      topP: chosen.config?.topP,
      reasoningEffort: chosen.config?.reasoningEffort,
      maxOutputTokens: chosen.config?.maxOutputTokens,
      timeoutMs: chosen.config?.timeoutMs,
      retryLimit: chosen.config?.retryLimit,
      retryDelayMs: chosen.config?.retryDelayMs,
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


import { createBflFluxImageProvider } from "#integrations/ai/image/bfl.mjs";
import { createOpenAIImageProvider } from "#integrations/ai/image/openai.mjs";
import { createCloudflareEmbeddingAdapter } from "#integrations/ai/embedding/cloudflare.mjs";
import { createCloudflareModelAdapter } from "#integrations/ai/reasoning/cloudflare.mjs";
import { createGoogleModelAdapter } from "#integrations/ai/reasoning/google.mjs";
import { createOpenAIModelAdapter } from "#integrations/ai/reasoning/openai.mjs";
import { sha256 } from "#integrations/ai/persistence-common.mjs";

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

// Defer secrets until first use while exposing the provenance metadata that
// streaming cognition validates when a service is composed.
export function lazyReasoningIntegration(value, options = {}) {
  const chosen = selection("reasoning integration", value, "ai.reasoning");
  const modelId = configured("reasoning integration config.model", chosen.config?.model);
  let adapter = null;
  const resolve = () => adapter ??= selectReasoningIntegration(value, options);
  return Object.freeze({
    provider: chosen.provider,
    modelId,
    configuration: Object.freeze({ ...chosen.config }),
    invoke: (request) => resolve().invoke(request),
    streamExpression: (request) => resolve().streamExpression(request),
  });
}

// One compact log line per model call, so cost and prompt-cache reuse can be
// read per cognitive job without persisting prompts or writing to the World.
const PREFIX_CHARS = Object.freeze([2048, 4096, 8192, 16384]);
const short = (text) => sha256(text).slice(0, 8);

// Opaque fingerprints of the prompt's parts in the order they are sent: the
// instructions, the output schema, then each top-level input field. On one
// cache scope, the first part whose fingerprint differs from the previous call
// is where any provider's prefix reuse must stop. No text is logged.
function promptPartTexts(request) {
  const texts = { system: String(request?.systemPrompt ?? ""), schema: JSON.stringify(request?.responseSchema ?? null) };
  for (const [field, value] of Object.entries(request?.input ?? {})) texts[`input.${field}`] = JSON.stringify(value) ?? "null";
  return texts;
}

function promptParts(request) {
  return Object.fromEntries(Object.entries(promptPartTexts(request)).map(([part, text]) => [part, short(text)]));
}

// How many characters each part contributes, so the parts that dominate input
// can be found. Sizes only; no text is logged.
function promptSizes(request) {
  return Object.fromEntries(Object.entries(promptPartTexts(request)).map(([part, text]) => [part, text.length]));
}

// Inside a large input part, which fields are large: any object of at least
// 2,000 characters is opened, up to three levels down.
const OPEN_CHARS = 2000;
function promptInnerSizes(request) {
  const inner = {};
  const open = (path, value, depth) => {
    for (const [field, child] of Object.entries(value)) {
      const text = JSON.stringify(child) ?? "null";
      const at = `${path}.${field}`;
      if (depth > 0) inner[at] = text.length;
      if (depth < 3 && text.length >= OPEN_CHARS && child !== null && typeof child === "object" && !Array.isArray(child)) {
        open(at, child, depth + 1);
      }
    }
  };
  open("input", request?.input ?? {}, 0);
  return inner;
}

function promptPrefix(request) {
  const text = `${request?.systemPrompt ?? ""}\n${JSON.stringify(request?.responseSchema ?? null)}\n${JSON.stringify(request?.input ?? null)}`;
  return PREFIX_CHARS.map((chars) => text.length < chars ? null : short(text.slice(0, chars)));
}

// Replay capture: for jobs of the named depths (staging, opt-in), one extra line carries the full input, schema and
// answer so a candidate model can later be judged on exactly the same
// requests. The record travels as one JSON string, so a log store that
// indexes fields keeps it whole. Thread-private content: operator evidence
// only, never committed.
const CAPTURE_MAX_CHARS = 60000;
function captureLine(request, provenance, output) {
  const kind = String(request?.clientRequestId ?? "unknown").replace(/_[0-9a-f]{16,}$/u, "");
  const capture = JSON.stringify({ input: request?.input ?? null, responseSchema: request?.responseSchema ?? null,
    output: output ?? null });
  const head = { kind, prompt: request?.promptRef ?? null, depth: request?.depth ?? null,
    scope: typeof request?.cacheKey === "string" ? short(request.cacheKey) : null, modelId: provenance?.modelId ?? null };
  // Too long to keep whole: say so, so a missing job is not mistaken for a quiet one.
  return capture.length > CAPTURE_MAX_CHARS
    ? JSON.stringify({ event: "model-capture-skipped", ...head, chars: capture.length })
    : JSON.stringify({ event: "model-capture", ...head, capture });
}

export function meteredReasoningIntegration(adapter, { port, log = console.log, captureDepths = [] } = {}) {
  const capturing = new Set(captureDepths);
  const kindOf = (request) => String(request?.clientRequestId ?? "unknown").replace(/_[0-9a-f]{16,}$/u, "");
  // A failed call names its error code and a short message, so an outage or
  // a model that misses the schema can be read from the logs.
  const report = (request, startedAt, provenance, outcome, error = null) => {
    const usage = provenance?.usage ?? null;
    log(JSON.stringify({
      event: "model-call",
      port,
      kind: kindOf(request),
      prompt: request?.promptRef ?? null,
      scope: typeof request?.cacheKey === "string" ? short(request.cacheKey) : null,
      cacheThrough: request?.cacheThrough ?? null,
      prefix: promptPrefix(request),
      parts: promptParts(request),
      sizes: promptSizes(request),
      innerSizes: promptInnerSizes(request),
      outcome,
      modelId: provenance?.modelId ?? adapter.modelId ?? null,
      latency: request?.latency ?? "live",
      serviceTier: provenance?.serviceTier ?? null,
      elapsedMs: Date.now() - startedAt,
      inputTokens: usage?.inputTokens ?? null,
      cachedInputTokens: usage?.cachedInputTokens ?? null,
      cacheWriteTokens: usage?.cacheWriteTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
      ...(error === null ? {} : { errorCode: error?.code ?? null, error: String(error?.message ?? error).slice(0, 200) }),
    }));
  };
  return Object.freeze({
    ...adapter,
    async invoke(request) {
      const startedAt = Date.now();
      let result, failure = null;
      try {
        result = await adapter.invoke(request);
        return result;
      } catch (error) {
        failure = error;
        throw error;
      } finally {
        report(request, startedAt, result?.provenance, result === undefined ? "failed" : "completed", failure);
        if (result !== undefined && capturing.has(request?.depth)) log(captureLine(request, result.provenance, result.output));
      }
    },
    ...(typeof adapter.streamExpression !== "function" ? {} : {
      async *streamExpression(request) {
        const startedAt = Date.now();
        let provenance = null, failure = null, text = "";
        try {
          for await (const event of adapter.streamExpression(request)) {
            if (event?.type === "expression_delta") text += event.text ?? "";
            if (event?.type === "expression_complete") provenance = event.provenance;
            yield event;
          }
        } catch (error) {
          failure = error;
          throw error;
        } finally {
          report(request, startedAt, provenance, failure !== null ? "failed" : provenance === null ? "stopped" : "completed", failure);
          // A spoken turn is recorded whole, as said, once the model finished it.
          if (provenance !== null && failure === null && capturing.has(request?.depth))
            log(captureLine(request, provenance, { text }));
        }
      },
    }),
  });
}

export function selectReasoningIntegration(value, { environment = process.env, fetchImpl = globalThis.fetch, observer = null } = {}) {
  const chosen = selection("reasoning integration", value, "ai.reasoning");
  const modelId = configured("reasoning integration config.model", chosen.config?.model);
  // Workers AI: the Worker's AI binding when it has one, else the account's
  // REST endpoint with a Workers AI token.
  if (chosen.provider === "cloudflare") {
    const binding = environment?.[chosen.config?.binding ?? "AI"];
    const viaBinding = typeof binding?.run === "function";
    return createCloudflareModelAdapter({
      binding: viaBinding ? binding : null,
      accountId: viaBinding ? null : environmentValue("reasoning integration environment", chosen.environment, "accountId", environment),
      apiToken: viaBinding ? null : environmentValue("reasoning integration secrets", chosen.secrets, "apiToken", environment),
      modelId,
      fetchImpl,
      observer,
      maxOutputTokens: chosen.config?.maxOutputTokens,
      timeoutMs: chosen.config?.timeoutMs,
      retryLimit: chosen.config?.retryLimit,
      retryDelayMs: chosen.config?.retryDelayMs,
      temperature: chosen.config?.temperature ?? null,
      thinking: chosen.config?.thinking === true,
      ...(chosen.config?.structuredOutput ? { structuredOutput: chosen.config.structuredOutput } : {}),
    });
  }
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
      deferredServiceTier: chosen.config?.deferredServiceTier ?? null,
      deferredTimeoutMs: chosen.config?.deferredTimeoutMs,
      cacheMode: chosen.config?.cacheMode,
    });
  }
  if (chosen.provider === "google") {
    return createGoogleModelAdapter({
      environment: { ...environment, GEMINI_API_KEY: apiKey },
      modelId,
      maxOutputTokens: chosen.config?.maxOutputTokens,
      timeoutMs: chosen.config?.timeoutMs,
      retryLimit: chosen.config?.retryLimit,
      retryDelayMs: chosen.config?.retryDelayMs,
      thinkingLevel: chosen.config?.thinkingLevel ?? null,
      thinkingBudget: chosen.config?.thinkingBudget ?? null,
      fetchImpl,
      observer,
    });
  }
  throw new TypeError(`unsupported reasoning integration provider ${chosen.provider}`);
}

// Where an operator tool finds a provider's credentials when it names only a
// provider and a model (a quality run, a smoke call).
const PROVIDER_CREDENTIALS = Object.freeze({
  openai: Object.freeze({ secrets: { apiKey: "OPENAI_API_KEY" } }),
  google: Object.freeze({ secrets: { apiKey: "GEMINI_API_KEY" } }),
  cloudflare: Object.freeze({ secrets: { apiToken: "CLOUDFLARE_AI_API_TOKEN" }, environment: { accountId: "CLOUDFLARE_ACCOUNT_ID" } }),
});
export function reasoningIntegrationFor(provider, model, config = {}) {
  const credentials = PROVIDER_CREDENTIALS[provider];
  if (!credentials) throw new TypeError(`unsupported reasoning integration provider ${provider}`);
  return { kind: "ai.reasoning", provider, config: { ...config, model }, ...structuredClone(credentials) };
}

// A service's mind for each cognitive job: the integration its manifest
// names for the job's prompt id, if any, else the port's. So one job can move
// to another model by configuration, with no code naming a provider. Each
// adapter is made on first use, so a job's credentials are read only when
// that job thinks.
export function routedReasoningIntegration(integrations, port, { lazy = false, ...options } = {}) {
  const base = integrations?.[port];
  const adapters = new Map();
  const adapterFor = (request) => {
    const job = typeof request?.promptRef === "string" ? request.promptRef.split("@")[0] : null;
    const routed = job !== null && integrations?.[job]?.kind === "ai.reasoning";
    const key = routed ? job : port;
    if (!adapters.has(key)) {
      adapters.set(key, routed || lazy
        ? lazyReasoningIntegration(routed ? integrations[job] : base, options)
        : selectReasoningIntegration(base, options));
    }
    return adapters.get(key);
  };
  const portAdapter = adapterFor(null);
  return Object.freeze({
    provider: portAdapter.provider,
    modelId: portAdapter.modelId,
    configuration: portAdapter.configuration,
    invoke: (request) => adapterFor(request).invoke(request),
    streamExpression: (request) => adapterFor(request).streamExpression(request),
  });
}

// Meaning (S5b repair): an embedding port for World's own measures, never a
// Thread's cognition. A service without one measures by shared words.
export function selectMeaningIntegration(value, { environment = process.env, fetchImpl = globalThis.fetch } = {}) {
  if (value === undefined || value === null) return null;
  const chosen = selection("meaning integration", value, "ai.embedding");
  const modelId = configured("meaning integration config.model", chosen.config?.model);
  if (chosen.provider !== "cloudflare") throw new TypeError(`unsupported meaning provider ${chosen.provider}`);
  const binding = environment?.[chosen.config?.binding ?? "AI"];
  const viaBinding = typeof binding?.run === "function";
  return createCloudflareEmbeddingAdapter({
    binding: viaBinding ? binding : null,
    accountId: viaBinding ? null : environmentValue("meaning integration environment", chosen.environment, "accountId", environment),
    apiToken: viaBinding ? null : environmentValue("meaning integration secrets", chosen.secrets, "apiToken", environment),
    modelId, fetchImpl, timeoutMs: chosen.config?.timeoutMs,
  });
}

export function selectImageIntegration(value, { environment = process.env, fetchImpl = globalThis.fetch } = {}) {
  const chosen = selection("image integration", value, "ai.image");
  const model = configured("image integration config.model", chosen.config?.model);
  const apiKey = environmentValue("image integration secrets", chosen.secrets, "apiKey", environment);

  if (chosen.provider === "openai") return createOpenAIImageProvider({ apiKey, model, fetchImpl });
  if (chosen.provider === "bfl") return createBflFluxImageProvider({ apiKey, model, fetchImpl });
  throw new TypeError(`unsupported image integration provider ${chosen.provider}`);
}


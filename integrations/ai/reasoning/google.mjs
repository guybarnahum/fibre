import { GuardianModelError } from "../guardian-model-adapter.mjs";
import { streamSseJson } from "./sse.mjs";
import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "../persistence-common.mjs";
import {
  attachRetryGuidance,
  httpRetryGuidance,
  isClearlyTransientTransportError,
  retryDelayFor,
  createProviderCircuit,
} from "./retry-policy.mjs";

const DEFAULTS = Object.freeze({
  timeoutMs: 45_000,
  maxOutputTokens: 2_000,
  retryLimit: 2,
  retryDelayMs: 2_000,
});

function apiKey(environment) {
  const value = environment.GEMINI_API_KEY;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function digest(value) {
  return `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;
}

function notify(observer, event) {
  if (typeof observer !== "function") return;
  try {
    observer(structuredClone(event));
  } catch {
    // Observability must never change cognition/provider behavior.
  }
}

function wait(milliseconds) {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// generateContent uses Google's legacy Schema protobuf rather than the newer
// Interactions response_format JSON-Schema surface. Translate shared Fibre
// schemas to that provider subset without weakening Fibre's canonical schema.
function googleSchema(value) {
  if (Array.isArray(value)) return value.map(googleSchema);
  if (value === null || typeof value !== "object") return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "minLength" || key === "maxLength" || key === "additionalProperties") continue;
    if (key === "type" && typeof item === "string") {
      result[key] = item.toUpperCase();
      continue;
    }
    if (key === "type" && Array.isArray(item)) {
      const nonNull = item.filter((type) => type !== "null");
      const hasNull = item.includes("null");
      if (!hasNull || nonNull.length !== 1 || typeof nonNull[0] !== "string") {
        throw new TypeError("Google generateContent schema translation supports nullable unions only");
      }
      result.type = nonNull[0].toUpperCase();
      result.nullable = true;
      continue;
    }
    result[key] = googleSchema(item);
  }
  return result;
}

// The answer's own text: thought summaries, when a model returns them, are not the answer.
function extractText(body) {
  const parts = body?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.filter((part) => typeof part?.text === "string" && part.thought !== true).map((part) => part.text).join("\n").trim();
}

// What a call used. Thinking is billed as output, so output includes it, and
// how much of it was thinking is kept beside it.
function usageOf(metadata, previous = {}) {
  const thinking = Number(metadata?.thoughtsTokenCount ?? previous.reasoningTokens ?? 0);
  const answer = Number(metadata?.candidatesTokenCount ?? 0);
  return {
    inputTokens: Number(metadata?.promptTokenCount ?? previous.inputTokens ?? 0),
    cachedInputTokens: Number(metadata?.cachedContentTokenCount ?? 0),
    outputTokens: metadata?.candidatesTokenCount === undefined && metadata?.thoughtsTokenCount === undefined
      ? Number(previous.outputTokens ?? 0) : answer + thinking,
    reasoningTokens: thinking,
    totalTokens: Number(metadata?.totalTokenCount ?? previous.totalTokens ?? 0),
  };
}

// Why a model stopped, when it did not finish its answer: cut off at the
// output limit (often by its own thinking), or stopped by the provider.
function incomplete(finishReason, usage) {
  const reason = String(finishReason);
  const cutOff = reason === "MAX_TOKENS";
  const error = new GuardianModelError(cutOff
    ? `Google answer was cut off at its output limit (${usage.reasoningTokens} of ${usage.outputTokens} output tokens were thinking)`
    : `Google model stopped before answering: ${reason}`, {
    code: "MODEL_INCOMPLETE_RESPONSE", retryable: false, providerErrorCode: reason,
    actionHint: cutOff ? "Raise maxOutputTokens or lower the thinking level for this model." : undefined,
  });
  error.providerUsage = usage;
  return error;
}

// The thinking a model may do: a level for Gemini 3 models, a token budget for 2.5.
function thinkingConfig({ thinkingLevel, thinkingBudget }) {
  if (thinkingLevel !== null) return { thinkingLevel };
  if (thinkingBudget !== null) return { thinkingBudget };
  return null;
}

function parseOutput(text) {
  assertNonEmpty("Google model output", text);
  try {
    const value = JSON.parse(text);
    assertPlainObject("Google model output", value);
    return value;
  } catch (error) {
    throw new GuardianModelError(`Google model returned unparseable structured output: ${error.message}`, {
      code: "UNPARSEABLE_MODEL_OUTPUT", cause: error, retryable: false,
    });
  }
}

function classifyHttpFailure(response, body) {
  const status = Number(response.status);
  const message = body?.error?.message ?? `HTTP ${status}`;
  const providerErrorCode = body?.error?.status ?? body?.error?.code ?? null;
  const guidance = httpRetryGuidance(response);
  if (status === 401) {
    return new GuardianModelError(`Google API authentication failed: ${message}`, {
      code: "MODEL_AUTHENTICATION_ERROR", retryable: false, httpStatus: status, providerErrorCode,
      actionHint: "Check GEMINI_API_KEY.",
    });
  }
  if (status === 403) {
    return new GuardianModelError(`Google API permission denied: ${message}`, {
      code: "MODEL_PERMISSION_ERROR", retryable: false, httpStatus: status, providerErrorCode,
    });
  }
  if ([400, 404, 405, 422].includes(status)) {
    return new GuardianModelError(`Google API request or model configuration is invalid: ${message}`, {
      code: "MODEL_REQUEST_CONFIGURATION_ERROR", retryable: false, httpStatus: status, providerErrorCode,
    });
  }
  return attachRetryGuidance(new GuardianModelError(`Google model endpoint failed: ${message}`, {
    code: "MODEL_HTTP_ERROR", retryable: guidance.retryable, httpStatus: status, providerErrorCode,
  }), guidance);
}

function normalizeError(error) {
  if (error instanceof GuardianModelError) return error;
  return new GuardianModelError(`Google model request failed: ${error?.message ?? String(error)}`, {
    code: error?.name === "AbortError" ? "MODEL_TIMEOUT" : "MODEL_TRANSPORT_ERROR",
    cause: error instanceof Error ? error : undefined,
    retryable: isClearlyTransientTransportError(error),
  });
}

export function createGoogleModelAdapter({
  environment = process.env,
  modelId,
  timeoutMs = DEFAULTS.timeoutMs,
  maxOutputTokens = DEFAULTS.maxOutputTokens,
  retryLimit = DEFAULTS.retryLimit,
  retryDelayMs = DEFAULTS.retryDelayMs,
  thinkingLevel = null,
  thinkingBudget = null,
  fetchImpl = globalThis.fetch,
  observer = null,
  now = Date.now,
} = {}) {
  const key = apiKey(environment);
  if (key === null) {
    throw new GuardianModelError("Google model runtime requires GEMINI_API_KEY", {
      code: "MODEL_UNAVAILABLE", retryable: false,
      actionHint: "Set GEMINI_API_KEY in the environment or local .env file.",
    });
  }
  assertId("Google modelId", modelId);
  if (typeof fetchImpl !== "function") throw new TypeError("Google model fetchImpl must be a function");
  if (thinkingLevel !== null && !["minimal", "low", "medium", "high"].includes(thinkingLevel)) {
    throw new TypeError("Google thinkingLevel must be minimal, low, medium or high");
  }
  if (thinkingBudget !== null && !Number.isSafeInteger(thinkingBudget)) throw new TypeError("Google thinkingBudget must be an integer");
  const thinking = thinkingConfig({ thinkingLevel, thinkingBudget });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`;
  const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:streamGenerateContent?alt=sse`;
  const configuration = Object.freeze({
    transport: "generateContent",
    endpoint,
    maxOutputTokens,
    retryLimit,
    retryDelayMs,
    structuredOutput: "json_schema",
    ...(thinking === null ? {} : { thinking }),
  });
  const expressionConfiguration = Object.freeze({
    transport:"streamGenerateContent",
    endpoint:streamEndpoint,
    maxOutputTokens,
    ...(thinking === null ? {} : { thinking }),
  });
  const generationConfig = (extra = {}) => ({ maxOutputTokens, ...(thinking === null ? {} : { thinkingConfig: thinking }), ...extra });
  const circuit = createProviderCircuit({ now });

  return Object.freeze({
    provider: "google",
    modelId,
    configuration,
    async *streamExpression({ systemPrompt, input, clientRequestId, signal = null }) {
      assertNonEmpty("expression systemPrompt", systemPrompt);
      assertPlainObject("expression input", input);
      assertId("expression clientRequestId", clientRequestId);
      if (signal !== null && typeof signal?.addEventListener !== "function") {
        throw new TypeError("expression signal must be an AbortSignal");
      }
      circuit.check();
      if (signal?.aborted) return;

      const controller = new AbortController();
      const onAbort = () => controller.abort(signal?.reason);
      signal?.addEventListener("abort", onAbort, { once:true });
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let completed = false;
      let usage = { inputTokens:0, outputTokens:0, reasoningTokens:0, totalTokens:0 };
      let resolvedModelId = modelId;

      try {
        let response;
        try {
          response = await fetchImpl(streamEndpoint, {
            method:"POST",
            headers:{
              "content-type":"application/json",
              accept:"text/event-stream",
              "x-goog-api-key":key,
            },
            body:JSON.stringify({
              systemInstruction:{ parts:[{ text:systemPrompt }] },
              contents:[{ role:"user", parts:[{ text:JSON.stringify(input) }] }],
              generationConfig:generationConfig(),
            }),
            signal:controller.signal,
          });
        } catch (error) {
          if (signal?.aborted) return;
          throw normalizeError(error);
        }

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw classifyHttpFailure(response, body);
        }

        const providerRequestId = response.headers?.get?.("x-request-id")
          ?? response.headers?.get?.("x-goog-request-id")
          ?? null;

        for await (const chunk of streamSseJson(response.body)) {
          if (signal?.aborted) return;
          if (typeof chunk?.modelVersion === "string" && chunk.modelVersion.trim() !== "") {
            resolvedModelId = chunk.modelVersion;
          }
          if (chunk?.usageMetadata) usage = usageOf(chunk.usageMetadata, usage);

          for (const part of chunk?.candidates?.[0]?.content?.parts ?? []) {
            if (typeof part?.text === "string" && part.text !== "" && part.thought !== true) {
              yield Object.freeze({ type:"expression_delta", text:part.text });
            }
          }

          const finishReason = chunk?.candidates?.[0]?.finishReason ?? null;
          if (finishReason !== null && finishReason !== "") {
            if (finishReason !== "STOP") throw incomplete(finishReason, usage);
            const provenance = Object.freeze({
              provider:"google",
              transport:"streamGenerateContent",
              modelId:resolvedModelId,
              providerRequestId,
              configuration:{ ...expressionConfiguration },
              usage:{ ...usage },
            });
            completed = true;
            yield Object.freeze({ type:"expression_complete", provenance });
          }
        }

        if (!completed && !signal?.aborted) {
          throw new GuardianModelError("Google expression stream ended before completion", {
            code:"MODEL_STREAM_INCOMPLETE",
            retryable:false,
          });
        }
      } catch (error) {
        if (signal?.aborted) return;
        throw normalizeError(error);
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener?.("abort", onAbort);
      }
    },
    // A request cacheKey is accepted and ignored: Gemini reuses an identical
    // prompt prefix implicitly and reports it as cachedContentTokenCount.
    async invoke({ systemPrompt, input, responseSchema, clientRequestId }) {
      assertNonEmpty("model systemPrompt", systemPrompt);
      assertPlainObject("model input", input);
      assertPlainObject("model responseSchema", responseSchema);
      assertId("model clientRequestId", clientRequestId);
      circuit.check();

      const maximumAttempts = retryLimit + 1;
      const operationalRetries = [];
      for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
        notify(observer, { type: "model_attempt", provider: "google", modelId, clientRequestId, attempt, maximumAttempts });
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          let response;
          let body;
          try {
            response = await fetchImpl(endpoint, {
              method: "POST",
              headers: { "content-type": "application/json", "x-goog-api-key": key },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
                generationConfig: generationConfig({
                  responseMimeType: "application/json",
                  responseSchema: googleSchema(responseSchema),
                }),
              }),
              signal: controller.signal,
            });
            try {
              body = await response.json();
            } catch (error) {
              const guidance = httpRetryGuidance(response);
              throw attachRetryGuidance(new GuardianModelError(`Google model response was not JSON: ${error.message}`, {
                code: "MODEL_PROTOCOL_ERROR", cause: error, retryable: guidance.retryable,
                httpStatus: Number(response.status),
              }), guidance);
            }
          } catch (error) {
            throw normalizeError(error);
          }

          if (!response.ok) throw classifyHttpFailure(response, body);
          const usage = usageOf(body?.usageMetadata);
          const finishReason = body?.candidates?.[0]?.finishReason ?? null;
          if (finishReason !== null && finishReason !== "STOP") throw incomplete(finishReason, usage);
          const output = parseOutput(extractText(body));
          const provenance = {
            provider: "google",
            transport: "generateContent",
            modelId,
            providerRequestId: response.headers?.get?.("x-request-id") ?? response.headers?.get?.("x-goog-request-id") ?? null,
            configuration: { ...configuration },
            invocationAttempts: attempt,
            operationalRetries: structuredClone(operationalRetries),
            usage,
          };
          notify(observer, {
            type: "model_response",
            provider: "google",
            modelId,
            clientRequestId,
            attempt,
            maximumAttempts,
            inputDigest: digest(input),
            promptHash: digest(systemPrompt),
            responseSchemaHash: digest(responseSchema),
            providerRequestId: provenance.providerRequestId,
            modelOutput: structuredClone(output),
            usage: structuredClone(provenance.usage),
          });
          return { output, provenance };
        } catch (error) {
          const normalized = normalizeError(error);
          const failure = {
            code: normalized.code,
            message: normalized.message,
            retryable: normalized.retryable,
            retryAfterMs: normalized.retryAfterMs ?? null,
            httpStatus: normalized.httpStatus,
            providerErrorCode: normalized.providerErrorCode,
            actionHint: normalized.actionHint,
          };
          const retrying = normalized.retryable === true && attempt < maximumAttempts;
          notify(observer, {
            type: "operational_failure",
            provider: "google",
            modelId,
            clientRequestId,
            attempt,
            maximumAttempts,
            retrying,
            retryDelayMs: retrying ? retryDelayFor(normalized, retryDelayMs) : null,
            inputDigest: digest(input),
            promptHash: digest(systemPrompt),
            responseSchemaHash: digest(responseSchema),
            failure,
          });
          if (normalized.retryable === false) {
            circuit.record(normalized);
            throw normalized;
          }
          if (!retrying) throw normalized;
          operationalRetries.push({ attempt, ...failure });
          await wait(retryDelayFor(normalized, retryDelayMs));
        } finally {
          clearTimeout(timer);
        }
      }
      throw new GuardianModelError("Google model retry loop exhausted unexpectedly", {
        code: "MODEL_RETRY_EXHAUSTED", retryable: false,
      });
    },
  });
}

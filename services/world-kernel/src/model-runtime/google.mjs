import { GuardianModelError } from "../guardian-model-adapter.mjs";
import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "../persistence-common.mjs";

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

function googleSchema(value) {
  if (Array.isArray(value)) return value.map(googleSchema);
  if (value === null || typeof value !== "object") return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "minLength" || key === "maxLength") continue;
    if (key === "type" && typeof item === "string") result[key] = item.toUpperCase();
    else result[key] = googleSchema(item);
  }
  return result;
}

function extractText(body) {
  const parts = body?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.filter((part) => typeof part?.text === "string").map((part) => part.text).join("\n").trim();
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
  return new GuardianModelError(`Google model endpoint failed: ${message}`, {
    code: "MODEL_HTTP_ERROR", retryable: status === 429 || status >= 500, httpStatus: status, providerErrorCode,
  });
}

export function createGoogleModelAdapter({
  environment = process.env,
  modelId,
  timeoutMs = 45_000,
  maxOutputTokens = 2_000,
  fetchImpl = globalThis.fetch,
  observer = null,
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

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`;
  const configuration = Object.freeze({ transport: "generateContent", endpoint, maxOutputTokens, structuredOutput: "json_schema" });

  return Object.freeze({
    provider: "google",
    modelId,
    configuration,
    async invoke({ systemPrompt, input, responseSchema, clientRequestId }) {
      assertNonEmpty("model systemPrompt", systemPrompt);
      assertPlainObject("model input", input);
      assertPlainObject("model responseSchema", responseSchema);
      assertId("model clientRequestId", clientRequestId);

      notify(observer, { type: "model_attempt", provider: "google", modelId, clientRequestId, attempt: 1, maximumAttempts: 1 });
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
              generationConfig: {
                maxOutputTokens,
                responseMimeType: "application/json",
                responseSchema: googleSchema(responseSchema),
              },
            }),
            signal: controller.signal,
          });
          body = await response.json();
        } catch (error) {
          if (error instanceof GuardianModelError) throw error;
          throw new GuardianModelError(`Google model request failed: ${error?.message ?? String(error)}`, {
            code: error?.name === "AbortError" ? "MODEL_TIMEOUT" : "MODEL_TRANSPORT_ERROR",
            cause: error instanceof Error ? error : undefined,
            retryable: true,
          });
        }

        if (!response.ok) throw classifyHttpFailure(response, body);
        const output = parseOutput(extractText(body));
        const provenance = {
          provider: "google",
          transport: "generateContent",
          modelId,
          providerRequestId: response.headers?.get?.("x-request-id") ?? response.headers?.get?.("x-goog-request-id") ?? null,
          configuration: { ...configuration },
          usage: {
            inputTokens: Number(body?.usageMetadata?.promptTokenCount ?? 0),
            outputTokens: Number(body?.usageMetadata?.candidatesTokenCount ?? 0),
            totalTokens: Number(body?.usageMetadata?.totalTokenCount ?? 0),
          },
        };
        notify(observer, {
          type: "model_response",
          provider: "google",
          modelId,
          clientRequestId,
          attempt: 1,
          maximumAttempts: 1,
          inputDigest: digest(input),
          promptHash: digest(systemPrompt),
          responseSchemaHash: digest(responseSchema),
          providerRequestId: provenance.providerRequestId,
          modelOutput: structuredClone(output),
          usage: structuredClone(provenance.usage),
        });
        return { output, provenance };
      } catch (error) {
        const normalized = error instanceof GuardianModelError
          ? error
          : new GuardianModelError(`Google model request failed: ${error?.message ?? String(error)}`, {
            code: "MODEL_TRANSPORT_ERROR", cause: error instanceof Error ? error : undefined, retryable: true,
          });
        notify(observer, {
          type: "operational_failure",
          provider: "google",
          modelId,
          clientRequestId,
          attempt: 1,
          maximumAttempts: 1,
          retrying: false,
          inputDigest: digest(input),
          promptHash: digest(systemPrompt),
          responseSchemaHash: digest(responseSchema),
          failure: {
            code: normalized.code,
            message: normalized.message,
            retryable: normalized.retryable,
            httpStatus: normalized.httpStatus,
            providerErrorCode: normalized.providerErrorCode,
            actionHint: normalized.actionHint,
          },
        });
        throw normalized;
      } finally {
        clearTimeout(timer);
      }
    },
  });
}

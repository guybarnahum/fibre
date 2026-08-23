import { GuardianModelError } from "../guardian-model-adapter.mjs";
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
  shouldOpenProviderCircuit,
} from "./retry-policy.mjs";

const DEFAULTS = Object.freeze({
  timeoutMs: 45_000,
  maxOutputTokens: null,
  temperature: 0,
  topP: 1,
  reasoningEffort: "none",
  retryLimit: 2,
  retryDelayMs: 2_000,
});

function apiKey(environment) {
  const value = environment.OPENAI_API_KEY ?? environment.FIBRE_GUARDIAN_OPENAI_API_KEY;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function digest(value) {
  return `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;
}

function canonicalDigest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

// OpenAI Structured Outputs supports a strict subset of JSON Schema. Keep Fibre's
// canonical schema intact for hashing, durable invocation identity and local
// admission, and project only provider-unsupported surface syntax at transport.
// `uniqueItems` is deliberately enforced by Fibre after the model response.
export function projectOpenAIStructuredOutputSchema(value) {
  if (Array.isArray(value)) return value.map(projectOpenAIStructuredOutputSchema);
  if (value === null || typeof value !== "object") return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "uniqueItems") continue;
    result[key] = projectOpenAIStructuredOutputSchema(item);
  }
  return result;
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

function extractOutputText(body) {
  if (typeof body?.output_text === "string" && body.output_text.trim() !== "") return body.output_text;
  const texts = [];
  for (const item of body?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") texts.push(content.text);
    }
  }
  return texts.join("\n").trim();
}

function parseOutput(text) {
  assertNonEmpty("OpenAI model output", text);
  try {
    const value = JSON.parse(text);
    assertPlainObject("OpenAI model output", value);
    return value;
  } catch (error) {
    throw new GuardianModelError(`OpenAI model returned unparseable structured output: ${error.message}`, {
      code: "UNPARSEABLE_MODEL_OUTPUT",
      cause: error,
      retryable: false,
    });
  }
}

function providerString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function usageFromBody(body) {
  return {
    inputTokens: Number(body?.usage?.input_tokens ?? 0),
    outputTokens: Number(body?.usage?.output_tokens ?? 0),
    totalTokens: Number(body?.usage?.total_tokens ?? 0),
  };
}

function classifyHttpFailure(response, body) {
  const httpStatus = Number(response.status);
  const providerErrorCode = providerString(body?.error?.code) || null;
  const providerErrorType = providerString(body?.error?.type) || null;
  const providerMessage = providerString(body?.error?.message) || "unknown error";
  const signature = [providerErrorCode, providerErrorType, providerMessage].filter(Boolean).join(" ").toLowerCase();
  const guidance = httpRetryGuidance(response);

  if (httpStatus === 429 && (
    signature.includes("insufficient_quota") || signature.includes("billing") ||
    signature.includes("no credits") || signature.includes("quota exhausted") ||
    signature.includes("current quota") || signature.includes("usage limit")
  )) {
    return new GuardianModelError(`OpenAI API billing quota is unavailable: ${providerMessage}`, {
      code: "MODEL_BILLING_QUOTA_EXHAUSTED",
      retryable: false,
      httpStatus,
      providerErrorCode,
      providerErrorType,
      actionHint: "Add OpenAI API credits or resolve API billing.",
    });
  }
  if (httpStatus === 401) {
    return new GuardianModelError(`OpenAI API authentication failed: ${providerMessage}`, {
      code: "MODEL_AUTHENTICATION_ERROR", retryable: false, httpStatus, providerErrorCode, providerErrorType,
      actionHint: "Check OPENAI_API_KEY.",
    });
  }
  if (httpStatus === 403) {
    return new GuardianModelError(`OpenAI API permission denied: ${providerMessage}`, {
      code: "MODEL_PERMISSION_ERROR", retryable: false, httpStatus, providerErrorCode, providerErrorType,
    });
  }
  if ([400, 404, 405, 422].includes(httpStatus)) {
    return new GuardianModelError(`OpenAI API request or model configuration is invalid (HTTP ${httpStatus}): ${providerMessage}`, {
      code: "MODEL_REQUEST_CONFIGURATION_ERROR", retryable: false, httpStatus, providerErrorCode, providerErrorType,
    });
  }
  return attachRetryGuidance(new GuardianModelError(`OpenAI model endpoint returned HTTP ${httpStatus}: ${providerMessage}`, {
    code: "MODEL_HTTP_ERROR",
    retryable: guidance.retryable,
    httpStatus,
    providerErrorCode,
    providerErrorType,
  }), guidance);
}

function normalizeError(error) {
  if (error instanceof GuardianModelError) return error;
  const retryable = isClearlyTransientTransportError(error);
  return new GuardianModelError(`OpenAI model request failed: ${error?.message ?? String(error)}`, {
    code: error?.name === "AbortError" ? "MODEL_TIMEOUT" : "MODEL_TRANSPORT_ERROR",
    cause: error instanceof Error ? error : undefined,
    retryable,
  });
}

export function createOpenAIModelAdapter({
  environment = process.env,
  modelId,
  fetchImpl = globalThis.fetch,
  observer = null,
  timeoutMs = DEFAULTS.timeoutMs,
  maxOutputTokens = DEFAULTS.maxOutputTokens,
  temperature = DEFAULTS.temperature,
  topP = DEFAULTS.topP,
  reasoningEffort = DEFAULTS.reasoningEffort,
  retryLimit = DEFAULTS.retryLimit,
  retryDelayMs = DEFAULTS.retryDelayMs,
} = {}) {
  const key = apiKey(environment);
  if (key === null) {
    throw new GuardianModelError("OpenAI model runtime requires OPENAI_API_KEY", {
      code: "MODEL_UNAVAILABLE",
      retryable: false,
      actionHint: "Set OPENAI_API_KEY in the environment or local .env file.",
    });
  }
  assertId("OpenAI modelId", modelId);
  if (typeof fetchImpl !== "function") throw new TypeError("OpenAI model fetchImpl must be a function");

  const endpoint = "https://api.openai.com/v1/responses";
  // Do not add the provider-schema projection to this object: the durable journal
  // hashes configuration, and the projection is transport compatibility rather
  // than a cognition/runtime selection change.
  const configuration = Object.freeze({
    transport: "responses",
    endpoint,
    maxOutputTokens: maxOutputTokens === null ? "auto" : maxOutputTokens,
    temperature,
    topP,
    reasoningEffort,
    retryLimit,
    retryDelayMs,
    structuredOutput: "json_schema_strict",
  });
  let terminalFailure = null;

  return Object.freeze({
    provider: "openai",
    modelId,
    configuration,
    async invoke({ systemPrompt, input, responseSchema, clientRequestId }) {
      assertNonEmpty("model systemPrompt", systemPrompt);
      assertPlainObject("model input", input);
      assertPlainObject("model responseSchema", responseSchema);
      assertId("model clientRequestId", clientRequestId);
      if (terminalFailure !== null) throw terminalFailure;

      const providerResponseSchema = projectOpenAIStructuredOutputSchema(responseSchema);
      const maximumAttempts = retryLimit + 1;
      const operationalRetries = [];
      for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
        notify(observer, {
          type: "model_attempt", provider: "openai", modelId, clientRequestId, attempt, maximumAttempts,
        });
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          let response;
          let body;
          try {
            response = await fetchImpl(endpoint, {
              method: "POST",
              headers: {
                authorization: `Bearer ${key}`,
                "content-type": "application/json",
                "x-client-request-id": clientRequestId,
              },
              body: JSON.stringify({
                model: modelId,
                store: false,
                ...(maxOutputTokens === null ? {} : { max_output_tokens: maxOutputTokens }),
                temperature,
                top_p: topP,
                reasoning: { effort: reasoningEffort },
                input: [
                  { role: "developer", content: [{ type: "input_text", text: systemPrompt }] },
                  { role: "user", content: [{ type: "input_text", text: JSON.stringify(input) }] },
                ],
                text: {
                  format: {
                    type: "json_schema",
                    name: "fibre_structured_cognition",
                    strict: true,
                    schema: providerResponseSchema,
                  },
                },
              }),
              signal: controller.signal,
            });
            try {
              body = await response.json();
            } catch (error) {
              const guidance = httpRetryGuidance(response);
              throw attachRetryGuidance(new GuardianModelError(`OpenAI model response was not JSON: ${error.message}`, {
                code: "MODEL_PROTOCOL_ERROR", cause: error, retryable: guidance.retryable,
                httpStatus: Number(response.status),
              }), guidance);
            }
          } catch (error) {
            throw normalizeError(error);
          }

          if (!response.ok) throw classifyHttpFailure(response, body);
          if (body?.status !== undefined && body.status !== "completed") {
            const incompleteReason = providerString(body?.incomplete_details?.reason) || null;
            const usage = usageFromBody(body);
            const reasonSuffix = incompleteReason === null ? "" : ` (${incompleteReason})`;
            const incomplete = new GuardianModelError(`OpenAI model response did not complete: ${body.status}${reasonSuffix}`, {
              code: "MODEL_INCOMPLETE_RESPONSE",
              retryable: false,
              providerErrorCode: incompleteReason,
              actionHint: incompleteReason === "max_output_tokens" || incompleteReason === "max_tokens"
                ? maxOutputTokens === null
                  ? "Provider returned a max-output-tokens incomplete response while using automatic output limits; inspect provider/model limits or reduce the structured output."
                  : `Output hit the ${maxOutputTokens}-token ceiling; increase the ceiling or reduce the structured output.`
                : null,
            });
            incomplete.providerUsage = usage;
            throw incomplete;
          }

          const output = parseOutput(extractOutputText(body));
          const providerRequestId = response.headers?.get?.("x-request-id") ?? body?.id ?? null;
          const usage = usageFromBody(body);
          const provenance = {
            provider: "openai",
            transport: "responses",
            modelId: body?.model ?? modelId,
            providerRequestId,
            configuration: { ...configuration },
            invocationAttempts: attempt,
            operationalRetries: structuredClone(operationalRetries),
            usage,
          };
          notify(observer, {
            type: "model_response",
            provider: "openai",
            modelId: provenance.modelId,
            clientRequestId,
            attempt,
            maximumAttempts,
            providerRequestId,
            inputDigest: digest(input),
            promptHash: digest(systemPrompt),
            promptCanonicalJsonHash: canonicalDigest(systemPrompt),
            responseSchemaHash: digest(responseSchema),
            modelOutput: structuredClone(output),
            usage,
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
            providerErrorType: normalized.providerErrorType,
            actionHint: normalized.actionHint,
            usage: normalized.providerUsage ?? null,
          };
          const retrying = normalized.retryable === true && attempt < maximumAttempts;
          notify(observer, {
            type: "operational_failure",
            provider: "openai",
            modelId,
            clientRequestId,
            attempt,
            maximumAttempts,
            retrying,
            retryDelayMs: retrying ? retryDelayFor(normalized, retryDelayMs) : null,
            inputDigest: digest(input),
            promptHash: digest(systemPrompt),
            promptCanonicalJsonHash: canonicalDigest(systemPrompt),
            responseSchemaHash: digest(responseSchema),
            failure,
          });
          if (normalized.retryable === false) {
            if (shouldOpenProviderCircuit(normalized)) terminalFailure = normalized;
            throw normalized;
          }
          if (!retrying) throw normalized;
          operationalRetries.push({ attempt, ...failure });
          await wait(retryDelayFor(normalized, retryDelayMs));
        } finally {
          clearTimeout(timer);
        }
      }
      throw new GuardianModelError("OpenAI model retry loop exhausted unexpectedly", {
        code: "MODEL_RETRY_EXHAUSTED", retryable: false,
      });
    },
  });
}

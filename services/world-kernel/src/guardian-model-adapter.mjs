import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export class GuardianModelError extends Error {
  constructor(message, { code = "MODEL_ERROR", cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "GuardianModelError";
    this.code = code;
  }
}

function extractOutputText(body) {
  if (typeof body?.output_text === "string" && body.output_text.trim() !== "") {
    return body.output_text;
  }
  const texts = [];
  if (Array.isArray(body?.output)) {
    for (const item of body.output) {
      if (!Array.isArray(item?.content)) continue;
      for (const content of item.content) {
        if (content?.type === "output_text" && typeof content.text === "string") {
          texts.push(content.text);
        }
      }
    }
  }
  return texts.join("\n").trim();
}

function parseStructuredOutput(text) {
  assertNonEmpty("Guardian model output", text);
  try {
    const value = JSON.parse(text);
    assertPlainObject("Guardian model output", value);
    return value;
  } catch (error) {
    throw new GuardianModelError(
      `Guardian model returned unparseable structured output: ${error.message}`,
      { code: "UNPARSEABLE_MODEL_OUTPUT", cause: error },
    );
  }
}

function sha256Digest(value) {
  return `sha256:${sha256(value)}`;
}

function canonicalDigest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function evidenceJournalPath() {
  const value = process.env.FIBRE_GUARDIAN_EVIDENCE_JOURNAL;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function appendEvidence(record) {
  const path = evidenceJournalPath();
  if (path === null) return;
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`, { encoding: "utf8" });
}

function wait(milliseconds) {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizeModelError(error) {
  if (error instanceof GuardianModelError) return error;
  const code = error?.name === "AbortError" ? "MODEL_TIMEOUT" : "MODEL_TRANSPORT_ERROR";
  return new GuardianModelError(`Guardian model request failed: ${error?.message ?? String(error)}`, {
    code,
    cause: error instanceof Error ? error : undefined,
  });
}

export const OPENAI_GUARDIAN_EVALUATION_CONFIGURATION = Object.freeze({
  temperature: 0,
  topP: 1,
  reasoningEffort: "none",
  operationalRetryLimit: 2,
  operationalRetryDelayMs: 2_000,
});

export function createUnavailableGuardianModelAdapter(reason = "No Guardian model adapter is configured") {
  return Object.freeze({
    provider: "unavailable",
    modelId: "unavailable",
    configuration: Object.freeze({}),
    async invoke() {
      throw new GuardianModelError(reason, { code: "MODEL_UNAVAILABLE" });
    },
  });
}

export function createOpenAIResponsesGuardianAdapter({
  apiKey,
  modelId,
  baseUrl = "https://api.openai.com/v1",
  timeoutMs = 45_000,
  maxOutputTokens = 2_000,
  temperature = OPENAI_GUARDIAN_EVALUATION_CONFIGURATION.temperature,
  topP = OPENAI_GUARDIAN_EVALUATION_CONFIGURATION.topP,
  reasoningEffort = OPENAI_GUARDIAN_EVALUATION_CONFIGURATION.reasoningEffort,
  operationalRetryLimit = OPENAI_GUARDIAN_EVALUATION_CONFIGURATION.operationalRetryLimit,
  operationalRetryDelayMs = OPENAI_GUARDIAN_EVALUATION_CONFIGURATION.operationalRetryDelayMs,
  fetchImpl = globalThis.fetch,
} = {}) {
  assertNonEmpty("OpenAI Guardian apiKey", apiKey);
  assertId("OpenAI Guardian modelId", modelId);
  assertNonEmpty("OpenAI Guardian baseUrl", baseUrl);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000) {
    throw new TypeError("OpenAI Guardian timeoutMs must be an integer of at least 1000");
  }
  if (!Number.isSafeInteger(maxOutputTokens) || maxOutputTokens < 256) {
    throw new TypeError("OpenAI Guardian maxOutputTokens must be an integer of at least 256");
  }
  if (typeof temperature !== "number" || !Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw new TypeError("OpenAI Guardian temperature must be between 0 and 2");
  }
  if (typeof topP !== "number" || !Number.isFinite(topP) || topP <= 0 || topP > 1) {
    throw new TypeError("OpenAI Guardian topP must be greater than 0 and at most 1");
  }
  if (!["none", "low", "medium", "high"].includes(reasoningEffort)) {
    throw new TypeError("OpenAI Guardian reasoningEffort is invalid for the pinned evaluation model");
  }
  if (!Number.isSafeInteger(operationalRetryLimit) || operationalRetryLimit < 0 || operationalRetryLimit > 5) {
    throw new TypeError("OpenAI Guardian operationalRetryLimit must be an integer from 0 through 5");
  }
  if (!Number.isSafeInteger(operationalRetryDelayMs) || operationalRetryDelayMs < 0 || operationalRetryDelayMs > 60_000) {
    throw new TypeError("OpenAI Guardian operationalRetryDelayMs must be an integer from 0 through 60000");
  }
  if (typeof fetchImpl !== "function") throw new TypeError("OpenAI Guardian fetchImpl must be a function");

  const endpoint = `${baseUrl.replace(/\/$/, "")}/responses`;
  const configuration = Object.freeze({
    endpoint,
    maxOutputTokens,
    structuredOutput: "json_schema_strict",
    store: false,
    tools: "none",
    temperature,
    topP,
    reasoningEffort,
    operationalRetryLimit,
    operationalRetryDelayMs,
  });

  return Object.freeze({
    provider: "openai_responses",
    modelId,
    configuration,
    async invoke({ systemPrompt, input, responseSchema, clientRequestId }) {
      assertNonEmpty("Guardian systemPrompt", systemPrompt);
      assertPlainObject("Guardian input", input);
      assertPlainObject("Guardian responseSchema", responseSchema);
      assertId("Guardian clientRequestId", clientRequestId);

      const operationalRetries = [];
      const maximumAttempts = operationalRetryLimit + 1;
      for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let response;
        let body;
        try {
          response = await fetchImpl(endpoint, {
            method: "POST",
            headers: {
              authorization: `Bearer ${apiKey}`,
              "content-type": "application/json",
              "x-client-request-id": clientRequestId,
            },
            body: JSON.stringify({
              model: modelId,
              store: false,
              max_output_tokens: maxOutputTokens,
              temperature,
              top_p: topP,
              reasoning: { effort: reasoningEffort },
              input: [
                {
                  role: "developer",
                  content: [{ type: "input_text", text: systemPrompt }],
                },
                {
                  role: "user",
                  content: [{ type: "input_text", text: JSON.stringify(input) }],
                },
              ],
              text: {
                format: {
                  type: "json_schema",
                  name: "fibre_dignity_guardian_v3",
                  strict: true,
                  schema: responseSchema,
                },
              },
            }),
            signal: controller.signal,
          });

          try {
            body = await response.json();
          } catch (error) {
            throw new GuardianModelError(
              `Guardian model response was not JSON: ${error.message}`,
              { code: "MODEL_PROTOCOL_ERROR", cause: error },
            );
          }
          if (!response.ok) {
            throw new GuardianModelError(
              `Guardian model endpoint returned HTTP ${response.status}: ${body?.error?.message ?? "unknown error"}`,
              { code: "MODEL_HTTP_ERROR" },
            );
          }
          if (body?.status !== undefined && body.status !== "completed") {
            throw new GuardianModelError(
              `Guardian model response did not complete: ${body.status}`,
              { code: "MODEL_INCOMPLETE" },
            );
          }

          const output = parseStructuredOutput(extractOutputText(body));
          const effectiveConfiguration = {
            temperature: typeof body?.temperature === "number" ? body.temperature : null,
            topP: typeof body?.top_p === "number" ? body.top_p : null,
            reasoningEffort: body?.reasoning?.effort ?? body?.reasoning_effort ?? null,
            store: typeof body?.store === "boolean" ? body.store : null,
            maxOutputTokens: Number.isFinite(Number(body?.max_output_tokens))
              ? Number(body.max_output_tokens)
              : null,
          };
          const providerRequestId = response.headers.get("x-request-id") ?? body?.id ?? null;
          const provenance = {
            provider: "openai_responses",
            modelId: body?.model ?? modelId,
            providerRequestId,
            configuration: { ...configuration },
            effectiveConfiguration,
            invocationAttempts: attempt,
            operationalRetries: structuredClone(operationalRetries),
            usage: {
              inputTokens: Number(body?.usage?.input_tokens ?? 0),
              outputTokens: Number(body?.usage?.output_tokens ?? 0),
              totalTokens: Number(body?.usage?.total_tokens ?? 0),
            },
          };

          appendEvidence({
            type: "model_response",
            cycle: "semantic_guardian_v3_acceptance_v1",
            clientRequestId,
            attempt,
            capsuleDigest: canonicalDigest(input.capsule),
            promptHash: sha256Digest(systemPrompt),
            responseSchemaHash: canonicalDigest(responseSchema),
            provider: provenance.provider,
            modelId: provenance.modelId,
            providerRequestId,
            requestedConfiguration: { ...configuration },
            effectiveConfiguration,
            operationalRetries: structuredClone(operationalRetries),
            modelOutput: structuredClone(output),
          });

          return { output, provenance };
        } catch (error) {
          const normalized = normalizeModelError(error);
          const failure = {
            attempt,
            code: normalized.code,
            message: normalized.message,
          };
          appendEvidence({
            type: "operational_failure",
            cycle: "semantic_guardian_v3_acceptance_v1",
            clientRequestId,
            attempt,
            capsuleDigest: canonicalDigest(input.capsule),
            promptHash: sha256Digest(systemPrompt),
            responseSchemaHash: canonicalDigest(responseSchema),
            failure,
          });
          if (attempt >= maximumAttempts) throw normalized;
          operationalRetries.push(failure);
          await wait(operationalRetryDelayMs);
        } finally {
          clearTimeout(timer);
        }
      }
      throw new GuardianModelError("Guardian model retry loop exhausted unexpectedly", {
        code: "MODEL_RETRY_EXHAUSTED",
      });
    },
  });
}

export function guardianModelAdapterFromEnvironment(environment = process.env) {
  const apiKey = environment.FIBRE_GUARDIAN_OPENAI_API_KEY ?? environment.OPENAI_API_KEY;
  const modelId = environment.FIBRE_GUARDIAN_MODEL_ID;
  if (typeof apiKey !== "string" || apiKey.trim() === "" || typeof modelId !== "string" || modelId.trim() === "") {
    return createUnavailableGuardianModelAdapter(
      "Semantic Dignity Guardian requires FIBRE_GUARDIAN_MODEL_ID and FIBRE_GUARDIAN_OPENAI_API_KEY or OPENAI_API_KEY",
    );
  }
  return createOpenAIResponsesGuardianAdapter({ apiKey, modelId });
}

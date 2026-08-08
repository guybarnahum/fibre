import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
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
  if (typeof fetchImpl !== "function") throw new TypeError("OpenAI Guardian fetchImpl must be a function");

  const endpoint = `${baseUrl.replace(/\/$/, "")}/responses`;
  const configuration = Object.freeze({
    endpoint,
    maxOutputTokens,
    structuredOutput: "json_schema_strict",
    store: false,
    tools: "none",
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
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
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
      } catch (error) {
        const code = error?.name === "AbortError" ? "MODEL_TIMEOUT" : "MODEL_TRANSPORT_ERROR";
        throw new GuardianModelError(`Guardian model request failed: ${error.message}`, { code, cause: error });
      } finally {
        clearTimeout(timer);
      }

      let body;
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
      return {
        output,
        provenance: {
          provider: "openai_responses",
          modelId: body?.model ?? modelId,
          providerRequestId: response.headers.get("x-request-id") ?? body?.id ?? null,
          configuration: { ...configuration },
          usage: {
            inputTokens: Number(body?.usage?.input_tokens ?? 0),
            outputTokens: Number(body?.usage?.output_tokens ?? 0),
            totalTokens: Number(body?.usage?.total_tokens ?? 0),
          },
        },
      };
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

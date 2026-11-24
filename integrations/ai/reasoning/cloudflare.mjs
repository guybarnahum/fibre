import { GuardianModelError } from "../guardian-model-adapter.mjs";
import { recoverModelOutput, schemaMiss } from "./output-recovery.mjs";
import { assertId, assertNonEmpty, assertPlainObject, canonicalJson, sha256 } from "../persistence-common.mjs";
import {
  attachRetryGuidance,
  createProviderCircuit,
  httpRetryGuidance,
  isClearlyTransientTransportError,
  retryDelayFor,
} from "./retry-policy.mjs";

// Cloudflare Workers AI as replaceable cognition. Inside a Worker it runs
// through the AI binding, beside the World; elsewhere (an operator's quality
// run) through the account's REST endpoint. Structured output is asked as a
// JSON schema, which Workers AI honours on a best-effort basis: an answer
// that misses it is unparseable and the caller's validation decides.
// Live speech is not streamed: the whole utterance arrives as one delta.
// Under Workers AI's enforced schema a model may be unable to write null: on
// Nov 20 Gemma 4 emitted whitespace to its output limit where a null was due.
// So a field that may be null is asked as optional, and an absent one is
// read back as null; the job's own validation then judges the answer.
// The binding cannot cancel a request: one we stop waiting for still runs
// and is billed. So a binding timeout is never retried, and cognition that
// may take minutes is given minutes to answer.
// Mechanical misses are the adapter's to repair, never the model's verdict:
// JSON wrapped in a code fence or a sentence is read from inside it; a string
// over its length is cut as for OpenAI (output-recovery); an answer that is
// unreadable, cut off, or misses the schema is asked once more, and both
// answers are billed and reported.

const ANSWER_ATTEMPTS = 2;
const MECHANICAL = new Set(["UNPARSEABLE_MODEL_OUTPUT", "MODEL_INCOMPLETE_RESPONSE"]);

const DEFAULTS = Object.freeze({
  timeoutMs:60_000, deferredTimeoutMs:180_000, maxOutputTokens:2_000, retryLimit:2, retryDelayMs:2_000,
});

const digest = (value) => `sha256:${sha256(typeof value === "string" ? value : canonicalJson(value))}`;
const wait = (ms) => ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));

function notify(observer, event) {
  if (typeof observer !== "function") return;
  try { observer(structuredClone(event)); } catch {}
}

// Workers AI answers in the OpenAI chat shape for current models and as
// { response } for older ones; a schema answer may already be parsed.
// With thinking off, some models (Qwen3, Nov 14) still return the whole
// answer in the reasoning field and leave content empty; then that field is
// the answer. With thinking on it is hidden thought, never the answer.
function answerOf(body, { thinking = false } = {}) {
  const result = body?.result ?? body;
  const message = result?.choices?.[0]?.message;
  const content = message?.content ?? (thinking ? null : message?.reasoning_content ?? message?.reasoning ?? null)
    ?? result?.response;
  const usage = result?.usage ?? {};
  return {
    content,
    finishReason:result?.choices?.[0]?.finish_reason ?? null,
    usage:{
      inputTokens:Number(usage.prompt_tokens ?? 0),
      cachedInputTokens:Number(usage.prompt_tokens_details?.cached_tokens ?? 0),
      outputTokens:Number(usage.completion_tokens ?? 0),
      totalTokens:Number(usage.total_tokens ?? 0),
    },
  };
}

const nonNull = (schema) => {
  if (Array.isArray(schema?.anyOf) && schema.anyOf.some((branch) => branch?.type === "null")) {
    const rest = schema.anyOf.filter((branch) => branch?.type !== "null");
    return rest.length === 1 ? rest[0] : { ...schema, anyOf: rest };
  }
  if (Array.isArray(schema?.type) && schema.type.includes("null")) {
    const rest = schema.type.filter((type) => type !== "null");
    return { ...schema, type: rest.length === 1 ? rest[0] : rest };
  }
  return null;
};

// The schema as asked of Workers AI: every nullable field optional instead.
function withOptionalNulls(schema) {
  if (schema === null || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(withOptionalNulls);
  const result = Object.fromEntries(Object.entries(schema).map(([key, value]) =>
    [key, key === "properties" ? value : withOptionalNulls(value)]));
  if (schema.properties && typeof schema.properties === "object") {
    const nullable = new Set();
    result.properties = Object.fromEntries(Object.entries(schema.properties).map(([name, property]) => {
      const present = nonNull(property);
      if (present !== null) nullable.add(name);
      return [name, withOptionalNulls(present ?? property)];
    }));
    if (Array.isArray(schema.required)) result.required = schema.required.filter((name) => !nullable.has(name));
  }
  return result;
}

// The answer as the job asked for it: an absent nullable field is null.
function withNullsRestored(value, schema) {
  if (value === null || typeof value !== "object" || schema === null || typeof schema !== "object") return value;
  const shape = nonNull(schema) ?? schema;
  if (Array.isArray(value)) return value.map((item) => withNullsRestored(item, shape.items));
  if (Array.isArray(shape.anyOf)) {
    const objectBranch = shape.anyOf.find((branch) => branch?.properties);
    return objectBranch ? withNullsRestored(value, objectBranch) : value;
  }
  if (!shape.properties) return value;
  const result = { ...value };
  for (const [name, property] of Object.entries(shape.properties)) {
    if (!(name in result)) {
      if (nonNull(property) !== null) result[name] = null;
    } else result[name] = withNullsRestored(result[name], property);
  }
  return result;
}

// The first complete JSON object in a text, wherever the model put it.
function jsonIn(text) {
  const start = text.indexOf("{");
  if (start < 0) return text;
  let depth = 0, inString = false, escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}" && (depth -= 1) === 0) return text.slice(start, index + 1);
  }
  return text;
}

function parseOutput(content, finishReason) {
  if (content !== null && typeof content === "object" && !Array.isArray(content)) return content;
  if (finishReason === "length") {
    throw new GuardianModelError("Workers AI answer was cut off at its output limit", {
      code:"MODEL_INCOMPLETE_RESPONSE", retryable:false });
  }
  try {
    assertNonEmpty("Workers AI model output", content);
    const value = JSON.parse(jsonIn(content.trim()));
    assertPlainObject("Workers AI model output", value);
    return value;
  } catch (error) {
    throw new GuardianModelError(`Workers AI returned unparseable structured output: ${error.message}`, {
      code:"UNPARSEABLE_MODEL_OUTPUT", cause:error, retryable:false });
  }
}

// One classification for both transports, from the status (REST) or the
// message (binding): the daily allocation or account limits, credentials,
// a request the model will not take, a schema it could not meet, or a
// passing failure.
function classify({ status = null, message, response = null }) {
  const text = String(message ?? "unknown error");
  const lower = text.toLowerCase();
  if (lower.includes("neuron") || lower.includes("daily free allocation") || lower.includes("account limit")) {
    return new GuardianModelError(`Workers AI allocation is unavailable: ${text}`, {
      code:"MODEL_BILLING_QUOTA_EXHAUSTED", retryable:false, httpStatus:status,
      actionHint:"Check the Cloudflare account's Workers AI plan and usage." });
  }
  if (lower.includes("json mode couldn't be met") || lower.includes("json mode could not be met")) {
    return new GuardianModelError(`Workers AI could not meet the response schema: ${text}`, {
      code:"UNPARSEABLE_MODEL_OUTPUT", retryable:false, httpStatus:status });
  }
  if (status === 401 || lower.includes("authentication")) {
    return new GuardianModelError(`Workers AI authentication failed: ${text}`, {
      code:"MODEL_AUTHENTICATION_ERROR", retryable:false, httpStatus:status,
      actionHint:"Check the Workers AI token or the World's AI binding." });
  }
  if (status === 403) {
    return new GuardianModelError(`Workers AI permission denied: ${text}`, {
      code:"MODEL_PERMISSION_ERROR", retryable:false, httpStatus:status });
  }
  if ([400, 404, 405, 422].includes(status) || lower.includes("no such model") || lower.includes("invalid input")) {
    return new GuardianModelError(`Workers AI request or model configuration is invalid: ${text}`, {
      code:"MODEL_REQUEST_CONFIGURATION_ERROR", retryable:false, httpStatus:status });
  }
  const guidance = response ? httpRetryGuidance(response) : { retryable:true, retryAfterMs:null };
  return attachRetryGuidance(new GuardianModelError(`Workers AI failed: ${text}`, {
    code:"MODEL_HTTP_ERROR", retryable:guidance.retryable, httpStatus:status }), guidance);
}

function normalizeError(error) {
  if (error instanceof GuardianModelError) return error;
  if (error?.name === "AbortError") {
    return new GuardianModelError("Workers AI request timed out", { code:"MODEL_TIMEOUT", cause:error, retryable:true });
  }
  if (isClearlyTransientTransportError(error)) {
    return new GuardianModelError(`Workers AI request failed: ${error.message}`, {
      code:"MODEL_TRANSPORT_ERROR", cause:error, retryable:true });
  }
  return classify({ message:error?.message ?? String(error) });
}

export function createCloudflareModelAdapter({
  binding = null,
  accountId = null,
  apiToken = null,
  modelId,
  maxOutputTokens = DEFAULTS.maxOutputTokens,
  timeoutMs = DEFAULTS.timeoutMs,
  deferredTimeoutMs = Math.max(timeoutMs, DEFAULTS.deferredTimeoutMs),
  retryLimit = DEFAULTS.retryLimit,
  retryDelayMs = DEFAULTS.retryDelayMs,
  temperature = null,
  thinking = false,
  fetchImpl = globalThis.fetch,
  observer = null,
  now = Date.now,
} = {}) {
  assertNonEmpty("Workers AI modelId", modelId);
  const viaBinding = typeof binding?.run === "function";
  if (!viaBinding && (typeof accountId !== "string" || typeof apiToken !== "string")) {
    throw new GuardianModelError("Workers AI needs the World's AI binding, or an account id and API token", {
      code:"MODEL_UNAVAILABLE", retryable:false,
      actionHint:"Bind AI in the Worker, or set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN." });
  }
  const endpoint = viaBinding ? null
    : `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${modelId}`;
  const transport = viaBinding ? "workers-ai-binding" : "workers-ai-rest";
  const configuration = Object.freeze({ transport, maxOutputTokens, retryLimit, retryDelayMs, thinking,
    temperature, structuredOutput:"json_schema-optional-nulls" });
  const circuit = createProviderCircuit({ now });

  async function run(body, signal) {
    if (viaBinding) {
      return Promise.race([binding.run(modelId, body), new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name:"AbortError" })), { once:true });
      })]);
    }
    const response = await fetchImpl(endpoint, {
      method:"POST",
      headers:{ "content-type":"application/json", authorization:`Bearer ${apiToken}` },
      body:JSON.stringify(body),
      signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      throw classify({ status:Number(response.status), response,
        message:payload?.errors?.map((item) => item?.message).filter(Boolean).join("; ") || `HTTP ${response.status}` });
    }
    return payload;
  }

  const request = ({ systemPrompt, input, responseSchema = null }) => ({
    messages:[{ role:"system", content:systemPrompt }, { role:"user", content:JSON.stringify(input) }],
    max_tokens:maxOutputTokens,
    ...(temperature === null ? {} : { temperature }),
    chat_template_kwargs:{ enable_thinking:thinking },
    ...(responseSchema === null ? {} : {
      response_format:{ type:"json_schema", json_schema:{ name:"fibre_cognition", schema:withOptionalNulls(responseSchema) } },
    }),
  });

  async function attempt(body, clientRequestId, context, waitMs = timeoutMs) {
    const maximumAttempts = retryLimit + 1;
    const operationalRetries = [];
    for (let attemptNumber = 1; attemptNumber <= maximumAttempts; attemptNumber += 1) {
      circuit.check();
      notify(observer, { type:"model_attempt", provider:"cloudflare", modelId, clientRequestId,
        attempt:attemptNumber, maximumAttempts });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), waitMs);
      try {
        const answer = answerOf(await run(body, controller.signal), { thinking });
        return { answer, attemptNumber, operationalRetries };
      } catch (error) {
        const normalized = normalizeError(error);
        const stillRunning = viaBinding && normalized.code === "MODEL_TIMEOUT";
        const retrying = normalized.retryable === true && !stillRunning && attemptNumber < maximumAttempts;
        notify(observer, { type:"operational_failure", provider:"cloudflare", modelId, clientRequestId,
          attempt:attemptNumber, maximumAttempts, retrying, ...context,
          failure:{ code:normalized.code, message:normalized.message, retryable:normalized.retryable } });
        circuit.record(normalized);
        if (!retrying) throw normalized;
        operationalRetries.push({ attempt:attemptNumber, code:normalized.code, message:normalized.message });
        await wait(retryDelayFor(normalized, retryDelayMs));
      } finally {
        clearTimeout(timer);
      }
    }
    throw new GuardianModelError("Workers AI retry loop exhausted unexpectedly", { code:"MODEL_RETRY_EXHAUSTED", retryable:false });
  }

  const provenance = (answer, attemptNumber, operationalRetries) => ({
    provider:"cloudflare",
    transport,
    modelId,
    providerRequestId:null,
    configuration:{ ...configuration },
    invocationAttempts:attemptNumber,
    operationalRetries:structuredClone(operationalRetries),
    usage:answer.usage,
  });

  return Object.freeze({
    provider:"cloudflare",
    modelId,
    configuration,
    async invoke({ systemPrompt, input, responseSchema, clientRequestId, latency = "live" }) {
      assertNonEmpty("model systemPrompt", systemPrompt);
      assertPlainObject("model input", input);
      assertPlainObject("model responseSchema", responseSchema);
      assertId("model clientRequestId", clientRequestId);
      const context = { inputDigest:digest(input), promptHash:digest(systemPrompt), responseSchemaHash:digest(responseSchema) };
      const missed = [], spent = [];
      for (let answerAttempt = 1; ; answerAttempt += 1) {
        try {
          // Workers AI may itself refuse an answer that could not meet the schema.
          const { answer, attemptNumber, operationalRetries } =
            await attempt(request({ systemPrompt, input, responseSchema }), clientRequestId, context,
              latency === "minutes" ? deferredTimeoutMs : timeoutMs);
          spent.push(answer.usage);
          const { output, recoveries } = recoverModelOutput({
            output:withNullsRestored(parseOutput(answer.content, answer.finishReason), responseSchema), responseSchema });
          const miss = schemaMiss(output, responseSchema);
          if (miss !== null) throw new GuardianModelError(`Workers AI answer missed the response schema at ${miss}`, {
            code:"UNPARSEABLE_MODEL_OUTPUT", retryable:false });
          notify(observer, { type:"model_response", provider:"cloudflare", modelId, clientRequestId,
            attempt:attemptNumber, ...context, modelOutput:structuredClone(output), usage:answer.usage });
          const usage = Object.fromEntries(Object.keys(answer.usage).map((key) => [key, spent.reduce((sum, item) => sum + item[key], 0)]));
          return { output, provenance:{ ...provenance({ ...answer, usage }, attemptNumber, operationalRetries),
            ...(recoveries.length ? { outputRecoveries:recoveries } : {}),
            ...(missed.length ? { answersAskedAgain:missed } : {}) } };
        } catch (error) {
          if (!(error instanceof GuardianModelError) || !MECHANICAL.has(error.code) || answerAttempt >= ANSWER_ATTEMPTS) throw error;
          missed.push({ code:error.code, message:error.message });
          notify(observer, { type:"operational_failure", provider:"cloudflare", modelId, clientRequestId, attempt:answerAttempt,
            maximumAttempts:ANSWER_ATTEMPTS, retrying:true, ...context,
            failure:{ code:error.code, message:error.message, retryable:true } });
        }
      }
    },
    async *streamExpression({ systemPrompt, input, clientRequestId, signal = null }) {
      assertNonEmpty("expression systemPrompt", systemPrompt);
      assertPlainObject("expression input", input);
      assertId("expression clientRequestId", clientRequestId);
      if (signal?.aborted) return;
      const { answer, attemptNumber, operationalRetries } =
        await attempt(request({ systemPrompt, input }), clientRequestId, {});
      if (signal?.aborted) return;
      if (answer.finishReason === "length") {
        throw new GuardianModelError("Workers AI expression was cut off at its output limit", {
          code:"MODEL_INCOMPLETE_RESPONSE", retryable:false });
      }
      const text = typeof answer.content === "string" ? answer.content : JSON.stringify(answer.content ?? "");
      if (text !== "") yield Object.freeze({ type:"expression_delta", text });
      yield Object.freeze({ type:"expression_complete", provenance:Object.freeze(provenance(answer, attemptNumber, operationalRetries)) });
    },
  });
}

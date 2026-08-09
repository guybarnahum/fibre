import assert from "node:assert/strict";
import test from "node:test";

import { createGoogleModelAdapter } from "../src/model-runtime/google.mjs";
import { createOpenAIModelAdapter } from "../src/model-runtime/openai.mjs";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["decision"],
  properties: { decision: { type: "string", enum: ["accept", "refuse"] } },
};

function headers(values = {}) {
  const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return { get: (name) => normalized[name.toLowerCase()] ?? null };
}

function response(status, body, headerValues = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headers(headerValues),
    async json() { return structuredClone(body); },
  };
}

function openAICompleted() {
  return {
    id: "resp_retry_test",
    status: "completed",
    model: "gpt-test",
    output_text: '{"decision":"accept"}',
    usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
  };
}

function googleCompleted() {
  return {
    candidates: [{ content: { parts: [{ text: '{"decision":"accept"}' }] } }],
    usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
  };
}

function invoke(adapter) {
  return adapter.invoke({
    systemPrompt: "Return one bounded decision.",
    input: { item: "value" },
    responseSchema: SCHEMA,
    clientRequestId: "model-runtime-retry-test",
  });
}

test("OpenAI retries a clearly transient 503 and then succeeds", async () => {
  let calls = 0;
  const events = [];
  const adapter = createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "test-key" },
    modelId: "gpt-test",
    retryDelayMs: 0,
    observer: (event) => events.push(event),
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return response(503, { error: { message: "temporarily unavailable" } });
      return response(200, openAICompleted());
    },
  });
  const result = await invoke(adapter);
  assert.equal(calls, 2);
  assert.deepEqual(result.output, { decision: "accept" });
  assert.deepEqual(events.map((event) => event.type), [
    "model_attempt", "operational_failure", "model_attempt", "model_response",
  ]);
  assert.equal(events[1].retrying, true);
});

test("OpenAI honors explicit Retry-After even for a status not otherwise retryable", async () => {
  let calls = 0;
  const events = [];
  const adapter = createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "test-key" },
    modelId: "gpt-test",
    retryDelayMs: 0,
    observer: (event) => events.push(event),
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return response(409, { error: { message: "retry this request" } }, { "retry-after": "0" });
      return response(200, openAICompleted());
    },
  });
  await invoke(adapter);
  assert.equal(calls, 2);
  assert.equal(events[1].retrying, true);
  assert.equal(events[1].retryDelayMs, 0);
  assert.equal(events[1].failure.retryAfterMs, 0);
});

test("OpenAI does not retry unknown HTTP, malformed success, or arbitrary transport failures", async () => {
  for (const scenario of [
    async () => response(501, { error: { message: "not implemented" } }),
    async () => ({ ok: true, status: 200, headers: headers(), async json() { throw new SyntaxError("bad json"); } }),
    async () => { throw new Error("arbitrary local failure"); },
  ]) {
    let calls = 0;
    const adapter = createOpenAIModelAdapter({
      environment: { OPENAI_API_KEY: "test-key" },
      modelId: "gpt-test",
      retryDelayMs: 0,
      fetchImpl: async () => { calls += 1; return scenario(); },
    });
    await assert.rejects(() => invoke(adapter), (error) => error?.retryable === false);
    assert.equal(calls, 1);
  }
});

test("OpenAI incomplete response is request-scoped, reports reason, and does not block the next cognition", async () => {
  let calls = 0;
  const events = [];
  const adapter = createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "test-key" },
    modelId: "gpt-test",
    observer: (event) => events.push(event),
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return response(200, {
          id: "resp_incomplete_test",
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
          usage: { input_tokens: 10, output_tokens: 3000, total_tokens: 3010 },
        });
      }
      return response(200, openAICompleted());
    },
  });

  await assert.rejects(
    () => invoke(adapter),
    (error) => error?.code === "MODEL_INCOMPLETE_RESPONSE"
      && error?.providerErrorCode === "max_output_tokens"
      && /3000-token ceiling/.test(error?.actionHint ?? ""),
  );
  assert.equal(calls, 1);
  assert.equal(events[1].failure.usage.outputTokens, 3000);

  const result = await invoke(adapter);
  assert.equal(calls, 2, "a request-scoped incomplete response must not open the provider circuit");
  assert.deepEqual(result.output, { decision: "accept" });
});

test("OpenAI provider-wide authentication failure opens the provider circuit", async () => {
  let calls = 0;
  const adapter = createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "test-key" },
    modelId: "gpt-test",
    fetchImpl: async () => {
      calls += 1;
      return response(401, { error: { message: "bad key" } });
    },
  });

  await assert.rejects(() => invoke(adapter), (error) => error?.code === "MODEL_AUTHENTICATION_ERROR");
  await assert.rejects(() => invoke(adapter), (error) => error?.code === "MODEL_AUTHENTICATION_ERROR");
  assert.equal(calls, 1, "provider-wide terminal failures should fail fast after the first provider response");
});

test("OpenAI retries a timeout because it is a clearly transient transport failure", async () => {
  let calls = 0;
  const adapter = createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "test-key" },
    modelId: "gpt-test",
    retryDelayMs: 0,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        const error = new Error("timed out");
        error.name = "AbortError";
        throw error;
      }
      return response(200, openAICompleted());
    },
  });
  await invoke(adapter);
  assert.equal(calls, 2);
});

test("Google retries only clearly recoverable failures", async () => {
  let transientCalls = 0;
  const transient = createGoogleModelAdapter({
    environment: { GEMINI_API_KEY: "test-key" },
    modelId: "gemini-test",
    retryDelayMs: 0,
    fetchImpl: async () => {
      transientCalls += 1;
      if (transientCalls === 1) return response(503, { error: { message: "temporarily unavailable" } });
      return response(200, googleCompleted());
    },
  });
  await invoke(transient);
  assert.equal(transientCalls, 2);

  let permanentCalls = 0;
  const permanent = createGoogleModelAdapter({
    environment: { GEMINI_API_KEY: "test-key" },
    modelId: "gemini-test",
    retryDelayMs: 0,
    fetchImpl: async () => {
      permanentCalls += 1;
      if (permanentCalls === 1) return response(501, { error: { message: "not implemented" } });
      return response(200, googleCompleted());
    },
  });
  await assert.rejects(() => invoke(permanent), (error) => error?.retryable === false);
  assert.equal(permanentCalls, 1);
  const result = await invoke(permanent);
  assert.equal(permanentCalls, 2, "request-scoped terminal failures must not poison the Google adapter");
  assert.deepEqual(result.output, { decision: "accept" });
});

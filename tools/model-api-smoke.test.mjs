import assert from "node:assert/strict";
import test from "node:test";

import {
  MODEL_SMOKE_TOKEN,
  parseModelSmokeArgs,
  runModelApiSmoke,
  validateModelSmokeOutput,
} from "./model-api-smoke.mjs";

test("model API smoke requires explicit provider and model", () => {
  assert.deepEqual(parseModelSmokeArgs(["--provider", "openai", "--model", "gpt-test"]), {
    provider: "openai",
    model: "gpt-test",
    help: false,
  });
  assert.deepEqual(parseModelSmokeArgs(["--provider=google", "--model=gemma-test"]), {
    provider: "google",
    model: "gemma-test",
    help: false,
  });
  assert.throws(() => parseModelSmokeArgs(["--provider", "openai"]), /--model is required/);
  assert.throws(() => parseModelSmokeArgs(["--provider", "other", "--model", "x"]), /openai or google/);
});

test("model API smoke validates the exact tiny result", () => {
  assert.equal(validateModelSmokeOutput({ status: "ok", token: MODEL_SMOKE_TOKEN }), true);
  assert.throws(() => validateModelSmokeOutput({ status: "ok", token: "wrong" }));
});

test("OpenAI live-smoke path validates Responses API adapter shape", async () => {
  let request = null;
  const result = await runModelApiSmoke({
    provider: "openai",
    model: "gpt-test",
    environment: { OPENAI_API_KEY: "test-key" },
    fetchImpl: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return {
        ok: true,
        status: 200,
        headers: { get: () => "req-openai" },
        async json() {
          return {
            id: "resp_smoke",
            status: "completed",
            model: "gpt-test",
            output_text: JSON.stringify({ status: "ok", token: MODEL_SMOKE_TOKEN }),
            usage: { input_tokens: 5, output_tokens: 4, total_tokens: 9 },
          };
        },
      };
    },
  });
  assert.match(request.url, /\/v1\/responses$/);
  assert.equal(request.body.model, "gpt-test");
  assert.equal(request.body.text.format.type, "json_schema");
  assert.equal(result.status, "passed");
  assert.equal(result.usage.totalTokens, 9);
});

test("Google live-smoke path validates generateContent adapter shape", async () => {
  let request = null;
  const result = await runModelApiSmoke({
    provider: "google",
    model: "gemma-test",
    environment: { GEMINI_API_KEY: "test-key" },
    fetchImpl: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return {
        ok: true,
        status: 200,
        headers: { get: () => "req-google" },
        async json() {
          return {
            candidates: [{ content: { parts: [{ text: JSON.stringify({ status: "ok", token: MODEL_SMOKE_TOKEN }) }] } }],
            usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 4, totalTokenCount: 9 },
          };
        },
      };
    },
  });
  assert.match(request.url, /gemma-test:generateContent$/);
  assert.equal(request.init.headers["x-goog-api-key"], "test-key");
  assert.equal(request.body.generationConfig.responseMimeType, "application/json");
  assert.equal(request.body.generationConfig.responseSchema.type, "OBJECT");
  assert.equal(Object.hasOwn(request.body.generationConfig.responseSchema, "additionalProperties"), false);
  assert.equal(Object.hasOwn(request.body.generationConfig, "responseFormat"), false);
  assert.equal(result.status, "passed");
  assert.equal(result.usage.totalTokens, 9);
});

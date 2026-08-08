import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  DEFAULT_MODEL_CONFIG_URL,
  createModelRuntime,
  parseModelRoutingYaml,
} from "../src/model-runtime/model-runtime.mjs";

test("model routing YAML contains only reasoning-block provider and model choices", () => {
  const parsed = parseModelRoutingYaml(`
version: 1
reasoning:
  dignity_guardian:
    provider: openai
    model: gpt-5.1-2025-11-13
  history_appraisal:
    provider: google
    model: gemini-3.5-flash
`);
  assert.deepEqual(parsed, {
    version: 1,
    reasoning: {
      dignity_guardian: { provider: "openai", model: "gpt-5.1-2025-11-13" },
      history_appraisal: { provider: "google", model: "gemini-3.5-flash" },
    },
  });
  assert.throws(
    () => parseModelRoutingYaml("version: 1\nreasoning:\n  x:\n    provider: openai\n    api_key: nope\n    model: x\n"),
    /unsupported key api_key/,
  );
});

test("repository model routing config selects the Guardian baseline without embedding secrets", () => {
  const text = readFileSync(DEFAULT_MODEL_CONFIG_URL, "utf8");
  assert.doesNotMatch(text, /api[_-]?key|secret|token/i);
  const config = parseModelRoutingYaml(text);
  assert.deepEqual(config.reasoning.dignity_guardian, {
    provider: "openai",
    model: "gpt-5.1-2025-11-13",
  });
});

test("runtime changes provider by config only and Google translates the shared invoke contract", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-model-runtime-test-"));
  const configPath = join(directory, "models.yaml");
  writeFileSync(configPath, "version: 1\nreasoning:\n  dignity_guardian:\n    provider: google\n    model: gemini-test\n");
  let request = null;
  const runtime = createModelRuntime({
    environment: { GEMINI_API_KEY: "test-key" },
    configUrl: configPath,
    fetchImpl: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return {
        ok: true,
        status: 200,
        headers: { get: () => "google-request-1" },
        async json() {
          return {
            candidates: [{ content: { parts: [{ text: '{"decision":"accept"}' }] } }],
            usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 3, totalTokenCount: 14 },
          };
        },
      };
    },
  });

  assert.deepEqual(runtime.selectionForBlock("dignity_guardian"), {
    provider: "google",
    modelId: "gemini-test",
  });
  const adapter = runtime.forBlock("dignity_guardian");
  const result = await adapter.invoke({
    systemPrompt: "Return the bounded result.",
    input: { item: "value" },
    responseSchema: {
      type: "object",
      additionalProperties: false,
      required: ["decision"],
      properties: { decision: { type: "string", enum: ["accept", "refuse"], minLength: 1 } },
    },
    clientRequestId: "model-runtime-test",
  });

  assert.match(request.url, /gemini-test:generateContent$/);
  assert.equal(request.init.headers["x-goog-api-key"], "test-key");
  assert.equal(request.body.systemInstruction.parts[0].text, "Return the bounded result.");
  assert.equal(request.body.generationConfig.responseMimeType, "application/json");
  assert.equal(request.body.generationConfig.responseSchema.type, "OBJECT");
  assert.equal(request.body.generationConfig.responseSchema.properties.decision.type, "STRING");
  assert.equal(Object.hasOwn(request.body.generationConfig.responseSchema.properties.decision, "minLength"), false);
  assert.deepEqual(result.output, { decision: "accept" });
  assert.equal(result.provenance.provider, "google");
  assert.equal(result.provenance.modelId, "gemini-test");
  assert.equal(result.provenance.usage.totalTokens, 14);
  rmSync(directory, { recursive: true, force: true });
});

test("runtime reads credentials only from the environment", () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-model-runtime-key-test-"));
  const configPath = join(directory, "models.yaml");
  writeFileSync(configPath, "version: 1\nreasoning:\n  dignity_guardian:\n    provider: google\n    model: gemini-test\n");
  const runtime = createModelRuntime({ environment: {}, configUrl: configPath, fetchImpl: async () => null });
  assert.throws(
    () => runtime.forBlock("dignity_guardian"),
    (error) => error?.code === "MODEL_UNAVAILABLE" && /GEMINI_API_KEY/.test(error.message),
  );
  rmSync(directory, { recursive: true, force: true });
});

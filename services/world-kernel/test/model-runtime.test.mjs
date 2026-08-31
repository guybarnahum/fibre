import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createLocalReasoningAdapter,
  localReasoningSelection,
} from "../../../infra/deployments/local-reasoning.mjs";
import {
  parseDeploymentManifest,
  resolveServiceDeployment,
} from "../../../infra/deployments/manifest.mjs";
import { selectReasoningIntegration } from "../../../infra/deployments/integration-selection.mjs";

const LOCAL_MANIFEST_URL = new URL("../../../infra/deployments/environments/local.yaml", import.meta.url);

function response(body, { status = 200, requestId = "req_test" } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => requestId },
    async json() { return structuredClone(body); },
  };
}

test("deployment YAML owns reasoning provider/model selection without embedding secret values", () => {
  const text = readFileSync(LOCAL_MANIFEST_URL, "utf8");
  assert.doesNotMatch(text, /sk-[A-Za-z0-9]|AIza[A-Za-z0-9]/);
  const manifest = parseDeploymentManifest(text);
  const worldKernel = resolveServiceDeployment(manifest, "world-kernel");
  assert.equal(worldKernel.infra.driver, "local-v1");
  assert.deepEqual(worldKernel.infra.capabilities, ["state", "scheduler"]);
  assert.deepEqual(
    {
      provider: worldKernel.integrations.dignityGuardian.provider,
      modelId: worldKernel.integrations.dignityGuardian.config.model,
      secretName: worldKernel.integrations.dignityGuardian.secrets.apiKey,
    },
    {
      provider: "openai",
      modelId: "gpt-5.1-2025-11-13",
      secretName: "OPENAI_API_KEY",
    },
  );
});

test("local reasoning selection exposes the World Kernel Guardian baseline", () => {
  assert.deepEqual(localReasoningSelection(), {
    provider: "openai",
    modelId: "gpt-5.1-2025-11-13",
  });
});

test("explicit development model override changes only the selected model", () => {
  assert.deepEqual(localReasoningSelection({ model: "gpt-cli" }), {
    provider: "openai",
    modelId: "gpt-cli",
  });
  assert.throws(() => localReasoningSelection({ model: "   " }), /must be a non-empty string/);
});

test("deployment-selected OpenAI reasoning accepts generic cognition input and emits progress", async () => {
  let calls = 0;
  const events = [];
  const adapter = createLocalReasoningAdapter({
    environment: { OPENAI_API_KEY: "test-key" },
    model: "gpt-test",
    observer: (event) => events.push(event),
    fetchImpl: async () => {
      calls += 1;
      return response({
        id: "resp_test",
        status: "completed",
        model: "gpt-test",
        output_text: '{"decision":"accept"}',
        usage: { input_tokens: 11, output_tokens: 3, total_tokens: 14 },
      }, { requestId: "openai-request-1" });
    },
  });

  const result = await adapter.invoke({
    systemPrompt: "Return the bounded result.",
    input: { contract: { version: 4 }, evidence: [{ ref: "thread:identity", text: "Mina" }] },
    responseSchema: {
      type: "object",
      additionalProperties: false,
      required: ["decision"],
      properties: { decision: { type: "string", enum: ["accept", "refuse"] } },
    },
    clientRequestId: "guardian-v4-dev:no-capsule",
  });

  assert.equal(calls, 1);
  assert.deepEqual(result.output, { decision: "accept" });
  assert.equal(result.provenance.provider, "openai");
  assert.deepEqual(events.map((event) => event.type), ["model_attempt", "model_response"]);
  assert.equal(events[0].attempt, 1);
  assert.equal(events[0].maximumAttempts, 3);
  assert.match(events[1].inputDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(Object.hasOwn(events[1], "capsuleDigest"), false);
});

test("reasoning provider changes by deployment selection and Google translates the shared invoke contract", async () => {
  const manifest = parseDeploymentManifest(`
schema: fibre-deployment
environment: test-google
runtimes:
  node:
    provider: local-node
infra:
  local:
    provider: local
    driver: local-v1
    capabilities:
      - state
integrations:
  guardian-google:
    kind: ai.reasoning
    provider: google
    config:
      model: gemini-test
    secrets:
      apiKey: GEMINI_API_KEY
services:
  world-kernel:
    runtime: node
    integrations:
      dignityGuardian: guardian-google
`);
  const selected = resolveServiceDeployment(manifest, "world-kernel").integrations.dignityGuardian;
  let request = null;
  const events = [];
  const adapter = selectReasoningIntegration(selected, {
    environment: { GEMINI_API_KEY: "test-key" },
    observer: (event) => events.push(event),
    fetchImpl: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return response({
        candidates: [{ content: { parts: [{ text: '{"decision":"accept"}' }] } }],
        usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 3, totalTokenCount: 14 },
      }, { requestId: "google-request-1" });
    },
  });

  assert.equal(adapter.provider, "google");
  assert.equal(adapter.modelId, "gemini-test");
  const result = await adapter.invoke({
    systemPrompt: "Return the bounded result.",
    input: { item: "value" },
    responseSchema: {
      type: "object",
      additionalProperties: false,
      required: ["decision"],
      properties: { decision: { type: "string", enum: ["accept", "refuse"], minLength: 1 } },
    },
    clientRequestId: "deployment-reasoning-test",
  });

  assert.match(request.url, /gemini-test:generateContent$/);
  assert.equal(request.init.headers["x-goog-api-key"], "test-key");
  assert.equal(request.body.systemInstruction.parts[0].text, "Return the bounded result.");
  assert.equal(request.body.generationConfig.responseMimeType, "application/json");
  assert.equal(request.body.generationConfig.responseSchema.type, "OBJECT");
  assert.equal(Object.hasOwn(request.body.generationConfig.responseSchema, "additionalProperties"), false);
  assert.equal(request.body.generationConfig.responseSchema.properties.decision.type, "STRING");
  assert.equal(Object.hasOwn(request.body.generationConfig.responseSchema.properties.decision, "minLength"), false);
  assert.equal(Object.hasOwn(request.body.generationConfig, "responseFormat"), false);
  assert.deepEqual(result.output, { decision: "accept" });
  assert.equal(result.provenance.provider, "google");
  assert.equal(result.provenance.modelId, "gemini-test");
  assert.equal(result.provenance.configuration.structuredOutput, "json_schema");
  assert.equal(result.provenance.usage.totalTokens, 14);
  assert.deepEqual(events.map((event) => event.type), ["model_attempt", "model_response"]);
});

test("deployment-selected reasoning reads credentials only from the named environment variable", () => {
  assert.throws(
    () => createLocalReasoningAdapter({ environment: {}, fetchImpl: async () => null }),
    /OPENAI_API_KEY/,
  );
});

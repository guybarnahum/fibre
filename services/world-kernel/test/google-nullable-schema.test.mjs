import assert from "node:assert/strict";
import test from "node:test";

import { createGoogleModelAdapter } from "../src/model-runtime/google.mjs";

test("Google generateContent translates JSON-Schema nullable union at the provider boundary", async () => {
  let request = null;
  const adapter = createGoogleModelAdapter({
    environment: { GEMINI_API_KEY: "test-key" },
    modelId: "gemini-test",
    fetchImpl: async (url, init) => {
      request = { url, body: JSON.parse(init.body) };
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        async json() {
          return {
            candidates: [{ content: { parts: [{ text: '{"structureRef":null}' }] } }],
            usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
          };
        },
      };
    },
  });

  const result = await adapter.invoke({
    systemPrompt: "Return the test object.",
    input: { test: true },
    responseSchema: {
      type: "object",
      additionalProperties: false,
      required: ["structureRef"],
      properties: { structureRef: { type: ["string", "null"] } },
    },
    clientRequestId: "google-nullable-schema-test",
  });

  assert.match(request.url, /gemini-test:generateContent$/);
  assert.equal(request.body.generationConfig.responseSchema.properties.structureRef.type, "STRING");
  assert.equal(request.body.generationConfig.responseSchema.properties.structureRef.nullable, true);
  assert.deepEqual(result.output, { structureRef: null });
});

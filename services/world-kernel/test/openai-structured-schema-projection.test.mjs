import assert from "node:assert/strict";
import test from "node:test";

import {
  assertOpenAIProjectedSchemaConstraints,
  createOpenAIModelAdapter,
  projectOpenAIStructuredOutputSchema,
} from "../src/model-runtime/openai.mjs";
import { assertUniquePassBEpisodeRefs } from "../src/genesis-pass-b-domain.mjs";
import {
  GENESIS_PASS_B_RESPONSE_SCHEMA,
  passBResponseSchemaHash,
} from "../src/genesis-pass-b-prompts.mjs";

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "req_schema_projection_test" },
    async json() { return structuredClone(body); },
  };
}

test("OpenAI transport projects only unsupported canonical constraints without mutating Pass-B schema", async () => {
  const frozenHash = passBResponseSchemaHash();
  const canonicalBefore = structuredClone(GENESIS_PASS_B_RESPONSE_SCHEMA);
  const projected = projectOpenAIStructuredOutputSchema(GENESIS_PASS_B_RESPONSE_SCHEMA);

  assert.equal(GENESIS_PASS_B_RESPONSE_SCHEMA.properties.episodeRefs.uniqueItems, true);
  assert.equal(GENESIS_PASS_B_RESPONSE_SCHEMA.properties.rememberedContent.maxLength, 600);
  assert.equal(GENESIS_PASS_B_RESPONSE_SCHEMA.properties.uncertainty.items.maxLength, 120);
  assert.equal(GENESIS_PASS_B_RESPONSE_SCHEMA.properties.uncertainty.maxItems, 8);
  assert.equal(Object.hasOwn(projected.properties.episodeRefs, "uniqueItems"), false);
  assert.equal(Object.hasOwn(projected.properties.rememberedContent, "maxLength"), false);
  assert.equal(Object.hasOwn(projected.properties.uncertainty.items, "maxLength"), false);
  assert.equal(projected.properties.uncertainty.maxItems, 8);
  assert.deepEqual(GENESIS_PASS_B_RESPONSE_SCHEMA, canonicalBefore);
  assert.equal(passBResponseSchemaHash(), frozenHash);

  let requestBody = null;
  const adapter = createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "test-key" },
    modelId: "gpt-test",
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return response(200, {
        id: "resp_schema_projection_test",
        status: "completed",
        model: "gpt-test",
        output_text: JSON.stringify({
          outcome: "not_remembered",
          episodeRefs: [],
          rememberedContent: null,
          uncertainty: [],
        }),
        usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
      });
    },
  });

  await adapter.invoke({
    systemPrompt: "Return one Pass-B record.",
    input: { fixture: true },
    responseSchema: GENESIS_PASS_B_RESPONSE_SCHEMA,
    clientRequestId: "openai-schema-projection-test",
  });

  const sent = requestBody.text.format.schema;
  assert.equal(Object.hasOwn(sent.properties.episodeRefs, "uniqueItems"), false);
  assert.equal(Object.hasOwn(sent.properties.rememberedContent, "maxLength"), false);
  assert.equal(Object.hasOwn(sent.properties.uncertainty.items, "maxLength"), false);
  assert.equal(sent.properties.uncertainty.maxItems, 8);
  assert.equal(passBResponseSchemaHash(), frozenHash, "transport projection must not change Fibre canonical schema identity");
});

test("OpenAI adapter re-enforces projected uniqueItems and string-length constraints locally", () => {
  assert.throws(
    () => assertOpenAIProjectedSchemaConstraints({
      outcome: "remembered",
      episodeRefs: ["ep_1", "ep_1"],
      rememberedContent: "A remembered event.",
      uncertainty: [],
    }, GENESIS_PASS_B_RESPONSE_SCHEMA),
    (error) => error?.code === "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR" && error?.providerErrorCode === "uniqueItems",
  );

  assert.throws(
    () => assertOpenAIProjectedSchemaConstraints({
      outcome: "remembered",
      episodeRefs: ["ep_1"],
      rememberedContent: "x".repeat(601),
      uncertainty: [],
    }, GENESIS_PASS_B_RESPONSE_SCHEMA),
    (error) => error?.code === "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR" && error?.providerErrorCode === "maxLength",
  );

  assert.throws(
    () => assertOpenAIProjectedSchemaConstraints({
      outcome: "remembered",
      episodeRefs: ["ep_1"],
      rememberedContent: "A remembered event.",
      uncertainty: ["x".repeat(121)],
    }, GENESIS_PASS_B_RESPONSE_SCHEMA),
    (error) => error?.code === "MODEL_OUTPUT_SCHEMA_CONSTRAINT_ERROR" && error?.providerErrorCode === "maxLength",
  );
});

test("Pass-B domain independently rejects duplicate episodeRefs after provider projection", () => {
  assert.throws(
    () => assertUniquePassBEpisodeRefs(["ep_1", "ep_1"]),
    /must contain unique references/,
  );
  assert.deepEqual(assertUniquePassBEpisodeRefs(["ep_1", "ep_2"]), ["ep_1", "ep_2"]);
});

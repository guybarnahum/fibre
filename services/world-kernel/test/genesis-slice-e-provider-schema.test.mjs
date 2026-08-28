import assert from "node:assert/strict";
import test from "node:test";

import { createGoogleModelAdapter } from "../../../integrations/models/google.mjs";
import { createOpenAIModelAdapter } from "../../../integrations/models/openai.mjs";
import { GENESIS_RICH_PASS_A_RESPONSE_SCHEMA } from "../src/genesis-rich-life-episode.mjs";

function headers(values = {}) {
  const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return { get: (name) => normalized[name.toLowerCase()] ?? null };
}

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headers(),
    async json() { return structuredClone(body); },
  };
}

const NULL_ENCOUNTER_OUTPUT = {
  episode: {
    episodeId: "ep_provider_schema",
    occurredAt: "2009-01-01T00:00:00Z",
    ageAtEvent: 12,
    placeRef: "place_provider_schema",
    participantRefs: ["thr_provider_schema"],
    observableAction: "The student returns one book to a shelf and leaves the library.",
    structureRef: null,
    introducedParticipants: [],
    intellectualEncounter: null,
  },
};

test("Slice E rich schema reaches OpenAI strict structured output with intellectualEncounter required and nullable", async () => {
  let requestBody = null;
  const adapter = createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "test-key" },
    modelId: "gpt-test",
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return response(200, {
        id: "resp_slice_e_schema",
        status: "completed",
        model: "gpt-test",
        output_text: JSON.stringify(NULL_ENCOUNTER_OUTPUT),
        usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
      });
    },
  });

  await adapter.invoke({
    systemPrompt: "Return one rich Pass-A episode.",
    input: { fixture: true },
    responseSchema: GENESIS_RICH_PASS_A_RESPONSE_SCHEMA,
    clientRequestId: "slice-e-openai-schema",
  });

  const schema = requestBody.text.format.schema;
  assert.equal(requestBody.text.format.strict, true);
  assert.equal(schema.properties.episode.required.includes("intellectualEncounter"), true);
  assert.deepEqual(schema.properties.episode.properties.intellectualEncounter.type, ["object", "null"]);
});

test("Slice E nullable intellectual encounter translates to Google's supported OBJECT+nullable schema", async () => {
  let requestBody = null;
  const adapter = createGoogleModelAdapter({
    environment: { GEMINI_API_KEY: "test-key" },
    modelId: "gemini-test",
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return response(200, {
        candidates: [{ content: { parts: [{ text: JSON.stringify(NULL_ENCOUNTER_OUTPUT) }] } }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
      });
    },
  });

  await adapter.invoke({
    systemPrompt: "Return one rich Pass-A episode.",
    input: { fixture: true },
    responseSchema: GENESIS_RICH_PASS_A_RESPONSE_SCHEMA,
    clientRequestId: "slice-e-google-schema",
  });

  const schema = requestBody.generationConfig.responseSchema;
  const encounter = schema.properties.episode.properties.intellectualEncounter;
  assert.equal(schema.properties.episode.required.includes("intellectualEncounter"), true);
  assert.equal(encounter.type, "OBJECT");
  assert.equal(encounter.nullable, true);
  assert.equal(Object.hasOwn(encounter, "anyOf"), false);
});

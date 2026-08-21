import assert from "node:assert/strict";
import test from "node:test";

import { GENESIS_PASS_B_RESPONSE_SCHEMA, passBResponseSchemaHash } from "../services/world-kernel/src/genesis-pass-b-prompts.mjs";
import {
  assertPassBOutputSatisfiesProjectedCanonicalConstraints,
  createH2OpenAICompatibilityFetch,
  projectPassBResponseSchemaForOpenAI,
} from "./genesis-h2-openai-schema-compat.mjs";

function responseBody(output) {
  return {
    status: "completed",
    output: [{ content: [{ type: "output_text", text: JSON.stringify(output) }] }],
  };
}

test("H-v2 OpenAI projection preserves canonical Pass-B schema while stripping only locally revalidated keywords", () => {
  const projected = projectPassBResponseSchemaForOpenAI();
  assert.equal(projected.canonicalSchemaHash, passBResponseSchemaHash());
  assert.equal(GENESIS_PASS_B_RESPONSE_SCHEMA.properties.episodeRefs.uniqueItems, true);
  assert.equal(projected.transportSchema.properties.episodeRefs.uniqueItems, undefined);
  assert.equal(projected.transportSchema.properties.rememberedContent.maxLength, undefined);
  assert.equal(projected.transportSchema.properties.uncertainty.maxItems, undefined);
  assert.equal(projected.transportSchema.properties.uncertainty.items.maxLength, undefined);
  assert.deepEqual(
    projected.removedConstraints.map(({ path }) => path).sort(),
    [
      "$.properties.episodeRefs.uniqueItems",
      "$.properties.rememberedContent.maxLength",
      "$.properties.uncertainty.items.maxLength",
      "$.properties.uncertainty.maxItems",
    ].sort(),
  );
});

test("H-v2 local compatibility guard enforces every stripped Pass-B constraint", () => {
  assert.doesNotThrow(() => assertPassBOutputSatisfiesProjectedCanonicalConstraints({
    outcome: "remembered",
    episodeRefs: ["epi_a", "epi_b"],
    rememberedContent: "A bounded remembered event.",
    uncertainty: ["Some detail is uncertain."],
  }));
  assert.throws(() => assertPassBOutputSatisfiesProjectedCanonicalConstraints({
    outcome: "remembered",
    episodeRefs: ["epi_a", "epi_a"],
    rememberedContent: "A bounded remembered event.",
    uncertainty: [],
  }), /uniqueItems/);
  assert.throws(() => assertPassBOutputSatisfiesProjectedCanonicalConstraints({
    outcome: "remembered",
    episodeRefs: ["epi_a"],
    rememberedContent: "x".repeat(601),
    uncertainty: [],
  }), /maxLength=600/);
  assert.throws(() => assertPassBOutputSatisfiesProjectedCanonicalConstraints({
    outcome: "remembered",
    episodeRefs: ["epi_a"],
    rememberedContent: "A bounded remembered event.",
    uncertainty: Array.from({ length: 9 }, () => "uncertain"),
  }), /maxItems=8/);
  assert.throws(() => assertPassBOutputSatisfiesProjectedCanonicalConstraints({
    outcome: "remembered",
    episodeRefs: ["epi_a"],
    rememberedContent: "A bounded remembered event.",
    uncertainty: ["x".repeat(121)],
  }), /maxLength=120/);
});

test("H-v2 fetch wrapper projects only the canonical Pass-B schema and validates returned output locally", async () => {
  const calls = [];
  const projections = [];
  const fakeFetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return new Response(JSON.stringify(responseBody({
      outcome: "remembered",
      episodeRefs: ["epi_a"],
      rememberedContent: "A bounded remembered event.",
      uncertainty: [],
    })), { status: 200, headers: { "content-type": "application/json" } });
  };
  const wrapped = createH2OpenAICompatibilityFetch({ fetchImpl: fakeFetch, onProjection: (item) => projections.push(item) });
  const request = {
    model: "test-model",
    text: { format: { type: "json_schema", schema: GENESIS_PASS_B_RESPONSE_SCHEMA } },
  };
  const response = await wrapped("https://example.invalid", { method: "POST", body: JSON.stringify(request) });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(projections.length, 1);
  assert.equal(calls[0].text.format.schema.properties.episodeRefs.uniqueItems, undefined);
  assert.equal(calls[0].text.format.schema.properties.rememberedContent.maxLength, undefined);
});

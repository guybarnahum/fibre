// fibre-test-lifecycle: regression
// fibre-test-scope: model-runtime
// fibre-test-purpose: preserve deterministic recovery for provider-projected string maxLength failures

import assert from "node:assert/strict";
import test from "node:test";

import { createOpenAIModelAdapter } from "../../../integrations/models/openai.mjs";

function response(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => "req_max_length_recovery_test" },
    async json() { return structuredClone(body); },
  };
}

test("OpenAI adapter mechanically truncates projected maxLength strings before canonical revalidation", async () => {
  const responseSchema = {
    type: "object",
    additionalProperties: false,
    required: ["decision", "reason"],
    properties: {
      decision: { type: "string", enum: ["pass", "fail"] },
      reason: { type: "string", maxLength: 5 },
    },
  };
  const adapter = createOpenAIModelAdapter({
    environment: { OPENAI_API_KEY: "test-key" },
    modelId: "gpt-test",
    fetchImpl: async () => response({
      id: "resp_max_length_recovery_test",
      status: "completed",
      model: "gpt-test",
      output_text: JSON.stringify({ decision: "pass", reason: "abcdefg" }),
      usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
    }),
  });

  const result = await adapter.invoke({
    systemPrompt: "Return a decision.",
    input: { fixture: true },
    responseSchema,
    clientRequestId: "max-length-recovery-test",
  });

  assert.deepEqual(result.output, { decision: "pass", reason: "abcde" });
  assert.deepEqual(result.provenance.outputRecovery?.recoveries, [{
    kind: "deterministic_normalization",
    constraint: "maxLength",
    path: "$.reason",
    action: "truncate_codepoints_preserve_prefix",
    beforeLength: 7,
    afterLength: 5,
    removedCodePoints: 2,
  }]);
});

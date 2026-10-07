import assert from "node:assert/strict";
import test from "node:test";

import { createGoogleModelAdapter } from "../../../integrations/ai/reasoning/google.mjs";
import { createOpenAIModelAdapter } from "../../../integrations/ai/reasoning/openai.mjs";
import { assertExpressionModelAdapter } from "../src/guardian-model-adapter.mjs";

function sseResponse(events) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")));
      controller.close();
    },
  });
  return new Response(body, {
    status:200,
    headers:{ "content-type":"text/event-stream", "x-request-id":"provider_req_1" },
  });
}

async function collect(adapter, { signal = null, abortAfterFirst = null } = {}) {
  const events = [];
  for await (const event of adapter.streamExpression({
    systemPrompt:"Speak naturally and briefly.",
    input:{ encounter:["hello"] },
    clientRequestId:"expr_live_encounter_1",
    signal,
  })) {
    events.push(event);
    if (event.type === "expression_delta" && typeof abortAfterFirst === "function") abortAfterFirst();
  }
  return events;
}

test("OpenAI and Google expose one streamed-expression vocabulary", async () => {
  const openai = assertExpressionModelAdapter(createOpenAIModelAdapter({
    environment:{ OPENAI_API_KEY:"test-key" },
    modelId:"gpt-test",
    fetchImpl:async () => sseResponse([
      { type:"response.output_text.delta", delta:"Hello" },
      { type:"response.output_text.delta", delta:" world." },
      {
        type:"response.completed",
        response:{
          id:"resp_test",
          model:"gpt-test",
          usage:{ input_tokens:8, output_tokens:2, total_tokens:10 },
        },
      },
    ]),
  }));
  const google = assertExpressionModelAdapter(createGoogleModelAdapter({
    environment:{ GEMINI_API_KEY:"test-key" },
    modelId:"gemini-test",
    fetchImpl:async () => sseResponse([
      {
        candidates:[{ content:{ parts:[{ text:"Hello" }] } }],
        modelVersion:"gemini-test",
      },
      {
        candidates:[{
          content:{ parts:[{ text:" world." }] },
          finishReason:"STOP",
        }],
        modelVersion:"gemini-test",
        usageMetadata:{ promptTokenCount:8, candidatesTokenCount:2, totalTokenCount:10 },
      },
    ]),
  }));

  for (const adapter of [openai, google]) {
    const events = await collect(adapter);
    assert.deepEqual(
      events.filter((event) => event.type === "expression_delta").map((event) => event.text),
      ["Hello", " world."],
      "providers diverged on outward expression deltas",
    );
    assert.equal(events.at(-1)?.type, "expression_complete", "expression did not complete");
    assert.equal(events.at(-1)?.provenance.provider, adapter.provider, "expression lost provider provenance");
  }
});

test("interruption preserves only the expression prefix already observed", async () => {
  const controller = new AbortController();
  const adapter = assertExpressionModelAdapter(createOpenAIModelAdapter({
    environment:{ OPENAI_API_KEY:"test-key" },
    modelId:"gpt-test",
    fetchImpl:async () => sseResponse([
      { type:"response.output_text.delta", delta:"I think the drawing matters because—" },
      { type:"response.output_text.delta", delta:" this unseen suffix must never become speech." },
      {
        type:"response.completed",
        response:{ id:"resp_interrupted", model:"gpt-test", usage:{} },
      },
    ]),
  }));

  const events = await collect(adapter, {
    signal:controller.signal,
    abortAfterFirst:() => controller.abort("interrupted"),
  });

  assert.deepEqual(
    events.map((event) => event.type === "expression_delta" ? event.text : event.type),
    ["I think the drawing matters because—"],
    "interruption leaked unspoken expression",
  );
});

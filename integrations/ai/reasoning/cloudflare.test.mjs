import assert from "node:assert/strict";
import test from "node:test";

import { createCloudflareModelAdapter } from "./cloudflare.mjs";
import { routedReasoningIntegration, selectReasoningIntegration } from "../../../infra/deployments/integration-selection.mjs";

const SCHEMA = { type:"object", properties:{ noticed:{ type:"boolean" } }, required:["noticed"], additionalProperties:false };
const ask = (adapter) => adapter.invoke({ systemPrompt:"Notice or not.", input:{ scene:"a library" },
  responseSchema:SCHEMA, clientRequestId:"attention_test" });
const chat = (content, extra = {}) => ({ choices:[{ message:{ content }, finish_reason:"stop", ...extra }],
  usage:{ prompt_tokens:120, completion_tokens:9, total_tokens:129 } });

test("Workers AI thinks beside the World through its binding, asked for the job's schema, without hidden thinking", async () => {
  const sent = [];
  const adapter = createCloudflareModelAdapter({ modelId:"@cf/google/gemma-4-26b-a4b-it", structuredOutput:"enforced",
    binding:{ run:async (model, body) => { sent.push({ model, body }); return chat("{\"noticed\":true}"); } } });
  const { output, provenance } = await ask(adapter);
  assert.deepEqual(output, { noticed:true });
  assert.equal(sent[0].model, "@cf/google/gemma-4-26b-a4b-it");
  assert.deepEqual(sent[0].body.response_format.json_schema.schema, SCHEMA, "the job's schema was not asked for");
  assert.equal(sent[0].body.chat_template_kwargs.enable_thinking, false);
  assert.equal(provenance.usage.inputTokens, 120, "usage was not reported for metering");
  const older = createCloudflareModelAdapter({ modelId:"@cf/old", binding:{ run:async () => ({ response:{ noticed:false } }) } });
  assert.deepEqual((await ask(older)).output, { noticed:false }, "an older model's parsed answer was not read");
  const misplaced = (thinking) => createCloudflareModelAdapter({ modelId:"@cf/qwen/qwen3-30b-a3b-fp8", thinking, retryLimit:0,
    binding:{ run:async () => ({ choices:[{ message:{ content:null, reasoning_content:"{\"noticed\":true}" }, finish_reason:"stop" }] }) } });
  assert.deepEqual((await ask(misplaced(false))).output, { noticed:true },
    "with thinking off, an answer returned in the reasoning field was lost");
  await assert.rejects(ask(misplaced(true)), { code:"UNPARSEABLE_MODEL_OUTPUT" },
    "hidden thought was taken as the answer");
});

test("Workers AI failures are classified like any provider's: allocation, schema missed, credentials", async () => {
  const failing = (message) => createCloudflareModelAdapter({ modelId:"@cf/m", retryLimit:0,
    binding:{ run:async () => { throw new Error(message); } } });
  await assert.rejects(ask(failing("3036: You have used up your daily free allocation of 10,000 neurons")),
    { code:"MODEL_BILLING_QUOTA_EXHAUSTED" });
  await assert.rejects(ask(failing("JSON Mode couldn't be met")), { code:"UNPARSEABLE_MODEL_OUTPUT" });
  const rest = createCloudflareModelAdapter({ modelId:"@cf/m", accountId:"acct", apiToken:"bad", retryLimit:0,
    fetchImpl:async () => Response.json({ success:false, errors:[{ code:10000, message:"Authentication error" }] }, { status:401 }) });
  await assert.rejects(ask(rest), { code:"MODEL_AUTHENTICATION_ERROR" });
  const cut = createCloudflareModelAdapter({ modelId:"@cf/m", binding:{ run:async () => chat("{\"noti", ) } });
  await assert.rejects(ask(cut), { code:"UNPARSEABLE_MODEL_OUTPUT" });
});

test("a request the binding cannot cancel is waited for, never sent twice", async () => {
  let runs = 0;
  const slow = (ms) => createCloudflareModelAdapter({ modelId:"@cf/m", timeoutMs:20, deferredTimeoutMs:200,
    binding:{ run:async () => { runs += 1; await new Promise((done) => setTimeout(done, ms)); return chat("{\"noticed\":true}"); } } });
  await assert.rejects(ask(slow(60)), { code:"MODEL_TIMEOUT" });
  assert.equal(runs, 1, "a timed-out request, still running and billed, was sent again");
  const reflection = await slow(60).invoke({ systemPrompt:"Reflect.", input:{ day:1 }, responseSchema:SCHEMA,
    clientRequestId:"reflection_test", latency:"minutes" });
  assert.deepEqual(reflection.output, { noticed:true }, "cognition that may take minutes was cut short");
});

test("what may be empty is asked as optional and read back as null, so a model need not write null", async () => {
  const schema = { type:"object", additionalProperties:false, required:["outcome", "experienceText", "passedReason", "notes"],
    properties:{ outcome:{ type:"string", enum:["noticed", "not_noticed"] },
      experienceText:{ anyOf:[{ type:"string", minLength:1 }, { type:"null" }] },
      passedReason:{ anyOf:[{ type:"string", minLength:1 }, { type:"null" }] },
      notes:{ type:"array", items:{ type:"object", additionalProperties:false, required:["text", "about"],
        properties:{ text:{ type:"string" }, about:{ type:["string", "null"] } } } } } };
  let asked = null;
  const adapter = createCloudflareModelAdapter({ modelId:"@cf/m", structuredOutput:"enforced", binding:{ run:async (model, body) => {
    asked = body.response_format.json_schema.schema;
    return chat(JSON.stringify({ outcome:"noticed", experienceText:"I look up.", notes:[{ text:"a friend" }] }));
  } } });
  const { output } = await adapter.invoke({ systemPrompt:"Notice.", input:{ scene:"library" }, responseSchema:schema,
    clientRequestId:"attention_test" });
  assert.deepEqual(asked.required, ["outcome", "notes"], "a nullable field was still required of the model");
  assert.equal(asked.properties.passedReason.type, "string", "null was still offered to the model");
  assert.deepEqual(asked.properties.notes.items.required, ["text"], "a nested nullable field was still required");
  assert.deepEqual(output, { outcome:"noticed", experienceText:"I look up.", passedReason:null,
    notes:[{ text:"a friend", about:null }] }, "an absent nullable field did not read back as null");
});

test("a live turn can speak through Workers AI, as one utterance", async () => {
  const adapter = createCloudflareModelAdapter({ modelId:"@cf/m", binding:{ run:async () => chat("engaged ordinary SAY: Hello.") } });
  const events = [];
  for await (const event of adapter.streamExpression({ systemPrompt:"Speak.", input:{ turn:1 }, clientRequestId:"live_turn" })) events.push(event);
  assert.deepEqual(events.map((event) => event.type), ["expression_delta", "expression_complete"]);
  assert.equal(events[0].text, "engaged ordinary SAY: Hello.");
});

test("a job thinks with the model its service names for it, every other job with the port's, by configuration alone", async () => {
  const integrations = {
    encounter:{ kind:"ai.reasoning", provider:"openai", config:{ model:"gpt-test" }, secrets:{ apiKey:"OPENAI_API_KEY" } },
    "world.happening":{ kind:"ai.reasoning", provider:"cloudflare", config:{ model:"@cf/google/gemma-4-26b-a4b-it", binding:"AI" } },
  };
  const ran = [];
  const environment = { OPENAI_API_KEY:"key", AI:{ run:async (model) => { ran.push(model); return chat("{\"noticed\":true}"); } } };
  const openaiCalls = [];
  const adapter = routedReasoningIntegration(integrations, "encounter", { environment,
    fetchImpl:async (url) => { openaiCalls.push(url); throw new Error("not reached"); } });
  await adapter.invoke({ promptRef:"world.happening@3", systemPrompt:"A happening.", input:{ place:"park" },
    responseSchema:SCHEMA, clientRequestId:"happening_test" });
  assert.deepEqual(ran, ["@cf/google/gemma-4-26b-a4b-it"], "the routed job did not think with its own model");
  assert.equal(openaiCalls.length, 0, "the routed job reached the port's provider");
  await assert.rejects(adapter.invoke({ promptRef:"encounter.attention@4", systemPrompt:"Notice.", input:{ scene:"x" },
    responseSchema:SCHEMA, clientRequestId:"attention_test" }));
  assert.ok(openaiCalls.length > 0, "an unrouted job did not think with the port's model");
  assert.equal(adapter.provider, "openai");
  assert.throws(() => selectReasoningIntegration(integrations["world.happening"], { environment:{} }),
    "Workers AI without a binding or token was accepted");
});

test("a mechanical miss is the adapter's to repair, never the model's verdict: read from a fence, or asked once more", async () => {
  const answering = (...contents) => { let calls = 0;
    return { calls:() => calls, adapter:createCloudflareModelAdapter({ modelId:"@cf/google/gemma-4-26b-a4b-it", retryLimit:0,
      binding:{ run:async () => chat(contents[Math.min(calls++, contents.length - 1)]) } }) }; };
  const fenced = answering("Here it is:\n```json\n{\"noticed\":true}\n```");
  assert.deepEqual((await ask(fenced.adapter)).output, { noticed:true }, "JSON inside a code fence was not read");
  const missed = answering("{\"noticed\":\"yes\"}", "{\"noticed\":false}");
  const { output, provenance } = await ask(missed.adapter);
  assert.deepEqual(output, { noticed:false }, "an answer that missed the schema was not asked again");
  assert.equal(provenance.answersAskedAgain.length, 1);
  assert.equal(provenance.usage.inputTokens, 240, "the missed answer's cost was hidden");
  const never = answering("{\"seen\":true}");
  await assert.rejects(ask(never.adapter), { code:"UNPARSEABLE_MODEL_OUTPUT" });
  assert.equal(never.calls(), 2, "a model that keeps missing the schema was asked more than once again");
});

test("by default the answer's form is an instruction checked here, never a grammar a model can stall in; a miss is shown what it missed", async () => {
  const sent = [];
  let calls = 0;
  const adapter = createCloudflareModelAdapter({ modelId:"@cf/google/gemma-4-26b-a4b-it", retryLimit:0,
    binding:{ run:async (model, body) => { sent.push(body); return chat(calls++ === 0 ? "{}" : "{\"noticed\":true}"); } } });
  const { output } = await ask(adapter);
  assert.deepEqual(output, { noticed:true });
  assert.equal(sent[0].response_format, undefined, "the decoder was still held to a grammar");
  assert.ok(sent[0].messages.some((message) => message.role === "system" && message.content.includes("\"noticed\"")),
    "the model was not told the answer's form");
  const again = sent[1].messages.at(-1).content;
  assert.ok(again.includes("$.noticed") && again.includes("missing"), "the second ask did not say what was missed");
  assert.equal(sent[1].messages.at(-2).content, "{}", "the answer that missed was not shown");
});

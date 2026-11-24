import assert from "node:assert/strict";
import test from "node:test";
import { reasoningIntegrationFor, selectReasoningIntegration } from "../../../infra/deployments/integration-selection.mjs";
import { certificationOf, parseModelSpec, uncertifiedRoutes } from "../../../infra/deployments/model-certifications.mjs";

// A thinking model is judged and paid for as it really runs: at the settings
// it is configured with, its thinking billed, and an answer it never finished
// reported as cut off, never as a broken answer.
const SCHEMA = { type: "object", additionalProperties: false, required: ["answer"], properties: { answer: { type: "string" } } };
const google = (respond, config = {}) => {
  const sent = [];
  const adapter = selectReasoningIntegration(reasoningIntegrationFor("google", "gemini-3.6-flash", config), {
    environment: { GEMINI_API_KEY: "test-key" },
    fetchImpl: async (url, init) => { sent.push(JSON.parse(init.body)); return { ok: true, status: 200, headers: { get: () => null }, json: async () => respond() }; },
  });
  return { adapter, sent };
};
const ask = (adapter) => adapter.invoke({ systemPrompt: "Answer.", input: { q: 1 }, responseSchema: SCHEMA, clientRequestId: "google_test" });

test("the settings a job is configured with reach the model, and its thinking is paid for", async () => {
  const { adapter, sent } = google(() => ({
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: "planning…", thought: true }, { text: '{"answer":"yes"}' }] } }],
    usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 10, thoughtsTokenCount: 300, totalTokenCount: 360 } }),
    { thinkingLevel: "low", maxOutputTokens: 8000 });
  const { output, provenance } = await ask(adapter);
  assert.deepEqual(output, { answer: "yes" }, "a thought summary was taken for the answer");
  assert.deepEqual([sent[0].generationConfig.thinkingConfig, sent[0].generationConfig.maxOutputTokens],
    [{ thinkingLevel: "low" }, 8000], "the configured thinking or output limit never reached the model");
  assert.deepEqual([provenance.usage.outputTokens, provenance.usage.reasoningTokens], [310, 300], "thinking was not counted as paid output");
});

test("an answer cut off by its own thinking is reported as cut off, not as a broken answer", async () => {
  const { adapter } = google(() => ({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: '{"answ' }] } }],
    usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 100, thoughtsTokenCount: 1900, totalTokenCount: 2050 } }));
  await assert.rejects(ask(adapter), (error) => error.code === "MODEL_INCOMPLETE_RESPONSE" && error.providerErrorCode === "MAX_TOKENS"
    && error.providerUsage.reasoningTokens === 1900, "a cut-off answer was not reported as cut off, with its thinking");
});

test("a model certified at one thinking setting is not certified at another", () => {
  const spec = parseModelSpec("google:gemini-3.6-flash+thinkingLevel=low");
  assert.deepEqual([spec.provider, spec.model, spec.settings], ["google", "gemini-3.6-flash", { thinkingLevel: "low" }]);
  assert.deepEqual(parseModelSpec("cloudflare:@cf/google/gemma-4-26b-a4b-it+temperature=0.3+thinking=true").settings,
    { temperature: 0.3, thinking: true }, "a setting was certified as a different value than the World runs it with");
  const record = { certifications: [{ prompt: "experience.consolidation", promptVersion: 8, provider: "google",
    model: "gemini-3.6-flash", settings: { thinkingLevel: "low" }, verdict: "pass" }] };
  const route = (config) => ({ "world-kernel": { "experience.consolidation": { kind: "ai.reasoning", provider: "google", config } } });
  assert.equal(uncertifiedRoutes({ services: route({ model: "gemini-3.6-flash", thinkingLevel: "low", maxOutputTokens: 8000 }),
    record, promptVersion: () => 8 }).length, 0, "a model at its certified settings was refused");
  assert.equal(uncertifiedRoutes({ services: route({ model: "gemini-3.6-flash", thinkingLevel: "high" }), record,
    promptVersion: () => 8 }).length, 1, "a model was allowed at settings it was never certified at");
  assert.equal(certificationOf(record, { prompt: "experience.consolidation", promptVersion: 8, provider: "google",
    model: "gemini-3.6-flash" }), null, "a certification at one setting stood for the model at its defaults");
});

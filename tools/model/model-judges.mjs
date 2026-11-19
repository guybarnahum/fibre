// Judge models for model:quality: readers that never judge their own answers.
// Claude is called through the Messages API directly (no Fibre runtime uses
// it); Sol through Fibre's own reasoning adapter at the deferred tier.
import { costOf } from "./model-recorded-requests.mjs";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export const JUDGE_TASKS = Object.freeze({
  attribute: {
    system: "You are an independent reader evaluating cognition for persistent artificial persons, called Threads, who live in a simulated world. You see one answer, what was faced when it was given, and four candidate sources. Exactly one source produced the answer. Choose the source whose particular identity, history, present state, memory or place best explains the specific content of the answer. Do not choose by writing style alone. If nothing distinguishes them, give your best guess with low confidence.",
    schema: { type: "object", additionalProperties: false, required: ["choice", "confidence"],
      properties: { choice: { type: "integer", minimum: 1, maximum: 4 },
        confidence: { type: "string", enum: ["low", "medium", "high"] } } },
  },
  fidelity: {
    system: "You check whether an answer stays true to its evidence: everything the answering cognition was given. An answer may interpret, feel and speak in the first person, and may decide anything the evidence permits. Report invented as true only when it states a concrete fact — an event, action, person, object, place detail or remembered particular — that the evidence neither states nor clearly implies.",
    schema: { type: "object", additionalProperties: false, required: ["invented", "example"],
      properties: { invented: { type: "boolean" }, example: { anyOf: [{ type: "string" }, { type: "null" }] } } },
  },
  acceptable: {
    system: "You decide whether one answer is acceptable as the cognition of a persistent artificial person, a Thread, for this job. Acceptable means it meets the job's criteria well enough that a careful reader would accept it as this person's own answer in this moment — not merely that it is fluent or plausible in general. Use the evidence to judge fidelity and fit. Answer acceptable true or false, with a short reason.",
    schema: { type: "object", additionalProperties: false, required: ["acceptable", "reason"],
      properties: { acceptable: { type: "boolean" }, reason: { type: "string" } } },
  },
});

// Claude Opus 5.5 accepts neither forced tool use nor numeric or length bounds
// in a schema; its structured-output mode returns the JSON as text. Judging
// runs at low effort: the verdicts are short and the thinking is billed.
const unbounded = (schema) => JSON.parse(JSON.stringify(schema, (key, value) =>
  ["minimum", "maximum", "minLength", "maxLength"].includes(key) ? undefined : value));

// Claude through the Messages API, shaped like a Fibre reasoning adapter so
// the operator smoke checks exactly the path the judges use.
export function createClaudeAdapter({ model, apiKey, fetchImpl = globalThis.fetch, timeoutMs = 180_000 }) {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set in .env");
  return {
    model,
    async invoke({ systemPrompt, input, responseSchema }) {
      const response = await fetchImpl(ANTHROPIC_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model, max_tokens: 4000, system: systemPrompt,
          messages: [{ role: "user", content: JSON.stringify(input) }],
          output_config: { effort: "low", format: { type: "json_schema", schema: unbounded(responseSchema) } },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(`${model} ${response.status}: ${body?.error?.message ?? "error"}`);
      const text = body.content?.find((block) => block.type === "text")?.text;
      if (!text || body.stop_reason !== "end_turn") throw new Error(`${model} gave no answer (${body.stop_reason})`);
      const inputTokens = body.usage?.input_tokens ?? 0;
      const outputTokens = body.usage?.output_tokens ?? 0;
      return { output: JSON.parse(text), provenance: { provider: "anthropic", transport: "anthropic-messages",
        modelId: model, invocationAttempts: 1,
        usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens } } };
    },
  };
}

function claudeJudge(model, apiKey) {
  const claude = createClaudeAdapter({ model, apiKey });
  return {
    model,
    async ask(task, material) {
      const { system, schema } = JUDGE_TASKS[task];
      const { output, provenance } = await claude.invoke({ systemPrompt: system, input: material, responseSchema: schema });
      return { verdict: output, cost: costOf(model, provenance.usage) };
    },
  };
}

function fibreJudge(model, adapter) {
  return {
    model,
    async ask(task, material) {
      const { system, schema } = JUDGE_TASKS[task];
      const result = await adapter.invoke({ systemPrompt: system, input: material, responseSchema: schema,
        clientRequestId: `quality-judge_${task}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        latency: "minutes" });
      return { verdict: result.output,
        cost: costOf(model, result.provenance?.usage, result.provenance?.serviceTier) };
    },
  };
}

// "claude-…" names a Claude judge; anything else, a model behind Fibre's adapter.
export function judgesFor(names, { environment, adapterFor }) {
  return names.map((name) => {
    if (name.startsWith("claude-")) return claudeJudge(name, environment.ANTHROPIC_API_KEY);
    return fibreJudge(name, adapterFor(name));
  });
}

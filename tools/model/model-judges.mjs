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
  compare: {
    system: "You compare two answers that different cognition gave to the same request, against the job's criteria. Judge only by the criteria, not by length or polish unless the criteria ask for it. Say which better meets them, or same.",
    schema: { type: "object", additionalProperties: false, required: ["better", "reason"],
      properties: { better: { type: "string", enum: ["A", "B", "same"] }, reason: { type: "string" } } },
  },
});

// Claude Opus 5.5 accepts neither forced tool use nor numeric or length bounds
// in a schema; its structured-output mode returns the JSON as text. Judging
// runs at low effort: the verdicts are short and the thinking is billed.
const unbounded = (schema) => JSON.parse(JSON.stringify(schema, (key, value) =>
  ["minimum", "maximum", "minLength", "maxLength"].includes(key) ? undefined : value));

function claudeJudge(model, apiKey) {
  return {
    model,
    async ask(task, material) {
      const { system, schema } = JUDGE_TASKS[task];
      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model, max_tokens: 4000, system,
          messages: [{ role: "user", content: JSON.stringify(material) }],
          output_config: { effort: "low", format: { type: "json_schema", schema: unbounded(schema) } },
        }),
        signal: AbortSignal.timeout(180_000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(`${model} ${response.status}: ${body?.error?.message ?? "error"}`);
      const text = body.content?.find((block) => block.type === "text")?.text;
      if (!text || body.stop_reason !== "end_turn") throw new Error(`${model} gave no verdict (${body.stop_reason})`);
      const verdict = JSON.parse(text);
      // Enum casing is not guaranteed.
      if (typeof verdict.better === "string") verdict.better = verdict.better.toLowerCase() === "same" ? "same" : verdict.better.toUpperCase();
      return { verdict, cost: costOf(model, { inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens }) };
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
    if (name.startsWith("claude-")) {
      if (!environment.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set in .env");
      return claudeJudge(name, environment.ANTHROPIC_API_KEY);
    }
    return fibreJudge(name, adapterFor(name));
  });
}

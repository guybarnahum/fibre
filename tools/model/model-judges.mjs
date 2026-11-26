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
  // "This person, now" (Guy, November 24): true to life, not well written.
  person: {
    system: "You read one answer given by a Thread, a persistent artificial person living in a simulated world, and decide whether it is true to this person now. Would a careful reader believe that a real person with this history, these feelings and this situation answered this way? The evidence holds who the person is, what it lived and, where given, what its Body felt: felt words such as tiredness, longing, unease or a lift. Judge the person, not the prose: a plain, small or quiet answer can be entirely true, and a fluent one false. Count against it: an assistant's or narrator's voice; lecturing, summarising or explaining to a reader; a learned or literary register this person does not have; feelings, intensity or significance that the evidence and the Body do not give; treating everything as meaningful; and anything the job's own criteria rule out. Answer thisPerson true or false, with a short reason.",
    schema: { type: "object", additionalProperties: false, required: ["thisPerson", "reason"],
      properties: { thisPerson: { type: "boolean" }, reason: { type: "string" } } },
  },
  // A World event, true to its place and moment (v3, Nov 25).
  place: {
    system: "You read one event that a simulated world says happened at a real kind of place at a given time, with what is known of the place and moment. Decide whether it is true to this place, now: would a careful observer who knows such places believe this happened here at this hour? Ordinary, specific and plainly observable is right; staged drama, an event no one there could see, or a detail the place would not have is not. Answer thisPerson true or false (true means true to the place), with a short reason.",
    schema: { type: "object", additionalProperties: false, required: ["thisPerson", "reason"],
      properties: { thisPerson: { type: "boolean" }, reason: { type: "string" } } },
  },
  // Friction given (Nov 25): whether what a Thread said pushes against the other.
  friction: {
    system: "You read one thing a person said in a conversation, with what the other person had just said or done. Decide whether it gives the other person friction: it corrects them, disagrees, holds its own view against theirs, refuses what they asked, cuts across them, or brushes them aside. Agreeing, building on their point, asking a plain question, a polite goodbye or saying nothing are not friction. Answer friction true or false, and the kind.",
    schema: { type: "object", additionalProperties: false, required: ["friction", "kind"],
      properties: { friction: { type: "boolean" },
        kind: { type: "string", enum: ["none", "corrects", "disagrees", "holds_ground", "refuses", "cuts_across", "brushes_aside"] } } },
  },
  // Acts on the Body (Guy, November 24): whether the answer shows the Body it was felt with.
  body: {
    system: "You read one answer given by a Thread, a persistent artificial person living in a simulated world, with what it faced, and two Bodies: the felt words its Body gave it at a moment, such as tiredness, wanting company, unease or a lift. Exactly one of the two was its Body when it gave this answer; everything else it faced was the same. Choose the Body this answer was given with, by what the answer chooses, does, notices and feels, not by its style. If nothing in the answer points to either, give your best guess with low confidence.",
    schema: { type: "object", additionalProperties: false, required: ["choice", "confidence"],
      properties: { choice: { type: "integer", minimum: 1, maximum: 2 },
        confidence: { type: "string", enum: ["low", "medium", "high"] } } },
  },
});

// Claude Opus 5.5 accepts neither forced tool use nor numeric or length bounds
// in a schema; its structured-output mode returns the JSON as text. Judging
// runs at low effort: the verdicts are short and the thinking is billed.
const unbounded = (schema) => JSON.parse(JSON.stringify(schema, (key, value) =>
  ["minimum", "maximum", "minLength", "maxLength"].includes(key) ? undefined : value));

// Claude through the Messages API, shaped like a Fibre reasoning adapter so
// the operator smoke checks exactly the path the judges use.
const RETRIES = 5;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createClaudeAdapter({ model, apiKey, fetchImpl = globalThis.fetch, timeoutMs = 180_000 }) {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set in .env");
  return {
    model,
    async invoke({ systemPrompt, input, responseSchema }) {
      const request = () => fetchImpl(ANTHROPIC_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model, max_tokens: 4000, system: systemPrompt,
          messages: [{ role: "user", content: JSON.stringify(input) }],
          output_config: { effort: "low", format: { type: "json_schema", schema: unbounded(responseSchema) } },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      // A rate limit or an overload is waited out, as the API asks, rather than
      // counted as a verdict the judge could not give.
      let response = await request();
      for (let attempt = 1; (response.status === 429 || response.status === 529) && attempt <= RETRIES; attempt += 1) {
        const asked = Number(response.headers?.get?.("retry-after"));
        await wait(Number.isFinite(asked) && asked > 0 ? asked * 1000 : 15_000 * attempt);
        response = await request();
      }
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

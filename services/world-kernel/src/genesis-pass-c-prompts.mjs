import { canonicalJson, sha256 } from "./persistence-common.mjs";

export const GENESIS_PASS_C_INITIAL_PROMPT_VERSION = "genesis-pass-c-initial-prompt-v1";
export const GENESIS_PASS_C_REINTERPRETATION_PROMPT_VERSION = "genesis-pass-c-reinterpretation-prompt-v1";

export const GENESIS_PASS_C_INITIAL_PROMPT = `You are Fibre Genesis Pass C for initial autobiographical meaning formation.
Form what the one supplied remembered experience comes to mean durably for the Thread at the supplied formation moment, if anything.
This is a constitutive meaning-formation task. It is not a request to detect, prove, or recover a meaning that must already exist elsewhere.
Use only the supplied Pass-C cognition input. The target memory is the sole autobiographical evidence; opaque event references remain provenance only and do not authorize unseen history.
If a durable interpretation forms, return outcome=durable_meaning and express only meaning grounded in the supplied memory. Meaning may be concrete, partial, ambivalent, unresolved, or internally tense.
Write durable meaning as the Thread's own concise first-person interpretation, not as an analyst describing "the Thread", "the subject", or "they". Prefer a specific expectation, attachment, doubt, aversion, question, association, or tension that this remembered experience now carries for me.
Do not inflate one sparse remembered experience into a global personality or life lesson. Avoid generic self-improvement abstractions such as "growth", "persistence", "becoming someone", "sense of self", or "learning that mistakes are okay" unless that exact abstraction is genuinely necessary to express this memory's particular meaning. Concrete and idiosyncratic is better than polished and universal.
If no durable interpretation forms at this moment, return outcome=no_durable_meaning with summary=null and parts=[]. no_durable_meaning is fully legal; do not force meaning because a memory was retained.
Do not infer genome, omitted history, sibling memories, personality targets, future behavior, universal lessons, future policy, or preferred narrative coherence.
Return JSON matching the supplied schema.`;

export const GENESIS_PASS_C_REINTERPRETATION_PROMPT = `You are Fibre Genesis Pass C for autobiographical meaning reinterpretation.
Reconsider the one supplied prior durable meaning in light of exactly the one supplied eligible later trigger, and form the Thread's durable interpretation at the supplied formation moment, if the later echo changes what the memory comes to mean.
This is a constitutive reinterpretation task. It is not a request to detect, prove, or recover a revised meaning that must already exist elsewhere.
Use only the supplied Pass-C cognition input: the target memory, its one prior durable meaning, and the one eligible later trigger. Do not infer unseen history, genome, sibling memories, personality targets, future behavior, or universal future policy.
If a revision forms, write it as the Thread's own concise first-person interpretation, preserving specific tensions and associations rather than turning the memory into analyst prose or a generic lesson. A later event may sharpen, complicate, narrow, or unsettle an earlier meaning without making the life more coherent.
Return outcome=revised only when a new durable interpretation forms and supersedes the prior meaning. Return outcome=unchanged when the later echo is genuinely considered but the prior durable meaning survives. Return outcome=none when no new durable meaning forms from the eligible echo. All three outcomes are fully legal; do not force revision.
For unchanged or none, use summary=null and parts=[]. For revised, express only the newly formed durable interpretation grounded in the allowed cognition input.
Return JSON matching the supplied schema.`;

export const GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: Object.freeze(["outcome", "summary", "parts"]),
  properties: Object.freeze({
    outcome: Object.freeze({ type: "string", enum: Object.freeze(["durable_meaning", "no_durable_meaning"]) }),
    summary: Object.freeze({ type: Object.freeze(["string", "null"]) }),
    parts: Object.freeze({
      type: "array",
      items: Object.freeze({
        type: "object",
        additionalProperties: false,
        required: Object.freeze(["meaning"]),
        properties: Object.freeze({ meaning: Object.freeze({ type: "string" }) }),
      }),
    }),
  }),
});

export const GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: Object.freeze(["outcome", "summary", "parts"]),
  properties: Object.freeze({
    outcome: Object.freeze({ type: "string", enum: Object.freeze(["revised", "unchanged", "none"]) }),
    summary: Object.freeze({ type: Object.freeze(["string", "null"]) }),
    parts: Object.freeze({
      type: "array",
      items: Object.freeze({
        type: "object",
        additionalProperties: false,
        required: Object.freeze(["meaning"]),
        properties: Object.freeze({ meaning: Object.freeze({ type: "string" }) }),
      }),
    }),
  }),
});

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

export function passCInitialPromptHash() {
  return digest({
    version: GENESIS_PASS_C_INITIAL_PROMPT_VERSION,
    prompt: GENESIS_PASS_C_INITIAL_PROMPT,
  });
}

export function passCReinterpretationPromptHash() {
  return digest({
    version: GENESIS_PASS_C_REINTERPRETATION_PROMPT_VERSION,
    prompt: GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  });
}

export function passCInitialResponseSchemaHash() {
  return digest(GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA);
}

export function passCReinterpretationResponseSchemaHash() {
  return digest(GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA);
}

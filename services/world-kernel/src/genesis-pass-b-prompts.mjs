import { canonicalJson, sha256 } from "./persistence-common.mjs";

export const GENESIS_PASS_B_PROMPT_VERSION = "genesis-pass-b-memory-formation-prompt-v1";
export const GENESIS_PASS_B_FORM_PROFILE = "genesis-pass-b-bounded-memory-v1";
export const GENESIS_PASS_B_MAX_MODEL_CHARACTERS = 600;
export const GENESIS_PASS_B_MAX_UNCERTAINTY_CHARACTERS = 120;

export const GENESIS_PASS_B_PROMPT = `You are Fibre Genesis Pass B for autobiographical memory formation.
Form the autobiographical memory this Thread retains from the supplied visible history at rememberingAt, if any.
This is a constitutive memory-formation task, not a request to detect, prove, or recover a memory that must already exist elsewhere.
priorMemories may be empty; that is normal for initial formation and is not evidence that nothing is retained. When priorMemories are present, they are continuity context only; do not copy an old memory into a new one or cite a memory ref as episode evidence.
Use only the supplied Pass-B cognition input. genomeExposure may be null or may contain the frozen direct-treatment genome exposure. If genomeExposure is present, it may influence what draws attention or is retained, but it is not a lived event: do not copy loci into rememberedContent, infer that an event happened because of a locus, or turn loci into personality, meaning, lessons, or future policy.
If one or more concrete experiences are retained autobiographically, return outcome=remembered, cite only visible episode IDs, and write rememberedContent as the memory itself, with bounded uncertainty where appropriate.
If nothing from the visible history is retained autobiographically at this formation moment, return outcome=not_remembered with episodeRefs=[], rememberedContent=null, uncertainty=[]. not_remembered is fully legal; do not force a memory.
Do not write durable meaning, significance, personality, lessons, future policy, or a summary of the whole life.
Mechanical form constraint: when outcome=remembered, rememberedContent MUST be at most ${GENESIS_PASS_B_MAX_MODEL_CHARACTERS} characters total. Keep uncertainty items short and concrete.
Return JSON matching the supplied schema.`;

export const GENESIS_PASS_B_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: Object.freeze(["outcome", "episodeRefs", "rememberedContent", "uncertainty"]),
  properties: Object.freeze({
    outcome: Object.freeze({ type: "string", enum: Object.freeze(["remembered", "not_remembered"]) }),
    episodeRefs: Object.freeze({
      type: "array",
      uniqueItems: true,
      items: Object.freeze({ type: "string" }),
    }),
    rememberedContent: Object.freeze({
      type: Object.freeze(["string", "null"]),
      maxLength: GENESIS_PASS_B_MAX_MODEL_CHARACTERS,
    }),
    uncertainty: Object.freeze({
      type: "array",
      maxItems: 8,
      items: Object.freeze({ type: "string", maxLength: GENESIS_PASS_B_MAX_UNCERTAINTY_CHARACTERS }),
    }),
  }),
});

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

export function passBPromptHash() {
  return digest({
    version: GENESIS_PASS_B_PROMPT_VERSION,
    formProfile: GENESIS_PASS_B_FORM_PROFILE,
    prompt: GENESIS_PASS_B_PROMPT,
  });
}

export function passBResponseSchemaHash() {
  return digest(GENESIS_PASS_B_RESPONSE_SCHEMA);
}

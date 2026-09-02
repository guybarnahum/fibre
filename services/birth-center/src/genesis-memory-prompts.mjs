import { birthCenterPromptText } from "./genesis-prompt-bundle.mjs";
import { canonicalJson, sha256 } from "fibre/world-kernel/genesis-authority-contracts";

export const GENESIS_PASS_B_PROMPT_VERSION = "genesis-pass-b-memory-formation-prompt-v1";
export const GENESIS_PASS_B_FORM_PROFILE = "genesis-pass-b-bounded-memory-v1";
export const GENESIS_PASS_B_MAX_MODEL_CHARACTERS = 600;
export const GENESIS_PASS_B_MAX_UNCERTAINTY_CHARACTERS = 120;

export const GENESIS_PASS_B_PROMPT = birthCenterPromptText("genesis.memory-formation.base");

export const GENESIS_PASS_B_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: Object.freeze(["outcome", "episodeRefs", "rememberedContent", "uncertainty"]),
  properties: Object.freeze({
    outcome: Object.freeze({ type: "string", enum: Object.freeze(["remembered", "not_remembered"]) }),
    episodeRefs: Object.freeze({ type: "array", uniqueItems: true, items: Object.freeze({ type: "string" }) }),
    rememberedContent: Object.freeze({ type: Object.freeze(["string", "null"]), maxLength: GENESIS_PASS_B_MAX_MODEL_CHARACTERS }),
    uncertainty: Object.freeze({
      type: "array",
      maxItems: 8,
      items: Object.freeze({ type: "string", maxLength: GENESIS_PASS_B_MAX_UNCERTAINTY_CHARACTERS }),
    }),
  }),
});

function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
export function passBPromptHash() { return digest({ version: GENESIS_PASS_B_PROMPT_VERSION, formProfile: GENESIS_PASS_B_FORM_PROFILE, prompt: GENESIS_PASS_B_PROMPT }); }
export function passBResponseSchemaHash() { return digest(GENESIS_PASS_B_RESPONSE_SCHEMA); }

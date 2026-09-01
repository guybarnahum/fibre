import { resolvePromptAsset } from "#integrations/ai/reasoning/prompt-assets.mjs";
import { canonicalJson, sha256 } from "fibre/world-kernel/genesis-authority-contracts";

export const GENESIS_PASS_C_INITIAL_PROMPT_VERSION = "genesis-pass-c-initial-prompt-v1";
export const GENESIS_PASS_C_REINTERPRETATION_BASE_PROMPT_VERSION = "genesis-pass-c-reinterpretation-prompt-v1";
export const GENESIS_PASS_C_REINTERPRETATION_PROMPT_VERSION = "genesis-pass-c-reinterpretation-prompt-v2";

const GENESIS_PROMPT_DIRECTORY = new URL("../prompts/", import.meta.url);

export const GENESIS_PASS_C_INITIAL_PROMPT = resolvePromptAsset({ directory: GENESIS_PROMPT_DIRECTORY, id: "genesis.meaning-initial" }).text;
export const GENESIS_PASS_C_REINTERPRETATION_PROMPT = resolvePromptAsset({ directory: GENESIS_PROMPT_DIRECTORY, id: "genesis.meaning-reinterpretation.base" }).text;
export const GENESIS_PASS_C_REINTERPRETATION_RESTRAINT_AMENDMENT = resolvePromptAsset({ directory: GENESIS_PROMPT_DIRECTORY, id: "genesis.meaning-reinterpretation-restraint" }).text;
export const GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT = resolvePromptAsset({ directory: GENESIS_PROMPT_DIRECTORY, id: "genesis.meaning-reinterpretation" }).text;

export const GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: Object.freeze(["outcome", "summary", "parts"]),
  properties: Object.freeze({
    outcome: Object.freeze({ type: "string", enum: Object.freeze(["durable_meaning", "no_durable_meaning"]) }),
    summary: Object.freeze({ type: Object.freeze(["string", "null"]) }),
    parts: Object.freeze({ type: "array", items: Object.freeze({
      type: "object", additionalProperties: false, required: Object.freeze(["meaning"]), properties: Object.freeze({ meaning: Object.freeze({ type: "string" }) }),
    }) }),
  }),
});

export const GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: Object.freeze(["outcome", "summary", "parts"]),
  properties: Object.freeze({
    outcome: Object.freeze({ type: "string", enum: Object.freeze(["revised", "unchanged", "none"]) }),
    summary: Object.freeze({ type: Object.freeze(["string", "null"]) }),
    parts: Object.freeze({ type: "array", items: Object.freeze({
      type: "object", additionalProperties: false, required: Object.freeze(["meaning"]), properties: Object.freeze({ meaning: Object.freeze({ type: "string" }) }),
    }) }),
  }),
});

function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
export function passCInitialPromptHash() { return digest({ version: GENESIS_PASS_C_INITIAL_PROMPT_VERSION, prompt: GENESIS_PASS_C_INITIAL_PROMPT }); }
export function passCReinterpretationBaselinePromptHash() { return digest({ version: GENESIS_PASS_C_REINTERPRETATION_BASE_PROMPT_VERSION, prompt: GENESIS_PASS_C_REINTERPRETATION_PROMPT }); }
export function passCReinterpretationPromptHash() { return digest({ version: GENESIS_PASS_C_REINTERPRETATION_PROMPT_VERSION, prompt: GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT }); }
export function passCInitialResponseSchemaHash() { return digest(GENESIS_PASS_C_INITIAL_RESPONSE_SCHEMA); }
export function passCReinterpretationResponseSchemaHash() { return digest(GENESIS_PASS_C_REINTERPRETATION_RESPONSE_SCHEMA); }

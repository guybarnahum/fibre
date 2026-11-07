// fibre-test-lifecycle: regression
// fibre-test-scope: world-kernel
// fibre-test-purpose: world-owned-llm-prompt-assets-are-runtime-authority

import assert from "node:assert/strict";
import test from "node:test";

import { resolvePromptAsset } from "#integrations/ai/reasoning/prompt-assets.mjs";
import { DIGNITY_GUARDIAN_V4_SYSTEM_PROMPT } from "../src/dignity-guardian-evaluation.mjs";
import { IDENTITY_CONTEXT_REASONING_PROMPT } from "../src/identity-context-capsule.mjs";
import { MODEL_SMOKE_PROMPT } from "../../../tools/model/model-api-smoke.mjs";

const WORLD_KERNEL_PROMPTS = new URL("../prompts/", import.meta.url);
const MODEL_PROMPTS = new URL("../../../tools/model/prompts/", import.meta.url);
const asset = (directory, id) => resolvePromptAsset({ directory, id }).text;

test("World and diagnostic prompt owners resolve only their own prompt assets", () => {
  assert.equal(DIGNITY_GUARDIAN_V4_SYSTEM_PROMPT, asset(WORLD_KERNEL_PROMPTS, "dignity.guardian"));
  assert.equal(IDENTITY_CONTEXT_REASONING_PROMPT.text, asset(WORLD_KERNEL_PROMPTS, "identity-context.local-reasoning"));
  assert.equal(MODEL_SMOKE_PROMPT, asset(MODEL_PROMPTS, "model.smoke"));
});

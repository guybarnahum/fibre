// fibre-test-lifecycle: regression
// fibre-test-scope: world-kernel
// fibre-test-purpose: llm-prompt-assets-are-runtime-authority

import assert from "node:assert/strict";
import test from "node:test";

import { resolvePromptAsset } from "#integrations/ai/reasoning/prompt-assets.mjs";
import {
  GENESIS_PASS_A_PROMPT,
  GENESIS_PASS_A_REPAIR_PROMPT,
} from "../src/genesis-pass-a-runner.mjs";
import {
  GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT,
  GENESIS_LIFE_PASS_A_PROMPT,
  GENESIS_LIFE_PASS_A_RETRY_PROMPT,
} from "../src/genesis-life-pass-a.mjs";
import {
  GENESIS_RICH_PASS_A_PROMPT,
  GENESIS_RICH_PASS_A_RECORD_RETRY_PROMPT,
  GENESIS_RICH_PASS_A_REPAIR_PROMPT,
  GENESIS_RICH_PASS_A_SELECTED_OPPORTUNITY_PROMPT,
  GENESIS_RICH_PASS_A_SELECTED_OPPORTUNITY_RETRY_PROMPT,
  richPassAPromptForPolicy,
} from "../src/genesis-rich-pass-a-runner.mjs";
import { GENESIS_PASS_A_RELIABILITY_POLICY_V3 } from "../src/genesis-pass-a-reliability-v3.mjs";
import { GENESIS_PASS_B_PROMPT } from "../src/genesis-pass-b-prompts.mjs";
import { GENESIS_PASS_B_GENOME_COPY_RETRY_PROMPT } from "../src/genesis-pass-b-admission.mjs";
import {
  GENESIS_LIFE_PASS_B_COGNITION_PROMPT,
  GENESIS_LIFE_PASS_B_GENOME_COPY_RETRY_PROMPT,
} from "../src/genesis-life-pass-b.mjs";
import {
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESTRAINT_AMENDMENT,
  GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT,
} from "../src/genesis-pass-c-prompts.mjs";
import { DIGNITY_GUARDIAN_V4_SYSTEM_PROMPT } from "../src/dignity-guardian-evaluation.mjs";
import { IDENTITY_CONTEXT_REASONING_PROMPT } from "../src/identity-context-capsule.mjs";
import { sha256 } from "../src/persistence-common.mjs";
import { GENESIS_D5_EVALUATOR_PROMPT } from "../../../tools/genesis/genesis-d5-sealed-history-diagnostic.mjs";
import { MODEL_SMOKE_PROMPT } from "../../../tools/model/model-api-smoke.mjs";

const WORLD_KERNEL_PROMPTS = new URL("../prompts/", import.meta.url);
const D5_PROMPTS = new URL("../../../tools/genesis/prompts/", import.meta.url);
const MODEL_PROMPTS = new URL("../../../tools/model/prompts/", import.meta.url);
const asset = (directory, id) => resolvePromptAsset({ directory, id }).text;
const digest = (text) => `sha256:${sha256(text)}`;

test("supported LLM prompt owners resolve their prose from prompt assets", () => {
  assert.equal(GENESIS_PASS_A_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.pass-a"));
  assert.equal(GENESIS_PASS_A_REPAIR_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.pass-a-repair"));
  assert.equal(GENESIS_LIFE_PASS_A_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.historical-realization"));
  assert.equal(GENESIS_LIFE_PASS_A_RETRY_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.historical-realization-retry"));
  assert.equal(GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.observable-action-repair"));

  assert.equal(GENESIS_RICH_PASS_A_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.rich-pass-a"));
  assert.equal(GENESIS_RICH_PASS_A_SELECTED_OPPORTUNITY_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.rich-pass-a-selected-opportunity"));
  assert.equal(GENESIS_RICH_PASS_A_REPAIR_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.rich-pass-a-repair"));
  assert.equal(GENESIS_RICH_PASS_A_RECORD_RETRY_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.rich-pass-a-record-retry"));
  assert.equal(GENESIS_RICH_PASS_A_SELECTED_OPPORTUNITY_RETRY_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.rich-pass-a-selected-opportunity-retry"));
  assert.equal(
    richPassAPromptForPolicy({ generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3 }),
    `${asset(WORLD_KERNEL_PROMPTS, "genesis.rich-pass-a")}\n\n${asset(WORLD_KERNEL_PROMPTS, "genesis.rich-pass-a-form-target")}`,
  );

  assert.equal(GENESIS_PASS_B_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.memory-formation.base"));
  assert.equal(GENESIS_PASS_B_GENOME_COPY_RETRY_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.memory-genome-copy-retry"));
  assert.equal(GENESIS_LIFE_PASS_B_COGNITION_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.memory-formation"));
  assert.equal(GENESIS_LIFE_PASS_B_GENOME_COPY_RETRY_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.memory-formation-genome-copy-retry"));

  assert.equal(GENESIS_PASS_C_INITIAL_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.meaning-initial"));
  assert.equal(GENESIS_PASS_C_REINTERPRETATION_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.meaning-reinterpretation.base"));
  assert.equal(GENESIS_PASS_C_REINTERPRETATION_RESTRAINT_AMENDMENT, asset(WORLD_KERNEL_PROMPTS, "genesis.meaning-reinterpretation-restraint"));
  assert.equal(GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT, asset(WORLD_KERNEL_PROMPTS, "genesis.meaning-reinterpretation"));

  assert.equal(DIGNITY_GUARDIAN_V4_SYSTEM_PROMPT, asset(WORLD_KERNEL_PROMPTS, "dignity.guardian"));
  assert.equal(
    IDENTITY_CONTEXT_REASONING_PROMPT.text,
    asset(WORLD_KERNEL_PROMPTS, "identity-context.local-reasoning"),
  );
  assert.equal(GENESIS_D5_EVALUATOR_PROMPT, asset(D5_PROMPTS, "genesis.d5-sealed-history-evaluator"));
  assert.equal(MODEL_SMOKE_PROMPT, asset(MODEL_PROMPTS, "model.smoke"));
});

test("scientifically pinned resolved prompts retain their exact bytes", () => {
  assert.equal(digest(GENESIS_LIFE_PASS_B_COGNITION_PROMPT), "sha256:3ba80ac180b5140bc3710a33c78ed6e14bc666979e60223ca44bcba32399f26a");
  assert.equal(digest(GENESIS_PASS_C_INITIAL_PROMPT), "sha256:a631988658a66dab9262150f5b378443f71263f1671244a30cdac2618905a8d9");
  assert.equal(digest(GENESIS_PASS_C_REINTERPRETATION_PROMPT), "sha256:03e2790535fbe54156fac49d48fea2e1139fed29b9e634765658d6c14c58f0ae");
  assert.equal(digest(GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT), "sha256:79003bbc27920be774d372c0f19fc4a96567a550b0f7db3db51cb19a7a5327e4");
  assert.equal(digest(GENESIS_D5_EVALUATOR_PROMPT), "sha256:8a406e4dec1292fae6e4da801212cd11d829eb55d961d8a8db27d4fdb00437c4");
});

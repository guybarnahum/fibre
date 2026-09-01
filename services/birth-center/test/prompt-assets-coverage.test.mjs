// fibre-test-lifecycle: regression
// fibre-test-scope: birth-center
// fibre-test-purpose: genesis-provider-prompts-are-birth-owned-runtime-authority

import assert from "node:assert/strict";
import test from "node:test";

import { resolvePromptAsset } from "#integrations/ai/reasoning/prompt-assets.mjs";
import {
  GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT,
  GENESIS_LIFE_PASS_A_PROMPT,
  GENESIS_LIFE_PASS_A_RETRY_PROMPT,
  GENESIS_LIFE_PASS_B_COGNITION_PROMPT,
  GENESIS_LIFE_PASS_B_GENOME_COPY_RETRY_PROMPT,
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESTRAINT_AMENDMENT,
  GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT,
} from "fibre/birth-center/genesis-development";
import { sha256 } from "fibre/world-kernel/genesis-authority-contracts";

const BIRTH_PROMPTS = new URL("../prompts/", import.meta.url);
const asset = (id) => resolvePromptAsset({ directory: BIRTH_PROMPTS, id }).text;
const digest = (text) => `sha256:${sha256(text)}`;

test("Birth-owned Genesis generation resolves prose from Birth prompt assets", () => {
  assert.equal(GENESIS_LIFE_PASS_A_PROMPT, asset("genesis.historical-realization"));
  assert.equal(GENESIS_LIFE_PASS_A_RETRY_PROMPT, asset("genesis.historical-realization-retry"));
  assert.equal(GENESIS_LIFE_PASS_A_FORM_REPAIR_PROMPT, asset("genesis.observable-action-repair"));
  assert.equal(GENESIS_LIFE_PASS_B_COGNITION_PROMPT, asset("genesis.memory-formation"));
  assert.equal(GENESIS_LIFE_PASS_B_GENOME_COPY_RETRY_PROMPT, asset("genesis.memory-formation-genome-copy-retry"));
  assert.equal(GENESIS_PASS_C_INITIAL_PROMPT, asset("genesis.meaning-initial"));
  assert.equal(GENESIS_PASS_C_REINTERPRETATION_PROMPT, asset("genesis.meaning-reinterpretation.base"));
  assert.equal(GENESIS_PASS_C_REINTERPRETATION_RESTRAINT_AMENDMENT, asset("genesis.meaning-reinterpretation-restraint"));
  assert.equal(GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT, asset("genesis.meaning-reinterpretation"));
});

test("promoted Genesis prompt bytes remain pinned through the ownership move", () => {
  assert.equal(digest(GENESIS_LIFE_PASS_B_COGNITION_PROMPT), "sha256:3ba80ac180b5140bc3710a33c78ed6e14bc666979e60223ca44bcba32399f26a");
  assert.equal(digest(GENESIS_PASS_C_INITIAL_PROMPT), "sha256:a631988658a66dab9262150f5b378443f71263f1671244a30cdac2618905a8d9");
  assert.equal(digest(GENESIS_PASS_C_REINTERPRETATION_PROMPT), "sha256:03e2790535fbe54156fac49d48fea2e1139fed29b9e634765658d6c14c58f0ae");
  assert.equal(digest(GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT), "sha256:79003bbc27920be774d372c0f19fc4a96567a550b0f7db3db51cb19a7a5327e4");
});

test("Genesis prompts retain personhood and constitutive-meaning semantics", () => {
  assert.match(GENESIS_LIFE_PASS_A_PROMPT, /priorEpisodes as continuity and anti-repetition context/iu);
  assert.match(GENESIS_LIFE_PASS_A_PROMPT, /do not repeatedly default to the same subject matter/iu);
  assert.match(GENESIS_LIFE_PASS_A_PROMPT, /underused domain afforded by this World and place/iu);
  assert.match(GENESIS_LIFE_PASS_A_PROMPT, /Do not invent a domain solely for diversity/iu);

  for (const prompt of [GENESIS_PASS_C_INITIAL_PROMPT, GENESIS_PASS_C_REINTERPRETATION_PROMPT]) {
    assert.match(prompt, /Thread's own concise first-person interpretation/iu);
    assert.doesNotMatch(prompt, /preferred narrative coherence is required/iu);
  }
  assert.match(GENESIS_PASS_C_INITIAL_PROMPT, /no_durable_meaning is fully legal/iu);
  assert.match(GENESIS_PASS_C_REINTERPRETATION_PROMPT, /All three outcomes are fully legal; do not force revision/iu);
  assert.match(GENESIS_PASS_C_REINTERPRETATION_PROMPT, /without making the life more coherent/iu);
});

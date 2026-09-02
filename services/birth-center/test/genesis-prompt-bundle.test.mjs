import assert from "node:assert/strict";
import test from "node:test";

import { resolvePromptAsset } from "#integrations/ai/reasoning/prompt-assets.mjs";
import {
  BIRTH_CENTER_PROMPT_IDS,
  birthCenterPromptResolution,
  birthCenterPromptText,
} from "../src/genesis-prompt-bundle.mjs";

const PROMPT_DIRECTORY = new URL("../prompts/", import.meta.url);
const EXPECTED_PROMPT_IDS = Object.freeze([
  "genesis.historical-realization",
  "genesis.historical-realization-retry",
  "genesis.observable-action-repair",
  "genesis.memory-formation",
  "genesis.memory-formation-genome-copy-retry",
  "genesis.memory-formation.base",
  "genesis.meaning-initial",
  "genesis.meaning-reinterpretation.base",
  "genesis.meaning-reinterpretation-restraint",
  "genesis.meaning-reinterpretation",
]);

test("Birth Center Worker prompt bundle is byte-for-byte equivalent to canonical prompt assets", () => {
  assert.deepEqual(BIRTH_CENTER_PROMPT_IDS, EXPECTED_PROMPT_IDS);
  for (const id of EXPECTED_PROMPT_IDS) {
    const expected = resolvePromptAsset({ directory: PROMPT_DIRECTORY, id });
    const bundled = birthCenterPromptResolution(id);
    assert.deepEqual(bundled, expected, id);
    assert.equal(birthCenterPromptText(id), expected.text, id);
  }
});

test("Birth Center Worker prompt bundle fails closed on unknown prompt ids", () => {
  assert.throws(() => birthCenterPromptText("genesis.not-real"), /unknown Birth Center prompt genesis\.not-real/u);
});

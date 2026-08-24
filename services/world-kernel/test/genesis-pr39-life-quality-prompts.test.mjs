// fibre-test-lifecycle: milestone
// fibre-test-scope: pr39
// fibre-test-purpose: rich-life prompt semantics that prevent thematic collapse and analyst-owned meaning
// fibre-test-disposition: consolidate into permanent Genesis personhood invariants after PR39

import assert from "node:assert/strict";
import test from "node:test";

import { GENESIS_LIFE_PASS_A_PROMPT } from "../src/genesis-life-pass-a.mjs";
import {
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
} from "../src/genesis-pass-c-prompts.mjs";

test("PR39 Pass A preserves continuity without collapsing different life structures into one subject matter", () => {
  assert.match(GENESIS_LIFE_PASS_A_PROMPT, /priorEpisodes as continuity and anti-repetition context/iu);
  assert.match(GENESIS_LIFE_PASS_A_PROMPT, /do not repeatedly default to the same subject matter/iu);
  assert.match(GENESIS_LIFE_PASS_A_PROMPT, /underused domain afforded by this World and place/iu);
  assert.match(GENESIS_LIFE_PASS_A_PROMPT, /Do not invent a domain solely for diversity/iu);
});

test("PR39 Pass C asks for Thread-owned specific meaning rather than evaluator biography", () => {
  for (const prompt of [GENESIS_PASS_C_INITIAL_PROMPT, GENESIS_PASS_C_REINTERPRETATION_PROMPT]) {
    assert.match(prompt, /Thread's own concise first-person interpretation/iu);
    assert.doesNotMatch(prompt, /preferred narrative coherence is required/iu);
  }
  assert.match(GENESIS_PASS_C_INITIAL_PROMPT, /specific expectation, attachment, doubt, aversion, question, association, or tension/iu);
  assert.match(GENESIS_PASS_C_INITIAL_PROMPT, /do not inflate one sparse remembered experience into a global personality or life lesson/iu);
  assert.match(GENESIS_PASS_C_REINTERPRETATION_PROMPT, /without making the life more coherent/iu);
});

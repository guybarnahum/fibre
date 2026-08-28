// fibre-test-lifecycle: regression
// fibre-test-scope: genesis
// fibre-test-purpose: preserve-promoted-selective-memory-prompt

import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_LIFE_PASS_B_COGNITION_PROMPT,
  GENESIS_LIFE_PASS_B_PROMPT_ID,
  GENESIS_LIFE_PASS_B_PROMPT_RESOLUTION,
} from "../src/genesis-life-pass-b.mjs";
import { sha256 } from "../src/persistence-common.mjs";

const rawDigest = (value) => `sha256:${sha256(value)}`;

test("runtime Pass-B prompt resolves from the exact prospectively validated prompt asset", () => {
  assert.equal(GENESIS_LIFE_PASS_B_PROMPT_ID, "genesis.memory-formation");
  assert.equal(GENESIS_LIFE_PASS_B_PROMPT_RESOLUTION.profile, null);
  assert.equal(GENESIS_LIFE_PASS_B_PROMPT_RESOLUTION.text, GENESIS_LIFE_PASS_B_COGNITION_PROMPT);
  assert.equal(
    GENESIS_LIFE_PASS_B_PROMPT_RESOLUTION.digest,
    "sha256:3ba80ac180b5140bc3710a33c78ed6e14bc666979e60223ca44bcba32399f26a",
  );
  assert.equal(
    rawDigest(GENESIS_LIFE_PASS_B_COGNITION_PROMPT),
    "sha256:3ba80ac180b5140bc3710a33c78ed6e14bc666979e60223ca44bcba32399f26a",
  );
});

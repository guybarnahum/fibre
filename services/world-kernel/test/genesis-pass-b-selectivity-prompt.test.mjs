// fibre-test-lifecycle: regression
// fibre-test-scope: genesis
// fibre-test-purpose: preserve-promoted-selective-memory-prompt

import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_LIFE_PASS_B_COGNITION_PROMPT,
  GENESIS_LIFE_PASS_B_PROMPT,
  GENESIS_LIFE_PASS_B_SELECTIVITY_AMENDMENT,
} from "../src/genesis-life-pass-b.mjs";
import { sha256 } from "../src/persistence-common.mjs";

const rawDigest = (value) => `sha256:${sha256(value)}`;

test("runtime Pass-B prompt is the exact prospectively validated selective-memory candidate", () => {
  assert.equal(
    GENESIS_LIFE_PASS_B_COGNITION_PROMPT,
    `${GENESIS_LIFE_PASS_B_PROMPT}\n\nSelective-memory authority:\n${GENESIS_LIFE_PASS_B_SELECTIVITY_AMENDMENT}`,
  );
  assert.equal(
    rawDigest(GENESIS_LIFE_PASS_B_COGNITION_PROMPT),
    "sha256:3ba80ac180b5140bc3710a33c78ed6e14bc666979e60223ca44bcba32399f26a",
  );
});

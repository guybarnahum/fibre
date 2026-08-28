// fibre-test-lifecycle: regression
// fibre-test-scope: genesis
// fibre-test-purpose: preserve-promoted-reinterpretation-restraint-prompt

import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_PASS_C_INITIAL_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_PROMPT,
  GENESIS_PASS_C_REINTERPRETATION_RESTRAINT_AMENDMENT,
  GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT,
} from "../src/genesis-pass-c-prompts.mjs";
import { sha256 } from "../src/persistence-common.mjs";

const rawDigest = (value) => `sha256:${sha256(value)}`;

test("runtime Pass-C reinterpretation prompt is the exact validated restraint candidate", () => {
  assert.equal(
    rawDigest(GENESIS_PASS_C_INITIAL_PROMPT),
    "sha256:a631988658a66dab9262150f5b378443f71263f1671244a30cdac2618905a8d9",
    "initial meaning prompt must remain unchanged",
  );
  assert.equal(
    rawDigest(GENESIS_PASS_C_REINTERPRETATION_PROMPT),
    "sha256:03e2790535fbe54156fac49d48fea2e1139fed29b9e634765658d6c14c58f0ae",
    "burned reinterpretation baseline must remain replayable",
  );
  assert.equal(
    GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT,
    `${GENESIS_PASS_C_REINTERPRETATION_PROMPT}\n\nReinterpretation-restraint authority:\n${GENESIS_PASS_C_REINTERPRETATION_RESTRAINT_AMENDMENT}`,
  );
  assert.equal(
    rawDigest(GENESIS_PASS_C_REINTERPRETATION_RUNTIME_PROMPT),
    "sha256:79003bbc27920be774d372c0f19fc4a96567a550b0f7db3db51cb19a7a5327e4",
    "runtime prompt must equal the prospectively validated correction candidate",
  );
});

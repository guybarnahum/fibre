import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSourceContains,
  assertSourceOmits,
} from "./source-invariant.mjs";

function captureFailure(callback) {
  try {
    callback();
  } catch (error) {
    return error;
  }
  throw new Error("expected source invariant to fail");
}

test("source invariant failures name the invariant without printing source contents", () => {
  const marker = "SOURCE_CONTENT_MUST_NOT_APPEAR_IN_DIAGNOSTIC";
  const source = `${marker}\n${"const value = 1;\n".repeat(2000)}`;

  const missing = captureFailure(() => assertSourceContains(
    source,
    /required-token/u,
    "Editor source must contain the required safe rendering primitive",
  ));
  assert.match(missing.message, /required safe rendering primitive/u);
  assert.equal(
    missing.message.includes(marker),
    false,
    "source invariant failure must not echo the inspected source text",
  );

  const forbidden = captureFailure(() => assertSourceOmits(
    source,
    /SOURCE_CONTENT_MUST_NOT_APPEAR_IN_DIAGNOSTIC/u,
    "Editor source must omit the forbidden rendering primitive",
  ));
  assert.match(forbidden.message, /omit the forbidden rendering primitive/u);
  assert.equal(
    forbidden.message.includes(marker),
    false,
    "source invariant failure must report the invariant, not the matching source text",
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  EXPECTED_REPLACEMENT_G2_PROTOCOL_DIGEST,
  verifyReplacementG2CeilingPreflight,
} from "./genesis-replacement-g2-ceiling-preflight.mjs";

test("replacement G2 ceiling first-run preflight binds exact frozen protocol and remains zero-call", () => {
  const result = verifyReplacementG2CeilingPreflight({ exists: () => false });
  assert.equal(result.status, "CLEAR_REPLACEMENT_G2_CEILING_FIRST_RUN_ZERO_CALL");
  assert.equal(result.protocolDigest, EXPECTED_REPLACEMENT_G2_PROTOCOL_DIGEST);
  assert.equal(result.pairCount, 5);
  assert.equal(result.callsPerPair, 72);
  assert.equal(result.maximumProviderCalls, 360);
  assert.deepEqual(result.generator, { provider: "google", model: "gemini-3.6-flash" });
  assert.deepEqual(result.rater, { provider: "openai", model: "gpt-5.1-2025-11-13" });
  assert.equal(result.resultPaths.length, 6);
  assert.equal(result.finalLifeCognitionAuthorized, false);
});

test("replacement G2 ceiling first-run preflight refuses a started result set", () => {
  let seen = 0;
  assert.throws(
    () => verifyReplacementG2CeilingPreflight({
      exists: () => {
        seen += 1;
        return seen === 2;
      },
    }),
    /ceiling has already started; preserve existing results and use resumable runner/,
  );
});

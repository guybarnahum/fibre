import assert from "node:assert/strict";
import test from "node:test";

import { verifyReplacementGateG2Closure } from "./genesis-replacement-gate-g2-closure-verify.mjs";

test("historical Gate-G(2) closure fails closed once replacement-v2 redesign changes execution authority", () => {
  assert.throws(
    () => verifyReplacementGateG2Closure(),
    /replacement execution authority changed after Gate-G\(2\)/,
  );
});

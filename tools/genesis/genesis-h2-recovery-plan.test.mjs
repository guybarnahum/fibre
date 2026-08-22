import assert from "node:assert/strict";
import test from "node:test";

import { buildH2RecoveryExecutionPlan } from "./genesis-h2-recovery-plan.mjs";
import { parseH2RecoveryMode } from "./genesis-h2-recovery.mjs";

test("H-v2 recovery execution plan cannot be rebuilt after the terminal recovery HOLD", () => {
  assert.throws(
    () => buildH2RecoveryExecutionPlan(),
    /requires a clear zero-call resume preflight/,
  );
});

test("H-v2 recovery command surface remains inspection-only after terminal HOLD", () => {
  assert.throws(
    () => parseH2RecoveryMode(["--execute"]),
    /execution is closed/,
  );
});

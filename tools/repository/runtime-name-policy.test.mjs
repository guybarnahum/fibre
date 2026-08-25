import assert from "node:assert/strict";
import test from "node:test";

import { runtimeNameSmellReason, validateRuntimeNames } from "./runtime-name-policy.mjs";

test("runtime naming policy accepts semantic capability names", () => {
  assert.equal(runtimeNameSmellReason("services/thread-presentation/src/index.mjs"), null);
  assert.equal(runtimeNameSmellReason("services/world-kernel/src/autobiographical-memory-domain.mjs"), null);
});

test("runtime naming policy detects development chronology under service src trees", () => {
  assert.equal(runtimeNameSmellReason("services/world-kernel/src/pr40-candidate.mjs"), "PR number");
  assert.equal(runtimeNameSmellReason("services/world-kernel/src/m3-candidate.mjs"), "milestone label");
  assert.equal(runtimeNameSmellReason("services/world-kernel/src/genesis-slice-f.mjs"), "stage or slice label");
  assert.equal(runtimeNameSmellReason("services/world-kernel/src/genesis-pass-d.mjs"), "pass label");
  assert.equal(runtimeNameSmellReason("services/world-kernel/src/new-runtime-v5.mjs"), "implementation version suffix");
});

test("runtime naming policy permits only explicitly frozen existing debt", () => {
  const path = "services/world-kernel/src/dignity-guardian-v4.mjs";
  assert.deepEqual(validateRuntimeNames([path], { debtPaths: [path] }), []);
});

test("runtime naming policy rejects both new debt and stale waivers", () => {
  assert.deepEqual(
    validateRuntimeNames(
      ["services/world-kernel/src/genesis-pass-d.mjs"],
      { debtPaths: ["services/world-kernel/src/genesis-pass-a.mjs"] },
    ),
    [
      "New development-chronology runtime name (pass label): services/world-kernel/src/genesis-pass-d.mjs",
      "Runtime naming debt allowance is stale and must be removed: services/world-kernel/src/genesis-pass-a.mjs",
    ],
  );
});

import assert from "node:assert/strict";
import { lstatSync, realpathSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const EXECUTABLE_WRAPPERS = Object.freeze([
  "../m1-demo-world-kernel.mjs",
]);

const RELOCATION_ALIASES = Object.freeze([
  "../genesis-rich-life-e2-a0.mjs",
  "../genesis-rich-life-e2-worlds.mjs",
  "../genesis-rich-life-dev.mjs",
  "../inspect-structured-obligations.mjs",
  "../editor/m1-reviewed-proof.mjs",
  "../inspect/m1-reviewed-proof.mjs",
  "../genesis/genesis-rich-life-e2-n1.mjs",
  "../repro/guardian/semantic-guardian-v4-dev-proof.mjs",
  "../repro/guardian/semantic-guardian-v4-counterfactual-dev.mjs",
  "../repro/m1/serve-thread-editor.mjs",
  "../repro/m1/inspect-world-database.mjs",
]);

test("Stage 6 relocation compatibility edges resolve and remain importable", async () => {
  for (const relativePath of EXECUTABLE_WRAPPERS) {
    const url = new URL(relativePath, import.meta.url);
    const path = fileURLToPath(url);
    assert.equal(lstatSync(path).isSymbolicLink(), false, `${relativePath} must remain a real executable wrapper so its main guard is stable`);
    await assert.doesNotReject(import(url), `${relativePath} must remain importable after relocation`);
  }

  for (const relativePath of RELOCATION_ALIASES) {
    const url = new URL(relativePath, import.meta.url);
    const path = fileURLToPath(url);
    assert.equal(lstatSync(path).isSymbolicLink(), true, `${relativePath} must remain an explicit relocation alias`);
    assert.ok(realpathSync(path), `${relativePath} must resolve to a retained target`);
    await assert.doesNotReject(import(url), `${relativePath} must remain importable after relocation`);
  }
});

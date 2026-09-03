import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeCloudE2EEnvironment,
  parseCloudE2EArgs,
  runCloudflareE2E,
} from "./cloudflare-e2e.mjs";

test("Cloudflare E2E accepts staging only", () => {
  assert.equal(normalizeCloudE2EEnvironment("staging"), "staging");
  assert.throws(() => normalizeCloudE2EEnvironment("production"), /unsupported Cloudflare E2E environment/);
  assert.throws(() => normalizeCloudE2EEnvironment("local"), /unsupported Cloudflare E2E environment/);
});

test("Cloudflare E2E CLI requires an explicit environment", () => {
  assert.deepEqual(parseCloudE2EArgs(["--env", "staging"]), { environment: "staging" });
  assert.throws(() => parseCloudE2EArgs([]), /--env staging is required/);
  assert.throws(() => parseCloudE2EArgs(["--mode", "staging"]), /unsupported argument --mode/);
});

test("Cloudflare E2E dispatches to the existing staging evidence harness", async () => {
  let calls = 0;
  const result = await runCloudflareE2E({
    environment: "staging",
    async runStaging() {
      calls += 1;
      return Object.freeze({
        evidence: Object.freeze({ contract: "fibre-slice-g-cloud-e2e-evidence-v1" }),
        evidencePath: "/tmp/fibre/evidence.json",
      });
    },
  });

  assert.equal(calls, 1);
  assert.equal(result.environment, "staging");
  assert.equal(result.evidence.contract, "fibre-slice-g-cloud-e2e-evidence-v1");
  assert.equal(result.evidencePath, "/tmp/fibre/evidence.json");
});

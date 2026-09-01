import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  E2E_ACTIVITY_REFERENCE_VERSION,
  runStagingGenesisDevelopmentE2EWithActivity,
} from "./genesis-development-e2e-staging.mjs";

const REQUEST_ID = "genesis-staging-wrapper-test";
const GENESIS_ID = "gen_wrapper_test";
const THREAD_ID = "thr_wrapper_test";

function coreResult(directory) {
  const evidencePath = resolve(directory, "evidence.json");
  const evidence = {
    contract: "fibre-slice-g-cloud-e2e-evidence-v1",
    environment: "staging",
    request: {
      requestId: REQUEST_ID,
      developmentPlanGenesisId: GENESIS_ID,
      developmentPlanThreadId: THREAD_ID,
    },
    closureAssertions: Array.from({ length: 13 }, (_, index) => ({ id: index + 1, passed: true })),
  };
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  return { evidence, evidencePath };
}

test("staging wrapper retains request/genesis/thread Activity references without replacing closure assertions", async () => {
  const directory = mkdtempSync(resolve(tmpdir(), "fibre-staging-activity-wrapper-"));
  const core = coreResult(directory);
  const calls = [];
  const records = [
    {
      activityId: "act_failed",
      occurredAt: "2026-09-01T05:31:15.000Z",
      service: "asset-generator",
      stage: "asset.generation",
      status: "failed",
      attempt: 1,
      error: { category: "provider", code: "BFL_503", retryable: true },
    },
    {
      activityId: "act_retry",
      occurredAt: "2026-09-01T05:31:17.000Z",
      service: "asset-generator",
      stage: "asset.generation",
      status: "retrying",
      attempt: 2,
      error: null,
    },
  ];
  const inspect = async ({ selector }) => {
    calls.push(selector);
    return {
      databaseName: "fibre-activity-log-staging",
      records,
      summary: "completed; asset.generation recovered after 1 retry event(s)",
    };
  };

  const result = await runStagingGenesisDevelopmentE2EWithActivity({
    repoRoot: directory,
    environment: {},
    runCore: async () => core,
    activityReader: {},
    inspect,
    emit: () => {},
  });

  assert.deepEqual(calls, [
    { kind: "requestId", value: REQUEST_ID },
    { kind: "genesisId", value: GENESIS_ID },
    { kind: "threadId", value: THREAD_ID },
  ]);
  assert.equal(result.evidence.activityLog.contract, E2E_ACTIVITY_REFERENCE_VERSION);
  assert.equal(result.evidence.activityLog.available, true);
  assert.equal(result.evidence.activityLog.request.databaseName, "fibre-activity-log-staging");
  assert.equal(result.evidence.activityLog.request.recordCount, 2);
  assert.equal(result.evidence.activityLog.failuresAndRetries.length, 2);
  assert.equal(result.evidence.closureAssertions.length, 13);
  assert.ok(result.evidence.closureAssertions.every((item) => item.passed === true));

  const retained = JSON.parse(readFileSync(core.evidencePath, "utf8"));
  assert.equal(retained.contract, "fibre-slice-g-cloud-e2e-evidence-v1");
  assert.equal(retained.activityLog.request.selector.value, REQUEST_ID);
});

test("Activity inspection failure is retained diagnostically and cannot suppress successful semantic E2E", async () => {
  const directory = mkdtempSync(resolve(tmpdir(), "fibre-staging-activity-fail-open-"));
  const core = coreResult(directory);
  const result = await runStagingGenesisDevelopmentE2EWithActivity({
    repoRoot: directory,
    environment: {},
    runCore: async () => core,
    activityReader: {},
    inspect: async () => { throw new Error("activity database unavailable"); },
    emit: () => {},
  });

  assert.equal(result.evidence.activityLog.available, false);
  assert.match(result.evidence.activityLog.error.message, /activity database unavailable/);
  assert.equal(result.evidence.closureAssertions.length, 13);
  assert.ok(result.evidence.closureAssertions.every((item) => item.passed === true));
});

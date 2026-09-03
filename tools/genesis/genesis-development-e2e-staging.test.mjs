import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  E2E_ACTIVITY_REFERENCE_VERSION,
  runStagingGenesisDevelopmentE2EWithActivity,
  terminalWorldFailure,
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

test("terminal World failure classifier ignores retryable failures and selects non-retryable World failure", () => {
  const records = [
    {
      activityId: "act_provider_retry",
      occurredAt: "2026-09-03T17:00:00.000Z",
      service: "world-kernel",
      stage: "world.visual_identity.demand",
      status: "failed",
      message: "provider unavailable",
      error: { category: "provider", code: "UPSTREAM_503", retryable: true },
    },
    {
      activityId: "act_other_terminal",
      occurredAt: "2026-09-03T17:00:01.000Z",
      service: "birth-center",
      stage: "birth.compile",
      status: "failed",
      message: "not relevant to World convergence",
      error: { category: "invariant", code: "OTHER", retryable: false },
    },
    {
      activityId: "act_world_terminal",
      occurredAt: "2026-09-03T17:00:02.000Z",
      service: "world-kernel",
      stage: "world.visual_identity.demand",
      status: "failed",
      message: "Buffer is not defined",
      error: { category: "unknown", code: "ERROR", retryable: false },
    },
  ];

  assert.deepEqual(terminalWorldFailure(records), {
    activityId: "act_world_terminal",
    occurredAt: "2026-09-03T17:00:02.000Z",
    stage: "world.visual_identity.demand",
    code: "ERROR",
    message: "Buffer is not defined",
  });
  assert.equal(terminalWorldFailure(records.slice(0, 2)), null);
});

test("staging wrapper fails fast when active Thread has terminal World reconciliation activity", async () => {
  const directory = mkdtempSync(resolve(tmpdir(), "fibre-staging-fast-fail-"));
  let underlyingSleeps = 0;
  const inspect = async ({ selector }) => {
    assert.deepEqual(selector, { kind: "threadId", value: THREAD_ID });
    return {
      databaseName: "fibre-activity-log-staging",
      records: [{
        activityId: "act_terminal",
        occurredAt: "2026-09-03T17:00:00.000Z",
        service: "world-kernel",
        stage: "world.visual_identity.demand",
        status: "failed",
        message: "canonical visual planner invariant failed",
        error: { category: "invariant", code: "VISUAL_PLAN_INVALID", retryable: false },
      }],
      summary: "terminal failure",
    };
  };

  await assert.rejects(
    runStagingGenesisDevelopmentE2EWithActivity({
      repoRoot: directory,
      environment: {},
      activityRecorder: null,
      activityReader: {},
      inspect,
      sleep: async () => { underlyingSleeps += 1; },
      emit: () => {},
      runCore: async ({ emit, sleep }) => {
        emit({
          event: "genesis-development-e2e-submitted",
          requestId: REQUEST_ID,
          genesisId: GENESIS_ID,
          threadId: THREAD_ID,
          status: "published",
        });
        await sleep(2_000);
        throw new Error("polling should have stopped before this point");
      },
    }),
    /World reconciliation failed terminally at world\.visual_identity\.demand \(VISUAL_PLAN_INVALID\)/,
  );
  assert.equal(underlyingSleeps, 0, "terminal failure is detected before another convergence sleep");
});

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
    activityRecorder: null,
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
    activityRecorder: null,
    activityReader: {},
    inspect: async () => { throw new Error("activity database unavailable"); },
    emit: () => {},
  });

  assert.equal(result.evidence.activityLog.available, false);
  assert.match(result.evidence.activityLog.error.message, /activity database unavailable/);
  assert.equal(result.evidence.closureAssertions.length, 13);
  assert.ok(result.evidence.closureAssertions.every((item) => item.passed === true));
});

test("Activity recorder exceptions are swallowed before they can affect semantic E2E", async () => {
  const directory = mkdtempSync(resolve(tmpdir(), "fibre-staging-activity-recorder-fail-open-"));
  const core = coreResult(directory);
  const events = [];
  let semanticRan = false;

  const result = await runStagingGenesisDevelopmentE2EWithActivity({
    repoRoot: directory,
    environment: {},
    activityRecorder: {
      async record() { throw new Error("recorder implementation bug"); },
    },
    runCore: async ({ activityRecorder }) => {
      const candidate = { stage: "e2e.start", status: "started" };
      const retained = await activityRecorder.record(candidate);
      assert.deepEqual(retained, candidate);
      semanticRan = true;
      return core;
    },
    activityReader: {},
    inspect: async ({ selector }) => ({
      databaseName: "fibre-activity-log-staging",
      records: [],
      summary: `no activity for ${selector.kind}`,
    }),
    emit: (event) => events.push(event),
  });

  assert.equal(semanticRan, true);
  assert.equal(result.evidence.closureAssertions.length, 13);
  assert.ok(events.some((event) => (
    event.event === "genesis-development-staging-activity-write-failed"
    && event.stage === "e2e.start"
    && event.status === "started"
  )));
});

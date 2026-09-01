import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_RECORD_VERSION,
  TELEMETRY_VERSION,
  ActivityTelemetryIdempotencyConflictError,
  createActivityRecorder,
  normalizeActivityRecord,
} from "../telemetry.mjs";
import { createLocalInfraDriver } from "../providers/local/driver.mjs";
import { createLocalActivityTelemetryPort } from "../providers/local/telemetry.mjs";

function activity(overrides = {}) {
  return {
    activityVersion: ACTIVITY_RECORD_VERSION,
    activityId: "act_test_001",
    occurredAt: "2026-09-01T05:31:12.123Z",
    recordedAt: "2026-09-01T05:31:12.129Z",
    environment: "test",
    service: "birth-center",
    deploymentGitSha: "0123456789abcdef0123456789abcdef01234567",
    requestId: "req_genesis_001",
    genesisId: "gen_001",
    threadId: "thr_001",
    experienceId: null,
    sessionId: null,
    correlationId: "corr_001",
    causationId: "cause_001",
    stage: "birth.genesis.history.model_call",
    status: "failed",
    attempt: 1,
    message: "provider timed out",
    error: {
      category: "provider",
      code: "MODEL_TIMEOUT",
      retryable: true,
    },
    evidence: {
      providerRequestId: "provider_req_001",
    },
    ...overrides,
  };
}

test("activity contract normalizes nullable identities and redacts common secret forms", () => {
  const normalized = normalizeActivityRecord(activity({
    genesisId: undefined,
    threadId: undefined,
    message: "Bearer abc.def token=secret-value sk-proj-secretvalue bfl_secretvalue cfk_secretvalue",
  }));

  assert.equal(normalized.genesisId, null);
  assert.equal(normalized.threadId, null);
  assert.equal(normalized.message.includes("secret-value"), false);
  assert.equal(normalized.message.includes("proj-secretvalue"), false);
  assert.equal(normalized.message.includes("bfl_secretvalue"), false);
  assert.equal(normalized.message.includes("cfk_secretvalue"), false);
  assert.match(normalized.message, /\[REDACTED\]/u);
});

test("activity evidence is a bounded safe identifier surface", () => {
  assert.throws(
    () => normalizeActivityRecord(activity({ evidence: { authorization: "Bearer secret" } })),
    /activity\.evidence\.authorization is not allowed/u,
  );
  assert.throws(
    () => normalizeActivityRecord(activity({ rawPrompt: "private biography" })),
    /activity\.rawPrompt is not allowed/u,
  );
});

test("local telemetry admission is idempotent by activityId and conflicts on divergent replay", async () => {
  const telemetry = createLocalActivityTelemetryPort();
  const first = activity();

  assert.deepEqual(await telemetry.record(first), normalizeActivityRecord(first));
  assert.deepEqual(await telemetry.record(first), normalizeActivityRecord(first));
  assert.equal((await telemetry.query({ requestId: "req_genesis_001" })).length, 1);

  await assert.rejects(
    () => telemetry.record(activity({ message: "different content" })),
    ActivityTelemetryIdempotencyConflictError,
  );
});

test("local telemetry queries request/genesis/thread activity in chronological order", async () => {
  const telemetry = createLocalActivityTelemetryPort();
  const records = [
    activity({
      activityId: "act_003",
      occurredAt: "2026-09-01T05:31:03.000Z",
      recordedAt: "2026-09-01T05:31:03.100Z",
      stage: "asset.provider.request",
      status: "succeeded",
      attempt: 2,
      error: null,
    }),
    activity({
      activityId: "act_001",
      occurredAt: "2026-09-01T05:31:01.000Z",
      recordedAt: "2026-09-01T05:31:01.100Z",
      stage: "asset.provider.request",
      status: "failed",
      attempt: 1,
    }),
    activity({
      activityId: "act_002",
      occurredAt: "2026-09-01T05:31:02.000Z",
      recordedAt: "2026-09-01T05:31:02.100Z",
      stage: "asset.provider.request",
      status: "retrying",
      attempt: 2,
      error: null,
    }),
  ];
  for (const record of records) await telemetry.record(record);

  for (const query of [
    { requestId: "req_genesis_001" },
    { genesisId: "gen_001" },
    { threadId: "thr_001" },
  ]) {
    const selected = await telemetry.query(query);
    assert.deepEqual(selected.map((record) => [record.status, record.attempt]), [
      ["failed", 1],
      ["retrying", 2],
      ["succeeded", 2],
    ]);
  }

  assert.deepEqual(
    (await telemetry.query({ status: "failed" })).map((record) => record.activityId),
    ["act_001"],
  );
});

test("runStage records success and failure without swallowing operation results or errors", async () => {
  const telemetry = createLocalActivityTelemetryPort();
  let id = 0;
  const recorder = createActivityRecorder({
    telemetry,
    environment: "test",
    service: "birth-center",
    deploymentGitSha: "0123456789abcdef0123456789abcdef01234567",
    now: () => "2026-09-01T05:40:00.000Z",
    activityIdFactory: () => `act_run_${++id}`,
  });

  const result = await recorder.runStage({
    requestId: "req_run_001",
    genesisId: "gen_run_001",
    threadId: "thr_run_001",
    stage: "birth.genesis.compile",
    attempt: 1,
  }, async () => "compiled");
  assert.equal(result, "compiled");

  const providerError = new Error("Bearer provider-secret failed with token=private-value");
  providerError.activityCategory = "provider";
  providerError.code = "MODEL_TIMEOUT";
  providerError.retryable = true;

  await assert.rejects(
    () => recorder.runStage({
      requestId: "req_run_001",
      genesisId: "gen_run_001",
      threadId: "thr_run_001",
      stage: "birth.genesis.history.model_call",
      attempt: 2,
    }, async () => { throw providerError; }),
    /provider-secret/u,
  );

  const selected = await telemetry.query({ requestId: "req_run_001" });
  assert.deepEqual(selected.map((record) => record.status), [
    "started",
    "succeeded",
    "started",
    "failed",
  ]);
  assert.equal(selected[3].message.includes("provider-secret"), false);
  assert.equal(selected[3].message.includes("private-value"), false);
  assert.deepEqual(selected[3].error, {
    category: "provider",
    code: "MODEL_TIMEOUT",
    retryable: true,
  });
});

test("telemetry storage outage cannot suppress a wrapped Fibre operation", async () => {
  const observedErrors = [];
  let operationCount = 0;
  let id = 0;
  const telemetry = Object.freeze({
    telemetryVersion: TELEMETRY_VERSION,
    async record() { throw new Error("telemetry unavailable"); },
    async query() { return []; },
  });
  const recorder = createActivityRecorder({
    telemetry,
    environment: "test",
    service: "world-kernel",
    now: () => "2026-09-01T05:41:00.000Z",
    activityIdFactory: () => `act_outage_${++id}`,
    onTelemetryError(error, record) {
      observedErrors.push([error.message, record.stage, record.status]);
    },
  });

  const result = await recorder.runStage({
    requestId: "req_outage_001",
    genesisId: "gen_outage_001",
    threadId: "thr_outage_001",
    stage: "world.thread.publication",
    attempt: 1,
  }, async () => {
    operationCount += 1;
    return "published";
  });

  assert.equal(result, "published");
  assert.equal(operationCount, 1);
  assert.deepEqual(observedErrors, [
    ["telemetry unavailable", "world.thread.publication", "started"],
    ["telemetry unavailable", "world.thread.publication", "succeeded"],
  ]);
});

test("local InfraDriver exposes telemetry only when explicitly enabled", async () => {
  const withoutTelemetry = createLocalInfraDriver();
  assert.deepEqual(withoutTelemetry.capabilities, []);
  assert.equal(withoutTelemetry.telemetry, undefined);

  const withTelemetry = createLocalInfraDriver({ telemetry: true });
  assert.deepEqual(withTelemetry.capabilities, ["telemetry"]);
  const stored = await withTelemetry.telemetry.record(activity({ activityId: "act_driver_001" }));
  assert.equal(stored.activityId, "act_driver_001");
});

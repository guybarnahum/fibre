import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTIVITY_RECORD_VERSION,
} from "#infra/telemetry";
import {
  buildActivityInsertSql,
  createWranglerGenesisE2EActivityRecorder,
} from "./genesis-development-e2e-activity.mjs";

const NOW = "2026-09-01T15:55:00.000Z";
const SHA = "abcdef1234567890abcdef1234567890abcdef12";

function state() {
  return {
    contract: "fibre-cloudflare-operator-state-v0.1",
    environment: "staging",
    resources: {
      d1: [{ binding: "ACTIVITY_LOG", name: "fibre-activity-log-staging", id: "activity-db-id" }],
    },
  };
}

function sampleRecord(overrides = {}) {
  return {
    activityVersion: ACTIVITY_RECORD_VERSION,
    activityId: "act_e2e_test_001",
    occurredAt: NOW,
    recordedAt: NOW,
    environment: "staging",
    service: "genesis-e2e",
    deploymentGitSha: SHA,
    requestId: "genesis-staging-test-001",
    genesisId: "gen_staging_test_001",
    threadId: "thr_staging_test_001",
    experienceId: null,
    sessionId: null,
    correlationId: "genesis-staging-test-001",
    causationId: null,
    stage: "e2e.birth_submit",
    status: "succeeded",
    attempt: 1,
    message: null,
    error: null,
    evidence: { worldSpecId: "world_test_001" },
    ...overrides,
  };
}

test("operator Activity insert SQL preserves normalized safe record fields", () => {
  const sql = buildActivityInsertSql(sampleRecord({ message: "safe 'quoted' message" }));
  assert.match(sql, /INSERT INTO fibre_activity_log/);
  assert.match(sql, /'genesis-e2e'/);
  assert.match(sql, /'e2e\.birth_submit'/);
  assert.match(sql, /'safe ''quoted'' message'/);
  assert.match(sql, /'genesis-staging-test-001'/);
  assert.match(sql, /'gen_staging_test_001'/);
  assert.match(sql, /'thr_staging_test_001'/);
});

test("Wrangler Activity recorder writes started and succeeded stage records to the provisioned remote D1", async () => {
  const commands = [];
  let ordinal = 0;
  const recorder = await createWranglerGenesisE2EActivityRecorder({
    repoRoot: "/repo",
    environment: "staging",
    deploymentGitSha: SHA,
    stateReader: async () => state(),
    runner: async (args, options) => {
      commands.push({ args, options });
      return { stdout: "[]", stderr: "", exitCode: 0 };
    },
    now: () => NOW,
    activityIdFactory: () => `act_e2e_writer_${++ordinal}`,
  });

  const result = await recorder.runStage({
    requestId: "genesis-staging-test-001",
    genesisId: "gen_staging_test_001",
    threadId: "thr_staging_test_001",
    correlationId: "genesis-staging-test-001",
    stage: "e2e.world_convergence_wait",
    attempt: 1,
  }, async () => 42);

  assert.equal(result, 42);
  assert.equal(commands.length, 2);
  for (const command of commands) {
    assert.deepEqual(command.args.slice(0, 3), ["d1", "execute", "fibre-activity-log-staging"]);
    assert.equal(command.args.includes("--remote"), true);
    assert.equal(command.options.cwd, "/repo");
  }
  assert.match(commands[0].args.at(-2), /'started'/);
  assert.match(commands[1].args.at(-2), /'succeeded'/);
  assert.match(commands[1].args.at(-2), /'e2e\.world_convergence_wait'/);
});

test("Activity D1 write failure is fail-open and cannot suppress the E2E operation", async () => {
  const telemetryErrors = [];
  let operationRan = false;
  let ordinal = 0;
  const recorder = await createWranglerGenesisE2EActivityRecorder({
    repoRoot: "/repo",
    environment: "staging",
    stateReader: async () => state(),
    runner: async () => { throw new Error("D1 unavailable"); },
    now: () => NOW,
    activityIdFactory: () => `act_e2e_fail_open_${++ordinal}`,
    onTelemetryError(error, activity) {
      telemetryErrors.push({ message: error.message, stage: activity.stage, status: activity.status });
    },
  });

  const result = await recorder.runStage({
    requestId: "genesis-staging-test-001",
    genesisId: "gen_staging_test_001",
    threadId: "thr_staging_test_001",
    correlationId: "genesis-staging-test-001",
    stage: "e2e.asset_visibility",
    attempt: 1,
  }, async () => {
    operationRan = true;
    return "semantic-result";
  });

  assert.equal(operationRan, true);
  assert.equal(result, "semantic-result");
  assert.deepEqual(telemetryErrors, [
    { message: "D1 unavailable", stage: "e2e.asset_visibility", status: "started" },
    { message: "D1 unavailable", stage: "e2e.asset_visibility", status: "succeeded" },
  ]);
});

test("failed E2E operation records the precise failed stage and still rethrows the semantic error", async () => {
  const commands = [];
  let ordinal = 0;
  const recorder = await createWranglerGenesisE2EActivityRecorder({
    repoRoot: "/repo",
    environment: "staging",
    stateReader: async () => state(),
    runner: async (args) => {
      commands.push(args);
      return { stdout: "[]", stderr: "", exitCode: 0 };
    },
    now: () => NOW,
    activityIdFactory: () => `act_e2e_failure_${++ordinal}`,
  });

  await assert.rejects(
    () => recorder.runStage({
      requestId: "genesis-staging-test-001",
      genesisId: "gen_staging_test_001",
      threadId: "thr_staging_test_001",
      correlationId: "genesis-staging-test-001",
      stage: "e2e.viewer_visibility",
      attempt: 1,
    }, async () => { throw new Error("viewer not reachable"); }),
    /viewer not reachable/,
  );

  assert.equal(commands.length, 2);
  assert.match(commands[1].at(-2), /'e2e\.viewer_visibility'/);
  assert.match(commands[1].at(-2), /'failed'/);
  assert.match(commands[1].at(-2), /viewer not reachable/);
});

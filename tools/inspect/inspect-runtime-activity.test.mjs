import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import {
  ACTIVITY_INSPECTION_VERSION,
  buildActivitySql,
  createWranglerActivityReader,
  inspectRuntimeActivity,
  parseActivityInspectArgs,
  renderActivityChain,
} from "./inspect-runtime-activity.mjs";
import { ACTIVITY_RECORD_VERSION } from "../../infra/telemetry.mjs";

const SHA = "1234567890abcdef1234567890abcdef12345678";

function record({ activityId, occurredAt, service, stage, status, attempt, error = null }) {
  return {
    activityVersion: ACTIVITY_RECORD_VERSION,
    activityId,
    occurredAt,
    recordedAt: occurredAt,
    environment: "staging",
    service,
    deploymentGitSha: SHA,
    requestId: "genesis-staging-123",
    genesisId: "gen_123",
    threadId: "thr_123",
    experienceId: null,
    sessionId: null,
    correlationId: "genesis-staging-123",
    causationId: null,
    stage,
    status,
    attempt,
    message: null,
    error,
    evidence: {},
  };
}

const chain = [
  record({ activityId: "act_1", occurredAt: "2026-09-01T05:31:14.000Z", service: "world-kernel", stage: "world.thread.publication", status: "succeeded", attempt: 1 }),
  record({ activityId: "act_2", occurredAt: "2026-09-01T05:31:15.000Z", service: "asset-generator", stage: "asset.generation", status: "failed", attempt: 1, error: { category: "provider", code: "BFL_503", retryable: true } }),
  record({ activityId: "act_3", occurredAt: "2026-09-01T05:31:17.000Z", service: "asset-generator", stage: "asset.generation", status: "retrying", attempt: 2 }),
  record({ activityId: "act_4", occurredAt: "2026-09-01T05:31:20.000Z", service: "asset-generator", stage: "asset.generation", status: "succeeded", attempt: 2 }),
  record({ activityId: "act_5", occurredAt: "2026-09-01T05:31:21.000Z", service: "thread-presentation", stage: "presentation.publication", status: "succeeded", attempt: 1 }),
];

test("Activity inspector parses the accepted operator selectors", () => {
  assert.deepEqual(parseActivityInspectArgs(["--request", "genesis-staging-123"]), {
    environment: "staging",
    selector: { kind: "requestId", value: "genesis-staging-123" },
    json: false,
  });
  assert.deepEqual(parseActivityInspectArgs(["--env", "production", "--thread", "thr_123", "--json"]), {
    environment: "production",
    selector: { kind: "threadId", value: "thr_123" },
    json: true,
  });
  assert.deepEqual(parseActivityInspectArgs(["--failures"]), {
    environment: "staging",
    selector: { kind: "failures", value: true },
    json: false,
  });
  assert.throws(() => parseActivityInspectArgs([]), /one of --request/);
  assert.throws(() => parseActivityInspectArgs(["--request", "bad id"]), /Fibre identifier/);
});

test("Activity SQL preserves environment scoping and failure/retry history", () => {
  assert.match(buildActivitySql({ environment: "staging", selector: { kind: "requestId", value: "genesis-staging-123" } }), /request_id = 'genesis-staging-123'/);
  assert.match(buildActivitySql({ environment: "staging", selector: { kind: "genesisId", value: "gen_123" } }), /genesis_id = 'gen_123'/);
  assert.match(buildActivitySql({ environment: "staging", selector: { kind: "threadId", value: "thr_123" } }), /thread_id = 'thr_123'/);
  const failures = buildActivitySql({ environment: "staging", selector: { kind: "failures", value: true } });
  assert.match(failures, /status IN \('failed', 'retrying'\)/);
  assert.match(failures, /ORDER BY occurred_at ASC, recorded_at ASC, rowid ASC$/);
});

test("one operator read identifies the precise failed stage and successful retry", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "fibre-activity-inspect-"));
  const resourcesPath = resolve(root, ".fibre/cloudflare/staging/resources.json");
  await mkdir(dirname(resourcesPath), { recursive: true });
  await writeFile(resourcesPath, JSON.stringify({
    contract: "fibre-cloudflare-operator-state-v0.1",
    environment: "staging",
    resources: {
      d1: [
        { binding: "PRESENTATION_CATALOG", name: "fibre-presentation-catalog-staging", id: "d1-1" },
        { binding: "ACTIVITY_LOG", name: "fibre-activity-log-staging", id: "d1-2" },
      ],
    },
  }));

  const calls = [];
  const reader = createWranglerActivityReader({
    cwd: root,
    runner: async (args) => {
      calls.push(args);
      return {
        stdout: JSON.stringify([{ success: true, results: chain.map((item) => ({ record_json: JSON.stringify(item) })) }]),
        stderr: "",
        exitCode: 0,
      };
    },
  });
  const result = await inspectRuntimeActivity({
    repoRoot: root,
    environment: "staging",
    selector: { kind: "requestId", value: "genesis-staging-123" },
    reader,
  });

  assert.equal(result.contract, ACTIVITY_INSPECTION_VERSION);
  assert.equal(result.databaseName, "fibre-activity-log-staging");
  assert.equal(result.records.length, 5);
  assert.match(calls[0].join(" "), /d1 execute fibre-activity-log-staging --remote/);
  const output = renderActivityChain(result.records);
  assert.match(output, /REQUEST genesis-staging-123/);
  assert.match(output, /GENESIS gen_123/);
  assert.match(output, /THREAD thr_123/);
  assert.match(output, /Asset Generator asset\.generation failed attempt=1 error=provider\/BFL_503 retryable=true/);
  assert.match(output, /Asset Generator asset\.generation retrying attempt=2/);
  assert.match(output, /Asset Generator asset\.generation succeeded attempt=2/);
  assert.match(output, /FINAL: completed; asset\.generation recovered/);
});

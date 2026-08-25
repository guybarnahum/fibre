import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectionCounts,
  lifecycleOutcome,
  requestSummary,
  runtimeSummary,
} from "#apps/thread-editor/editor-model.js";

test("inspection counts remain derived from the loaded API payload", () => {
  assert.deepEqual(inspectionCounts({
    events: [{}, {}],
    private: { requests: [{}], runtimes: [{}, {}, {}], expressions: [] },
    thread: {
      memoryRefs: ["mem_1"],
      relationshipRefs: ["rel_1", "rel_2"],
      currentState: { unresolvedIntentions: ["obligation"] },
    },
  }), {
    events: 2,
    requests: 1,
    runtimes: 3,
    expressions: 0,
    completeExpressions: 0,
    memories: 1,
    relationships: 2,
    unresolvedIntentions: 1,
  });
});

test("runtime outcome distinguishes freeze, explicit abandonment, lazy timeout, and active state", () => {
  const kernelTime = "2026-08-05T23:30:00.000Z";
  const active = {
    runtime: {
      session: { status: "active" },
      lease: { status: "active", expiresAt: "2026-08-05T23:35:00.000Z" },
    },
  };
  assert.equal(lifecycleOutcome(active, null, null, kernelTime).kind, "active");
  assert.equal(lifecycleOutcome(active, { freeze: { reportId: "frz_1" } }, null, kernelTime).kind, "frozen");
  assert.equal(lifecycleOutcome(active, null, { abandonment: { record: { abandonmentId: "abd_1" } } }, kernelTime).kind, "abandoned");

  const unattended = {
    runtime: {
      session: { status: "active" },
      lease: { status: "active", expiresAt: "2026-08-05T21:05:00.000Z" },
    },
  };
  const lazyTimeout = lifecycleOutcome(unattended, null, null, kernelTime);
  assert.equal(lazyTimeout.kind, "timeout");
  assert.equal(lazyTimeout.label, "Timed out — not yet reclaimed");
  assert.match(lazyTimeout.detail, /persisted lease remains active/);

  assert.equal(lifecycleOutcome({
    runtime: {
      session: { status: "aborted" },
      lease: { status: "expired", expiresAt: "2026-08-05T21:05:00.000Z" },
    },
  }, null, null, kernelTime).kind, "timeout");
});

test("request and runtime summaries tolerate canonical summary and full-record shapes", () => {
  assert.deepEqual(requestSummary({
    requestId: "req_1",
    objective: "Review",
    requester: { displayName: "Guy" },
    desiredAction: "accept",
    dignityBand: "high",
    snapshotVersion: 2,
    occurredAt: "2026-08-05T00:00:00Z",
  }), {
    requestId: "req_1",
    objective: "Review",
    requester: "Guy",
    desiredAction: "accept",
    dignityBand: "high",
    snapshotVersion: 2,
    occurredAt: "2026-08-05T00:00:00Z",
  });
  assert.deepEqual(runtimeSummary({
    session: { sessionId: "run_1", requestId: "req_1", status: "completed", startedAt: "now" },
    lease: { status: "released" },
    goalGuardianAudit: { audit: { decision: "pass" } },
  }), {
    sessionId: "run_1",
    requestId: "req_1",
    status: "completed",
    leaseStatus: "released",
    guardianDecision: "pass",
    desiredAction: null,
    startedAt: "now",
  });
});

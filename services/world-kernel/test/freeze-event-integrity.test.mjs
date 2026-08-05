import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  IntegrityError,
  canonicalJson,
  sha256,
  threadStateHash,
} from "../src/persistence-common.mjs";
import {
  applyFreezeEventToThread,
  buildFreezeOutcome,
} from "../src/freeze-domain.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function runtime() {
  const output = {
    worker: { kind: "deterministic_actor", version: "1" },
    threadId: fixture.threadId,
    snapshotVersion: fixture.version,
    requestId: "req_freeze_event_integrity",
    requestFingerprint: `sha256:${"1".repeat(64)}`,
    objective: "Evaluate a bounded review",
    summary: "Bounded deterministic output",
    steps: [],
    toolCalls: [],
    proposedCommands: [],
    proposedLifeChanges: [{
      kind: "memory",
      summary: "Remember the bounded review outcome.",
      evidenceRefs: ["mem_mina_first_review"],
    }],
  };
  const audit = {
    decision: "pass",
    checks: [{ code: "ALL", passed: true, rationale: "All declared boundaries pass." }],
  };
  const context = {
    relevantMemories: ["mem_mina_first_review"],
    relevantRelationships: ["rel_mina_daniel_colleague"],
  };
  return {
    threadId: fixture.threadId,
    requestId: output.requestId,
    snapshotVersion: fixture.version,
    threadStateHash: threadStateHash(fixture),
    authorization: {
      authorizationId: "auth_freeze_event_integrity",
      authorizedAction: "accept",
      obligationReferences: [],
    },
    lease: {
      leaseId: "lease_freeze_event_integrity",
      status: "active",
      acquiredAt: "2026-08-05T22:00:00Z",
      expiresAt: "2026-08-05T22:10:00Z",
    },
    session: {
      sessionId: "ses_freeze_event_integrity",
      status: "active",
      context,
    },
    actorRun: {
      actorRunId: "act_freeze_event_integrity",
      output,
      outputDigest: digest(output),
    },
    goalGuardianAudit: {
      auditId: "gga_freeze_event_integrity",
      audit,
      auditDigest: digest(audit),
    },
  };
}

function freezeEvent() {
  const currentRuntime = runtime();
  const outcome = buildFreezeOutcome(
    fixture,
    currentRuntime,
    {
      operationId: "op_freeze_event_integrity",
      lifeChangeDecisions: [{
        proposalIndex: 0,
        decision: "accept",
        rationale: "Evidence-bearing memory.",
      }],
      causationId: "cause_freeze_event_integrity",
      correlationId: "corr_freeze_event_integrity",
    },
    {
      reportId: "frz_" + "2".repeat(64),
      completedAt: "2026-08-05T22:01:00Z",
    },
  );
  return {
    event: {
      eventId: outcome.eventId,
      threadId: fixture.threadId,
      sequence: 2,
      expectedVersion: fixture.version,
      resultingVersion: outcome.nextThread.version,
      eventType: "THREAD_FROZEN",
      commandId: outcome.operation.operationId,
      commandDigest: outcome.commitDigest,
      payload: outcome.eventPayload,
      actor: {
        entityId: "fibre.world-kernel",
        kind: "institution",
        displayName: "Fibre World Kernel",
      },
      occurredAt: outcome.report.completedAt,
      stateHash: outcome.resultingStateHash,
      authorizationId: currentRuntime.authorization.authorizationId,
      causationId: outcome.report.causationId,
      correlationId: outcome.report.correlationId,
      payloadSchemaVersion: 1,
      provenance: { source: "test" },
    },
    resultingThread: outcome.nextThread,
  };
}

test("freeze replay binds private witness IDs, authorization, time, and report digest", () => {
  const baseline = freezeEvent();
  assert.deepEqual(
    applyFreezeEventToThread(fixture, baseline.event),
    baseline.resultingThread,
  );

  const mutations = [
    (event) => { event.authorizationId = "auth_substituted"; },
    (event) => { event.payload.freezeReportId = "frz_" + "3".repeat(64); },
    (event) => { event.payload.actorRunId = "act_substituted"; },
    (event) => { event.payload.goalGuardianAuditId = "gga_substituted"; },
    (event) => { event.occurredAt = "2026-08-05T22:02:00Z"; },
    (event) => { event.payload.freezeReportDigest = `sha256:${"4".repeat(64)}`; },
  ];
  for (const mutate of mutations) {
    const event = structuredClone(baseline.event);
    mutate(event);
    assert.throws(
      () => applyFreezeEventToThread(fixture, event),
      IntegrityError,
    );
  }
});

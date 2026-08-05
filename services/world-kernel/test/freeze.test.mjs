import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  WORLD_STORE_SCHEMA_VERSION,
  openWorldStore,
} from "../src/persistence.mjs";
import { openRuntimeStore } from "../src/runtime-store.mjs";
import { openFreezeStore } from "../src/freeze-store.mjs";
import { M1FreezeWorldKernelService } from "../src/freeze-service.mjs";
import {
  AuthorizationConsumedError,
  FreezeRejectedError,
  FreezeStateChangedError,
} from "../src/freeze-domain.mjs";
import { ParticipationAuthorizationRejectedError } from "../src/runtime-domain.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-freeze-"));
  const databasePath = join(directory, "world.sqlite");
  try { return run(databasePath); } finally { rmSync(directory, { recursive: true, force: true }); }
}

function controlledClock(start = "2026-08-05T20:00:00Z") {
  let value = Date.parse(start);
  return {
    clock: () => new Date(value),
    advance(milliseconds) { value += milliseconds; },
    iso() { return new Date(value).toISOString(); },
  };
}

function activationRequest(requestId) {
  return {
    requestId,
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Evaluate a bounded website security review",
    statedNeed: "Identify authorization and privacy risks",
    permissions: ["read_design", "quote_findings"],
    acceptanceCriteria: "Return a concise evidence-bearing review",
  };
}

function appraisalSubmission(requestId, correlationId = "corr_freeze_review") {
  return {
    request: activationRequest(requestId),
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-05T19:55:00Z",
    causationId: `cause_${requestId}`,
    correlationId,
  };
}

function assessment(trace, { action = "accept", score = 82 } = {}) {
  return {
    threadId: trace.threadId,
    snapshotVersion: trace.snapshotVersion,
    requestId: trace.requestId,
    requestFingerprint: trace.requestFingerprint,
    policy: { id: "dignity_guardian", version: "1" },
    proposedAction: action,
    score,
    rationale: "The request is bounded and the private stance is explicit.",
    factors: {
      identityAlignment: "Strong systems-review fit",
      individualizedAdvantage: "Uses Mina's durable review history",
      requesterNeed: "Concrete security need",
      relationalMeaning: "Known collaborator",
      respectAndReciprocity: "Scope is explicit",
      participationTerms: "Bounded and reversible",
      obligationsAndOpportunityCost: "Recorded obligations are evaluated explicitly",
    },
    evidenceRefs: ["mem_mina_first_review"],
    repairQuestions: [],
    knownAlternatives: [],
    feelings: ["careful"],
    conflictingMotives: ["Help", "Preserve autonomy"],
    uncertainties: [],
    relationshipImpact: {
      entity: activationRequest(trace.requestId).requester,
      fondnessDelta: 0,
      resentmentDelta: 0,
      rationale: "No relationship change.",
      evidenceRefs: [],
    },
  };
}

function start(databasePath, { time = controlledClock(), actor, leaseDurationMs = 10 * 60 * 1000 } = {}) {
  const store = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const freezeStore = openFreezeStore(databasePath);
  const service = new M1FreezeWorldKernelService(store, runtimeStore, freezeStore, {
    clock: time.clock,
    leaseDurationMs,
    ...(actor === undefined ? {} : { actor }),
  });
  return {
    store,
    runtimeStore,
    freezeStore,
    service,
    time,
    close() { freezeStore.close(); runtimeStore.close(); store.close(); },
  };
}

function recordStance(service, requestId, options = {}) {
  const trace = service.recordRequestAppraisal(
    fixture.threadId,
    appraisalSubmission(requestId),
  ).trace;
  return service.recordPrivateStance(fixture.threadId, requestId, {
    assessment: assessment(trace, options),
    recordedAt: "2026-08-05T19:56:00Z",
    causationId: `cause_stance_${requestId}`,
    correlationId: trace.correlationId,
  }).trace;
}

function acquireBody(operationId, obligationReferences = []) {
  return {
    operationId,
    decision: {
      authorizedAction: "accept",
      rationale: "Proceed through the bounded deterministic runtime.",
      obligationReferences,
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
    },
    causationId: `cause_${operationId}`,
    correlationId: `corr_${operationId}`,
  };
}

function prepare(service, requestId = "req_freeze_001", {
  stance = {},
  obligationReferences = [],
} = {}) {
  service.seedThread({ thread: fixture });
  const trace = recordStance(service, requestId, stance);
  const runtime = service.acquireThawRuntime(
    fixture.threadId,
    requestId,
    acquireBody(`op_acquire_${requestId}`, obligationReferences),
  ).runtime;
  service.runDeterministicActor(fixture.threadId, runtime.session.sessionId, {
    operationId: `op_actor_${requestId}`,
  });
  return service.runGoalGuardian(fixture.threadId, runtime.session.sessionId, {
    operationId: `op_guardian_${requestId}`,
  }).runtime;
}

function freezeBody(operationId, decision = "accept") {
  return {
    operationId,
    lifeChangeDecisions: [{
      proposalIndex: 0,
      decision,
      rationale: decision === "accept"
        ? "The memory is bounded and evidence-bearing."
        : "The proposal is not useful enough to retain.",
    }],
    causationId: `cause_${operationId}`,
    correlationId: `corr_${operationId}`,
  };
}

test("atomically freezes a Guardian-approved runtime, records memory, and survives replay", () =>
  withDatabase((databasePath) => {
    const runtime = start(databasePath);
    const prepared = prepare(runtime.service);
    runtime.time.advance(1000);
    const result = runtime.service.freezeRuntime(
      fixture.threadId,
      prepared.session.sessionId,
      freezeBody("op_freeze_001"),
    );
    assert.equal(result.idempotent, false);
    assert.equal(result.freeze.report.acceptedLifeChanges.length, 1);
    assert.equal(result.freeze.report.rejectedLifeChanges.length, 0);
    assert.equal(result.freeze.event.eventType, "THREAD_FROZEN");
    assert.equal(result.freeze.memories.length, 1);

    const thread = runtime.service.getThread(fixture.threadId);
    assert.equal(thread.version, 2);
    assert.equal(thread.status, "frozen");
    assert.ok(thread.memoryRefs.includes(result.freeze.memories[0].memoryId));
    assert.equal(runtime.service.getRuntime(fixture.threadId, prepared.session.sessionId).session.status, "completed");
    assert.equal(runtime.service.getRuntime(fixture.threadId, prepared.session.sessionId).lease.status, "released");
    assert.equal(runtime.store.verifyThreadIntegrity(fixture.threadId).version, 2);
    assert.equal(runtime.service.verifyFreezeIntegrity(fixture.threadId, prepared.session.sessionId).runtimeCompleted, true);

    const publicEvent = runtime.service.listEvents(fixture.threadId).at(-1);
    assert.equal(publicEvent.eventType, "THREAD_FROZEN");
    assert.equal(publicEvent.authorizationId, null);
    assert.equal(JSON.stringify(publicEvent).includes(prepared.session.sessionId), false);
    assert.deepEqual(publicEvent.payload.acceptedMemoryRefs, [result.freeze.memories[0].memoryId]);
    runtime.close();
  }));

test("exact freeze retry is idempotent and a different operation cannot reuse consumed authorization", () =>
  withDatabase((databasePath) => {
    const runtime = start(databasePath);
    const prepared = prepare(runtime.service, "req_freeze_retry");
    const first = runtime.service.freezeRuntime(
      fixture.threadId,
      prepared.session.sessionId,
      freezeBody("op_freeze_retry"),
    );
    runtime.time.advance(60_000);
    const retry = runtime.service.freezeRuntime(
      fixture.threadId,
      prepared.session.sessionId,
      freezeBody("op_freeze_retry"),
    );
    assert.equal(retry.idempotent, true);
    assert.equal(retry.freeze.event.eventId, first.freeze.event.eventId);
    assert.throws(
      () => runtime.service.freezeRuntime(
        fixture.threadId,
        prepared.session.sessionId,
        freezeBody("op_freeze_replay"),
      ),
      AuthorizationConsumedError,
    );
    assert.equal(runtime.store.listEvents(fixture.threadId).length, 2);
    runtime.close();
  }));

test("obligation override is consumed once and discharged from unresolved intentions", () =>
  withDatabase((databasePath) => {
    const runtime = start(databasePath);
    const obligation = fixture.currentState.unresolvedIntentions[0];
    const prepared = prepare(runtime.service, "req_freeze_obligation", {
      stance: { action: "refuse", score: 8 },
      obligationReferences: [obligation],
    });
    const frozen = runtime.service.freezeRuntime(
      fixture.threadId,
      prepared.session.sessionId,
      freezeBody("op_freeze_obligation", "reject"),
    ).freeze;
    assert.deepEqual(frozen.report.dischargedObligations, [obligation]);
    assert.equal(runtime.service.getThread(fixture.threadId).currentState.unresolvedIntentions.includes(obligation), false);

    const freshTrace = recordStance(runtime.service, "req_freeze_after_discharge");
    assert.throws(
      () => runtime.service.acquireThawRuntime(
        fixture.threadId,
        freshTrace.requestId,
        acquireBody("op_acquire_after_discharge", [obligation]),
      ),
      ParticipationAuthorizationRejectedError,
    );
    runtime.close();
  }));

test("Guardian reject, missing decisions, and lease expiry consume nothing", () =>
  withDatabase((databasePath) => {
    const divergentActor = (context) => ({
      worker: { kind: "deterministic_actor", version: "test" },
      threadId: context.threadId,
      snapshotVersion: context.snapshotVersion,
      requestId: context.requestId,
      requestFingerprint: context.requestFingerprint,
      objective: "wrong objective",
      summary: "Divergent output",
      steps: [],
      toolCalls: [{ tool: "shell" }],
      proposedCommands: [{ type: "MUTATE_WORLD" }],
      proposedLifeChanges: [],
    });
    const rejected = start(databasePath, { actor: divergentActor });
    const prepared = prepare(rejected.service, "req_freeze_guardian_reject");
    assert.equal(prepared.goalGuardianAudit.audit.decision, "reject");
    assert.throws(
      () => rejected.service.freezeRuntime(
        fixture.threadId,
        prepared.session.sessionId,
        { ...freezeBody("op_freeze_guardian_reject"), lifeChangeDecisions: [] },
      ),
      FreezeRejectedError,
    );
    assert.equal(rejected.freezeStore.getAuthorizationConsumption(prepared.authorization.authorizationId), null);
    rejected.close();
  }));

test("freeze requires exactly one decision per proposal and may reject all life changes", () =>
  withDatabase((databasePath) => {
    const runtime = start(databasePath);
    const prepared = prepare(runtime.service, "req_freeze_decisions");
    assert.throws(
      () => runtime.service.freezeRuntime(
        fixture.threadId,
        prepared.session.sessionId,
        { ...freezeBody("op_freeze_missing_decision"), lifeChangeDecisions: [] },
      ),
      FreezeRejectedError,
    );
    const result = runtime.service.freezeRuntime(
      fixture.threadId,
      prepared.session.sessionId,
      freezeBody("op_freeze_reject_memory", "reject"),
    ).freeze;
    assert.equal(result.memories.length, 0);
    assert.equal(result.report.acceptedLifeChanges.length, 0);
    assert.equal(result.report.rejectedLifeChanges.length, 1);
    assert.deepEqual(runtime.service.getThread(fixture.threadId).memoryRefs, fixture.memoryRefs);
    runtime.close();
  }));

test("Thread change before freeze fails atomically without consuming authority", () =>
  withDatabase((databasePath) => {
    const runtime = start(databasePath);
    const prepared = prepare(runtime.service, "req_freeze_state_change");
    const command = {
      commandId: "cmd_freeze_state_change",
      threadId: fixture.threadId,
      expectedVersion: 1,
      type: "UPDATE_SELF_MODEL",
      payload: { selfModel: "I changed before freeze.", summary: "Race freeze." },
      actor: { entityId: "human_guy", kind: "human", displayName: "Guy" },
      occurredAt: "2026-08-05T20:01:00Z",
    };
    const preview = runtime.service.previewCommand(command);
    runtime.service.applyPreviewedCommand({ previewId: preview.previewId, command });
    assert.throws(
      () => runtime.service.freezeRuntime(
        fixture.threadId,
        prepared.session.sessionId,
        freezeBody("op_freeze_state_change"),
      ),
      FreezeStateChangedError,
    );
    assert.equal(runtime.freezeStore.getAuthorizationConsumption(prepared.authorization.authorizationId), null);
    assert.equal(runtime.service.getRuntime(fixture.threadId, prepared.session.sessionId).session.status, "active");
    runtime.close();
  }));

test("freeze records are append-only and coherent report tampering is detected", () =>
  withDatabase((databasePath) => {
    const runtime = start(databasePath);
    const prepared = prepare(runtime.service, "req_freeze_tamper");
    const result = runtime.service.freezeRuntime(
      fixture.threadId,
      prepared.session.sessionId,
      freezeBody("op_freeze_tamper"),
    ).freeze;
    runtime.close();

    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    assert.throws(
      () => database.prepare("DELETE FROM authorization_consumptions").run(),
      /append-only/,
    );
    assert.throws(
      () => database.prepare("UPDATE thread_memories SET summary=summary").run(),
      /append-only/,
    );
    database.exec("DROP TRIGGER freeze_reports_no_update");
    const report = structuredClone(result.report);
    report.resultingVersion = 999;
    database.prepare("UPDATE freeze_reports SET report_json=?,report_digest=? WHERE report_id=?").run(
      JSON.stringify(report),
      result.reportDigest,
      result.report.reportId,
    );
    database.close();

    const reopened = start(databasePath);
    assert.throws(
      () => reopened.service.getFreezeReport(fixture.threadId, prepared.session.sessionId),
      IntegrityError,
    );
    reopened.close();
  }));

test("schema version 3 migrates to unified freeze schema version 4", () =>
  withDatabase((databasePath) => {
    const runtime = start(databasePath);
    runtime.service.seedThread({ thread: fixture });
    runtime.close();
    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    database.exec(`
      DROP TABLE IF EXISTS thread_memories;
      DROP TABLE IF EXISTS freeze_reports;
      DROP TABLE IF EXISTS authorization_consumptions;
      PRAGMA user_version=3;
    `);
    database.close();
    const reopened = start(databasePath);
    assert.equal(reopened.store.storageMetadata().schemaVersion, WORLD_STORE_SCHEMA_VERSION);
    assert.equal(reopened.runtimeStore.storageMetadata().schemaVersion, WORLD_STORE_SCHEMA_VERSION);
    assert.equal(reopened.freezeStore.storageMetadata().schemaVersion, WORLD_STORE_SCHEMA_VERSION);
    assert.equal(reopened.service.getThread(fixture.threadId).version, 1);
    reopened.close();
  }));

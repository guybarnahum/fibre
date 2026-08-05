import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  openWorldStore,
} from "../src/persistence.mjs";
import { openRuntimeStore } from "../src/runtime-store.mjs";
import { openFreezeStore } from "../src/freeze-store.mjs";
import { openLifecycleHardeningStore } from "../src/lifecycle-hardening-store.mjs";
import { M1LifecycleWorldKernelService } from "../src/lifecycle-hardening-service.mjs";
import { createLifecycleWorldKernelHttpServer } from "../src/lifecycle-hardening-http-server.mjs";
import {
  closeWorldKernelHttpServer,
  listenWorldKernelHttpServer,
} from "../src/http-server.mjs";
import {
  ParticipationAuthorizationRejectedError,
  RuntimeOrderError,
} from "../src/runtime-domain.mjs";
import {
  RuntimeAbandonConflictError,
  RuntimeAbandonRejectedError,
} from "../src/lifecycle-hardening-domain.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

async function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-lifecycle-hardening-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return await run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function controlledClock(start = "2026-08-05T21:00:00Z") {
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

function appraisalSubmission(requestId, correlationId = "corr_lifecycle_review") {
  return {
    request: activationRequest(requestId),
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-05T20:55:00Z",
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

function start(databasePath, {
  time = controlledClock(),
  actor,
  leaseDurationMs = 10 * 60 * 1000,
} = {}) {
  const store = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const freezeStore = openFreezeStore(databasePath);
  const lifecycleStore = openLifecycleHardeningStore(databasePath);
  const service = new M1LifecycleWorldKernelService(
    store,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    {
      clock: time.clock,
      leaseDurationMs,
      ...(actor === undefined ? {} : { actor }),
    },
  );
  return {
    store,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    service,
    time,
    close() {
      lifecycleStore.close();
      freezeStore.close();
      runtimeStore.close();
      store.close();
    },
  };
}

function recordStance(service, requestId, {
  correlationId = "corr_lifecycle_review",
  action = "accept",
  score = 82,
} = {}) {
  const trace = service.recordRequestAppraisal(
    fixture.threadId,
    appraisalSubmission(requestId, correlationId),
  ).trace;
  return service.recordPrivateStance(fixture.threadId, requestId, {
    assessment: assessment(trace, { action, score }),
    recordedAt: "2026-08-05T20:56:00Z",
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

function freezeBody(operationId, rationale = "The memory is bounded and evidence-bearing.") {
  return {
    operationId,
    lifeChangeDecisions: [{ proposalIndex: 0, decision: "accept", rationale }],
    causationId: `cause_${operationId}`,
    correlationId: `corr_${operationId}`,
  };
}

function abandonBody(operationId) {
  return {
    operationId,
    causationId: `cause_${operationId}`,
    correlationId: `corr_${operationId}`,
  };
}

function divergentActor(context) {
  return {
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
  };
}

function prepare(service, requestId, {
  correlationId = "corr_lifecycle_review",
  obligationReferences = [],
} = {}) {
  const trace = recordStance(service, requestId, { correlationId });
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

test("Guardian rejection can be abandoned immediately without consuming authority", async () =>
  withDatabase(async (databasePath) => {
    const runtime = start(databasePath, { actor: divergentActor });
    runtime.service.seedThread({ thread: fixture });
    const rejected = prepare(runtime.service, "req_abandon_rejected");
    assert.equal(rejected.goalGuardianAudit.audit.decision, "reject");

    const first = runtime.service.abandonRejectedRuntime(
      fixture.threadId,
      rejected.session.sessionId,
      abandonBody("op_abandon_rejected"),
    );
    assert.equal(first.idempotent, false);
    assert.equal(first.runtime.session.status, "aborted");
    assert.equal(first.runtime.lease.status, "released");
    assert.equal(first.runtime.lease.releaseReason, "guardian_rejected_abandon");
    assert.equal(
      runtime.freezeStore.getAuthorizationConsumption(
        rejected.authorization.authorizationId,
      ),
      null,
    );
    assert.equal(runtime.service.getThread(fixture.threadId).version, 1);

    runtime.time.advance(60_000);
    const retry = runtime.service.abandonRejectedRuntime(
      fixture.threadId,
      rejected.session.sessionId,
      abandonBody("op_abandon_rejected"),
    );
    assert.equal(retry.idempotent, true);
    assert.equal(
      retry.abandonment.record.abandonmentId,
      first.abandonment.record.abandonmentId,
    );
    assert.throws(
      () => runtime.service.abandonRejectedRuntime(
        fixture.threadId,
        rejected.session.sessionId,
        abandonBody("op_abandon_again"),
      ),
      RuntimeAbandonConflictError,
    );
    assert.throws(
      () => runtime.service.runDeterministicActor(
        fixture.threadId,
        rejected.session.sessionId,
        { operationId: "op_actor_after_abandon" },
      ),
      RuntimeOrderError,
    );

    const freshTrace = recordStance(runtime.service, "req_abandon_retry", {
      correlationId: "corr_lifecycle_review",
    });
    const fresh = runtime.service.acquireThawRuntime(
      fixture.threadId,
      freshTrace.requestId,
      acquireBody("op_acquire_after_abandon"),
    ).runtime;
    assert.equal(fresh.session.status, "active");
    assert.notEqual(fresh.session.sessionId, rejected.session.sessionId);
    runtime.close();
  }));

test("abandon requires Guardian reject and is available through the private HTTP boundary", async () =>
  withDatabase(async (databasePath) => {
    const accepted = start(databasePath);
    accepted.service.seedThread({ thread: fixture });
    const passed = prepare(accepted.service, "req_abandon_pass");
    assert.throws(
      () => accepted.service.abandonRejectedRuntime(
        fixture.threadId,
        passed.session.sessionId,
        abandonBody("op_abandon_pass"),
      ),
      RuntimeAbandonRejectedError,
    );
    accepted.service.freezeRuntime(
      fixture.threadId,
      passed.session.sessionId,
      freezeBody("op_freeze_abandon_pass"),
    );
    accepted.close();

    const rejected = start(databasePath, { actor: divergentActor });
    const trace = recordStance(rejected.service, "req_abandon_http");
    const active = rejected.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody("op_acquire_abandon_http"),
    ).runtime;
    rejected.service.runDeterministicActor(fixture.threadId, active.session.sessionId, {
      operationId: "op_actor_abandon_http",
    });
    rejected.service.runGoalGuardian(fixture.threadId, active.session.sessionId, {
      operationId: "op_guardian_abandon_http",
    });

    const server = createLifecycleWorldKernelHttpServer({
      service: rejected.service,
      privateToken: "private-token-1234",
    });
    const address = await listenWorldKernelHttpServer(server, {
      host: "127.0.0.1",
      port: 0,
    });
    const base = `http://${address.host}:${address.port}`;
    const path = `/threads/${fixture.threadId}/private/runtime/${active.session.sessionId}/abandon`;
    const forbidden = await fetch(`${base}${path}`);
    assert.equal(forbidden.status, 403);

    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-fibre-private-token": "private-token-1234",
      },
      body: JSON.stringify(abandonBody("op_abandon_http")),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.runtime.session.status, "aborted");
    assert.equal(body.runtime.lease.status, "released");

    const integrity = await fetch(`${base}${path}/integrity`, {
      headers: { "x-fibre-private-token": "private-token-1234" },
    });
    assert.equal(integrity.status, 200);
    assert.equal((await integrity.json()).authorizationConsumed, false);
    await closeWorldKernelHttpServer(server);
    rejected.close();
  }));

test("discharged obligations remain spent even if later text is reintroduced", async () =>
  withDatabase(async (databasePath) => {
    const runtime = start(databasePath);
    runtime.service.seedThread({ thread: fixture });
    const obligation = fixture.currentState.unresolvedIntentions[0];
    const trace = recordStance(runtime.service, "req_spent_obligation", {
      action: "refuse",
      score: 8,
    });
    const active = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody("op_acquire_spent_obligation", [obligation]),
    ).runtime;
    runtime.service.runDeterministicActor(fixture.threadId, active.session.sessionId, {
      operationId: "op_actor_spent_obligation",
    });
    runtime.service.runGoalGuardian(fixture.threadId, active.session.sessionId, {
      operationId: "op_guardian_spent_obligation",
    });
    runtime.service.freezeRuntime(
      fixture.threadId,
      active.session.sessionId,
      freezeBody("op_freeze_spent_obligation"),
    );

    assert.throws(
      () => runtime.lifecycleStore.assertObligationsUnspent(
        fixture.threadId,
        [obligation],
      ),
      ParticipationAuthorizationRejectedError,
    );
    runtime.close();

    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    const authorizationId = `auth_${"a".repeat(64)}`;
    const stanceId = `pst_${"b".repeat(64)}`;
    assert.throws(
      () => database.prepare(
        "INSERT INTO participation_authorizations VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        authorizationId,
        "op_future_readded_obligation",
        JSON.stringify({ operationId: "op_future_readded_obligation" }),
        `sha256:${"1".repeat(64)}`,
        fixture.threadId,
        "req_future_readded_obligation",
        `app_${"c".repeat(64)}`,
        stanceId,
        2,
        `sha256:${"2".repeat(64)}`,
        `sha256:${"3".repeat(64)}`,
        JSON.stringify({ obligationReferences: [obligation] }),
        `sha256:${"4".repeat(64)}`,
        "2026-08-05T21:05:00Z",
        "cause_future_readded_obligation",
        "corr_future_readded_obligation",
      ),
      /authorization obligation was already discharged/,
    );
    database.close();
  }));

test("Thread integrity cross-checks freeze reports, memory rows, and projection refs", async () =>
  withDatabase(async (databasePath) => {
    let runtime = start(databasePath);
    runtime.service.seedThread({ thread: fixture });
    const prepared = prepare(runtime.service, "req_memory_integrity");
    const frozen = runtime.service.freezeRuntime(
      fixture.threadId,
      prepared.session.sessionId,
      freezeBody("op_freeze_memory_integrity"),
    ).freeze;
    const integrity = runtime.service.verifyThreadIntegrity(fixture.threadId);
    assert.equal(integrity.memoryProjection.matchesProjection, true);
    assert.deepEqual(
      integrity.memoryProjection.freezeCreatedMemoryIds,
      [frozen.memories[0].memoryId],
    );
    runtime.close();

    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    database.exec("DROP TRIGGER thread_memories_no_delete");
    database.prepare("DELETE FROM thread_memories WHERE memory_id=?").run(
      frozen.memories[0].memoryId,
    );
    database.close();

    runtime = start(databasePath);
    assert.throws(
      () => runtime.service.verifyThreadIntegrity(fixture.threadId),
      IntegrityError,
    );
    runtime.close();
  }));

test("freeze rejection rationale is bounded before append-only persistence", async () =>
  withDatabase(async (databasePath) => {
    const runtime = start(databasePath);
    runtime.service.seedThread({ thread: fixture });
    const prepared = prepare(runtime.service, "req_rationale_bound");
    assert.throws(
      () => runtime.service.freezeRuntime(
        fixture.threadId,
        prepared.session.sessionId,
        freezeBody("op_freeze_oversized_rationale", "x".repeat(4097)),
      ),
      /rationale exceeds 4096 bytes/,
    );
    assert.equal(
      runtime.freezeStore.getAuthorizationConsumption(
        prepared.authorization.authorizationId,
      ),
      null,
    );
    const frozen = runtime.service.freezeRuntime(
      fixture.threadId,
      prepared.session.sessionId,
      freezeBody("op_freeze_bounded_rationale"),
    );
    assert.equal(frozen.freeze.report.acceptedLifeChanges.length, 1);
    runtime.close();
  }));
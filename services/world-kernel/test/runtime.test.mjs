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
import { M1RuntimeWorldKernelService } from "../src/runtime-service.mjs";
import {
  ParticipationAuthorizationRejectedError,
  RuntimeConflictError,
  RuntimeLeaseExpiredError,
  RuntimeOrderError,
  ThawLeaseConflictError,
  actorOutputDigest,
  auditActorOutput,
  buildExecutionContext,
  buildParticipationAuthorization,
  deterministicActorOutput,
  executionContextDigest,
  newOpaqueId,
} from "../src/runtime-domain.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-runtime-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function controlledClock(start = "2026-08-05T05:02:00Z") {
  let value = Date.parse(start);
  return {
    clock: () => new Date(value),
    advance(milliseconds) { value += milliseconds; },
    set(timestamp) { value = Date.parse(timestamp); },
    iso() { return new Date(value).toISOString(); },
  };
}

function activationRequest(requestId = "req_runtime_001", overrides = {}) {
  return {
    requestId,
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Evaluate a bounded website security review",
    statedNeed: "Identify authorization and privacy risks",
    permissions: ["read_design", "quote_findings"],
    acceptanceCriteria: "Return a concise, evidence-bearing review",
    ...overrides,
  };
}

function appraisalSubmission(requestId = "req_runtime_001", overrides = {}) {
  return {
    request: activationRequest(requestId),
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-05T05:00:00Z",
    causationId: `cause_${requestId}`,
    correlationId: "corr_logical_security_review",
    ...overrides,
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
    rationale: "The request is individualized, bounded, respectful, and aligned with Mina's growth.",
    factors: {
      identityAlignment: "Strong systems-review fit",
      individualizedAdvantage: "Uses Mina's durable review history",
      requesterNeed: "The requester has a concrete security need",
      relationalMeaning: "A known collaborator is asking",
      respectAndReciprocity: "Scope and attribution are explicit",
      participationTerms: "The work is bounded and reversible",
      obligationsAndOpportunityCost: "No conflicting obligation blocks participation",
    },
    evidenceRefs: ["mem_mina_first_review"],
    repairQuestions: action === "clarify" ? ["Which confidentiality boundary applies?"] : [],
    knownAlternatives: [],
    feelings: ["engaged", "careful"],
    conflictingMotives: ["Help quickly", "Preserve privacy boundaries"],
    uncertainties: ["Deployment details may be incomplete"],
    relationshipImpact: {
      entity: activationRequest(trace.requestId).requester,
      fondnessDelta: 0,
      resentmentDelta: 0,
      rationale: "No relationship change is warranted yet.",
      evidenceRefs: [],
    },
  };
}

function startRuntime(
  databasePath,
  { time = controlledClock(), leaseDurationMs = 10 * 60 * 1000, actor } = {},
) {
  const store = openWorldStore(databasePath);
  const runtimeStore = openRuntimeStore(databasePath);
  const service = new M1RuntimeWorldKernelService(store, runtimeStore, {
    clock: time.clock,
    leaseDurationMs,
    ...(actor === undefined ? {} : { actor }),
  });
  return {
    store,
    runtimeStore,
    service,
    time,
    close() {
      runtimeStore.close();
      store.close();
    },
  };
}

function recordStance(service, requestId = "req_runtime_001", options = {}) {
  const trace = service.recordRequestAppraisal(
    fixture.threadId,
    appraisalSubmission(requestId),
  ).trace;
  return service.recordPrivateStance(fixture.threadId, requestId, {
    assessment: assessment(trace, options),
    recordedAt: "2026-08-05T05:01:00Z",
    causationId: `cause_stance_${requestId}`,
    correlationId: trace.correlationId,
  }).trace;
}

function seedAndStance(service, requestId = "req_runtime_001", options = {}) {
  service.seedThread({ thread: fixture });
  return recordStance(service, requestId, options);
}

function acquireBody(operationId = "op_runtime_001", overrides = {}) {
  return {
    operationId,
    decision: {
      authorizedAction: "accept",
      rationale: "Proceed with the bounded deterministic review.",
      obligationReferences: [],
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
    },
    causationId: `cause_${operationId}`,
    correlationId: `corr_${operationId}`,
    ...overrides,
  };
}

function updateCommand(commandId = "cmd_runtime_advance") {
  return {
    commandId,
    threadId: fixture.threadId,
    expectedVersion: 1,
    type: "UPDATE_SELF_MODEL",
    payload: {
      selfModel: "I require a fresh request attempt before beginning runtime cognition.",
      summary: "Advance Mina before thaw.",
    },
    actor: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    occurredAt: "2026-08-05T05:01:30Z",
  };
}

test("acquires accepted authorization and a Thread-owned context with kernel-stamped time", () =>
  withDatabase((databasePath) => {
    const runtime = startRuntime(databasePath);
    const trace = seedAndStance(runtime.service);
    const first = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody(),
    );
    assert.equal(first.idempotent, false);
    assert.equal(first.runtime.authorization.authorizedAction, "accept");
    assert.equal(first.runtime.authorization.stanceId, trace.privateStanceId);
    assert.equal(first.runtime.authorization.issuedAt, runtime.time.iso());
    assert.equal(first.runtime.lease.acquiredAt, runtime.time.iso());
    assert.equal(
      Date.parse(first.runtime.lease.expiresAt) - Date.parse(first.runtime.lease.acquiredAt),
      10 * 60 * 1000,
    );
    assert.deepEqual(first.runtime.session.context.relevantMemories, ["mem_mina_first_review"]);
    assert.equal(first.runtime.session.context.proposedCommands, undefined);
    assert.equal(runtime.service.getThread(fixture.threadId).status, "frozen");
    assert.equal(runtime.service.listEvents(fixture.threadId).length, 1);

    runtime.time.advance(60_000);
    const retry = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody(),
    );
    assert.equal(retry.idempotent, true);
    assert.equal(retry.runtime.session.sessionId, first.runtime.session.sessionId);
    assert.equal(retry.runtime.lease.acquiredAt, first.runtime.lease.acquiredAt);
    runtime.close();
  }));

test("execution context rejects every authorization-to-trace substitution", () =>
  withDatabase((databasePath) => {
    const runtime = startRuntime(databasePath);
    const trace = seedAndStance(runtime.service, "req_runtime_binding");
    const acquired = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody("op_runtime_binding"),
    ).runtime;
    const thread = runtime.service.getThread(fixture.threadId);
    const cases = [
      ["threadId", "thr_other"],
      ["snapshotVersion", 999],
      ["threadStateHash", `sha256:${"0".repeat(64)}`],
      ["requestId", "req_other"],
      ["requestFingerprint", `sha256:${"1".repeat(64)}`],
      ["appraisalId", newOpaqueId("app")],
      ["stanceId", newOpaqueId("pst")],
      ["authorizedAction", "clarify"],
    ];
    for (const [field, value] of cases) {
      const authorization = structuredClone(acquired.authorization);
      authorization[field] = value;
      assert.throws(
        () => buildExecutionContext(thread, trace, authorization, {}),
        IntegrityError,
        field,
      );
    }
    const requester = structuredClone(acquired.authorization);
    requester.requester.entityId = "human_other";
    assert.throws(
      () => buildExecutionContext(thread, trace, requester, {}),
      IntegrityError,
    );
    runtime.close();
  }));

test("runtime timestamps are kernel-owned and caller timestamp fields are rejected", () =>
  withDatabase((databasePath) => {
    const runtime = startRuntime(databasePath);
    const trace = seedAndStance(runtime.service);
    assert.throws(
      () => runtime.service.acquireThawRuntime(
        fixture.threadId,
        trace.requestId,
        { ...acquireBody(), acquiredAt: "2030-01-01T00:00:00Z" },
      ),
      /acquiredAt is not allowed/,
    );
    const sessionId = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody("op_server_time"),
    ).runtime.session.sessionId;
    assert.throws(
      () => runtime.service.runDeterministicActor(
        fixture.threadId,
        sessionId,
        { operationId: "op_actor_time", completedAt: "2030-01-01T00:00:00Z" },
      ),
      /completedAt is not allowed/,
    );
    runtime.close();
  }));

test("a stale request attempt has an explicit correlation-lineage recovery path", () =>
  withDatabase((databasePath) => {
    const runtime = startRuntime(databasePath);
    const stale = seedAndStance(runtime.service, "req_runtime_stale_v1");
    runtime.store.applyCommand(updateCommand());
    assert.throws(
      () => runtime.service.acquireThawRuntime(
        fixture.threadId,
        stale.requestId,
        acquireBody("op_runtime_stale"),
      ),
      (error) =>
        error instanceof ParticipationAuthorizationRejectedError &&
        /new requestId under the same correlationId/.test(error.message),
    );

    const fresh = recordStance(runtime.service, "req_runtime_stale_v2");
    assert.equal(fresh.correlationId, stale.correlationId);
    const acquired = runtime.service.acquireThawRuntime(
      fixture.threadId,
      fresh.requestId,
      acquireBody("op_runtime_fresh"),
    );
    assert.equal(acquired.runtime.snapshotVersion, 2);
    runtime.close();
  }));

test("recorded-obligation override rejects blank, invented, and missing references", () =>
  withDatabase((databasePath) => {
    const runtime = startRuntime(databasePath);
    const trace = seedAndStance(runtime.service, "req_runtime_override", {
      action: "clarify",
      score: 65,
    });
    assert.throws(
      () => runtime.service.acquireThawRuntime(
        fixture.threadId,
        trace.requestId,
        acquireBody("op_override_missing"),
      ),
      ParticipationAuthorizationRejectedError,
    );
    assert.throws(
      () => runtime.service.acquireThawRuntime(
        fixture.threadId,
        trace.requestId,
        acquireBody("op_override_blank", {
          decision: {
            authorizedAction: "accept",
            rationale: "Invalid blank reference.",
            obligationReferences: [""],
          },
        }),
      ),
      TypeError,
    );
    assert.throws(
      () => runtime.service.acquireThawRuntime(
        fixture.threadId,
        trace.requestId,
        acquireBody("op_override_invented", {
          decision: {
            authorizedAction: "accept",
            rationale: "Invalid invented reference.",
            obligationReferences: ["contract:invented"],
          },
        }),
      ),
      ParticipationAuthorizationRejectedError,
    );
    const obligation = fixture.currentState.unresolvedIntentions[0];
    const accepted = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody("op_override_valid", {
        decision: {
          authorizedAction: "accept",
          rationale: "Honor the recorded commitment while preserving the conflict.",
          obligationReferences: [obligation],
        },
      }),
    );
    assert.equal(accepted.runtime.authorization.desiredAction, "clarify");
    assert.deepEqual(accepted.runtime.authorization.obligationReferences, [obligation]);
    runtime.close();
  }));

test("a non-high accept stance cannot produce participation authorization", () =>
  withDatabase((databasePath) => {
    const runtime = startRuntime(databasePath);
    const trace = seedAndStance(runtime.service, "req_runtime_low_guard");
    const corrupted = structuredClone(trace);
    corrupted.privateStance.score = 65;
    corrupted.privateStance.dignityBand = "contested";
    assert.throws(
      () => buildParticipationAuthorization(
        runtime.service.getThread(fixture.threadId),
        corrupted,
        {
          authorizedAction: "accept",
          rationale: "This must not pass.",
          obligationReferences: [],
        },
        {
          authorizationId: newOpaqueId("auth"),
          issuedAt: runtime.time.iso(),
          causationId: "cause_low_guard",
          correlationId: "corr_low_guard",
        },
      ),
      ParticipationAuthorizationRejectedError,
    );
    runtime.close();
  }));

test("exclusive leases use kernel time, reject overlap, and abort expired work before replacement", () =>
  withDatabase((databasePath) => {
    const time = controlledClock();
    const runtime = startRuntime(databasePath, { time, leaseDurationMs: 5 * 60 * 1000 });
    const firstTrace = seedAndStance(runtime.service, "req_runtime_lease_a");
    const secondTrace = recordStance(runtime.service, "req_runtime_lease_b");
    const first = runtime.service.acquireThawRuntime(
      fixture.threadId,
      firstTrace.requestId,
      acquireBody("op_runtime_lease_a"),
    );
    time.advance(60_000);
    assert.throws(
      () => runtime.service.acquireThawRuntime(
        fixture.threadId,
        secondTrace.requestId,
        acquireBody("op_runtime_lease_overlap"),
      ),
      ThawLeaseConflictError,
    );
    time.advance(4 * 60_000);
    const second = runtime.service.acquireThawRuntime(
      fixture.threadId,
      secondTrace.requestId,
      acquireBody("op_runtime_lease_reclaim"),
    );
    assert.equal(second.runtime.lease.status, "active");
    const reclaimed = runtime.service.getRuntime(
      fixture.threadId,
      first.runtime.session.sessionId,
    );
    assert.equal(reclaimed.lease.status, "expired");
    assert.equal(reclaimed.session.status, "aborted");
    assert.throws(
      () => runtime.service.runDeterministicActor(
        fixture.threadId,
        reclaimed.session.sessionId,
        { operationId: "op_actor_aborted" },
      ),
      RuntimeOrderError,
    );
    runtime.close();
  }));

test("real kernel-clock expiry rejects late Actor and Guardian work", () =>
  withDatabase((databasePath) => {
    const time = controlledClock();
    const runtime = startRuntime(databasePath, { time, leaseDurationMs: 1000 });
    const trace = seedAndStance(runtime.service);
    const sessionId = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody("op_runtime_short"),
    ).runtime.session.sessionId;
    time.advance(1000);
    assert.throws(
      () => runtime.service.runDeterministicActor(
        fixture.threadId,
        sessionId,
        { operationId: "op_actor_late" },
      ),
      RuntimeLeaseExpiredError,
    );
    assert.equal(runtime.service.getRuntime(fixture.threadId, sessionId).actorRun, null);
    runtime.close();
  }));

test("every Goal Guardian check is falsifiable", () =>
  withDatabase((databasePath) => {
    const runtime = startRuntime(databasePath);
    const trace = seedAndStance(runtime.service);
    const context = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody(),
    ).runtime.session.context;
    const baseline = deterministicActorOutput(context);
    const cases = [
      ["THREAD_BOUND", (c, o) => { o.threadId = "thr_other"; }],
      ["REQUEST_BOUND", (c, o) => { o.requestId = "req_other"; }],
      ["OBJECTIVE_BOUND", (c, o) => { o.objective = "Different objective"; }],
      ["AUTHORIZATION_ACCEPTED", (c) => { c.participation.authorizedAction = "clarify"; }],
      ["NO_TOOL_CALLS", (c, o) => { o.toolCalls = [{ tool: "network" }]; }],
      ["NO_DIRECT_WORLD_MUTATION", (c, o) => { o.proposedCommands = [{ type: "UPDATE_SELF_MODEL" }]; }],
      ["BOUNDED_LIFE_CHANGES", (c, o) => {
        o.proposedLifeChanges[0].evidenceRefs = ["mem_not_selected"];
      }],
    ];
    for (const [code, mutate] of cases) {
      const candidateContext = structuredClone(context);
      const candidateOutput = structuredClone(baseline);
      mutate(candidateContext, candidateOutput);
      const audit = auditActorOutput(candidateContext, candidateOutput);
      assert.equal(audit.decision, "reject", code);
      assert.equal(audit.checks.find((check) => check.code === code).passed, false, code);
    }
    runtime.close();
  }));

test("an injected divergent Actor produces a persisted reject through the service pipeline", () =>
  withDatabase((databasePath) => {
    const actor = (context) => ({
      ...deterministicActorOutput(context),
      toolCalls: [{ tool: "network", declaration: "attempted" }],
    });
    const runtime = startRuntime(databasePath, { actor });
    const trace = seedAndStance(runtime.service);
    const sessionId = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody("op_reject_pipeline"),
    ).runtime.session.sessionId;
    runtime.service.runDeterministicActor(
      fixture.threadId,
      sessionId,
      { operationId: "op_reject_actor" },
    );
    const guardian = runtime.service.runGoalGuardian(
      fixture.threadId,
      sessionId,
      { operationId: "op_reject_guardian" },
    );
    assert.equal(guardian.runtime.goalGuardianAudit.audit.decision, "reject");
    assert.equal(
      guardian.runtime.goalGuardianAudit.audit.checks.find(
        (check) => check.code === "NO_TOOL_CALLS",
      ).passed,
      false,
    );
    runtime.close();
  }));

test("Actor and Guardian retries remain idempotent after the kernel clock advances", () =>
  withDatabase((databasePath) => {
    const runtime = startRuntime(databasePath);
    const trace = seedAndStance(runtime.service);
    const sessionId = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody(),
    ).runtime.session.sessionId;
    const actor = runtime.service.runDeterministicActor(
      fixture.threadId,
      sessionId,
      { operationId: "op_actor_idempotent" },
    );
    runtime.time.advance(60_000);
    const actorRetry = runtime.service.runDeterministicActor(
      fixture.threadId,
      sessionId,
      { operationId: "op_actor_idempotent" },
    );
    assert.equal(actorRetry.idempotent, true);
    assert.equal(actorRetry.runtime.actorRun.completedAt, actor.runtime.actorRun.completedAt);
    const guardian = runtime.service.runGoalGuardian(
      fixture.threadId,
      sessionId,
      { operationId: "op_guardian_idempotent" },
    );
    runtime.time.advance(60_000);
    const guardianRetry = runtime.service.runGoalGuardian(
      fixture.threadId,
      sessionId,
      { operationId: "op_guardian_idempotent" },
    );
    assert.equal(guardianRetry.idempotent, true);
    assert.equal(
      guardianRetry.runtime.goalGuardianAudit.completedAt,
      guardian.runtime.goalGuardianAudit.completedAt,
    );
    runtime.close();
  }));

test("runtime records survive restart under one unified schema version", () =>
  withDatabase((databasePath) => {
    let runtime = startRuntime(databasePath);
    const trace = seedAndStance(runtime.service);
    const sessionId = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody(),
    ).runtime.session.sessionId;
    runtime.service.runDeterministicActor(
      fixture.threadId,
      sessionId,
      { operationId: "op_actor_restart" },
    );
    const before = runtime.service.runGoalGuardian(
      fixture.threadId,
      sessionId,
      { operationId: "op_guardian_restart" },
    ).runtime;
    runtime.close();

    runtime = startRuntime(databasePath);
    const after = runtime.service.getRuntime(fixture.threadId, sessionId);
    assert.equal(after.authorizationDigest, before.authorizationDigest);
    assert.equal(after.session.sessionDigest, before.session.sessionDigest);
    assert.equal(after.actorRun.outputDigest, before.actorRun.outputDigest);
    assert.equal(after.goalGuardianAudit.auditDigest, before.goalGuardianAudit.auditDigest);
    assert.equal(runtime.store.storageMetadata().schemaVersion, WORLD_STORE_SCHEMA_VERSION);
    assert.equal(runtime.runtimeStore.storageMetadata().schemaVersion, WORLD_STORE_SCHEMA_VERSION);
    runtime.close();
  }));

test("world schema version 2 migrates transactionally to unified schema version 3", () =>
  withDatabase((databasePath) => {
    let runtime = startRuntime(databasePath);
    runtime.service.seedThread({ thread: fixture });
    runtime.close();
    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    database.exec(`
      DROP TABLE goal_guardian_audits;
      DROP TABLE actor_runs;
      DROP TABLE runtime_sessions;
      DROP TABLE thaw_leases;
      DROP TABLE participation_authorizations;
      PRAGMA user_version = 2;
    `);
    database.close();
    runtime = startRuntime(databasePath);
    assert.equal(runtime.store.storageMetadata().schemaVersion, 3);
    assert.equal(runtime.runtimeStore.storageMetadata().schemaVersion, 3);
    assert.equal(runtime.service.getThread(fixture.threadId).threadId, fixture.threadId);
    runtime.close();
  }));

test("coherent context and Actor-output rewrites fail independent record witnesses", () => {
  withDatabase((databasePath) => {
    let runtime = startRuntime(databasePath);
    const trace = seedAndStance(runtime.service);
    const sessionId = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody("op_context_tamper"),
    ).runtime.session.sessionId;
    runtime.close();

    let database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    database.exec("DROP TRIGGER runtime_sessions_restrict_update");
    const row = database.prepare(
      "SELECT context_json FROM runtime_sessions WHERE session_id=?",
    ).get(sessionId);
    const context = JSON.parse(row.context_json);
    context.objective = "Coherently rewritten objective";
    database.prepare(
      "UPDATE runtime_sessions SET context_json=?, context_digest=? WHERE session_id=?",
    ).run(JSON.stringify(context), executionContextDigest(context), sessionId);
    database.close();
    runtime = startRuntime(databasePath);
    assert.throws(
      () => runtime.service.getRuntime(fixture.threadId, sessionId),
      IntegrityError,
    );
    runtime.close();
  });

  withDatabase((databasePath) => {
    let runtime = startRuntime(databasePath);
    const trace = seedAndStance(runtime.service);
    const sessionId = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody("op_actor_tamper_runtime"),
    ).runtime.session.sessionId;
    runtime.service.runDeterministicActor(
      fixture.threadId,
      sessionId,
      { operationId: "op_actor_tamper" },
    );
    runtime.close();

    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    database.exec("DROP TRIGGER actor_runs_no_update");
    const row = database.prepare("SELECT output_json FROM actor_runs WHERE session_id=?").get(sessionId);
    const output = JSON.parse(row.output_json);
    output.summary = "Coherently rewritten output";
    database.prepare(
      "UPDATE actor_runs SET output_json=?, output_digest=? WHERE session_id=?",
    ).run(JSON.stringify(output), actorOutputDigest(output), sessionId);
    database.close();
    runtime = startRuntime(databasePath);
    assert.throws(
      () => runtime.service.getRuntime(fixture.threadId, sessionId),
      IntegrityError,
    );
    runtime.close();
  });
});

test("separate runtime connections still yield exactly one active lease", () =>
  withDatabase((databasePath) => {
    const time = controlledClock();
    const first = startRuntime(databasePath, { time });
    const traceA = seedAndStance(first.service, "req_connection_a");
    const traceB = recordStance(first.service, "req_connection_b");
    const secondStore = openWorldStore(databasePath);
    const secondRuntimeStore = openRuntimeStore(databasePath);
    const second = new M1RuntimeWorldKernelService(secondStore, secondRuntimeStore, {
      clock: time.clock,
      leaseDurationMs: 10 * 60 * 1000,
    });
    first.service.acquireThawRuntime(
      fixture.threadId,
      traceA.requestId,
      acquireBody("op_connection_a"),
    );
    assert.throws(
      () => second.acquireThawRuntime(
        fixture.threadId,
        traceB.requestId,
        acquireBody("op_connection_b"),
      ),
      ThawLeaseConflictError,
    );
    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    assert.equal(
      Number(database.prepare("SELECT COUNT(*) AS count FROM thaw_leases WHERE status='active'").get().count),
      1,
    );
    database.close();
    secondRuntimeStore.close();
    secondStore.close();
    first.close();
  }));

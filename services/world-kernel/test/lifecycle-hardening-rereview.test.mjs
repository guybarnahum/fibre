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
import { ParticipationAuthorizationRejectedError } from "../src/runtime-domain.mjs";
import { RuntimeAbandonRejectedError } from "../src/lifecycle-hardening-domain.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

async function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-lifecycle-rereview-"));
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
    set(iso) { value = Date.parse(iso); },
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

function appraisalSubmission(requestId, correlationId) {
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
  correlationId,
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

function freezeBody(operationId) {
  return {
    operationId,
    lifeChangeDecisions: [{
      proposalIndex: 0,
      decision: "accept",
      rationale: "Evidence-bearing memory.",
    }],
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
    worker: { kind: "deterministic_actor", version: "rereview" },
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

function prepareRejected(service, requestId, correlationId) {
  const trace = recordStance(service, requestId, { correlationId });
  const runtime = service.acquireThawRuntime(
    fixture.threadId,
    requestId,
    acquireBody(`op_acquire_${requestId}`),
  ).runtime;
  service.runDeterministicActor(fixture.threadId, runtime.session.sessionId, {
    operationId: `op_actor_${requestId}`,
  });
  return service.runGoalGuardian(fixture.threadId, runtime.session.sessionId, {
    operationId: `op_guardian_${requestId}`,
  }).runtime;
}

test("abandon refuses a Guardian-rejected runtime after lease expiry", async () =>
  withDatabase(async (databasePath) => {
    const time = controlledClock();
    const runtime = start(databasePath, {
      time,
      actor: divergentActor,
      leaseDurationMs: 60_000,
    });
    runtime.service.seedThread({ thread: fixture });
    const rejected = prepareRejected(
      runtime.service,
      "req_abandon_expired_guard",
      "corr_abandon_expired_guard",
    );

    time.advance(60_001);
    assert.throws(
      () => runtime.service.abandonRejectedRuntime(
        fixture.threadId,
        rejected.session.sessionId,
        abandonBody("op_abandon_after_expiry"),
      ),
      (error) => error instanceof RuntimeAbandonRejectedError &&
        /lease expired before abandonment/.test(error.message),
    );
    assert.equal(
      runtime.lifecycleStore.getRuntimeAbandonment(
        fixture.threadId,
        rejected.session.sessionId,
        { required: false },
      ),
      null,
    );
    const unchanged = runtime.service.getRuntime(
      fixture.threadId,
      rejected.session.sessionId,
    );
    assert.equal(unchanged.session.status, "active");
    assert.equal(unchanged.lease.status, "active");
    assert.equal(
      runtime.freezeStore.getAuthorizationConsumption(
        rejected.authorization.authorizationId,
      ),
      null,
    );
    runtime.close();
  }));

test("abandon refuses a non-monotonic kernel clock before lease acquisition", async () =>
  withDatabase(async (databasePath) => {
    const time = controlledClock();
    const runtime = start(databasePath, { time, actor: divergentActor });
    runtime.service.seedThread({ thread: fixture });
    const rejected = prepareRejected(
      runtime.service,
      "req_abandon_backwards_clock",
      "corr_abandon_backwards_clock",
    );

    time.set("2026-08-05T20:59:00Z");
    assert.throws(
      () => runtime.service.abandonRejectedRuntime(
        fixture.threadId,
        rejected.session.sessionId,
        abandonBody("op_abandon_backwards_clock"),
      ),
      (error) => error instanceof IntegrityError &&
        /kernel clock moved before lease acquisition/.test(error.message),
    );
    assert.equal(
      runtime.lifecycleStore.getRuntimeAbandonment(
        fixture.threadId,
        rejected.session.sessionId,
        { required: false },
      ),
      null,
    );
    const unchanged = runtime.service.getRuntime(
      fixture.threadId,
      rejected.session.sessionId,
    );
    assert.equal(unchanged.session.status, "active");
    assert.equal(unchanged.lease.status, "active");
    runtime.close();
  }));

test("unattended rejected runtime expires as a timeout, not synthetic abandonment", async () =>
  withDatabase(async (databasePath) => {
    const time = controlledClock();
    const runtime = start(databasePath, {
      time,
      actor: divergentActor,
      leaseDurationMs: 60_000,
    });
    runtime.service.seedThread({ thread: fixture });
    const rejected = prepareRejected(
      runtime.service,
      "req_rejected_timeout",
      "corr_rejected_timeout_lineage",
    );

    time.advance(60_001);
    const freshTrace = recordStance(runtime.service, "req_after_rejected_timeout", {
      correlationId: "corr_rejected_timeout_lineage",
    });
    const fresh = runtime.service.acquireThawRuntime(
      fixture.threadId,
      freshTrace.requestId,
      acquireBody("op_acquire_after_rejected_timeout"),
    ).runtime;

    const expired = runtime.service.getRuntime(
      fixture.threadId,
      rejected.session.sessionId,
    );
    assert.equal(expired.session.status, "aborted");
    assert.equal(expired.lease.status, "expired");
    assert.equal(expired.lease.releaseReason, "lease_expired");
    assert.equal(
      runtime.lifecycleStore.getRuntimeAbandonment(
        fixture.threadId,
        rejected.session.sessionId,
        { required: false },
      ),
      null,
    );
    assert.equal(
      runtime.freezeStore.getAuthorizationConsumption(
        rejected.authorization.authorizationId,
      ),
      null,
    );
    assert.equal(fresh.session.status, "active");
    runtime.close();
  }));

test("M1 obligation discharge identity is exact UTF-8 prose", async () =>
  withDatabase(async (databasePath) => {
    const runtime = start(databasePath);
    runtime.service.seedThread({ thread: fixture });
    const obligation = fixture.currentState.unresolvedIntentions[0];
    const trace = recordStance(runtime.service, "req_exact_obligation_identity", {
      correlationId: "corr_exact_obligation_identity",
      action: "refuse",
      score: 8,
    });
    const active = runtime.service.acquireThawRuntime(
      fixture.threadId,
      trace.requestId,
      acquireBody("op_acquire_exact_obligation_identity", [obligation]),
    ).runtime;
    runtime.service.runDeterministicActor(fixture.threadId, active.session.sessionId, {
      operationId: "op_actor_exact_obligation_identity",
    });
    runtime.service.runGoalGuardian(fixture.threadId, active.session.sessionId, {
      operationId: "op_guardian_exact_obligation_identity",
    });
    runtime.service.freezeRuntime(
      fixture.threadId,
      active.session.sessionId,
      freezeBody("op_freeze_exact_obligation_identity"),
    );

    assert.throws(
      () => runtime.lifecycleStore.assertObligationsUnspent(
        fixture.threadId,
        [obligation],
      ),
      ParticipationAuthorizationRejectedError,
    );
    const nearMiss = ` ${obligation}`;
    assert.doesNotThrow(
      () => runtime.lifecycleStore.assertObligationsUnspent(
        fixture.threadId,
        [nearMiss],
      ),
    );

    const nearMissTrace = recordStance(runtime.service, "req_near_miss_obligation", {
      correlationId: "corr_exact_obligation_identity",
      action: "refuse",
      score: 8,
    });
    assert.throws(
      () => runtime.service.acquireThawRuntime(
        fixture.threadId,
        nearMissTrace.requestId,
        acquireBody("op_acquire_near_miss_obligation", [nearMiss]),
      ),
      (error) => error instanceof ParticipationAuthorizationRejectedError &&
        /obligation is not recorded by the Thread/.test(error.message),
    );
    runtime.close();
  }));

test("same-version schema open restores newer lifecycle tables and triggers", async () =>
  withDatabase(async (databasePath) => {
    const lifecycle = openLifecycleHardeningStore(databasePath);
    assert.equal(lifecycle.storageMetadata().schemaVersion, 6);
    lifecycle.close();

    let database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    database.exec(`
      DROP TRIGGER IF EXISTS participation_authorizations_reject_discharged_obligation;
      DROP TRIGGER IF EXISTS runtime_abandons_no_update;
      DROP TRIGGER IF EXISTS runtime_abandons_no_delete;
      DROP INDEX IF EXISTS idx_runtime_abandons_thread_time;
      DROP TABLE IF EXISTS runtime_abandons;
    `);
    assert.equal(Number(database.prepare("PRAGMA user_version").get().user_version), 6);
    database.close();

    const reopened = openLifecycleHardeningStore(databasePath);
    assert.equal(reopened.storageMetadata().schemaVersion, 6);
    reopened.close();

    database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    assert.equal(
      database.prepare(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='runtime_abandons'",
      ).get().count,
      1,
    );
    for (const name of [
      "runtime_abandons_no_update",
      "runtime_abandons_no_delete",
      "participation_authorizations_reject_discharged_obligation",
    ]) {
      assert.equal(
        database.prepare(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='trigger' AND name=?",
        ).get(name).count,
        1,
        name,
      );
    }
    database.close();
  }));

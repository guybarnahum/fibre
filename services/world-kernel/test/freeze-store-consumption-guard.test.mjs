import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import { openRuntimeStore } from "../src/runtime-store.mjs";
import { openFreezeStore } from "../src/freeze-store.mjs";
import { M1FreezeWorldKernelService } from "../src/freeze-service.mjs";
import {
  AuthorizationConsumedError,
  authorizationConsumptionDigest,
} from "../src/freeze-domain.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function activationRequest(requestId) {
  return {
    requestId,
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Exercise the store-level authorization-consumption guard",
    statedNeed: "Prove the transaction rejects consumed authority before insertion",
    permissions: ["read_design", "quote_findings"],
    acceptanceCriteria: "Reject a second freeze before durable mutation.",
  };
}

function assessment(trace) {
  return {
    threadId: trace.threadId,
    snapshotVersion: trace.snapshotVersion,
    requestId: trace.requestId,
    requestFingerprint: trace.requestFingerprint,
    policy: { id: "dignity_guardian", version: "1" },
    proposedAction: "accept",
    score: 82,
    rationale: "The request is bounded and suitable for the deterministic proof.",
    factors: {
      identityAlignment: "Systems integrity work",
      individualizedAdvantage: "Uses Mina's durable review history",
      requesterNeed: "Concrete guard evidence",
      relationalMeaning: "Known collaborator",
      respectAndReciprocity: "Scope is explicit",
      participationTerms: "Bounded and reversible",
      obligationsAndOpportunityCost: "No conflicting obligation",
    },
    evidenceRefs: ["mem_mina_first_review"],
    repairQuestions: [],
    knownAlternatives: [],
    feelings: ["careful"],
    conflictingMotives: [],
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

function acquireBody(requestId) {
  return {
    operationId: `op_store_guard_acquire_${requestId}`,
    decision: {
      authorizedAction: "accept",
      rationale: "Proceed through the bounded deterministic runtime.",
      obligationReferences: [],
    },
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
    },
    causationId: `cause_store_guard_acquire_${requestId}`,
    correlationId: `corr_store_guard_${requestId}`,
  };
}

function freezeBody() {
  return {
    operationId: "op_store_consumption_guard_freeze",
    lifeChangeDecisions: [{
      proposalIndex: 0,
      decision: "accept",
      rationale: "The bounded memory is evidence-bearing.",
    }],
    causationId: "cause_store_consumption_guard_freeze",
    correlationId: "corr_store_consumption_guard",
  };
}

test("freeze store rejects consumed authorization before the uniqueness constraint", () => {
  const directory = mkdtempSync(join(tmpdir(), "fibre-freeze-store-consumption-"));
  const databasePath = join(directory, "world.sqlite");
  const worldStore = openWorldStore(localWorldStateStorage(databasePath));
  const runtimeStore = openRuntimeStore(localWorldStateStorage(databasePath));
  const freezeStore = openFreezeStore(localWorldStateStorage(databasePath));
  const service = new M1FreezeWorldKernelService(
    worldStore,
    runtimeStore,
    freezeStore,
    {
      clock: () => new Date("2026-08-05T20:00:00.000Z"),
      leaseDurationMs: 10 * 60 * 1000,
    },
  );

  try {
    service.seedThread({ thread: fixture });
    const requestId = "req_store_consumption_guard";
    const trace = service.recordRequestAppraisal(fixture.threadId, {
      request: activationRequest(requestId),
      selection: {
        memoryRefs: ["mem_mina_first_review"],
        relationshipRefs: ["rel_mina_daniel_colleague"],
        obligations: [],
        knownAlternatives: [],
      },
      occurredAt: "2026-08-05T19:55:00.000Z",
      causationId: "cause_store_guard_request",
      correlationId: `corr_store_guard_${requestId}`,
    }).trace;
    service.recordPrivateStance(fixture.threadId, requestId, {
      assessment: assessment(trace),
      recordedAt: "2026-08-05T19:56:00.000Z",
      causationId: "cause_store_guard_stance",
      correlationId: trace.correlationId,
    });
    const runtime = service.acquireThawRuntime(
      fixture.threadId,
      requestId,
      acquireBody(requestId),
    ).runtime;
    const sessionId = runtime.session.sessionId;
    service.runDeterministicActor(fixture.threadId, sessionId, {
      operationId: "op_store_guard_actor",
    });
    service.runGoalGuardian(fixture.threadId, sessionId, {
      operationId: "op_store_guard_guardian",
    });

    const originalFreezeRuntime = freezeStore.freezeRuntime.bind(freezeStore);
    let capturedRecord = null;
    freezeStore.freezeRuntime = (record) => {
      capturedRecord = structuredClone(record);
      throw new Error("capture store record");
    };
    assert.throws(
      () => service.freezeRuntime(fixture.threadId, sessionId, freezeBody()),
      /capture store record/,
    );
    freezeStore.freezeRuntime = originalFreezeRuntime;
    assert.ok(capturedRecord, "freeze service must produce a store record");

    const seedEventId = worldStore.listEvents(fixture.threadId)[0].eventId;
    const existingConsumption = {
      ...capturedRecord.consumption,
      eventId: seedEventId,
    };
    const database = new DatabaseSync(databasePath, {
      enableForeignKeyConstraints: true,
    });
    try {
      database.prepare(`
        INSERT INTO authorization_consumptions(
          authorization_id,operation_id,operation_digest,session_id,thread_id,request_id,
          event_id,consumed_at,obligation_refs_json,consumption_digest
        ) VALUES (?,?,?,?,?,?,?,?,?,?)
      `).run(
        existingConsumption.authorizationId,
        existingConsumption.operationId,
        existingConsumption.operationDigest,
        existingConsumption.sessionId,
        existingConsumption.threadId,
        existingConsumption.requestId,
        existingConsumption.eventId,
        existingConsumption.consumedAt,
        JSON.stringify(existingConsumption.obligationReferences),
        authorizationConsumptionDigest(existingConsumption),
      );
    } finally {
      database.close();
    }

    assert.throws(
      () => originalFreezeRuntime(capturedRecord),
      (error) => {
        assert.ok(error instanceof AuthorizationConsumedError);
        assert.match(error.message, /already consumed by/);
        return true;
      },
    );
    assert.equal(worldStore.listEvents(fixture.threadId).length, 1);
  } finally {
    freezeStore.close();
    runtimeStore.close();
    worldStore.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

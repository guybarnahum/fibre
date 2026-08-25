import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  PrivateRequestConflictError,
  PrivateStanceConflictError,
  WORLD_STORE_SCHEMA_VERSION,
  openWorldStore,
} from "../src/persistence.mjs";
import { WorldKernelService } from "../src/kernel-service.mjs";
import { prepareRequestAppraisal, requestFingerprint } from "../src/private-participation.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-private-request-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function activationRequest(overrides = {}) {
  return {
    requestId: "req_security_review_001",
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Review an identity-service design",
    statedNeed: "Find authorization weaknesses",
    permissions: ["read_design", "quote_findings"],
    acceptanceCriteria: "Return a concise risk review",
    ...overrides,
  };
}

function appraisalSubmission(overrides = {}) {
  return {
    request: activationRequest(),
    selection: {
      memoryRefs: ["mem_mina_first_review"],
      relationshipRefs: ["rel_mina_daniel_colleague"],
      obligations: [],
      knownAlternatives: [],
    },
    occurredAt: "2026-08-05T01:20:00Z",
    causationId: "cause_req_001",
    correlationId: "corr_request_001",
    ...overrides,
  };
}

function assessment(trace, overrides = {}) {
  return {
    threadId: trace.threadId,
    snapshotVersion: trace.snapshotVersion,
    requestId: trace.requestId,
    requestFingerprint: trace.requestFingerprint,
    policy: { id: "dignity_guardian", version: "1" },
    proposedAction: "accept",
    score: 82,
    rationale: "The request is individualized, respectful, bounded, and aligned with my security growth.",
    factors: {
      identityAlignment: "Strong systems and security fit",
      individualizedAdvantage: "Uses Mina's review history and self-model",
      requesterNeed: "Concrete authorization review need",
      relationalMeaning: "A known collaborator is asking",
      respectAndReciprocity: "Scope and attribution are explicit",
      participationTerms: "The review is bounded and reversible",
      obligationsAndOpportunityCost: "No recorded obligation conflicts",
    },
    evidenceRefs: ["mem_mina_first_review"],
    repairQuestions: [],
    knownAlternatives: [],
    feelings: ["engaged"],
    conflictingMotives: ["Protect study time"],
    uncertainties: ["Deployment details may be absent"],
    relationshipImpact: {
      entity: activationRequest().requester,
      fondnessDelta: 0.1,
      resentmentDelta: 0,
      rationale: "The request is respectful and specific.",
      evidenceRefs: ["rel_mina_daniel_colleague"],
    },
    ...overrides,
  };
}

function updateCommand() {
  return {
    commandId: "cmd_mina_advance_for_stale_appraisal",
    threadId: fixture.threadId,
    expectedVersion: 1,
    type: "UPDATE_SELF_MODEL",
    payload: {
      selfModel: "I now preserve historical private appraisals after durable self-model changes.",
      summary: "Advance Mina after request appraisal.",
    },
    actor: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    occurredAt: "2026-08-05T01:22:00Z",
  };
}

function seededService(databasePath) {
  const store = openWorldStore(databasePath);
  const service = new WorldKernelService(store);
  service.seedThread({ thread: fixture });
  return { store, service };
}

test("kernel request fingerprint matches the portable domain binding", async () => {
  const domain = await import("#packages/domain/dist/index.js");
  const base = activationRequest();
  assert.equal(requestFingerprint(base), domain.requestFingerprint(base));
  const selection = {
    memoryRefs: ["mem_mina_first_review"],
    relationshipRefs: ["rel_mina_daniel_colleague"],
    obligations: [],
    knownAlternatives: [],
  };
  const canonicalBase = { ...base, permissions: [...base.permissions].sort() };
  assert.deepEqual(
    prepareRequestAppraisal(fixture, canonicalBase, selection),
    domain.prepareRequestAppraisal(fixture, canonicalBase, selection),
  );
  for (const changed of [
    { requestId: "req_security_review_002" },
    { trigger: "scheduled_review" },
    { requester: { ...base.requester, displayName: "Guy Bar-Nahum" } },
    { objective: "Review a different service" },
    { statedNeed: "Find privacy weaknesses" },
    { permissions: ["read_design"] },
    { acceptanceCriteria: "Return a full report" },
  ]) {
    assert.notEqual(requestFingerprint({ ...base, ...changed }), requestFingerprint(base));
  }
  assert.equal(
    requestFingerprint({ ...base, permissions: [...base.permissions].reverse() }),
    requestFingerprint(base),
  );
});

test("persists an immutable Thread-owned request appraisal without public event leakage", () =>
  withDatabase((databasePath) => {
    const { store, service } = seededService(databasePath);
    const created = service.recordRequestAppraisal(fixture.threadId, appraisalSubmission());
    assert.equal(created.idempotent, false);
    assert.equal(created.trace.snapshotVersion, 1);
    assert.deepEqual(created.trace.appraisal.relevantMemories, ["mem_mina_first_review"]);
    assert.deepEqual(created.trace.appraisal.excludedRelationships, ["rel_mina_sunhee_story"]);
    assert.deepEqual(created.trace.appraisal.obligations, []);
    assert.deepEqual(created.trace.appraisal.excludedObligations, fixture.currentState.unresolvedIntentions);
    assert.equal(store.listEvents(fixture.threadId).length, 1);

    const retry = service.recordRequestAppraisal(fixture.threadId, {
      ...appraisalSubmission(),
      request: { ...activationRequest(), permissions: [...activationRequest().permissions].reverse() },
    });
    assert.equal(retry.idempotent, true);
    assert.equal(retry.trace.appraisalId, created.trace.appraisalId);
    store.applyCommand(updateCommand());
    const afterAdvance = service.recordRequestAppraisal(fixture.threadId, appraisalSubmission());
    assert.equal(afterAdvance.idempotent, true);
    assert.equal(afterAdvance.trace.snapshotVersion, 1);
    assert.equal(service.getThread(fixture.threadId).version, 2);
    assert.equal(service.listPrivateRequestSummaries(fixture.threadId).length, 1);
    store.close();
  }));

test("unowned appraisal context and conflicting request reuse fail without partial records", () =>
  withDatabase((databasePath) => {
    const { store, service } = seededService(databasePath);
    assert.throws(
      () => service.recordRequestAppraisal(fixture.threadId, {
        ...appraisalSubmission(),
        selection: { memoryRefs: ["mem_attacker_injected"] },
      }),
      /not owned by the Thread/,
    );
    assert.deepEqual(service.listPrivateRequestSummaries(fixture.threadId), []);

    service.recordRequestAppraisal(fixture.threadId, appraisalSubmission());
    assert.throws(
      () => service.recordRequestAppraisal(fixture.threadId, {
        ...appraisalSubmission(),
        request: activationRequest({ objective: "Replace Mina's identity" }),
      }),
      PrivateRequestConflictError,
    );
    assert.equal(service.listPrivateRequestSummaries(fixture.threadId).length, 1);
    store.close();
  }));

test("records one restricted private stance with exact retry and binding enforcement", () =>
  withDatabase((databasePath) => {
    const { store, service } = seededService(databasePath);
    const trace = service.recordRequestAppraisal(fixture.threadId, appraisalSubmission()).trace;
    const submission = {
      assessment: assessment(trace),
      recordedAt: "2026-08-05T01:21:00Z",
      causationId: "cause_stance_001",
      correlationId: trace.correlationId,
    };
    const first = service.recordPrivateStance(fixture.threadId, trace.requestId, submission);
    assert.equal(first.idempotent, false);
    assert.equal(first.trace.privateStance.desiredAction, "accept");
    assert.equal(first.trace.privateStance.dignityBand, "high");
    assert.equal(first.trace.privateStanceThreadStateHash, first.trace.threadStateHash);
    assert.equal(service.recordPrivateStance(fixture.threadId, trace.requestId, submission).idempotent, true);

    assert.throws(
      () => service.recordPrivateStance(fixture.threadId, trace.requestId, {
        ...submission,
        assessment: assessment(trace, { score: 75, rationale: "Different immutable stance." }),
      }),
      PrivateStanceConflictError,
    );
    assert.throws(
      () => service.recordPrivateStance(fixture.threadId, trace.requestId, {
        ...submission,
        assessment: assessment(trace, {
          requestFingerprint: `sha256:${"0".repeat(64)}`,
        }),
      }),
      /persisted appraisal trace/,
    );
    store.close();
  }));

test("records a private stance against its historical appraisal after the Thread advances", () =>
  withDatabase((databasePath) => {
    const { store, service } = seededService(databasePath);
    const trace = service.recordRequestAppraisal(fixture.threadId, appraisalSubmission()).trace;
    store.applyCommand(updateCommand());
    const result = service.recordPrivateStance(fixture.threadId, trace.requestId, {
      assessment: assessment(trace),
      recordedAt: "2026-08-05T01:23:00Z",
      causationId: "cause_historical_stance",
    });
    assert.equal(result.idempotent, false);
    assert.equal(result.trace.snapshotVersion, 1);
    assert.equal(result.trace.privateStance.snapshotVersion, 1);
    assert.equal(service.getThread(fixture.threadId).version, 2);
    store.close();
  }));

test("private request traces survive restart and verify against historical Thread replay", () =>
  withDatabase((databasePath) => {
    let runtime = seededService(databasePath);
    const trace = runtime.service.recordRequestAppraisal(fixture.threadId, appraisalSubmission()).trace;
    runtime.store.applyCommand(updateCommand());
    runtime.store.close();

    const reopened = openWorldStore(databasePath);
    const service = new WorldKernelService(reopened);
    const recovered = service.getPrivateRequestTrace(fixture.threadId, trace.requestId);
    assert.equal(recovered.snapshotVersion, 1);
    assert.equal(recovered.requestFingerprint, trace.requestFingerprint);
    assert.equal(service.getThread(fixture.threadId).version, 2);
    assert.equal(service.verifyPrivateRequestTrace(fixture.threadId, trace.requestId).hasPrivateStance, false);
    reopened.close();
  }));

test("private records are append-only and coherent tampering is detected", () =>
  withDatabase((databasePath) => {
    const { store, service } = seededService(databasePath);
    const trace = service.recordRequestAppraisal(fixture.threadId, appraisalSubmission()).trace;
    service.recordPrivateStance(fixture.threadId, trace.requestId, {
      assessment: assessment(trace),
      recordedAt: "2026-08-05T01:21:00Z",
      causationId: "cause_stance_001",
    });
    store.close();

    let database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    assert.throws(
      () => database.prepare("UPDATE activation_requests SET occurred_at = occurred_at").run(),
      /append-only/,
    );
    assert.throws(
      () => database.prepare("DELETE FROM request_appraisals").run(),
      /append-only/,
    );
    assert.throws(
      () => database.prepare("UPDATE private_participation_stances SET recorded_at = recorded_at").run(),
      /append-only/,
    );
    database.exec("DROP TRIGGER request_appraisals_no_update");
    database.prepare("UPDATE request_appraisals SET capsule_digest = ? WHERE appraisal_id = ?")
      .run(`sha256:${"0".repeat(64)}`, trace.appraisalId);
    database.close();

    const reopened = openWorldStore(databasePath);
    assert.throws(
      () => reopened.getPrivateRequestTrace(fixture.threadId, trace.requestId),
      IntegrityError,
    );
    reopened.close();
  }));

test("schema version 1 migrates in place to private participation schema version 2", () =>
  withDatabase((databasePath) => {
    const { store } = seededService(databasePath);
    store.close();
    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    database.exec(`
      DROP TABLE private_participation_stances;
      DROP TABLE request_appraisals;
      DROP TABLE activation_requests;
      PRAGMA user_version = 1;
    `);
    database.close();

    const migrated = openWorldStore(databasePath);
    assert.equal(migrated.storageMetadata().schemaVersion, WORLD_STORE_SCHEMA_VERSION);
    assert.equal(migrated.getThread(fixture.threadId).threadId, fixture.threadId);
    const service = new WorldKernelService(migrated);
    assert.equal(service.recordRequestAppraisal(fixture.threadId, appraisalSubmission()).idempotent, false);
    migrated.close();
  }));

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  StaleAppraisalError,
  canonicalJson,
  openWorldStore,
} from "../src/persistence.mjs";
import { WorldKernelService } from "../src/kernel-service.mjs";
import {
  appraisalDigest,
  prepareRequestAppraisal,
} from "../src/private-participation.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-private-adversarial-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function activationRequest(overrides = {}) {
  return {
    requestId: "req_adversarial_001",
    trigger: "human_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Review an identity-service design",
    statedNeed: "Find authorization weaknesses",
    permissions: ["quote_findings", "read_design"],
    acceptanceCriteria: "Return a concise risk review",
    ...overrides,
  };
}

function selection(overrides = {}) {
  return {
    memoryRefs: ["mem_mina_first_review"],
    relationshipRefs: ["rel_mina_daniel_colleague"],
    obligations: [],
    knownAlternatives: [],
    ...overrides,
  };
}

function appraisalSubmission(overrides = {}) {
  return {
    request: activationRequest(),
    selection: selection(),
    occurredAt: "2026-08-05T02:00:00Z",
    causationId: "cause_adversarial_request_001",
    correlationId: "corr_adversarial_request_001",
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

function stanceSubmission(trace, assessmentOverrides = {}, submissionOverrides = {}) {
  return {
    assessment: assessment(trace, assessmentOverrides),
    recordedAt: "2026-08-05T02:01:00Z",
    causationId: "cause_adversarial_stance_001",
    correlationId: trace.correlationId,
    ...submissionOverrides,
  };
}

function updateCommand(overrides = {}) {
  return {
    commandId: "cmd_adversarial_advance_001",
    threadId: fixture.threadId,
    expectedVersion: 1,
    type: "UPDATE_SELF_MODEL",
    payload: {
      selfModel: "I preserve historical appraisals while current state continues to evolve.",
      summary: "Advance Mina after appraisal.",
    },
    actor: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    occurredAt: "2026-08-05T02:02:00Z",
    ...overrides,
  };
}

function seededService(databasePath) {
  const store = openWorldStore(databasePath);
  const service = new WorldKernelService(store);
  service.seedThread({ thread: fixture });
  return { store, service };
}

function directRecord(store, request, appraisal, suffix = "direct") {
  return store.recordRequestAppraisal({
    threadId: fixture.threadId,
    request,
    appraisal,
    occurredAt: `2026-08-05T02:1${suffix.length % 10}:00Z`,
    causationId: `cause_${suffix}`,
    correlationId: `corr_${suffix}`,
  });
}

function assertNoStoredTrace(store, requestId) {
  assert.equal(
    store.getPrivateRequestTrace(fixture.threadId, requestId, { required: false }),
    null,
  );
}

test("rejects low-dignity acceptance, incomplete clarify/delegate, and missing evidence", () =>
  withDatabase((databasePath) => {
    const { store, service } = seededService(databasePath);
    const trace = service.recordRequestAppraisal(fixture.threadId, appraisalSubmission()).trace;

    assert.throws(
      () => service.recordPrivateStance(
        fixture.threadId,
        trace.requestId,
        stanceSubmission(trace, { proposedAction: "accept", score: 39 }),
      ),
      /accept stance requires high dignity/,
    );
    assert.throws(
      () => service.recordPrivateStance(
        fixture.threadId,
        trace.requestId,
        stanceSubmission(trace, {
          proposedAction: "clarify",
          score: 60,
          repairQuestions: [],
        }),
      ),
      /clarification requires at least one repair question/,
    );
    assert.throws(
      () => service.recordPrivateStance(
        fixture.threadId,
        trace.requestId,
        stanceSubmission(trace, {
          proposedAction: "delegate",
          score: 60,
          knownAlternatives: [],
        }),
      ),
      /delegation requires a known alternative/,
    );
    assert.throws(
      () => service.recordPrivateStance(
        fixture.threadId,
        trace.requestId,
        stanceSubmission(trace, { evidenceRefs: [] }),
      ),
      /requires attributable evidence/,
    );
    assert.throws(
      () => service.recordPrivateStance(
        fixture.threadId,
        trace.requestId,
        stanceSubmission(trace, {
          relationshipImpact: {
            ...assessment(trace).relationshipImpact,
            evidenceRefs: [],
          },
        }),
      ),
      /non-zero changes require evidence/,
    );
    assert.equal(service.getPrivateRequestTrace(fixture.threadId, trace.requestId).privateStance, null);
    store.close();
  }));

test("rejects every stance-to-trace substitution and requester-target substitution", () =>
  withDatabase((databasePath) => {
    const { store, service } = seededService(databasePath);
    const trace = service.recordRequestAppraisal(fixture.threadId, appraisalSubmission()).trace;
    const substitutions = [
      ["threadId", { threadId: "thr_other_001" }],
      ["snapshotVersion", { snapshotVersion: trace.snapshotVersion + 1 }],
      ["requestId", { requestId: "req_other_001" }],
      ["requestFingerprint", { requestFingerprint: `sha256:${"0".repeat(64)}` }],
      ["policy", { policy: { id: "dignity_guardian", version: "2" } }],
    ];
    for (const [name, changed] of substitutions) {
      assert.throws(
        () => service.recordPrivateStance(
          fixture.threadId,
          trace.requestId,
          stanceSubmission(trace, changed, {
            causationId: `cause_substitute_${name}`,
          }),
        ),
        /persisted appraisal trace/,
        name,
      );
    }
    assert.throws(
      () => service.recordPrivateStance(
        fixture.threadId,
        trace.requestId,
        stanceSubmission(trace, {
          relationshipImpact: {
            ...assessment(trace).relationshipImpact,
            entity: { entityId: "human_other", kind: "human", displayName: "Other" },
          },
        }),
      ),
      /relationship target does not match requester/,
    );
    assert.equal(service.getPrivateRequestTrace(fixture.threadId, trace.requestId).privateStance, null);
    store.close();
  }));

test("rejects capsule requester substitution, partition corruption, and copied-state substitution", () =>
  withDatabase((databasePath) => {
    const { store } = seededService(databasePath);

    const cases = [
      ["requester", (capsule) => { capsule.requester = { ...capsule.requester, displayName: "Other" }; }, /requester does not match/],
      ["partition-overlap", (capsule) => { capsule.excludedMemories.push(capsule.relevantMemories[0]); }, /includes overlap/],
      ["partition-missing", (capsule) => { capsule.relevantMemories = []; }, /does not partition/],
      ["partition-extra", (capsule) => { capsule.excludedMemories.push("mem_unowned_extra"); }, /does not partition/],
      ["self-model", (capsule) => { capsule.selfModel = "Substituted self-model"; }, /private Thread state/],
      ["feelings", (capsule) => { capsule.feelings = ["substituted feeling"]; }, /private Thread state/],
      ["needs", (capsule) => { capsule.needs = ["substituted need"]; }, /private Thread state/],
      ["intentions", (capsule) => { capsule.unresolvedIntentions = ["substituted intention"]; }, /private Thread state/],
      ["budgets", (capsule) => { capsule.budgets = { ...capsule.budgets, fibreCredits: 999999 }; }, /private Thread state/],
    ];

    for (const [suffix, mutate, expected] of cases) {
      const request = activationRequest({ requestId: `req_bad_${suffix}` });
      const capsule = prepareRequestAppraisal(store.getThread(fixture.threadId), request, selection());
      mutate(capsule);
      assert.throws(() => directRecord(store, request, capsule, suffix), expected, suffix);
      assertNoStoredTrace(store, request.requestId);
    }
    store.close();
  }));

test("direct store rejects an appraisal whose snapshot became stale before atomic persistence", () =>
  withDatabase((databasePath) => {
    const { store } = seededService(databasePath);
    const request = activationRequest({ requestId: "req_stale_direct_001" });
    const appraisal = prepareRequestAppraisal(store.getThread(fixture.threadId), request, selection());
    store.applyCommand(updateCommand());
    assert.throws(
      () => directRecord(store, request, appraisal, "stale_direct"),
      StaleAppraisalError,
    );
    assertNoStoredTrace(store, request.requestId);
    store.close();
  }));

test("omitted and explicit full selection retry identically while explicit empty selection remains distinct", () =>
  withDatabase((databasePath) => {
    const { store, service } = seededService(databasePath);
    const request = activationRequest({ requestId: "req_selection_full_001" });
    const base = {
      request,
      occurredAt: "2026-08-05T02:20:00Z",
      causationId: "cause_selection_full",
    };
    const omitted = service.recordRequestAppraisal(fixture.threadId, base);
    const explicit = service.recordRequestAppraisal(fixture.threadId, {
      ...base,
      selection: {
        memoryRefs: [...fixture.memoryRefs],
        relationshipRefs: [...fixture.relationshipRefs],
        obligations: [...fixture.currentState.unresolvedIntentions],
        knownAlternatives: [],
      },
    });
    assert.equal(explicit.idempotent, true);
    assert.equal(explicit.trace.appraisalId, omitted.trace.appraisalId);

    const emptyRequest = activationRequest({ requestId: "req_selection_empty_001" });
    const empty = service.recordRequestAppraisal(fixture.threadId, {
      request: emptyRequest,
      selection: {
        memoryRefs: [],
        relationshipRefs: [],
        obligations: [],
        knownAlternatives: [],
      },
      occurredAt: "2026-08-05T02:21:00Z",
      causationId: "cause_selection_empty",
    }).trace;
    assert.deepEqual(empty.appraisal.relevantMemories, []);
    assert.deepEqual(empty.appraisal.excludedMemories, fixture.memoryRefs);
    assert.deepEqual(empty.appraisal.relevantRelationships, []);
    assert.deepEqual(empty.appraisal.excludedRelationships, fixture.relationshipRefs);
    assert.deepEqual(empty.appraisal.obligations, []);
    assert.deepEqual(
      empty.appraisal.excludedObligations,
      fixture.currentState.unresolvedIntentions,
    );
    store.close();
  }));

test("opaque appraisal and stance identifiers are not content-addressed", () => {
  const ids = [];
  for (let index = 0; index < 2; index += 1) {
    withDatabase((databasePath) => {
      const { store, service } = seededService(databasePath);
      const trace = service.recordRequestAppraisal(fixture.threadId, appraisalSubmission()).trace;
      const completed = service.recordPrivateStance(
        fixture.threadId,
        trace.requestId,
        stanceSubmission(trace),
      ).trace;
      ids.push([completed.appraisalId, completed.privateStanceId]);
      assert.match(completed.appraisalId, /^app_[0-9a-f]{64}$/);
      assert.match(completed.privateStanceId, /^pst_[0-9a-f]{64}$/);
      assert.notEqual(completed.appraisalId.slice(4), completed.appraisalDigest.slice(7));
      assert.notEqual(completed.privateStanceId.slice(4), completed.privateStanceDigest.slice(7));
      store.close();
    });
  }
  assert.notDeepEqual(ids[0], ids[1]);
});

test("schema rejects malformed appraisal and stance identifiers", () => {
  withDatabase((databasePath) => {
    const { store, service } = seededService(databasePath);
    const trace = service.recordRequestAppraisal(fixture.threadId, appraisalSubmission()).trace;
    service.recordPrivateStance(fixture.threadId, trace.requestId, stanceSubmission(trace));
    store.close();

    const database = new DatabaseSync(databasePath);
    database.exec(`
      DROP TRIGGER request_appraisals_no_update;
      DROP TRIGGER private_participation_stances_no_update;
    `);
    assert.throws(
      () => database.prepare("UPDATE request_appraisals SET appraisal_id = 'app_bad'").run(),
      /CHECK constraint failed/,
    );
    assert.throws(
      () => database.prepare("UPDATE private_participation_stances SET stance_id = 'pst_bad'").run(),
      /CHECK constraint failed/,
    );
    database.close();
  });
});

test("coherent capsule JSON, digest, and identifier rewriting is detected by historical replay", () =>
  withDatabase((databasePath) => {
    const { store, service } = seededService(databasePath);
    const trace = service.recordRequestAppraisal(fixture.threadId, appraisalSubmission()).trace;
    store.close();

    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    database.exec("DROP TRIGGER request_appraisals_no_update");
    const row = database.prepare(
      "SELECT capsule_json FROM request_appraisals WHERE appraisal_id = ?",
    ).get(trace.appraisalId);
    const capsule = JSON.parse(row.capsule_json);
    capsule.feelings = ["coherently rewritten private feeling"];
    database.prepare(`
      UPDATE request_appraisals
      SET appraisal_id = ?, capsule_json = ?, capsule_digest = ?
      WHERE appraisal_id = ?
    `).run(
      `app_${"f".repeat(64)}`,
      canonicalJson(capsule),
      appraisalDigest(capsule),
      trace.appraisalId,
    );
    database.close();

    const reopened = openWorldStore(databasePath);
    assert.throws(
      () => reopened.verifyPrivateRequestTrace(fixture.threadId, trace.requestId),
      IntegrityError,
    );
    reopened.close();
  }));

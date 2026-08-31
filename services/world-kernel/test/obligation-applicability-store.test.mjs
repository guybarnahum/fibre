import { localWorldStateStorage } from "./support/world-state-storage-fixture.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { WorldKernelService } from "../src/kernel-service.mjs";
import { openWorldStore } from "../src/persistence.mjs";
import { requestFingerprint } from "../src/private-participation.mjs";
import {
  ObligationConflictError,
  ObligationNotFoundError,
  openObligationStore,
} from "../src/obligation-store.mjs";
import {
  ApplicabilityConflictError,
  applicabilityIdForInput,
  applicabilityInputDigest,
  openObligationApplicabilityStore,
} from "../src/obligation-applicability-store.mjs";
import { applicabilityDecisionDigest } from "../src/obligation-schema.mjs";
import { canonicalJson } from "../src/persistence-common.mjs";
import { openStructuredObligationInspectionStore } from "../src/structured-obligation-inspection-store.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const OBLIGATION_A = `obl_${"1".repeat(64)}`;
const OBLIGATION_B = `obl_${"2".repeat(64)}`;
const WRONG_FINGERPRINT = `sha256:${"f".repeat(64)}`;

function request(requestId = "req_obligation_applicability") {
  return {
    requestId,
    trigger: "direct_request",
    requester: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    objective: "Perform one bounded Fibre security review.",
    statedNeed: "Confirm whether the current authority path is coherent.",
    permissions: ["read_private_context"],
    acceptanceCriteria: "Return evidence-bearing findings only.",
  };
}

function obligation({
  obligationId = OBLIGATION_A,
  revision = 1,
  status = "active",
  binding = requestFingerprint(request()),
  supersedesRevision,
  createdAt = "2026-08-09T18:59:00.000Z",
  terms = "Perform the bounded review if Fibre determines this obligation governs the request.",
  legacySourceDigest,
} = {}) {
  return {
    obligationId,
    revision,
    threadId: fixture.threadId,
    status,
    issuer: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    parties: [{
      role: "beneficiary",
      entity: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    }],
    scope: {
      description: "Participate in the exact Fibre-bound request.",
      binding: binding === null
        ? null
        : { kind: "request_fingerprint", requestFingerprint: binding },
    },
    terms,
    effectiveAt: "2026-08-09T19:00:00.000Z",
    expiresAt: "2026-09-09T19:00:00.000Z",
    recurrence: { kind: "none" },
    satisfaction: { criteria: "One authorized participation episode is completed and discharged." },
    provenance: {
      createdBy: "test",
      createdAt,
      evidenceReferences: ["evidence:commitment"],
    },
    visibility: { standing: "restricted", terms: "private" },
    ...(legacySourceDigest === undefined ? {} : { legacySourceDigest }),
    ...(supersedesRevision === undefined ? {} : { supersedesRevision }),
  };
}

function revision2(overrides = {}) {
  return obligation({
    revision: 2,
    supersedesRevision: 1,
    createdAt: "2026-08-09T20:02:00.000Z",
    terms: "Perform the bounded review under the current second revision.",
    ...overrides,
  });
}

function decisionInput(overrides = {}) {
  return {
    operationId: "oba_op_001",
    threadId: fixture.threadId,
    requestId: request().requestId,
    obligationId: OBLIGATION_A,
    nominationSource: "caller",
    decidedAt: "2026-08-09T20:01:00.000Z",
    causationId: "cause_applicability_001",
    correlationId: "corr_applicability_001",
    ...overrides,
  };
}

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-obligation-applicability-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    const world = openWorldStore(localWorldStateStorage(databasePath));
    world.seedThread(fixture);
    const kernel = new WorldKernelService(world);
    kernel.recordRequestAppraisal(fixture.threadId, {
      request: request(),
      selection: {
        memoryRefs: [],
        relationshipRefs: [],
        obligations: [],
        knownAlternatives: [],
      },
      occurredAt: "2026-08-09T20:00:00.000Z",
      causationId: "cause_request_001",
      correlationId: "corr_request_001",
    });
    world.close();

    const obligations = openObligationStore(localWorldStateStorage(databasePath));
    obligations.recordRevision(obligation(), { recordedAt: "2026-08-09T19:01:00.000Z" });
    obligations.close();
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("Fibre computes and persists an applies decision from current obligation and request witnesses", () =>
  withDatabase((databasePath) => {
    const store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    const input = decisionInput();
    const result = store.decideApplicability(input);
    assert.equal(result.created, true);
    assert.equal(result.decision.result, "applies");
    assert.equal(result.decision.reasonCode, "request_binding_match");
    assert.equal(result.decision.obligationRevision, 1);
    assert.equal(result.decision.requestFingerprint, requestFingerprint(request()));
    assert.equal(result.decision.inputDigest, applicabilityInputDigest(input));
    assert.equal(result.decision.applicabilityId, applicabilityIdForInput(input));
    assert.equal(result.decisionDigest, applicabilityDecisionDigest(result.decision));
    assert.deepEqual(result.decision.policy, {
      id: "structured_obligation_applicability",
      version: "1",
    });
    assert.equal(result.decision.evidenceReferences.length, 3);
    assert.equal(result.decision.evidenceReferences.some((ref) => ref.startsWith("activation_request:")), true);
    assert.equal(result.decision.evidenceReferences.some((ref) => ref.startsWith("thread_snapshot:")), true);
    assert.equal(result.decision.evidenceReferences.some((ref) => ref.startsWith("obligation_revision:")), true);
    assert.deepEqual(store.getDecision(result.decision.applicabilityId), {
      decision: result.decision,
      decisionDigest: result.decisionDigest,
    });
    assert.deepEqual(store.listRequestDecisions(fixture.threadId, request().requestId), [{
      decision: result.decision,
      decisionDigest: result.decisionDigest,
    }]);
    store.close();
  }));

test("exact operation retry is idempotent after restart and ignores later kernel time", () =>
  withDatabase((databasePath) => {
    let store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    const first = store.decideApplicability(decisionInput());
    store.close();

    store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    const retry = store.decideApplicability(decisionInput({
      decidedAt: "2026-08-09T20:10:00.000Z",
    }));
    assert.equal(retry.created, false);
    assert.deepEqual(retry.decision, first.decision);
    assert.equal(retry.decision.decidedAt, "2026-08-09T20:01:00.000Z");
    store.close();
  }));

test("operation identity cannot be reused for a different nomination", () =>
  withDatabase((databasePath) => {
    const obligations = openObligationStore(localWorldStateStorage(databasePath));
    obligations.recordRevision(obligation({ obligationId: OBLIGATION_B }), {
      recordedAt: "2026-08-09T19:02:00.000Z",
    });
    obligations.close();

    const store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    store.decideApplicability(decisionInput());
    assert.throws(
      () => store.decideApplicability(decisionInput({ obligationId: OBLIGATION_B })),
      ApplicabilityConflictError,
    );
    assert.throws(
      () => store.decideApplicability(decisionInput({ nominationSource: "fibre" })),
      ApplicabilityConflictError,
    );
    assert.equal(store.listRequestDecisions(fixture.threadId, request().requestId).length, 1);
    store.close();
  }));

test("caller cannot author applicability result, reason, policy, revision, digest, or evidence", () =>
  withDatabase((databasePath) => {
    const store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    for (const [key, value] of [
      ["result", "applies"],
      ["reasonCode", "request_binding_match"],
      ["policy", { id: "caller_policy", version: "1" }],
      ["obligationRevision", 1],
      ["obligationDigest", `sha256:${"a".repeat(64)}`],
      ["evidenceReferences", ["caller:evidence"]],
    ]) {
      assert.throws(
        () => store.decideApplicability({ ...decisionInput(), [key]: value }),
        new RegExp(`applicability input\\.${key} is not allowed`),
      );
    }
    assert.equal(store.listRequestDecisions(fixture.threadId, request().requestId).length, 0);
    store.close();
  }));

test("Fibre resolves the exact current revision rather than a caller-selected historical revision", () =>
  withDatabase((databasePath) => {
    const obligations = openObligationStore(localWorldStateStorage(databasePath));
    obligations.recordRevision(revision2(), { recordedAt: "2026-08-09T20:02:30.000Z" });
    obligations.close();

    const store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    const result = store.decideApplicability(decisionInput({
      decidedAt: "2026-08-09T20:03:00.000Z",
    }));
    assert.equal(result.decision.obligationRevision, 2);
    assert.equal(result.decision.result, "applies");
    store.close();
  }));

test("unrelated current obligation persists does_not_apply instead of gaining authority from nomination", () =>
  withDatabase((databasePath) => {
    const obligations = openObligationStore(localWorldStateStorage(databasePath));
    obligations.recordRevision(obligation({
      obligationId: OBLIGATION_B,
      binding: WRONG_FINGERPRINT,
    }), { recordedAt: "2026-08-09T19:02:00.000Z" });
    obligations.close();

    const store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    const result = store.decideApplicability(decisionInput({
      operationId: "oba_op_unrelated",
      obligationId: OBLIGATION_B,
    }));
    assert.equal(result.decision.result, "does_not_apply");
    assert.equal(result.decision.reasonCode, "request_binding_mismatch");
    assert.equal(store.listRequestDecisions(fixture.threadId, request().requestId).length, 1);
    store.close();
  }));

test("unknown and foreign obligation nominations produce no applicability authority", () =>
  withDatabase((databasePath) => {
    const other = structuredClone(fixture);
    other.threadId = "thr_mina_applicability_other";
    other.identity.name = "Mina Other";
    const world = openWorldStore(localWorldStateStorage(databasePath));
    world.seedThread(other);
    world.close();
    const obligations = openObligationStore(localWorldStateStorage(databasePath));
    obligations.recordRevision({
      ...obligation({ obligationId: OBLIGATION_B }),
      threadId: other.threadId,
    }, { recordedAt: "2026-08-09T19:02:00.000Z" });
    obligations.close();

    const store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    assert.throws(
      () => store.decideApplicability(decisionInput({
        operationId: "oba_op_unknown",
        obligationId: `obl_${"9".repeat(64)}`,
      })),
      ObligationNotFoundError,
    );
    assert.throws(
      () => store.decideApplicability(decisionInput({
        operationId: "oba_op_foreign",
        obligationId: OBLIGATION_B,
      })),
      ObligationNotFoundError,
    );
    assert.equal(store.listRequestDecisions(fixture.threadId, request().requestId).length, 0);
    store.close();
  }));

test("a persisted decision remains historical after revision advance while a new operation binds the new current revision", () =>
  withDatabase((databasePath) => {
    let store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    const first = store.decideApplicability(decisionInput());
    store.close();

    const obligations = openObligationStore(localWorldStateStorage(databasePath));
    obligations.recordRevision(revision2(), { recordedAt: "2026-08-09T20:02:30.000Z" });
    obligations.close();

    store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    const historicalRetry = store.decideApplicability(decisionInput({
      decidedAt: "2026-08-09T20:04:00.000Z",
    }));
    assert.equal(historicalRetry.created, false);
    assert.equal(historicalRetry.decision.obligationRevision, 1);
    assert.equal(historicalRetry.decisionDigest, first.decisionDigest);

    const current = store.decideApplicability(decisionInput({
      operationId: "oba_op_after_revision",
      decidedAt: "2026-08-09T20:04:00.000Z",
      causationId: "cause_applicability_002",
      correlationId: "corr_applicability_002",
    }));
    assert.equal(current.created, true);
    assert.equal(current.decision.obligationRevision, 2);
    assert.equal(store.listRequestDecisions(fixture.threadId, request().requestId).length, 2);
    store.close();
  }));

test("request witness corruption is detected before any decision is persisted", () =>
  withDatabase((databasePath) => {
    const raw = new DatabaseSync(databasePath, { enableForeignKeyConstraints: false });
    raw.exec("DROP TRIGGER activation_requests_no_update");
    raw.prepare(`
      UPDATE activation_requests
      SET request_fingerprint=?
      WHERE thread_id=? AND request_id=?
    `).run(WRONG_FINGERPRINT, fixture.threadId, request().requestId);
    raw.close();

    const store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    assert.throws(
      () => store.decideApplicability(decisionInput()),
      /activation request .* fingerprint failed/,
    );
    assert.equal(store.listRequestDecisions(fixture.threadId, request().requestId).length, 0);
    store.close();
  }));

test("decision chronology cannot predate its request or current obligation revision", () =>
  withDatabase((databasePath) => {
    const store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    assert.throws(
      () => store.decideApplicability(decisionInput({
        operationId: "oba_op_too_early_request",
        decidedAt: "2026-08-09T19:59:59.000Z",
      })),
      /cannot predate its activation request/,
    );
    store.close();

    const obligations = openObligationStore(localWorldStateStorage(databasePath));
    obligations.recordRevision(revision2({ createdAt: "2026-08-09T20:02:00.000Z" }), {
      recordedAt: "2026-08-09T20:02:30.000Z",
    });
    obligations.close();

    const reopened = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    assert.throws(
      () => reopened.decideApplicability(decisionInput({
        operationId: "oba_op_too_early_revision",
        decidedAt: "2026-08-09T20:02:10.000Z",
      })),
      /cannot predate the current obligation revision/,
    );
    assert.equal(reopened.listRequestDecisions(fixture.threadId, request().requestId).length, 0);
    reopened.close();
  }));

test("append-only and SQL binding backstops independently reject rewritten or mismatched decisions", () =>
  withDatabase((databasePath) => {
    const store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    const persisted = store.decideApplicability(decisionInput());
    store.close();

    const raw = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    assert.throws(
      () => raw.prepare(`
        UPDATE obligation_applicability_decisions
        SET result='does_not_apply'
        WHERE applicability_id=?
      `).run(persisted.decision.applicabilityId),
      /append-only/,
    );

    const fakeId = `oba_${"8".repeat(64)}`;
    const fakeDecision = {
      ...persisted.decision,
      applicabilityId: fakeId,
      operationId: "oba_op_sql_backstop",
      inputDigest: `sha256:${"8".repeat(64)}`,
      threadStateHash: WRONG_FINGERPRINT,
    };
    assert.throws(
      () => raw.prepare(`
        INSERT INTO obligation_applicability_decisions(
          applicability_id,operation_id,thread_id,snapshot_version,thread_state_hash,
          request_id,request_fingerprint,obligation_id,obligation_revision,obligation_digest,
          nomination_source,result,reason_code,policy_id,policy_version,evidence_refs_json,
          decision_json,decision_digest,decided_at,causation_id,correlation_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        fakeDecision.applicabilityId,
        fakeDecision.operationId,
        fakeDecision.threadId,
        fakeDecision.snapshotVersion,
        fakeDecision.threadStateHash,
        fakeDecision.requestId,
        fakeDecision.requestFingerprint,
        fakeDecision.obligationId,
        fakeDecision.obligationRevision,
        fakeDecision.obligationDigest,
        fakeDecision.nominationSource,
        fakeDecision.result,
        fakeDecision.reasonCode,
        fakeDecision.policy.id,
        fakeDecision.policy.version,
        JSON.stringify(fakeDecision.evidenceReferences),
        JSON.stringify(fakeDecision),
        applicabilityDecisionDigest(fakeDecision),
        fakeDecision.decidedAt,
        fakeDecision.causationId,
        fakeDecision.correlationId,
      ),
      /does not match activation request/,
    );
    raw.close();
  }));

test("two independent applicability writers converge on one exact operation record", () =>
  withDatabase((databasePath) => {
    const firstStore = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    const secondStore = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    const first = firstStore.decideApplicability(decisionInput());
    const second = secondStore.decideApplicability(decisionInput({
      decidedAt: "2026-08-09T20:05:00.000Z",
    }));
    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(second.decisionDigest, first.decisionDigest);
    assert.deepEqual(second.decision, first.decision);
    secondStore.close();
    firstStore.close();
  }));

test("legacy tombstone is Fibre-owned evidence that forces does_not_apply", () =>
  withDatabase((databasePath) => {
    const legacyDigest = `sha256:${"7".repeat(64)}`;
    const obligations = openObligationStore(localWorldStateStorage(databasePath));
    assert.throws(
      () => obligations.recordRevision(revision2({ legacySourceDigest: legacyDigest }), {
        recordedAt: "2026-08-09T20:02:30.000Z",
      }),
      ObligationConflictError,
    );
    obligations.close();

    const legacyObligationId = `obl_${"7".repeat(64)}`;
    const legacyObligations = openObligationStore(localWorldStateStorage(databasePath));
    legacyObligations.recordRevision(obligation({
      obligationId: legacyObligationId,
      legacySourceDigest: legacyDigest,
    }), { recordedAt: "2026-08-09T19:02:00.000Z" });
    legacyObligations.close();

    const raw = new DatabaseSync(databasePath, { enableForeignKeyConstraints: false });
    raw.exec("PRAGMA foreign_keys=OFF");
    raw.prepare(`
      INSERT INTO legacy_obligation_tombstones(
        tombstone_id,thread_id,legacy_reference,legacy_reference_digest,
        source_authorization_id,source_consumption_digest,consumed_at
      ) VALUES (?,?,?,?,?,?,?)
    `).run(
      `olt_${"7".repeat(64)}`,
      fixture.threadId,
      "Legacy spent commitment",
      legacyDigest,
      "auth_legacy_applicability",
      `sha256:${"6".repeat(64)}`,
      "2026-08-09T19:30:00.000Z",
    );
    raw.close();

    const store = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    const result = store.decideApplicability(decisionInput({
      operationId: "oba_op_legacy_spent",
      obligationId: legacyObligationId,
    }));
    assert.equal(result.decision.result, "does_not_apply");
    assert.equal(result.decision.reasonCode, "legacy_authority_spent");
    assert.equal(
      result.decision.evidenceReferences.some((ref) => ref === `legacy_obligation_tombstone:${legacyDigest}`),
      true,
    );
    store.close();
  }));

test("read-only inspection re-derives applicability policy without downstream authority witnesses", () =>
  withDatabase((databasePath) => {
    const applicability = openObligationApplicabilityStore(localWorldStateStorage(databasePath));
    const persisted = applicability.decideApplicability(decisionInput());
    assert.equal(persisted.decision.result, "applies");
    applicability.close();

    const db = new DatabaseSync(databasePath, { enableForeignKeyConstraints: false });
    try {
      assert.equal(Number(db.prepare(
        "SELECT COUNT(*) AS count FROM participation_authorizations",
      ).get().count), 0);
      assert.equal(Number(db.prepare(
        "SELECT COUNT(*) AS count FROM structured_obligation_discharges",
      ).get().count), 0);
      db.exec("DROP TRIGGER obligation_applicability_decisions_no_update");
      const forged = structuredClone(persisted.decision);
      forged.result = "does_not_apply";
      forged.reasonCode = "request_binding_mismatch";
      const forgedDigest = applicabilityDecisionDigest(forged);
      db.prepare(`
        UPDATE obligation_applicability_decisions
        SET result=?,reason_code=?,decision_json=?,decision_digest=?
        WHERE applicability_id=?
      `).run(
        forged.result,
        forged.reasonCode,
        canonicalJson(forged),
        forgedDigest,
        forged.applicabilityId,
      );
    } finally {
      db.close();
    }

    const inspector = openStructuredObligationInspectionStore(localWorldStateStorage(databasePath));
    try {
      assert.throws(
        () => inspector.listRequestApplicability(fixture.threadId, request().requestId),
        /applicability derived result does not match persisted evidence/,
      );
    } finally {
      inspector.close();
    }
  }));

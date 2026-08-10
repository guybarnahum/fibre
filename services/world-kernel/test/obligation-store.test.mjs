import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { openWorldStore } from "../src/persistence.mjs";
import {
  ObligationConflictError,
  ObligationNotFoundError,
  StaleObligationRevisionError,
  openObligationStore,
} from "../src/obligation-store.mjs";
import {
  legacyObligationReferenceDigest,
  structuredObligationDigest,
} from "../src/obligation-domain.mjs";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const REQUEST_A = `sha256:${"a".repeat(64)}`;
const REQUEST_B = `sha256:${"b".repeat(64)}`;
const OBLIGATION_A = `obl_${"1".repeat(64)}`;
const OBLIGATION_B = `obl_${"2".repeat(64)}`;

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-obligation-store-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    const world = openWorldStore(databasePath);
    world.seedThread(fixture);
    world.close();
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function obligation({
  obligationId = OBLIGATION_A,
  revision = 1,
  threadId = fixture.threadId,
  status = "active",
  requestFingerprint = REQUEST_A,
  terms = "Perform one bounded security review while preserving private dignity state.",
  legacySourceDigest,
  supersedesRevision,
  issuer = { entityId: "human_guy", kind: "human", displayName: "Guy" },
  createdAt = "2026-08-09T20:00:00.000Z",
} = {}) {
  return {
    obligationId,
    revision,
    threadId,
    status,
    issuer,
    parties: [{
      role: "beneficiary",
      entity: { entityId: "human_guy", kind: "human", displayName: "Guy" },
    }],
    scope: {
      description: "Participate in the Fibre-bound request.",
      binding: { kind: "request_fingerprint", requestFingerprint },
    },
    terms,
    effectiveAt: "2026-08-09T20:00:00.000Z",
    expiresAt: "2026-09-09T20:00:00.000Z",
    recurrence: { kind: "none" },
    satisfaction: { criteria: "One authorized participation episode is frozen and discharged." },
    provenance: {
      createdBy: "test",
      createdAt,
      evidenceReferences: ["request:req_bound"],
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
    terms: "Perform one bounded security review and return only evidence-bearing findings.",
    createdAt: "2026-08-09T20:05:00.000Z",
    ...overrides,
  });
}

function revision3(overrides = {}) {
  return obligation({
    revision: 3,
    supersedesRevision: 2,
    status: "satisfied",
    terms: "The bounded review obligation is satisfied; preserve its historical terms.",
    createdAt: "2026-08-09T20:10:00.000Z",
    ...overrides,
  });
}

test("records revision 1 transactionally and exact retry is idempotent across restart", () =>
  withDatabase((databasePath) => {
    let store = openObligationStore(databasePath);
    const first = store.recordRevision(obligation(), {
      recordedAt: "2026-08-09T20:01:00.000Z",
    });
    assert.equal(first.created, true);
    assert.equal(first.revision.obligation.revision, 1);
    assert.equal(first.revision.obligationDigest, structuredObligationDigest(obligation()));
    store.close();

    store = openObligationStore(databasePath);
    const retry = store.recordRevision(obligation(), {
      recordedAt: "2026-08-09T20:10:00.000Z",
    });
    assert.equal(retry.created, false);
    assert.equal(retry.revision.recordedAt, "2026-08-09T20:01:00.000Z");
    assert.deepEqual(store.listHistory(fixture.threadId, OBLIGATION_A), [retry.revision]);
    store.close();
  }));

test("current resolution binds exact revision and digest", () =>
  withDatabase((databasePath) => {
    const store = openObligationStore(databasePath);
    const first = store.recordRevision(obligation(), {
      recordedAt: "2026-08-09T20:01:00.000Z",
    }).revision;
    const second = store.recordRevision(revision2(), {
      recordedAt: "2026-08-09T20:06:00.000Z",
    }).revision;

    assert.deepEqual(store.getCurrentRevision(fixture.threadId, OBLIGATION_A), second);
    assert.deepEqual(
      store.resolveCurrentRevision({
        threadId: fixture.threadId,
        obligationId: OBLIGATION_A,
        revision: 2,
        obligationDigest: second.obligationDigest,
      }),
      second,
    );
    assert.throws(
      () => store.resolveCurrentRevision({
        threadId: fixture.threadId,
        obligationId: OBLIGATION_A,
        revision: 1,
        obligationDigest: first.obligationDigest,
      }),
      StaleObligationRevisionError,
    );
    assert.throws(
      () => store.resolveCurrentRevision({
        threadId: fixture.threadId,
        obligationId: OBLIGATION_A,
        revision: 2,
        obligationDigest: REQUEST_B,
      }),
      StaleObligationRevisionError,
    );
    store.close();
  }));

test("revision append rejects skipped, missing, and conflicting revisions", () =>
  withDatabase((databasePath) => {
    const store = openObligationStore(databasePath);
    assert.throws(
      () => store.recordRevision(obligation({
        revision: 2,
        supersedesRevision: 1,
      }), { recordedAt: "2026-08-09T20:01:00.000Z" }),
      StaleObligationRevisionError,
    );
    store.recordRevision(obligation(), { recordedAt: "2026-08-09T20:01:00.000Z" });
    assert.throws(
      () => store.recordRevision(obligation({
        revision: 3,
        supersedesRevision: 2,
      }), { recordedAt: "2026-08-09T20:02:00.000Z" }),
      StaleObligationRevisionError,
    );
    store.recordRevision(revision2(), { recordedAt: "2026-08-09T20:06:00.000Z" });
    assert.throws(
      () => store.recordRevision(revision2({ terms: "Different competing revision." }), {
        recordedAt: "2026-08-09T20:07:00.000Z",
      }),
      ObligationConflictError,
    );
    store.close();
  }));

test("independent connections serialize competing revision attempts", () =>
  withDatabase((databasePath) => {
    const firstStore = openObligationStore(databasePath);
    const secondStore = openObligationStore(databasePath);
    firstStore.recordRevision(obligation(), { recordedAt: "2026-08-09T20:01:00.000Z" });

    const winner = firstStore.recordRevision(revision2(), {
      recordedAt: "2026-08-09T20:06:00.000Z",
    });
    assert.equal(winner.created, true);
    assert.throws(
      () => secondStore.recordRevision(revision2({ terms: "Competing revision from another connection." }), {
        recordedAt: "2026-08-09T20:06:30.000Z",
      }),
      ObligationConflictError,
    );
    assert.deepEqual(
      secondStore.getCurrentRevision(fixture.threadId, OBLIGATION_A),
      winner.revision,
    );
    secondStore.close();
    firstStore.close();
  }));

test("obligation identity cannot move between Threads", () =>
  withDatabase((databasePath) => {
    const other = structuredClone(fixture);
    other.threadId = "thr_mina_other";
    other.identity.name = "Mina Other";
    const world = openWorldStore(databasePath);
    world.seedThread(other);
    world.close();

    const store = openObligationStore(databasePath);
    store.recordRevision(obligation(), { recordedAt: "2026-08-09T20:01:00.000Z" });
    assert.throws(
      () => store.recordRevision(obligation({ threadId: other.threadId }), {
        recordedAt: "2026-08-09T20:02:00.000Z",
      }),
      ObligationConflictError,
    );
    assert.equal(
      store.getCurrentRevision(other.threadId, OBLIGATION_A, { required: false }),
      null,
    );
    assert.throws(
      () => store.getCurrentRevision(other.threadId, OBLIGATION_A),
      ObligationNotFoundError,
    );
    store.close();
  }));

test("issuer identity is stable and terminal status cannot be resurrected", () =>
  withDatabase((databasePath) => {
    const store = openObligationStore(databasePath);
    store.recordRevision(obligation(), { recordedAt: "2026-08-09T20:01:00.000Z" });
    assert.throws(
      () => store.recordRevision(revision2({
        issuer: { entityId: "human_other", kind: "human", displayName: "Other" },
      }), { recordedAt: "2026-08-09T20:06:00.000Z" }),
      ObligationConflictError,
    );

    store.recordRevision(revision2({ status: "satisfied" }), {
      recordedAt: "2026-08-09T20:06:00.000Z",
    });
    assert.throws(
      () => store.recordRevision(revision3({ status: "active" }), {
        recordedAt: "2026-08-09T20:11:00.000Z",
      }),
      ObligationConflictError,
    );
    assert.equal(
      store.recordRevision(revision3(), {
        recordedAt: "2026-08-09T20:11:00.000Z",
      }).revision.obligation.status,
      "satisfied",
    );
    store.close();
  }));

test("legacy source identity is unique, stable, and spent authority cannot become active", () =>
  withDatabase((databasePath) => {
    const legacyReference = "Legacy bounded review commitment";
    const legacyDigest = legacyObligationReferenceDigest(fixture.threadId, legacyReference);
    let store = openObligationStore(databasePath);
    store.recordRevision(obligation({
      status: "satisfied",
      legacySourceDigest: legacyDigest,
    }), { recordedAt: "2026-08-09T20:01:00.000Z" });
    assert.throws(
      () => store.recordRevision(revision2({
        status: "satisfied",
        legacySourceDigest: undefined,
      }), { recordedAt: "2026-08-09T20:06:00.000Z" }),
      ObligationConflictError,
    );
    assert.throws(
      () => store.recordRevision(obligation({
        obligationId: OBLIGATION_B,
        status: "satisfied",
        legacySourceDigest: legacyDigest,
      }), { recordedAt: "2026-08-09T20:02:00.000Z" }),
      ObligationConflictError,
    );
    store.close();

    const raw = new DatabaseSync(databasePath, { enableForeignKeyConstraints: false });
    raw.exec("PRAGMA foreign_keys=OFF");
    raw.prepare(`
      INSERT INTO legacy_obligation_tombstones(
        tombstone_id,thread_id,legacy_reference,legacy_reference_digest,
        source_authorization_id,source_consumption_digest,consumed_at
      ) VALUES (?,?,?,?,?,?,?)
    `).run(
      `olt_${legacyDigest.slice(7)}`,
      fixture.threadId,
      legacyReference,
      legacyDigest,
      "auth_test_legacy",
      `sha256:${"c".repeat(64)}`,
      "2026-08-09T19:00:00.000Z",
    );
    raw.close();

    store = openObligationStore(databasePath);
    assert.equal(store.hasLegacyTombstone(fixture.threadId, legacyDigest), true);
    assert.throws(
      () => store.recordRevision(revision2({
        status: "active",
        legacySourceDigest: legacyDigest,
      }), { recordedAt: "2026-08-09T20:10:00.000Z" }),
      ObligationConflictError,
    );
    store.close();
  }));

test("append-only enforcement rejects ordinary row rewriting", () =>
  withDatabase((databasePath) => {
    const store = openObligationStore(databasePath);
    store.recordRevision(obligation(), { recordedAt: "2026-08-09T20:01:00.000Z" });
    store.close();

    const raw = new DatabaseSync(databasePath, { enableForeignKeyConstraints: false });
    assert.throws(
      () => raw.prepare(`
        UPDATE obligation_records SET status='revoked'
        WHERE obligation_id=? AND revision=1
      `).run(OBLIGATION_A),
      /append-only/,
    );
    raw.close();
  }));

test("reads detect digest and denormalized-column corruption after append-only protection is bypassed", () =>
  withDatabase((databasePath) => {
    let store = openObligationStore(databasePath);
    const first = store.recordRevision(obligation(), {
      recordedAt: "2026-08-09T20:01:00.000Z",
    }).revision;
    store.close();

    let raw = new DatabaseSync(databasePath, { enableForeignKeyConstraints: false });
    raw.exec("DROP TRIGGER obligation_records_no_update");
    raw.prepare(`
      UPDATE obligation_records SET obligation_digest=?
      WHERE obligation_id=? AND revision=1
    `).run(REQUEST_B, OBLIGATION_A);
    raw.close();

    store = openObligationStore(databasePath);
    assert.throws(
      () => store.getCurrentRevision(fixture.threadId, OBLIGATION_A),
      /digest failed/,
    );
    store.close();

    raw = new DatabaseSync(databasePath, { enableForeignKeyConstraints: false });
    raw.exec("DROP TRIGGER obligation_records_no_update");
    raw.prepare(`
      UPDATE obligation_records SET obligation_digest=?, status='revoked'
      WHERE obligation_id=? AND revision=1
    `).run(first.obligationDigest, OBLIGATION_A);
    raw.close();

    store = openObligationStore(databasePath);
    assert.throws(
      () => store.getCurrentRevision(fixture.threadId, OBLIGATION_A),
      /status does not match obligation_json/,
    );
    store.close();
  }));

test("current resolution verifies chronology across the full revision chain", () =>
  withDatabase((databasePath) => {
    let store = openObligationStore(databasePath);
    store.recordRevision(obligation(), { recordedAt: "2026-08-09T20:01:00.000Z" });
    store.recordRevision(revision2(), { recordedAt: "2026-08-09T20:06:00.000Z" });
    store.close();

    const raw = new DatabaseSync(databasePath, { enableForeignKeyConstraints: false });
    raw.exec("DROP TRIGGER obligation_records_no_update");
    raw.prepare(`
      UPDATE obligation_records SET recorded_at=?
      WHERE obligation_id=? AND revision=1
    `).run("2026-08-09T20:07:00.000Z", OBLIGATION_A);
    raw.close();

    store = openObligationStore(databasePath);
    assert.throws(
      () => store.getCurrentRevision(fixture.threadId, OBLIGATION_A),
      /recordedAt moves backwards/,
    );
    store.close();
  }));

test("listCurrent resolves each aggregate through verified history", () =>
  withDatabase((databasePath) => {
    const store = openObligationStore(databasePath);
    const first = store.recordRevision(obligation(), {
      recordedAt: "2026-08-09T20:01:00.000Z",
    }).revision;
    const second = store.recordRevision(obligation({ obligationId: OBLIGATION_B }), {
      recordedAt: "2026-08-09T20:02:00.000Z",
    }).revision;
    assert.deepEqual(store.listCurrent(fixture.threadId), [first, second]);
    assert.deepEqual(store.listHistory(fixture.threadId, OBLIGATION_B), [second]);
    store.close();
  }));

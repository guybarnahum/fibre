import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { WORLD_STORE_SCHEMA_VERSION } from "../src/persistence-common.mjs";
import {
  createObligationTables,
  legacyConsumptionRowsToTombstones,
  migrateLegacyConsumedObligations,
} from "../src/obligation-schema.mjs";
import { migrateDatabase } from "../src/persistence-sqlite.mjs";
import { legacyObligationReferenceDigest } from "../src/obligation-domain.mjs";

const SHA_A = `sha256:${"a".repeat(64)}`;
const SHA_B = `sha256:${"b".repeat(64)}`;

function database() {
  const db = new DatabaseSync(":memory:", { enableForeignKeyConstraints: true });
  db.exec("PRAGMA foreign_keys=ON");
  return db;
}

test("current world-store schema creates the Structured Obligation tables additively", () => {
  const db = database();
  try {
    migrateDatabase(db);
    assert.equal(Number(db.prepare("PRAGMA user_version").get().user_version), WORLD_STORE_SCHEMA_VERSION);
    assert.equal(WORLD_STORE_SCHEMA_VERSION, 5);
    const names = new Set(db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN (
        'obligation_records',
        'obligation_applicability_decisions',
        'legacy_obligation_tombstones'
      )
    `).all().map((row) => row.name));
    assert.deepEqual(
      [...names].sort(),
      [
        "legacy_obligation_tombstones",
        "obligation_applicability_decisions",
        "obligation_records",
      ],
    );
  } finally {
    db.close();
  }
});

test("migration does not promote unresolved intentions into active obligations", () => {
  const db = database();
  try {
    migrateDatabase(db);
    db.prepare(`
      INSERT INTO threads(
        thread_id,version,status,state_json,state_hash,last_event_id,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?)
    `).run(
      "thr_mina_001",
      1,
      "frozen",
      JSON.stringify({
        currentState: {
          unresolvedIntentions: ["Read a case study on identity-system failures"],
        },
      }),
      SHA_A,
      "evt_seed",
      "2026-08-09T00:00:00.000Z",
      "2026-08-09T00:00:00.000Z",
    );
    migrateLegacyConsumedObligations(db);
    assert.equal(Number(db.prepare("SELECT COUNT(*) AS count FROM obligation_records").get().count), 0);
    assert.equal(
      Number(db.prepare("SELECT COUNT(*) AS count FROM legacy_obligation_tombstones").get().count),
      0,
    );
  } finally {
    db.close();
  }
});

test("legacy consumption rows map to deterministic spent-authority tombstones", () => {
  const rows = [
    {
      authorization_id: "auth_one",
      thread_id: "thr_mina_001",
      consumed_at: "2026-08-08T01:00:00.000Z",
      obligation_refs_json: JSON.stringify([
        "Read a case study on identity-system failures",
        "Finish the bounded review",
      ]),
      consumption_digest: SHA_A,
    },
    {
      authorization_id: "auth_two",
      thread_id: "thr_mina_001",
      consumed_at: "2026-08-08T02:00:00.000Z",
      obligation_refs_json: JSON.stringify(["Finish the bounded review"]),
      consumption_digest: SHA_B,
    },
  ];
  const tombstones = legacyConsumptionRowsToTombstones(rows);
  assert.equal(tombstones.length, 2);
  const finish = tombstones.find((item) => item.legacyReference === "Finish the bounded review");
  assert.equal(finish.sourceAuthorizationId, "auth_one");
  assert.equal(
    finish.legacyReferenceDigest,
    legacyObligationReferenceDigest("thr_mina_001", "Finish the bounded review"),
  );
});

test("legacy tombstones and obligation records are append-only and spent legacy authority cannot reactivate", () => {
  const db = database();
  try {
    migrateDatabase(db);
    db.exec("PRAGMA foreign_keys=OFF");
    const legacyReference = "Read a case study on identity-system failures";
    const legacyDigest = legacyObligationReferenceDigest("thr_mina_001", legacyReference);
    db.prepare(`
      INSERT INTO legacy_obligation_tombstones(
        tombstone_id,thread_id,legacy_reference,legacy_reference_digest,
        source_authorization_id,source_consumption_digest,consumed_at
      ) VALUES (?,?,?,?,?,?,?)
    `).run(
      `olt_${legacyDigest.slice(7)}`,
      "thr_mina_001",
      legacyReference,
      legacyDigest,
      "auth_legacy",
      SHA_A,
      "2026-08-08T01:00:00.000Z",
    );

    assert.throws(
      () => db.prepare("UPDATE legacy_obligation_tombstones SET consumed_at=? WHERE tombstone_id=?")
        .run("2026-08-09T00:00:00.000Z", `olt_${legacyDigest.slice(7)}`),
      /append-only/,
    );

    const record = {
      obligationId: `obl_${"1".repeat(64)}`,
      revision: 1,
      threadId: "thr_mina_001",
      status: "active",
    };
    assert.throws(
      () => db.prepare(`
        INSERT INTO obligation_records(
          obligation_id,revision,thread_id,status,obligation_json,obligation_digest,
          supersedes_revision,effective_at,expires_at,standing_visibility,terms_visibility,
          legacy_source_digest,recorded_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        record.obligationId,
        record.revision,
        record.threadId,
        record.status,
        JSON.stringify(record),
        SHA_B,
        null,
        "2026-08-09T00:00:00.000Z",
        null,
        "public",
        "restricted",
        legacyDigest,
        "2026-08-09T00:00:00.000Z",
      ),
      /already spent/,
    );
  } finally {
    db.close();
  }
});

test("obligation storage rejects terms that are more public than standing", () => {
  const db = database();
  try {
    migrateDatabase(db);
    db.exec("PRAGMA foreign_keys=OFF");
    assert.throws(
      () => db.prepare(`
        INSERT INTO obligation_records(
          obligation_id,revision,thread_id,status,obligation_json,obligation_digest,
          supersedes_revision,effective_at,expires_at,standing_visibility,terms_visibility,
          legacy_source_digest,recorded_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        `obl_${"2".repeat(64)}`,
        1,
        "thr_mina_001",
        "active",
        JSON.stringify({ obligationId: `obl_${"2".repeat(64)}` }),
        SHA_B,
        null,
        "2026-08-09T00:00:00.000Z",
        null,
        "private",
        "public",
        null,
        "2026-08-09T00:00:00.000Z",
      ),
      /CHECK constraint failed/,
    );
  } finally {
    db.close();
  }
});

test("SQL backstops preserve aggregate identity, legacy origin, and terminal status", () => {
  const db = database();
  try {
    migrateDatabase(db);
    db.exec("PRAGMA foreign_keys=OFF");
    const obligationId = `obl_${"3".repeat(64)}`;
    const secondObligationId = `obl_${"4".repeat(64)}`;
    const insert = db.prepare(`
      INSERT INTO obligation_records(
        obligation_id,revision,thread_id,status,obligation_json,obligation_digest,
        supersedes_revision,effective_at,expires_at,standing_visibility,terms_visibility,
        legacy_source_digest,recorded_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    const json = (issuerId) => JSON.stringify({
      obligationId,
      issuer: { entityId: issuerId, kind: "human" },
    });

    insert.run(
      obligationId, 1, "thr_mina_001", "active", json("human_guy"), SHA_A,
      null, "2026-08-09T00:00:00.000Z", null, "restricted", "private", SHA_A,
      "2026-08-09T00:00:00.000Z",
    );

    assert.throws(
      () => insert.run(
        obligationId, 2, "thr_other", "active", json("human_guy"), SHA_B,
        1, "2026-08-09T00:00:00.000Z", null, "restricted", "private", SHA_A,
        "2026-08-09T00:01:00.000Z",
      ),
      /changes stable identity/,
    );
    assert.throws(
      () => insert.run(
        obligationId, 2, "thr_mina_001", "active", json("human_guy"), SHA_B,
        1, "2026-08-09T00:00:00.000Z", null, "restricted", "private", SHA_B,
        "2026-08-09T00:01:00.000Z",
      ),
      /changes stable identity/,
    );
    assert.throws(
      () => insert.run(
        obligationId, 2, "thr_mina_001", "active", json("human_other"), SHA_B,
        1, "2026-08-09T00:00:00.000Z", null, "restricted", "private", SHA_A,
        "2026-08-09T00:01:00.000Z",
      ),
      /changes stable identity/,
    );

    insert.run(
      obligationId, 2, "thr_mina_001", "satisfied", json("human_guy"), SHA_B,
      1, "2026-08-09T00:00:00.000Z", null, "restricted", "private", SHA_A,
      "2026-08-09T00:01:00.000Z",
    );
    assert.throws(
      () => insert.run(
        obligationId, 3, "thr_mina_001", "active", json("human_guy"), SHA_A,
        2, "2026-08-09T00:00:00.000Z", null, "restricted", "private", SHA_A,
        "2026-08-09T00:02:00.000Z",
      ),
      /terminal obligation status cannot change/,
    );

    assert.throws(
      () => insert.run(
        secondObligationId, 1, "thr_mina_001", "satisfied",
        JSON.stringify({ obligationId: secondObligationId, issuer: { entityId: "human_guy", kind: "human" } }),
        SHA_B, null, "2026-08-09T00:00:00.000Z", null, "restricted", "private", SHA_A,
        "2026-08-09T00:03:00.000Z",
      ),
      /UNIQUE constraint failed/,
    );
  } finally {
    db.close();
  }
});

test("obligation schema creation is idempotent", () => {
  const db = database();
  try {
    migrateDatabase(db);
    createObligationTables(db);
    createObligationTables(db);
    assert.equal(
      Number(db.prepare("SELECT COUNT(*) AS count FROM obligation_records").get().count),
      0,
    );
  } finally {
    db.close();
  }
});

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { WORLD_STORE_SCHEMA_VERSION, openWorldStore } from "../src/persistence.mjs";
import { openLifecycleHardeningStore } from "../src/lifecycle-hardening-store.mjs";

function withDatabase(run) {
  const directory = mkdtempSync(join(tmpdir(), "fibre-lifecycle-schema-"));
  const databasePath = join(directory, "world.sqlite");
  try {
    return run(databasePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("schema version 3 migration creates rejected-runtime closure and spent-obligation guards", () =>
  withDatabase((databasePath) => {
    const world = openWorldStore(databasePath);
    world.close();

    let database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });
    database.exec(`
      DROP TRIGGER IF EXISTS participation_authorizations_reject_discharged_obligation;
      DROP TRIGGER IF EXISTS runtime_abandons_no_update;
      DROP TRIGGER IF EXISTS runtime_abandons_no_delete;
      DROP INDEX IF EXISTS idx_runtime_abandons_thread_time;
      DROP TABLE IF EXISTS runtime_abandons;
      PRAGMA user_version=3;
    `);
    database.close();

    const lifecycle = openLifecycleHardeningStore(databasePath);
    assert.equal(lifecycle.storageMetadata().schemaVersion, WORLD_STORE_SCHEMA_VERSION);
    lifecycle.close();

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

test("runtime abandonment records are append-only", () =>
  withDatabase((databasePath) => {
    const lifecycle = openLifecycleHardeningStore(databasePath);
    lifecycle.close();

    const database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: false });
    const abandonmentId = `abd_${"a".repeat(64)}`;
    const operationId = "op_schema_abandon";
    const operationDigest = `sha256:${"1".repeat(64)}`;
    const sessionId = `run_${"b".repeat(64)}`;
    const threadId = "thr_schema_abandon";
    const requestId = "req_schema_abandon";
    const authorizationId = `auth_${"c".repeat(64)}`;
    const auditId = `gga_${"d".repeat(64)}`;
    const abandonedAt = "2026-08-05T21:00:00.000Z";
    const record = {
      abandonmentId,
      operationId,
      operationDigest,
      sessionId,
      threadId,
      requestId,
      authorizationId,
      goalGuardianAuditId: auditId,
      reason: "guardian_rejected",
      abandonedAt,
      causationId: "cause_schema_abandon",
      correlationId: "corr_schema_abandon",
    };
    database.prepare(`
      INSERT INTO runtime_abandons(
        abandonment_id,operation_id,operation_digest,session_id,thread_id,request_id,
        authorization_id,audit_id,reason,record_json,record_digest,abandoned_at,
        causation_id,correlation_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      abandonmentId,
      operationId,
      operationDigest,
      sessionId,
      threadId,
      requestId,
      authorizationId,
      auditId,
      "guardian_rejected",
      JSON.stringify(record),
      `sha256:${"2".repeat(64)}`,
      abandonedAt,
      record.causationId,
      record.correlationId,
    );
    assert.throws(
      () => database.prepare(
        "UPDATE runtime_abandons SET record_json=record_json WHERE abandonment_id=?",
      ).run(abandonmentId),
      /append-only/,
    );
    assert.throws(
      () => database.prepare(
        "DELETE FROM runtime_abandons WHERE abandonment_id=?",
      ).run(abandonmentId),
      /append-only/,
    );
    database.close();
  }));
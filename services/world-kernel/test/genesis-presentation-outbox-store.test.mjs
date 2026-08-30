import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { GenesisPresentationOutboxStore } from "../src/genesis-presentation-outbox-store.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "fibre-genesis-presentation-outbox-"));
  const databasePath = join(root, "world.sqlite");
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE genesis_manifests (
      genesis_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL UNIQUE,
      publication_status TEXT NOT NULL,
      record_json TEXT NOT NULL,
      record_digest TEXT NOT NULL
    ) STRICT;
  `);
  database.close();
  const store = new GenesisPresentationOutboxStore(databasePath);
  return {
    databasePath,
    store,
    close() {
      store.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function publishedManifest({ genesisId = "gen_test", threadId = "thr_test" } = {}) {
  return {
    genesisId,
    threadId,
    publication: {
      status: "published",
      publishedAt: "2026-08-30T00:00:00.000Z",
    },
  };
}

test("published Genesis manifest atomically enqueues presentation delivery", () => {
  const current = fixture();
  try {
    const database = new DatabaseSync(current.databasePath);
    const manifest = publishedManifest();
    database.prepare(`
      INSERT INTO genesis_manifests(genesis_id,thread_id,publication_status,record_json,record_digest)
      VALUES (?,?,?,?,?)
    `).run(
      manifest.genesisId,
      manifest.threadId,
      "published",
      JSON.stringify(manifest),
      `sha256:${"a".repeat(64)}`,
    );
    database.close();

    const pending = current.store.listPending();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].genesisId, "gen_test");
    assert.equal(pending[0].threadId, "thr_test");
    assert.equal(pending[0].publishedAt, "2026-08-30T00:00:00.000Z");
    assert.equal(pending[0].state, "pending");
  } finally {
    current.close();
  }
});

test("presentation outbox records retry failure and idempotent delivery", () => {
  const current = fixture();
  try {
    const database = new DatabaseSync(current.databasePath);
    const manifest = publishedManifest();
    database.prepare(`
      INSERT INTO genesis_manifests(genesis_id,thread_id,publication_status,record_json,record_digest)
      VALUES (?,?,?,?,?)
    `).run(
      manifest.genesisId,
      manifest.threadId,
      "published",
      JSON.stringify(manifest),
      `sha256:${"b".repeat(64)}`,
    );
    database.close();

    const failed = current.store.recordFailure("gen_test", new Error("presentation unavailable"), {
      attemptedAt: "2026-08-30T00:00:01.000Z",
    });
    assert.equal(failed.state, "pending");
    assert.equal(failed.attemptCount, 1);
    assert.equal(failed.lastError.message, "presentation unavailable");

    const delivered = current.store.markDelivered("gen_test", {
      deliveredAt: "2026-08-30T00:00:02.000Z",
    });
    assert.equal(delivered.state, "delivered");
    assert.equal(delivered.attemptCount, 2);
    assert.equal(delivered.lastError, null);
    assert.equal(current.store.listPending().length, 0);

    const duplicate = current.store.markDelivered("gen_test", {
      deliveredAt: "2026-08-30T00:00:03.000Z",
    });
    assert.equal(duplicate.deliveredAt, "2026-08-30T00:00:02.000Z");
    assert.equal(duplicate.attemptCount, 2);
  } finally {
    current.close();
  }
});

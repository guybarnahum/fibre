import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createSqliteStateInfraDriver } from "../../../infra/providers/local/sqlite-state.mjs";
import { GenesisPresentationOutboxStore } from "../src/genesis-presentation-outbox-store.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "fibre-genesis-presentation-outbox-"));
  const databasePath = join(root, "world.sqlite");
  const infraDriver = createSqliteStateInfraDriver({ scopes: { world: databasePath } });
  const storage = { infraDriver, stateScopeId: "world" };
  const session = infraDriver.state.open("world");
  session.exec(`
    CREATE TABLE genesis_presentation_outbox (
      genesis_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL UNIQUE,
      manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json)),
      publication_digest TEXT NOT NULL CHECK (publication_digest LIKE 'sha256:%'),
      published_at TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','delivered')),
      attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
      last_attempt_at TEXT,
      last_error_json TEXT CHECK (last_error_json IS NULL OR json_valid(last_error_json)),
      delivered_at TEXT
    ) STRICT;
  `);
  session.close();
  const store = new GenesisPresentationOutboxStore(storage);
  return {
    infraDriver,
    storage,
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

function seedPending(current, { digestChar = "a" } = {}) {
  const manifest = publishedManifest();
  const session = current.infraDriver.state.open("world");
  session.prepare(`
    INSERT INTO genesis_presentation_outbox(
      genesis_id,thread_id,manifest_json,publication_digest,published_at
    ) VALUES (?,?,?,?,?)
  `).run(
    manifest.genesisId,
    manifest.threadId,
    JSON.stringify(manifest),
    `sha256:${digestChar.repeat(64)}`,
    manifest.publication.publishedAt,
  );
  session.close();
  return manifest;
}

test("Genesis presentation outbox reads pending delivery through Infra state binding", () => {
  const current = fixture();
  try {
    seedPending(current);
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

test("presentation outbox records retry failure and idempotent delivery through Infra state", () => {
  const current = fixture();
  try {
    seedPending(current, { digestChar: "b" });

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

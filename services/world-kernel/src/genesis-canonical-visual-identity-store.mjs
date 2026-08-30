import { DatabaseSync } from "node:sqlite";

import {
  canonicalJson,
  assertId,
  assertIsoTimestamp,
} from "./persistence-common.mjs";
import { normalizeDatabasePath } from "./persistence-sqlite.mjs";
import { normalizeGenesisCanonicalVisualIdentity } from "./genesis-canonical-visual-identity.mjs";

export class GenesisCanonicalVisualIdentityConflictError extends Error {}
export class GenesisCanonicalVisualIdentityNotFoundError extends Error {}

function parseRecord(row) {
  const parsed = JSON.parse(row.record_json);
  const canonicalVisualIdentity = normalizeGenesisCanonicalVisualIdentity(parsed.canonicalVisualIdentity, {
    threadId: parsed.threadId,
  });
  const normalized = {
    threadId: parsed.threadId,
    genesisId: parsed.genesisId,
    canonicalVisualIdentity,
    recordedAt: parsed.recordedAt,
  };
  assertId("canonical visual identity record genesisId", normalized.genesisId);
  assertIsoTimestamp("canonical visual identity record recordedAt", normalized.recordedAt);
  if (canonicalJson(normalized) !== row.record_json) {
    throw new GenesisCanonicalVisualIdentityConflictError(
      `canonical visual identity authority for ${normalized.threadId} is not canonical`,
    );
  }
  return normalized;
}

export class GenesisCanonicalVisualIdentityStore {
  #database;

  constructor(databasePath) {
    this.#database = new DatabaseSync(normalizeDatabasePath(databasePath), {
      enableForeignKeyConstraints: true,
    });
    this.#database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS genesis_canonical_visual_identities (
        thread_id TEXT PRIMARY KEY,
        genesis_id TEXT NOT NULL UNIQUE,
        record_json TEXT NOT NULL CHECK (json_valid(record_json)),
        recorded_at TEXT NOT NULL
      ) STRICT;
      CREATE TRIGGER IF NOT EXISTS genesis_canonical_visual_identities_no_update
        BEFORE UPDATE ON genesis_canonical_visual_identities
        BEGIN SELECT RAISE(ABORT,'genesis_canonical_visual_identities is append-only'); END;
      CREATE TRIGGER IF NOT EXISTS genesis_canonical_visual_identities_no_delete
        BEFORE DELETE ON genesis_canonical_visual_identities
        BEGIN SELECT RAISE(ABORT,'genesis_canonical_visual_identities is append-only'); END;
    `);
  }

  close() { this.#database.close(); }

  record({ threadId, genesisId, canonicalVisualIdentity, recordedAt } = {}) {
    assertId("canonical visual identity record threadId", threadId);
    assertId("canonical visual identity record genesisId", genesisId);
    assertIsoTimestamp("canonical visual identity record recordedAt", recordedAt);
    const normalized = {
      threadId,
      genesisId,
      canonicalVisualIdentity: normalizeGenesisCanonicalVisualIdentity(canonicalVisualIdentity, { threadId }),
      recordedAt,
    };
    const recordJson = canonicalJson(normalized);
    const existing = this.#database.prepare(
      "SELECT record_json,recorded_at FROM genesis_canonical_visual_identities WHERE thread_id=?",
    ).get(threadId);
    if (existing) {
      if (existing.record_json !== recordJson || existing.recorded_at !== recordedAt) {
        throw new GenesisCanonicalVisualIdentityConflictError(
          `canonical visual identity authority for ${threadId} already exists with different content`,
        );
      }
      return Object.freeze({ ...normalized, idempotent: true });
    }
    this.#database.prepare(`
      INSERT INTO genesis_canonical_visual_identities(thread_id,genesis_id,record_json,recorded_at)
      VALUES (?,?,?,?)
    `).run(threadId, genesisId, recordJson, recordedAt);
    return Object.freeze({ ...normalized, idempotent: false });
  }

  getByThreadId(threadId, { required = true } = {}) {
    assertId("threadId", threadId);
    const row = this.#database.prepare(
      "SELECT record_json FROM genesis_canonical_visual_identities WHERE thread_id=?",
    ).get(threadId);
    if (!row) {
      if (!required) return null;
      throw new GenesisCanonicalVisualIdentityNotFoundError(
        `canonical visual identity authority for ${threadId} was not found`,
      );
    }
    return parseRecord(row);
  }

  listThreadIds() {
    return this.#database.prepare(
      "SELECT thread_id FROM genesis_canonical_visual_identities ORDER BY thread_id",
    ).all().map((row) => row.thread_id);
  }
}

export function openGenesisCanonicalVisualIdentityStore(databasePath) {
  return new GenesisCanonicalVisualIdentityStore(databasePath);
}

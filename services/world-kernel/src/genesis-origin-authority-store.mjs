
import {
  IntegrityError,
  assertId,
  canonicalJson,
} from "./persistence-common.mjs";
import {
  migrateDatabase,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";
import { createGenesisTables } from "./genesis-schema.mjs";
import {
  genesisOriginAuthorityDigest,
  normalizeGenesisOriginAuthority,
} from "./genesis-origin-authority.mjs";

export class GenesisOriginAuthorityConflictError extends Error {}
export class GenesisOriginAuthorityNotFoundError extends Error {}

function parseRecord(name, json) {
  try { return JSON.parse(json); }
  catch (error) { throw new IntegrityError(`${name} is not valid JSON: ${error.message}`); }
}

function tableExists(database, tableName) {
  return database.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?",
  ).get(tableName) !== undefined;
}

export class GenesisOriginAuthorityStore {
  #database;
  #readOnly;

  constructor(storage, { readOnly = false } = {}) {
    this.#readOnly = readOnly;
    this.#database = openWorldStateDatabase(storage, { readOnly, storeName: "GenesisOriginAuthorityStore" });
    try {
      if (!readOnly) {
        migrateDatabase(this.#database);
        this.#database.transaction(() => {
          createGenesisTables(this.#database);
        });
      }
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }

  recordAuthority(candidate) {
    if (this.#readOnly) throw new GenesisOriginAuthorityConflictError("read-only origin authority store cannot write");
    const record = normalizeGenesisOriginAuthority(candidate);
    const recordDigest = genesisOriginAuthorityDigest(record);
    const existing = this.#database.prepare(
      "SELECT record_json,record_digest FROM genesis_origin_authorities WHERE authority_ref=?",
    ).get(record.authorityRef);
    if (existing !== undefined) {
      if (existing.record_json !== canonicalJson(record) || existing.record_digest !== recordDigest) {
        throw new GenesisOriginAuthorityConflictError(
          `Genesis origin authority ${record.authorityRef} already exists with different content`,
        );
      }
      return { record: structuredClone(record), recordDigest, idempotent: true };
    }
    try {
      this.#database.transaction(() => {
        this.#database.prepare(`
          INSERT INTO genesis_origin_authorities(
            authority_ref,authority_kind,source_party_id,subject_status,
            record_json,record_digest,asserted_at
          ) VALUES (?,?,?,?,?,?,?)
        `).run(
          record.authorityRef,
          record.authorityKind,
          record.sourcePartyId,
          record.subjectStatus,
          canonicalJson(record),
          recordDigest,
          record.assertedAt,
        );
      });
    } catch (error) {
      throw translateStorageError(error);
    }
    return { record: structuredClone(record), recordDigest, idempotent: false };
  }

  getAuthority(authorityRef, { required = true } = {}) {
    assertId("authorityRef", authorityRef);
    if (!tableExists(this.#database, "genesis_origin_authorities")) {
      if (!required) return null;
      throw new GenesisOriginAuthorityNotFoundError("Genesis origin authority storage is not present in this world");
    }
    const row = this.#database.prepare(
      "SELECT record_json,record_digest FROM genesis_origin_authorities WHERE authority_ref=?",
    ).get(authorityRef);
    if (row === undefined) {
      if (!required) return null;
      throw new GenesisOriginAuthorityNotFoundError(`Genesis origin authority ${authorityRef} was not found`);
    }
    const record = normalizeGenesisOriginAuthority(parseRecord(`Genesis origin authority ${authorityRef}`, row.record_json));
    const recordDigest = genesisOriginAuthorityDigest(record);
    if (recordDigest !== row.record_digest || canonicalJson(record) !== row.record_json) {
      throw new IntegrityError(`Genesis origin authority ${authorityRef} failed canonical/digest verification`);
    }
    return { record, recordDigest };
  }
}

import { DatabaseSync } from "node:sqlite";

import {
  IntegrityError,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  canonicalJson,
} from "./persistence-common.mjs";
import {
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import {
  sameSemanticStateSlot,
  semanticStateDigest,
  semanticStateIdFor,
  validateSemanticDimension,
  normalizeSemanticStateRecord,
} from "./semantic-state.mjs";
import { createSemanticStateTables } from "./semantic-state-schema.mjs";

function parseJson(name, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function rowToState(row) {
  const record = normalizeSemanticStateRecord({
    stateId: row.state_id,
    threadId: row.thread_id,
    domain: row.domain,
    dimension: row.dimension,
    target: row.target_json === null ? null : parseJson(`semantic state ${row.state_id} target`, row.target_json),
    state: row.state_text,
    evidenceReferences: parseJson(`semantic state ${row.state_id} evidence`, row.evidence_refs_json),
    asOf: row.as_of,
    supersedes: row.supersedes_state_id,
    provenance: parseJson(`semantic state ${row.state_id} provenance`, row.provenance_json),
    visibility: row.visibility,
    staleness: row.staleness,
  });
  if (semanticStateDigest(record) !== row.state_digest) {
    throw new IntegrityError(`semantic state ${record.stateId} digest failed`);
  }
  return record;
}

export class SemanticStateStore {
  #database;

  constructor(databasePath) {
    assertNonEmpty("databasePath", databasePath);
    this.#database = new DatabaseSync(normalizeDatabasePath(databasePath), {
      enableForeignKeyConstraints: true,
    });
    this.#database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
    try {
      migrateDatabase(this.#database);
      createSemanticStateTables(this.#database);
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() {
    this.#database.close();
  }

  registerDimension(definition, { registeredBy = "fibre", registeredAt = new Date().toISOString() } = {}) {
    const normalized = validateSemanticDimension(definition);
    assertNonEmpty("registeredBy", registeredBy);
    assertIsoTimestamp("registeredAt", registeredAt);
    const existing = this.#database.prepare(`
      SELECT domain,dimension,semantics,behavioral_relevance
      FROM semantic_state_dimensions WHERE domain=? AND dimension=?
    `).get(normalized.domain, normalized.dimension);
    if (existing !== undefined) {
      if (
        existing.semantics !== normalized.semantics ||
        existing.behavioral_relevance !== normalized.behavioralRelevance
      ) {
        throw new IntegrityError(
          `semantic dimension ${normalized.domain}:${normalized.dimension} already exists with different semantics`,
        );
      }
      return { definition: normalized, created: false };
    }
    this.#database.prepare(`
      INSERT INTO semantic_state_dimensions(
        domain,dimension,semantics,behavioral_relevance,registered_by,registered_at
      ) VALUES (?,?,?,?,?,?)
    `).run(
      normalized.domain,
      normalized.dimension,
      normalized.semantics,
      normalized.behavioralRelevance,
      registeredBy,
      registeredAt,
    );
    return { definition: normalized, created: true };
  }

  listDimensions() {
    return this.#database.prepare(`
      SELECT domain,dimension,semantics,behavioral_relevance
      FROM semantic_state_dimensions ORDER BY domain,dimension
    `).all().map((row) => ({
      domain: row.domain,
      dimension: row.dimension,
      semantics: row.semantics,
      behavioralRelevance: row.behavioral_relevance,
    }));
  }

  getState(stateId, { required = true } = {}) {
    assertId("stateId", stateId);
    const row = this.#database.prepare(`
      SELECT state_id,thread_id,domain,dimension,target_json,state_text,evidence_refs_json,
        as_of,supersedes_state_id,provenance_json,visibility,staleness,state_digest
      FROM semantic_state_records WHERE state_id=?
    `).get(stateId);
    if (row === undefined) {
      if (!required) return null;
      throw new IntegrityError(`semantic state ${stateId} was not found`);
    }
    return rowToState(row);
  }

  listStateHistory(threadId) {
    assertId("threadId", threadId);
    return this.#database.prepare(`
      SELECT state_id,thread_id,domain,dimension,target_json,state_text,evidence_refs_json,
        as_of,supersedes_state_id,provenance_json,visibility,staleness,state_digest
      FROM semantic_state_records WHERE thread_id=? ORDER BY as_of,state_id
    `).all(threadId).map(rowToState);
  }

  listCurrentState(threadId) {
    assertId("threadId", threadId);
    return this.#database.prepare(`
      SELECT r.state_id,r.thread_id,r.domain,r.dimension,r.target_json,r.state_text,
        r.evidence_refs_json,r.as_of,r.supersedes_state_id,r.provenance_json,
        r.visibility,r.staleness,r.state_digest
      FROM semantic_state_records r
      WHERE r.thread_id=?
        AND r.staleness='current'
        AND NOT EXISTS (
          SELECT 1 FROM semantic_state_records newer
          WHERE newer.supersedes_state_id=r.state_id
        )
      ORDER BY r.domain,r.dimension,r.as_of,r.state_id
    `).all(threadId).map(rowToState);
  }

  recordState(candidate) {
    const prepared = structuredClone(candidate);
    if (prepared.stateId === undefined) prepared.stateId = semanticStateIdFor(prepared);
    const record = normalizeSemanticStateRecord(prepared);
    const dimension = this.#database.prepare(`
      SELECT semantics FROM semantic_state_dimensions WHERE domain=? AND dimension=?
    `).get(record.domain, record.dimension);
    if (dimension === undefined) {
      throw new TypeError(
        `semantic dimension ${record.domain}:${record.dimension} must be registered before persistence`,
      );
    }
    const existing = this.getState(record.stateId, { required: false });
    if (existing !== null) {
      if (canonicalJson(existing) === canonicalJson(record)) {
        return { state: existing, created: false };
      }
      throw new IntegrityError(`semantic state ID ${record.stateId} already exists with different content`);
    }

    let superseded = null;
    if (record.supersedes !== null) {
      superseded = this.getState(record.supersedes);
      if (!sameSemanticStateSlot(superseded, record)) {
        throw new TypeError("semantic state may only supersede the same Thread/domain/dimension/target slot");
      }
      const alreadySuperseded = this.#database.prepare(
        "SELECT state_id FROM semantic_state_records WHERE supersedes_state_id=?",
      ).get(record.supersedes);
      if (alreadySuperseded !== undefined) {
        throw new IntegrityError(`semantic state ${record.supersedes} was already superseded`);
      }
    }

    try {
      this.#database.exec("BEGIN IMMEDIATE");
      this.#database.prepare(`
        INSERT INTO semantic_state_records(
          state_id,thread_id,domain,dimension,target_json,state_text,evidence_refs_json,
          as_of,supersedes_state_id,provenance_json,visibility,staleness,state_digest
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        record.stateId,
        record.threadId,
        record.domain,
        record.dimension,
        record.target === null ? null : canonicalJson(record.target),
        record.state,
        canonicalJson(record.evidenceReferences),
        record.asOf,
        record.supersedes,
        canonicalJson(record.provenance),
        record.visibility,
        record.staleness,
        semanticStateDigest(record),
      );
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
    return { state: this.getState(record.stateId), created: true };
  }
}

export function openSemanticStateStore(databasePath) {
  return new SemanticStateStore(databasePath);
}

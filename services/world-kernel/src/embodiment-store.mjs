import { DatabaseSync } from "node:sqlite";
import { IntegrityError, canonicalJson, sha256 } from "./persistence-common.mjs";
import { migrateDatabase, normalizeDatabasePath, safeRollback, translateStorageError } from "./persistence-sqlite.mjs";
import { normalizeEmbodimentRepresentation } from "./embodiment-domain.mjs";
import { createEmbodimentTables } from "./embodiment-schema.mjs";

export class EmbodimentConflictError extends Error {}
export class EmbodimentNotFoundError extends Error {}

function digest(record) {
  return `sha256:${sha256(canonicalJson({ kind: "embodiment_representation", record }))}`;
}

function parseRow(row) {
  let raw;
  try { raw = JSON.parse(row.record_json); }
  catch (error) { throw new IntegrityError(`embodiment ${row.embodiment_id} invalid JSON: ${error.message}`); }
  const record = normalizeEmbodimentRepresentation(raw);
  const checks = [
    [row.embodiment_id, record.embodimentId, "embodiment ID"],
    [Number(row.revision), record.revision, "revision"],
    [row.thread_id, record.threadId, "Thread"],
    [row.kind, record.kind, "kind"],
    [row.representation_kind, record.representationKind, "representation kind"],
    [row.truth_status, record.truthStatus, "truth status"],
    [row.rights_basis, record.rightsBasis, "rights basis"],
    [row.visibility, record.visibility, "visibility"],
    [row.status, record.status, "status"],
    [row.recorded_at, record.recordedAt, "recordedAt"],
    [row.supersedes_revision, record.supersedesRevision ?? null, "supersedes revision"],
    [row.specification_digest, record.specificationDigest, "specification digest"],
    [row.asset_sha256, record.asset?.sha256 ?? null, "asset hash"],
  ];
  for (const [actual, expected, field] of checks) {
    if (actual !== expected) throw new IntegrityError(`embodiment ${record.embodimentId} ${field} column mismatch`);
  }
  if (row.record_json !== canonicalJson(record)) throw new IntegrityError(`embodiment ${record.embodimentId} is not canonical JSON`);
  if (row.record_digest !== digest(record)) throw new IntegrityError(`embodiment ${record.embodimentId} digest mismatch`);
  return record;
}

function sameSlot(a, b) {
  return a.embodimentId === b.embodimentId && a.threadId === b.threadId && a.kind === b.kind && a.representationKind === b.representationKind && a.truthStatus === b.truthStatus && a.rightsBasis === b.rightsBasis;
}

export class EmbodimentStore {
  #db;
  #readOnly;
  constructor(databasePath, { readOnly = false } = {}) {
    this.#readOnly = readOnly;
    this.#db = new DatabaseSync(normalizeDatabasePath(databasePath), { readOnly, enableForeignKeyConstraints: true });
    try {
      if (readOnly) this.#db.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=5000;");
      else {
        this.#db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
        migrateDatabase(this.#db);
        this.#db.exec("BEGIN IMMEDIATE");
        createEmbodimentTables(this.#db);
        this.#db.exec("COMMIT");
      }
    } catch (error) {
      safeRollback(this.#db);
      this.#db.close();
      throw error;
    }
  }
  close() { this.#db.close(); }
  queryOnly() { return Number(this.#db.prepare("PRAGMA query_only").get().query_only) === 1; }
  #requireThread(threadId) {
    const row = this.#db.prepare("SELECT created_at FROM threads WHERE thread_id=?").get(threadId);
    if (!row) throw new EmbodimentNotFoundError(`Thread ${threadId} was not found`);
    return row;
  }
  history(threadId, embodimentId, { required = true } = {}) {
    this.#requireThread(threadId);
    const rows = this.#db.prepare(`SELECT embodiment_id,revision,thread_id,kind,representation_kind,truth_status,rights_basis,visibility,status,recorded_at,supersedes_revision,specification_digest,asset_sha256,record_json,record_digest FROM embodiment_records WHERE thread_id=? AND embodiment_id=? ORDER BY revision`).all(threadId, embodimentId);
    if (rows.length === 0 && required) throw new EmbodimentNotFoundError(`embodiment ${embodimentId} was not found`);
    const records = rows.map(parseRow);
    for (let i = 0; i < records.length; i += 1) {
      if (records[i].revision !== i + 1) throw new IntegrityError(`embodiment ${embodimentId} has non-contiguous revisions`);
      if (i > 0) {
        if (records[i].supersedesRevision !== records[i - 1].revision) throw new IntegrityError(`embodiment ${embodimentId} does not supersede its immediate predecessor`);
        if (Date.parse(records[i].recordedAt) < Date.parse(records[i - 1].recordedAt)) throw new IntegrityError(`embodiment ${embodimentId} recordedAt moves backwards`);
        if (!sameSlot(records[0], records[i])) throw new IntegrityError(`embodiment ${embodimentId} changes its truth/rights identity slot`);
      }
    }
    return records;
  }
  listCurrent(threadId) {
    this.#requireThread(threadId);
    const ids = this.#db.prepare("SELECT DISTINCT embodiment_id FROM embodiment_records WHERE thread_id=? ORDER BY embodiment_id").all(threadId);
    return ids.map(({ embodiment_id }) => this.history(threadId, embodiment_id).at(-1));
  }
  record(candidate) {
    if (this.#readOnly) throw new EmbodimentConflictError("read-only embodiment store cannot write");
    const record = normalizeEmbodimentRepresentation(candidate);
    const thread = this.#requireThread(record.threadId);
    if (Date.parse(record.recordedAt) < Date.parse(thread.created_at)) throw new EmbodimentConflictError("embodiment cannot be recorded before Thread creation");
    try {
      this.#db.exec("BEGIN IMMEDIATE");
      const history = this.history(record.threadId, record.embodimentId, { required: false });
      if (history.length !== record.revision - 1) throw new EmbodimentConflictError(`embodiment ${record.embodimentId} expected revision ${history.length + 1}`);
      if (history.length > 0 && !sameSlot(history[0], record)) throw new EmbodimentConflictError(`embodiment ${record.embodimentId} cannot switch source truth or rights basis`);
      this.#db.prepare(`INSERT INTO embodiment_records(embodiment_id,revision,thread_id,kind,representation_kind,truth_status,rights_basis,visibility,status,recorded_at,supersedes_revision,specification_digest,asset_sha256,record_json,record_digest) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        record.embodimentId, record.revision, record.threadId, record.kind, record.representationKind, record.truthStatus, record.rightsBasis, record.visibility, record.status, record.recordedAt, record.supersedesRevision ?? null, record.specificationDigest, record.asset?.sha256 ?? null, canonicalJson(record), digest(record),
      );
      this.#db.exec("COMMIT");
      return record;
    } catch (error) {
      safeRollback(this.#db);
      throw translateStorageError(error);
    }
  }
  inspectThread(threadId) { return { threadId, embodiment: this.listCurrent(threadId) }; }
}

export function openEmbodimentStore(databasePath) { return new EmbodimentStore(databasePath); }
export function openEmbodimentInspectionStore(databasePath) { return new EmbodimentStore(databasePath, { readOnly: true }); }

import { DatabaseSync } from "node:sqlite";
import { IntegrityError, canonicalJson, sha256 } from "./persistence-common.mjs";
import { migrateDatabase, normalizeDatabasePath, safeRollback, translateStorageError } from "./persistence-sqlite.mjs";
import { normalizeEmbodimentRepresentation } from "./embodiment-domain.mjs";
import { normalizeEmbodimentRightsAuthority } from "./embodiment-rights-domain.mjs";
import { createEmbodimentTables } from "./embodiment-schema.mjs";
import { embodimentRecordDigest, ensureEmbodimentIntegrity } from "./embodiment-integrity.mjs";

export class EmbodimentConflictError extends Error {}
export class EmbodimentNotFoundError extends Error {}

const VISIBILITY_RANK = Object.freeze({ private: 0, restricted: 1, public: 2 });

function rightsDigest(record) {
  return `sha256:${sha256(canonicalJson({ kind: "embodiment_rights_authority", record }))}`;
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
  return record;
}

function sameSlot(a, b) {
  return a.embodimentId === b.embodimentId &&
    a.threadId === b.threadId &&
    a.kind === b.kind &&
    a.representationKind === b.representationKind &&
    a.truthStatus === b.truthStatus &&
    a.rightsBasis === b.rightsBasis;
}

function isSuperset(next, prior) {
  const values = new Set(next);
  return prior.every((item) => values.has(item));
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
        ensureEmbodimentIntegrity(this.#db);
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
  #worldEvidenceExists(threadId, reference) {
    if (this.#db.prepare("SELECT 1 FROM thread_events WHERE thread_id=? AND event_id=?").get(threadId, reference)) return true;
    if (this.#db.prepare("SELECT 1 FROM situated_evidence_witnesses WHERE thread_id=? AND reference=?").get(threadId, reference)) return true;
    if (this.#db.prepare("SELECT 1 FROM identity_assertion_records WHERE thread_id=? AND assertion_id=?").get(threadId, reference)) return true;
    return false;
  }
  #requireWorldEvidence(threadId, references, label) {
    for (const reference of references) {
      if (!this.#worldEvidenceExists(threadId, reference)) {
        throw new EmbodimentConflictError(`${label} reference ${reference} is not durable evidence for Thread ${threadId}`);
      }
    }
  }
  #rightsAuthority(reference, record) {
    const row = this.#db.prepare(`
      SELECT authority_kind,max_visibility,record_json,record_digest
      FROM embodiment_rights_authorities WHERE authority_id=? AND thread_id=?
    `).get(reference, record.threadId);
    if (!row) throw new EmbodimentConflictError(`embodiment rights authority ${reference} does not exist for Thread ${record.threadId}`);
    const authority = normalizeEmbodimentRightsAuthority(JSON.parse(row.record_json));
    if (row.record_json !== canonicalJson(authority) || row.record_digest !== rightsDigest(authority)) {
      throw new IntegrityError(`embodiment rights authority ${reference} integrity mismatch`);
    }
    if (authority.authorityKind !== record.rightsBasis) {
      throw new EmbodimentConflictError(`embodiment rights authority ${reference} does not establish ${record.rightsBasis}`);
    }
    if (!authority.permittedKinds.includes(record.kind)) {
      throw new EmbodimentConflictError(`embodiment rights authority ${reference} does not permit ${record.kind}`);
    }
    if (VISIBILITY_RANK[record.visibility] > VISIBILITY_RANK[authority.maxVisibility]) {
      throw new EmbodimentConflictError(`embodiment rights authority ${reference} does not permit ${record.visibility} visibility`);
    }
    return authority;
  }
  recordRightsAuthority(candidate) {
    if (this.#readOnly) throw new EmbodimentConflictError("read-only embodiment store cannot record rights authority");
    const authority = normalizeEmbodimentRightsAuthority(candidate);
    const thread = this.#requireThread(authority.threadId);
    if (Date.parse(authority.recordedAt) < Date.parse(thread.created_at)) {
      throw new EmbodimentConflictError("embodiment rights authority cannot predate Thread creation");
    }
    try {
      this.#db.exec("BEGIN IMMEDIATE");
      this.#requireWorldEvidence(authority.threadId, authority.evidenceReferences, "embodiment rights evidence");
      const prior = this.#db.prepare("SELECT record_json,record_digest FROM embodiment_rights_authorities WHERE authority_id=?").get(authority.authorityId);
      if (prior) {
        if (prior.record_json !== canonicalJson(authority) || prior.record_digest !== rightsDigest(authority)) {
          throw new EmbodimentConflictError(`embodiment rights authority ${authority.authorityId} already exists with different content`);
        }
        this.#db.exec("COMMIT");
        return authority;
      }
      this.#db.prepare(`
        INSERT INTO embodiment_rights_authorities(
          authority_id,thread_id,authority_kind,source_party_id,max_visibility,record_json,record_digest,recorded_at
        ) VALUES (?,?,?,?,?,?,?,?)
      `).run(
        authority.authorityId, authority.threadId, authority.authorityKind, authority.sourcePartyId,
        authority.maxVisibility, canonicalJson(authority), rightsDigest(authority), authority.recordedAt,
      );
      this.#db.exec("COMMIT");
      return authority;
    } catch (error) {
      safeRollback(this.#db);
      throw translateStorageError(error);
    }
  }
  history(threadId, embodimentId, { required = true } = {}) {
    this.#requireThread(threadId);
    const rows = this.#db.prepare(`
      SELECT embodiment_id,revision,thread_id,kind,representation_kind,truth_status,rights_basis,
        visibility,status,recorded_at,supersedes_revision,specification_digest,asset_sha256,record_json,record_digest
      FROM embodiment_records WHERE thread_id=? AND embodiment_id=? ORDER BY revision
    `).all(threadId, embodimentId);
    if (rows.length === 0 && required) throw new EmbodimentNotFoundError(`embodiment ${embodimentId} was not found`);
    const records = rows.map(parseRow);
    const heads = this.#db.prepare(`
      SELECT revision,thread_id,head_digest,recorded_at
      FROM embodiment_lineage_heads WHERE embodiment_id=? ORDER BY revision
    `).all(embodimentId);
    if (heads.length !== records.length) throw new IntegrityError(`embodiment ${embodimentId} head chain length mismatch`);
    let previousDigest = null;
    for (let i = 0; i < records.length; i += 1) {
      const record = records[i];
      if (record.revision !== i + 1) throw new IntegrityError(`embodiment ${embodimentId} has non-contiguous revisions`);
      if (i > 0) {
        if (record.supersedesRevision !== records[i - 1].revision) throw new IntegrityError(`embodiment ${embodimentId} does not supersede its immediate predecessor`);
        if (Date.parse(record.recordedAt) < Date.parse(records[i - 1].recordedAt)) throw new IntegrityError(`embodiment ${embodimentId} recordedAt moves backwards`);
        if (!sameSlot(records[0], record)) throw new IntegrityError(`embodiment ${embodimentId} changes its truth/rights identity slot`);
      }
      const expectedDigest = embodimentRecordDigest(record, previousDigest);
      const head = heads[i];
      if (
        rows[i].record_digest !== expectedDigest ||
        Number(head.revision) !== record.revision ||
        head.thread_id !== record.threadId ||
        head.head_digest !== expectedDigest ||
        head.recorded_at !== record.recordedAt
      ) {
        throw new IntegrityError(`embodiment ${embodimentId} head mismatch at revision ${record.revision}`);
      }
      previousDigest = expectedDigest;
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
      this.#requireWorldEvidence(record.threadId, record.sourceReferences, "embodiment source");
      for (const reference of record.permissionReferences) this.#rightsAuthority(reference, record);
      const history = this.history(record.threadId, record.embodimentId, { required: false });
      if (history.length !== record.revision - 1) throw new EmbodimentConflictError(`embodiment ${record.embodimentId} expected revision ${history.length + 1}`);
      if (history.length > 0) {
        const prior = history.at(-1);
        if (!sameSlot(history[0], record)) throw new EmbodimentConflictError(`embodiment ${record.embodimentId} cannot switch source truth or rights basis`);
        if (record.representationKind === "human_source_derivative") {
          if (!isSuperset(record.sourceReferences, prior.sourceReferences)) {
            throw new EmbodimentConflictError("human-derived embodiment cannot discard prior source evidence");
          }
          if (!isSuperset(record.permissionReferences, prior.permissionReferences)) {
            throw new EmbodimentConflictError("human-derived embodiment cannot discard prior permission authority");
          }
        }
        if (VISIBILITY_RANK[record.visibility] > VISIBILITY_RANK[prior.visibility]) {
          const newAuthorities = record.permissionReferences.filter((reference) => !prior.permissionReferences.includes(reference));
          if (record.representationKind === "human_source_derivative" && newAuthorities.length === 0) {
            throw new EmbodimentConflictError("widening human-derived embodiment visibility requires new rights authority");
          }
          for (const reference of newAuthorities) this.#rightsAuthority(reference, record);
        }
      }
      const previousDigest = history.length === 0
        ? null
        : this.#db.prepare("SELECT record_digest FROM embodiment_records WHERE embodiment_id=? AND revision=?").get(record.embodimentId, record.revision - 1).record_digest;
      const recordDigest = embodimentRecordDigest(record, previousDigest);
      this.#db.prepare(`INSERT INTO embodiment_records(embodiment_id,revision,thread_id,kind,representation_kind,truth_status,rights_basis,visibility,status,recorded_at,supersedes_revision,specification_digest,asset_sha256,record_json,record_digest) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        record.embodimentId, record.revision, record.threadId, record.kind, record.representationKind, record.truthStatus, record.rightsBasis, record.visibility, record.status, record.recordedAt, record.supersedesRevision ?? null, record.specificationDigest, record.asset?.sha256 ?? null, canonicalJson(record), recordDigest,
      );
      this.#db.prepare(`
        INSERT INTO embodiment_lineage_heads(embodiment_id,revision,thread_id,head_digest,recorded_at)
        VALUES (?,?,?,?,?)
      `).run(record.embodimentId, record.revision, record.threadId, recordDigest, record.recordedAt);
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

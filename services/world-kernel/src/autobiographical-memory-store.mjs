import { DatabaseSync } from "node:sqlite";
import { IntegrityError, canonicalJson } from "./persistence-common.mjs";
import {
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import {
  autobiographicalMemoryIsCurrent,
  autobiographicalMemoryRecordDigest,
  normalizeAutobiographicalMemory,
} from "./autobiographical-memory-domain.mjs";
import {
  AUTOBIOGRAPHICAL_MEMORY_RECORDED,
  buildAutobiographicalMemoryRecordedEvent,
} from "./autobiographical-memory-anchor.mjs";

export class AutobiographicalMemoryConflictError extends Error {}
export class AutobiographicalMemoryNotFoundError extends Error {}

function parseRecord(row) {
  try { return JSON.parse(row.record_json); }
  catch (error) { throw new IntegrityError(`memory ${row.memory_id} JSON is invalid: ${error.message}`); }
}

function parseThread(row) {
  try { return JSON.parse(row.state_json); }
  catch (error) { throw new IntegrityError(`Thread ${row.thread_id} JSON is invalid: ${error.message}`); }
}

function parseAnchor(row) {
  try { return JSON.parse(row.payload_json); }
  catch (error) { throw new IntegrityError(`memory anchor ${row.event_id} JSON is invalid: ${error.message}`); }
}

function visibilityRank(value) { return { private: 0, restricted: 1, public: 2 }[value]; }
function evidenceSet(record) { return new Set([...record.supportingEvidenceRefs, ...record.contradictingEvidenceRefs]); }
function isEvidenceSuperset(previous, current) {
  const next = evidenceSet(current);
  return [...evidenceSet(previous)].every((ref) => next.has(ref));
}
function hasNewEvidence(previous, current) {
  const prior = evidenceSet(previous);
  return [...evidenceSet(current)].some((ref) => !prior.has(ref));
}
function subjectiveMemoryStateChanged(previous, current) {
  return previous.accessibility !== current.accessibility ||
    previous.retentionState !== current.retentionState;
}
function isSubjectEventSuperset(previous, current) {
  const next = new Set(current.eventRefs);
  return previous.eventRefs.every((ref) => next.has(ref));
}
function sameSubject(previous, current) { return canonicalJson(previous.subject) === canonicalJson(current.subject); }

export class AutobiographicalMemoryStore {
  #database;
  #readOnly;

  constructor(databasePath, { readOnly = false } = {}) {
    this.#readOnly = readOnly;
    this.#database = new DatabaseSync(normalizeDatabasePath(databasePath), {
      readOnly,
      enableForeignKeyConstraints: true,
    });
    try {
      if (readOnly) this.#database.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=5000;");
      else {
        this.#database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
        migrateDatabase(this.#database);
      }
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  close() { this.#database.close(); }
  queryOnly() { return Number(this.#database.prepare("PRAGMA query_only").get().query_only) === 1; }

  #requireThread(threadId) {
    const row = this.#database.prepare(`
      SELECT thread_id,version,status,state_json,state_hash,last_event_id,created_at,updated_at
      FROM threads WHERE thread_id=?
    `).get(threadId);
    if (row === undefined) throw new AutobiographicalMemoryNotFoundError(`Thread ${threadId} was not found`);
    return row;
  }

  #requireEventRefs(record) {
    const start = Date.parse(record.subjectPeriod.startAt);
    const end = record.subjectPeriod.endAt === null ? null : Date.parse(record.subjectPeriod.endAt);
    for (const ref of record.eventRefs) {
      const event = this.#database.prepare("SELECT occurred_at FROM thread_events WHERE thread_id=? AND event_id=?").get(record.threadId, ref);
      if (event === undefined) throw new AutobiographicalMemoryConflictError(`memory event reference ${ref} does not resolve to Thread ${record.threadId} history`);
      const occurredAt = Date.parse(event.occurred_at);
      if (occurredAt > Date.parse(record.asOf)) throw new AutobiographicalMemoryConflictError(`memory cannot cite future event ${ref} relative to asOf`);
      if (occurredAt < start || (end !== null && occurredAt > end)) throw new AutobiographicalMemoryConflictError(`memory subject event ${ref} falls outside subjectPeriod`);
    }
  }

  #referenceResolves(threadId, ref) {
    if (this.#database.prepare("SELECT 1 AS present FROM thread_events WHERE thread_id=? AND event_id=?").get(threadId, ref) !== undefined) return true;
    if (this.#database.prepare("SELECT 1 AS present FROM situated_evidence_witnesses WHERE thread_id=? AND reference=?").get(threadId, ref) !== undefined) return true;
    if (this.#database.prepare("SELECT 1 AS present FROM identity_assertion_records WHERE thread_id=? AND assertion_id=?").get(threadId, ref) !== undefined) return true;
    return false;
  }

  #requireEvidence(record) {
    for (const ref of [...record.supportingEvidenceRefs, ...record.contradictingEvidenceRefs]) {
      if (!this.#referenceResolves(record.threadId, ref)) throw new AutobiographicalMemoryConflictError(`memory evidence reference ${ref} does not resolve for Thread ${record.threadId}`);
    }
  }

  #anchorRows(threadId, memoryId) {
    return this.#database.prepare(`
      SELECT event_id,payload_json,occurred_at
      FROM thread_events
      WHERE thread_id=? AND event_type=? AND json_extract(payload_json,'$.memoryId')=?
      ORDER BY sequence
    `).all(threadId, AUTOBIOGRAPHICAL_MEMORY_RECORDED, memoryId);
  }

  memoryHistory(threadId, memoryId, { required = true } = {}) {
    this.#requireThread(threadId);
    const rows = this.#database.prepare(`
      SELECT memory_id,revision,thread_id,status,visibility,as_of,
        recorded_at,supersedes_revision,record_json,record_digest
      FROM autobiographical_memory_records
      WHERE thread_id=? AND memory_id=? ORDER BY revision
    `).all(threadId, memoryId);
    const anchors = this.#anchorRows(threadId, memoryId);
    if (rows.length === 0) {
      if (anchors.length !== 0) throw new IntegrityError(`memory ${memoryId} has history anchors but no memory records`);
      if (required) throw new AutobiographicalMemoryNotFoundError(`memory ${memoryId} was not found`);
      return [];
    }

    const heads = this.#database.prepare(`
      SELECT revision,thread_id,head_digest,recorded_at
      FROM autobiographical_memory_lineage_heads
      WHERE memory_id=? ORDER BY revision
    `).all(memoryId);
    if (heads.length !== rows.length) throw new IntegrityError(`memory ${memoryId} head chain length mismatch`);
    if (anchors.length !== rows.length) throw new IntegrityError(`memory ${memoryId} Thread-history anchor length mismatch`);

    const history = [];
    let previousDigest = null;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const record = normalizeAutobiographicalMemory(parseRecord(row));
      if (record.revision !== index + 1) throw new IntegrityError(`memory ${memoryId} has non-contiguous revisions`);
      const checks = [
        [row.memory_id, record.memoryId, "memory ID"],
        [Number(row.revision), record.revision, "revision"],
        [row.thread_id, record.threadId, "Thread"],
        [row.status, record.status, "status"],
        [row.visibility, record.visibility, "visibility"],
        [row.as_of, record.asOf, "asOf"],
        [row.recorded_at, record.recordedAt, "recordedAt"],
        [row.supersedes_revision, record.supersedesRevision ?? null, "supersedes revision"],
      ];
      for (const [actual, expected, field] of checks) if (actual !== expected) throw new IntegrityError(`memory ${memoryId} ${field} column mismatch`);
      if (row.record_json !== canonicalJson(record)) throw new IntegrityError(`memory ${memoryId} is not canonical JSON`);

      this.#requireEventRefs(record);
      this.#requireEvidence(record);
      const digest = autobiographicalMemoryRecordDigest(record, previousDigest);
      if (row.record_digest !== digest) throw new IntegrityError(`memory ${memoryId} digest mismatch at revision ${record.revision}`);

      const head = heads[index];
      if (Number(head.revision) !== record.revision || head.thread_id !== threadId || head.head_digest !== digest || head.recorded_at !== record.recordedAt) {
        throw new IntegrityError(`memory ${memoryId} lineage head mismatch at revision ${record.revision}`);
      }

      const anchor = anchors[index];
      const anchorPayload = parseAnchor(anchor);
      if (
        anchorPayload.memoryId !== memoryId ||
        Number(anchorPayload.revision) !== record.revision ||
        anchorPayload.memoryDigest !== digest ||
        anchor.occurred_at !== record.recordedAt
      ) {
        throw new IntegrityError(`memory ${memoryId} Thread-history anchor mismatch at revision ${record.revision}`);
      }

      if (index > 0) {
        const previous = history[index - 1];
        if (record.supersedesRevision !== previous.revision) throw new IntegrityError(`memory ${memoryId} does not supersede its predecessor`);
        if (Date.parse(record.recordedAt) < Date.parse(previous.recordedAt)) throw new IntegrityError(`memory ${memoryId} recordedAt moves backwards`);
        if (record.threadId !== previous.threadId) throw new IntegrityError(`memory ${memoryId} changes Thread identity`);
        if (!sameSubject(previous, record)) throw new IntegrityError(`memory ${memoryId} changes its immutable subject`);
        if (!isSubjectEventSuperset(previous, record)) throw new IntegrityError(`memory ${memoryId} erases subject-history references`);
        if (!isEvidenceSuperset(previous, record)) throw new IntegrityError(`memory ${memoryId} erases previously cited evidence`);
        if (subjectiveMemoryStateChanged(previous, record) && !hasNewEvidence(previous, record)) {
          throw new IntegrityError(`memory ${memoryId} changes accessibility/retention without new evidence`);
        }
      }
      history.push(record);
      previousDigest = digest;
    }
    return history;
  }

  listCurrentMemories(threadId) {
    this.#requireThread(threadId);
    const ids = this.#database.prepare(`
      SELECT memory_id FROM autobiographical_memory_records WHERE thread_id=?
      UNION
      SELECT json_extract(payload_json,'$.memoryId') AS memory_id
      FROM thread_events WHERE thread_id=? AND event_type=?
      ORDER BY memory_id
    `).all(threadId, threadId, AUTOBIOGRAPHICAL_MEMORY_RECORDED);
    return ids.map(({ memory_id: id }) => this.memoryHistory(threadId, id).at(-1)).filter(autobiographicalMemoryIsCurrent);
  }

  inspectThread(threadId) {
    return {
      threadId,
      memories: this.listCurrentMemories(threadId),
      standingCredit: { acceptedCausalAssertions: 0, endogenousEvidenceAssertions: 0 },
    };
  }

  recordMemory(candidate) {
    if (this.#readOnly) throw new AutobiographicalMemoryConflictError("read-only memory store cannot write");
    const record = normalizeAutobiographicalMemory(candidate);

    try {
      this.#database.exec("BEGIN IMMEDIATE");
      const threadRow = this.#requireThread(record.threadId);
      if (Date.parse(record.recordedAt) < Date.parse(threadRow.created_at)) throw new AutobiographicalMemoryConflictError("memory cannot be recorded before Thread creation");
      if (Date.parse(record.recordedAt) < Date.parse(threadRow.updated_at)) throw new AutobiographicalMemoryConflictError("memory cannot be recorded before the Thread's latest historical event");
      this.#requireEventRefs(record);
      this.#requireEvidence(record);
      const history = this.memoryHistory(record.threadId, record.memoryId, { required: false });
      if (history.length !== record.revision - 1) throw new AutobiographicalMemoryConflictError(`memory ${record.memoryId} expected revision ${history.length + 1}`);

      const previous = history.at(-1) ?? null;
      if (previous !== null) {
        if (!sameSubject(previous, record)) throw new AutobiographicalMemoryConflictError("memory revision cannot change its immutable subject");
        if (!isSubjectEventSuperset(previous, record)) throw new AutobiographicalMemoryConflictError("memory revision cannot erase or replace subject-history references");
        if (!isEvidenceSuperset(previous, record)) throw new AutobiographicalMemoryConflictError("memory revision cannot erase previously cited epistemic evidence");
        if (subjectiveMemoryStateChanged(previous, record) && !hasNewEvidence(previous, record)) {
          throw new AutobiographicalMemoryConflictError("memory accessibility/retention changes require new resolved evidence");
        }
        if (visibilityRank(record.visibility) > visibilityRank(previous.visibility)) throw new AutobiographicalMemoryConflictError("memory visibility cannot widen without a future disclosure-authority path");
      }

      const previousDigest = previous === null ? null : this.#database.prepare("SELECT record_digest FROM autobiographical_memory_records WHERE memory_id=? AND revision=?").get(record.memoryId, previous.revision).record_digest;
      const digest = autobiographicalMemoryRecordDigest(record, previousDigest);
      const thread = parseThread(threadRow);
      if (thread.version !== Number(threadRow.version) || thread.provenance.lastEventId !== threadRow.last_event_id) throw new IntegrityError(`Thread ${record.threadId} projection columns do not match memory anchor source state`);
      const sequence = Number(this.#database.prepare("SELECT COALESCE(MAX(sequence),0)+1 AS next_sequence FROM thread_events WHERE thread_id=?").get(record.threadId).next_sequence);
      const { nextThread, event } = buildAutobiographicalMemoryRecordedEvent(thread, {
        memoryId: record.memoryId,
        revision: record.revision,
        memoryDigest: digest,
        recordedAt: record.recordedAt,
        sequence,
      });

      this.#database.prepare(`
        INSERT INTO autobiographical_memory_records(
          memory_id,revision,thread_id,status,visibility,as_of,recorded_at,
          supersedes_revision,record_json,record_digest
        ) VALUES (?,?,?,?,?,?,?,?,?,?)
      `).run(record.memoryId, record.revision, record.threadId, record.status, record.visibility, record.asOf, record.recordedAt, record.supersedesRevision ?? null, canonicalJson(record), digest);
      this.#database.prepare(`
        INSERT INTO autobiographical_memory_lineage_heads(memory_id,revision,thread_id,head_digest,recorded_at)
        VALUES (?,?,?,?,?)
      `).run(record.memoryId, record.revision, record.threadId, digest, record.recordedAt);
      this.#database.prepare(`
        INSERT INTO thread_events(
          event_id,thread_id,sequence,expected_version,resulting_version,event_type,
          command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
          authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        event.eventId, event.threadId, event.sequence, event.expectedVersion, event.resultingVersion,
        event.eventType, event.commandId, event.commandDigest, canonicalJson(event.payload), canonicalJson(event.actor),
        event.occurredAt, event.stateHash, event.authorizationId, event.causationId, event.correlationId,
        event.payloadSchemaVersion, canonicalJson(event.provenance),
      );
      this.#database.prepare(`
        INSERT INTO commands(thread_id,command_id,command_digest,expected_version,resulting_version,event_id,created_at)
        VALUES (?,?,?,?,?,?,?)
      `).run(event.threadId, event.commandId, event.commandDigest, event.expectedVersion, event.resultingVersion, event.eventId, event.occurredAt);
      const updated = this.#database.prepare(`
        UPDATE threads SET version=?,state_json=?,state_hash=?,last_event_id=?,updated_at=?
        WHERE thread_id=? AND version=?
      `).run(nextThread.version, canonicalJson(nextThread), event.stateHash, event.eventId, event.occurredAt, record.threadId, event.expectedVersion);
      if (Number(updated.changes) !== 1) throw new AutobiographicalMemoryConflictError(`Thread ${record.threadId} changed while recording memory`);

      this.#database.exec("COMMIT");
      return record;
    } catch (error) {
      safeRollback(this.#database);
      if (error instanceof IntegrityError || error instanceof AutobiographicalMemoryConflictError || error instanceof AutobiographicalMemoryNotFoundError) throw error;
      throw translateStorageError(error);
    }
  }
}

export function openAutobiographicalMemoryStore(databasePath) { return new AutobiographicalMemoryStore(databasePath); }
export function openAutobiographicalMemoryInspectionStore(databasePath) { return new AutobiographicalMemoryStore(databasePath, { readOnly: true }); }

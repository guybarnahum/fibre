import {
  IntegrityError,
  canonicalJson,
  threadStateHash,
} from "./persistence-common.mjs";
import {
  AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2,
  autobiographicalMemoryRecordDigest,
  normalizeAutobiographicalMemory,
  rehydrateAutobiographicalMemory,
} from "./autobiographical-memory-domain.mjs";
import { buildAutobiographicalMemoryRecordedEvent } from "./autobiographical-memory-anchor.mjs";
import { ensureMemoryVisualCompanion } from "./identity-schema.mjs";

function parseJson(name, value, ErrorType = IntegrityError) {
  try { return JSON.parse(value); }
  catch (error) { throw new ErrorType(`${name} JSON is invalid: ${error.message}`); }
}

function visibilityRank(value) { return { private: 0, restricted: 1, public: 2 }[value]; }
function evidenceSet(record) { return new Set([...record.supportingEvidenceRefs, ...record.contradictingEvidenceRefs]); }
function formatOf(record) { return record.recordFormat ?? null; }

function isEvidenceSuperset(previous, current) {
  const next = evidenceSet(current);
  return [...evidenceSet(previous)].every((ref) => next.has(ref));
}

function hasNewEvidence(previous, current) {
  const prior = evidenceSet(previous);
  return [...evidenceSet(current)].some((ref) => !prior.has(ref));
}

function subjectiveMemoryStateChanged(previous, current) {
  return previous.accessibility !== current.accessibility || previous.retentionState !== current.retentionState;
}

function referenceResolves(database, threadId, ref) {
  if (database.prepare("SELECT 1 AS present FROM thread_events WHERE thread_id=? AND event_id=?").get(threadId, ref) !== undefined) return true;
  if (database.prepare("SELECT 1 AS present FROM situated_evidence_witnesses WHERE thread_id=? AND reference=?").get(threadId, ref) !== undefined) return true;
  if (database.prepare("SELECT 1 AS present FROM identity_assertion_records WHERE thread_id=? AND assertion_id=?").get(threadId, ref) !== undefined) return true;
  return false;
}

export function assertAutobiographicalMemoryReferences(database, recordCandidate, ErrorType = TypeError) {
  const record = normalizeAutobiographicalMemory(recordCandidate);
  const start = Date.parse(record.subjectPeriod.startAt);
  const end = record.subjectPeriod.endAt === null ? null : Date.parse(record.subjectPeriod.endAt);
  for (const ref of record.eventRefs) {
    const event = database.prepare(
      "SELECT occurred_at FROM thread_events WHERE thread_id=? AND event_id=?",
    ).get(record.threadId, ref);
    if (event === undefined) throw new ErrorType(`memory event reference ${ref} does not resolve to Thread ${record.threadId} history`);
    const occurredAt = Date.parse(event.occurred_at);
    if (occurredAt > Date.parse(record.asOf)) throw new ErrorType(`memory cannot cite future event ${ref} relative to asOf`);
    if (occurredAt < start || (end !== null && occurredAt > end)) {
      throw new ErrorType(`memory subject event ${ref} falls outside subjectPeriod`);
    }
  }
  for (const ref of [...record.supportingEvidenceRefs, ...record.contradictingEvidenceRefs]) {
    if (!referenceResolves(database, record.threadId, ref)) {
      throw new ErrorType(`memory evidence reference ${ref} does not resolve for Thread ${record.threadId}`);
    }
  }
  return record;
}

export function assertAutobiographicalMemoryRevisionCompatibility(
  previousCandidate,
  currentCandidate,
  ErrorType = TypeError,
  { enforceCurrentContentPolicy = true } = {},
) {
  const previous = rehydrateAutobiographicalMemory(previousCandidate);
  const current = normalizeAutobiographicalMemory(currentCandidate, {
    enforceContentPolicy: enforceCurrentContentPolicy,
  });
  if (current.threadId !== previous.threadId || current.memoryId !== previous.memoryId) {
    throw new ErrorType("memory revision cannot change memory or Thread identity");
  }
  if (current.revision !== previous.revision + 1 || current.supersedesRevision !== previous.revision) {
    throw new ErrorType("memory must supersede its immediate predecessor");
  }
  if (canonicalJson(current.subject) !== canonicalJson(previous.subject)) {
    throw new ErrorType("memory revision cannot change its immutable subject");
  }
  if (!previous.eventRefs.every((ref) => current.eventRefs.includes(ref))) {
    throw new ErrorType("memory revision cannot erase or replace subject-history references");
  }
  if (!isEvidenceSuperset(previous, current)) {
    throw new ErrorType("memory revision cannot erase previously cited epistemic evidence");
  }
  if (subjectiveMemoryStateChanged(previous, current) && !hasNewEvidence(previous, current)) {
    throw new ErrorType("memory accessibility/retention changes require new resolved evidence");
  }
  if (visibilityRank(current.visibility) > visibilityRank(previous.visibility)) {
    throw new ErrorType("memory visibility cannot widen without a future disclosure-authority path");
  }
  if (formatOf(current) !== formatOf(previous)) {
    throw new ErrorType("memory lineage cannot change record format");
  }

  if (current.recordFormat === AUTOBIOGRAPHICAL_MEMORY_FORMAT_V2) {
    if (current.rememberedContent !== previous.rememberedContent) {
      throw new ErrorType("v2 meaning revision cannot rewrite rememberedContent");
    }
    if (canonicalJson(current.uncertainty) !== canonicalJson(previous.uncertainty)) {
      throw new ErrorType("v2 meaning revision cannot rewrite Pass-B uncertainty");
    }
    if (canonicalJson(current.subjectPeriod) !== canonicalJson(previous.subjectPeriod)) {
      throw new ErrorType("v2 meaning revision cannot rewrite subjectPeriod");
    }
    if (canonicalJson(current.eventRefs) !== canonicalJson(previous.eventRefs)) {
      throw new ErrorType("v2 meaning revision cannot redefine the memory event set");
    }
  }
  return current;
}

function currentThreadFromDatabase(database, threadId, ErrorType) {
  const row = database.prepare(`
    SELECT thread_id,version,state_json,state_hash,last_event_id,created_at,updated_at
    FROM threads WHERE thread_id=?
  `).get(threadId);
  if (row === undefined) throw new ErrorType(`Thread ${threadId} was not found`);
  const thread = parseJson(`Thread ${threadId}`, row.state_json, ErrorType);
  if (
    Number(row.version) !== thread.version ||
    row.last_event_id !== thread.provenance.lastEventId ||
    row.state_hash !== threadStateHash(thread) ||
    row.state_json !== canonicalJson(thread)
  ) {
    throw new IntegrityError(`Thread ${threadId} projection columns disagree before memory append`);
  }
  return { row, thread };
}

export function appendAutobiographicalMemoryRevisionInTransaction(
  database,
  candidate,
  {
    previousRecord = null,
    previousDigest = null,
    ConflictErrorType = TypeError,
    createdFrom = "persisted_autobiographical_memory",
  } = {},
) {
  const record = assertAutobiographicalMemoryReferences(database, candidate, ConflictErrorType);
  if (record.revision === 1) {
    if (previousRecord !== null || previousDigest !== null) {
      throw new ConflictErrorType("memory revision 1 cannot have a predecessor");
    }
  } else {
    if (previousRecord === null || previousDigest === null) {
      throw new ConflictErrorType("memory revision requires its immediate predecessor and digest");
    }
    assertAutobiographicalMemoryRevisionCompatibility(previousRecord, record, ConflictErrorType);
  }

  const existing = database.prepare(
    "SELECT COUNT(*) AS count FROM autobiographical_memory_records WHERE memory_id=?",
  ).get(record.memoryId);
  if (Number(existing.count) !== record.revision - 1) {
    throw new ConflictErrorType(`memory ${record.memoryId} expected revision ${Number(existing.count) + 1}`);
  }

  const { row: threadRow, thread } = currentThreadFromDatabase(database, record.threadId, ConflictErrorType);
  if (Date.parse(record.recordedAt) < Date.parse(threadRow.created_at)) {
    throw new ConflictErrorType("memory cannot be recorded before Thread creation");
  }
  if (Date.parse(record.recordedAt) < Date.parse(threadRow.updated_at)) {
    throw new ConflictErrorType("memory cannot be recorded before the Thread's latest historical event");
  }

  const digest = autobiographicalMemoryRecordDigest(record, previousDigest);
  const sequence = Number(database.prepare(
    "SELECT COALESCE(MAX(sequence),0)+1 AS next_sequence FROM thread_events WHERE thread_id=?",
  ).get(record.threadId).next_sequence);
  const { nextThread, event } = buildAutobiographicalMemoryRecordedEvent(thread, {
    memoryId: record.memoryId,
    revision: record.revision,
    memoryDigest: digest,
    recordedAt: record.recordedAt,
    sequence,
  });

  database.prepare(`
    INSERT INTO autobiographical_memory_records(
      memory_id,revision,thread_id,status,visibility,as_of,recorded_at,
      supersedes_revision,record_json,record_digest
    ) VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    record.memoryId,
    record.revision,
    record.threadId,
    record.status,
    record.visibility,
    record.asOf,
    record.recordedAt,
    record.supersedesRevision ?? null,
    canonicalJson(record),
    digest,
  );
  database.prepare(`
    INSERT INTO autobiographical_memory_lineage_heads(memory_id,revision,thread_id,head_digest,recorded_at)
    VALUES (?,?,?,?,?)
  `).run(record.memoryId, record.revision, record.threadId, digest, record.recordedAt);
  database.prepare(`
    INSERT INTO thread_events(
      event_id,thread_id,sequence,expected_version,resulting_version,event_type,
      command_id,command_digest,payload_json,actor_json,occurred_at,state_hash,
      authorization_id,causation_id,correlation_id,payload_schema_version,provenance_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    event.eventId,
    event.threadId,
    event.sequence,
    event.expectedVersion,
    event.resultingVersion,
    event.eventType,
    event.commandId,
    event.commandDigest,
    canonicalJson(event.payload),
    canonicalJson(event.actor),
    event.occurredAt,
    event.stateHash,
    event.authorizationId,
    event.causationId,
    event.correlationId,
    event.payloadSchemaVersion,
    canonicalJson(event.provenance),
  );
  database.prepare(`
    INSERT INTO commands(thread_id,command_id,command_digest,expected_version,resulting_version,event_id,created_at)
    VALUES (?,?,?,?,?,?,?)
  `).run(
    event.threadId,
    event.commandId,
    event.commandDigest,
    event.expectedVersion,
    event.resultingVersion,
    event.eventId,
    event.occurredAt,
  );
  const updated = database.prepare(`
    UPDATE threads SET version=?,state_json=?,state_hash=?,last_event_id=?,updated_at=?
    WHERE thread_id=? AND version=?
  `).run(
    nextThread.version,
    canonicalJson(nextThread),
    event.stateHash,
    event.eventId,
    record.recordedAt,
    record.threadId,
    event.expectedVersion,
  );
  if (Number(updated.changes) !== 1) {
    throw new ConflictErrorType(`Thread ${record.threadId} changed while recording memory`);
  }

  if (record.revision === 1) {
    ensureMemoryVisualCompanion(database, {
      threadId: record.threadId,
      memoryRef: record.memoryId,
      recordedAt: record.recordedAt,
      eventId: record.subject.originEventRef,
      evidenceRefs: record.eventRefs.filter((reference) => reference !== record.subject.originEventRef),
      memorySummary: record.rememberedMeaning ?? record.rememberedContent,
      createdFrom,
    });
  }

  return {
    record,
    recordDigest: digest,
    thread: nextThread,
    event,
  };
}

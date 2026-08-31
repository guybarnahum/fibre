import { randomBytes } from "node:crypto";

import {
  WORLD_STORE_SCHEMA_VERSION,
  IdempotencyConflictError,
  IntegrityError,
  PrivateRequestConflictError,
  PrivateRequestNotFoundError,
  PrivateStanceConflictError,
  StaleAppraisalError,
  StaleThreadVersionError,
  ThreadAlreadyExistsError,
  ThreadNotFoundError,
  UNCOMMANDED_EVENT_TYPES,
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
  canonicalJson,
  threadStateHash,
} from "./persistence-common.mjs";
import {
  applyCommandToThread,
  applyEventToThread,
  assertCommandLifecycle,
  commandDigest,
  eventIdForCommand,
  normalizeSeedSnapshot,
  parseJson,
  rowToEvent,
  validateCommand,
  validateStoredThread,
  validateThreadSnapshot,
} from "./persistence-domain.mjs";
import {
  appraisalDigest,
  assertCapsuleMatchesThread,
  assertStanceMatchesTrace,
  assertStoredDigest,
  requestFingerprint,
  requestRecordDigest,
  stanceDigest,
  validateActivationRequest,
} from "./private-participation.mjs";
import {
  migrateDatabase,
  translateStorageError,
} from "./persistence-sqlite.mjs";
import {
  ensureMemoryVisualCompanion,
  persistLegacySeedIdentity,
} from "./identity-schema.mjs";
import { openWorldStateDatabase } from "./world-state-storage.mjs";

export {
  WORLD_STORE_SCHEMA_VERSION,
  MAX_COMMAND_PAYLOAD_BYTES,
  ThreadNotFoundError,
  ThreadAlreadyExistsError,
  StaleThreadVersionError,
  IdempotencyConflictError,
  LifecycleCommandError,
  IntegrityError,
  StorageBusyError,
  PrivateRequestNotFoundError,
  PrivateRequestConflictError,
  PrivateStanceConflictError,
  StaleAppraisalError,
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";

const APPRAISAL_ID_PATTERN = /^app_[0-9a-f]{64}$/;
const STANCE_ID_PATTERN = /^pst_[0-9a-f]{64}$/;

function newPrivateRecordId(prefix) {
  return `${prefix}_${randomBytes(32).toString("hex")}`;
}

export class WorldStore {
  #database;

  constructor(storage) {
    this.#database = openWorldStateDatabase(storage, { storeName: "WorldStore" });
    try {
      migrateDatabase(this.#database);
    } catch (error) {
      this.#database.close();
      throw error;
    }
  }

  storageMetadata() {
    const version = Number(this.#database.prepare("PRAGMA user_version").get().user_version);
    const busyTimeout = Number(this.#database.prepare("PRAGMA busy_timeout").get().timeout);
    return { schemaVersion: version, busyTimeoutMs: busyTimeout };
  }

  close() {
    this.#database.close();
  }

  seedThread(thread, { occurredAt = thread?.provenance?.createdAt } = {}) {
    validateThreadSnapshot(thread);
    assertIsoTimestamp("occurredAt", occurredAt);
    const normalized = normalizeSeedSnapshot(thread);
    const existing = this.getThread(normalized.threadId, { required: false });
    if (existing !== null) {
      if (threadStateHash(existing) === threadStateHash(normalized)) {
        return { thread: existing, created: false };
      }
      throw new ThreadAlreadyExistsError(
        `Thread ${normalized.threadId} already exists with different state`,
      );
    }

    const eventId = normalized.provenance.lastEventId;
    const stateJson = canonicalJson(normalized);
    const stateHash = threadStateHash(normalized);
    const payloadJson = canonicalJson({ snapshot: normalized });
    const actor = {
      entityId: normalized.provenance.createdBy,
      kind: "other",
      displayName: normalized.provenance.createdBy,
    };
    const actorJson = canonicalJson(actor);
    const provenanceJson = canonicalJson({ source: "seedThread", adapter: "sqlite-v2" });

    try {
      this.#database.transaction(() => {
        this.#database
          .prepare(`
            INSERT INTO threads (
              thread_id, version, status, state_json, state_hash,
              last_event_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            normalized.threadId,
            normalized.version,
            normalized.status,
            stateJson,
            stateHash,
            eventId,
            normalized.provenance.createdAt,
            occurredAt,
          );
        this.#database
          .prepare(`
            INSERT INTO thread_events (
              event_id, thread_id, sequence, expected_version, resulting_version,
              event_type, command_id, command_digest, payload_json, actor_json,
              occurred_at, state_hash, authorization_id, causation_id, correlation_id,
              payload_schema_version, provenance_json
            ) VALUES (?, ?, 1, 0, ?, 'THREAD_SEEDED', NULL, NULL, ?, ?, ?, ?, NULL, ?, ?, 1, ?)
          `)
          .run(
            eventId,
            normalized.threadId,
            normalized.version,
            payloadJson,
            actorJson,
            occurredAt,
            stateHash,
            eventId,
            eventId,
            provenanceJson,
          );
        persistLegacySeedIdentity(this.#database, normalized, { sourceEventId: eventId });
        for (const memoryRef of normalized.memoryRefs) {
          ensureMemoryVisualCompanion(this.#database, {
            threadId: normalized.threadId,
            memoryRef,
            recordedAt: normalized.provenance.createdAt,
            createdFrom: "legacy_memory_reference",
          });
        }
      });
    } catch (error) {
      throw translateStorageError(error);
    }
    return { thread: structuredClone(normalized), created: true };
  }

  #projectionRow(threadId, required) {
    const row = this.#database
      .prepare(`
        SELECT thread_id, version, status, state_json, state_hash, last_event_id
        FROM threads WHERE thread_id = ?
      `)
      .get(threadId);
    if (row === undefined) {
      if (!required) return null;
      throw new ThreadNotFoundError(`Thread ${threadId} was not found`);
    }
    return row;
  }

  getThread(threadId, { required = true } = {}) {
    assertId("threadId", threadId);
    const row = this.#projectionRow(threadId, required);
    if (row === null) return null;
    const thread = parseJson(`Thread ${threadId} state`, row.state_json);
    validateStoredThread(threadId, thread);
    if (thread.threadId !== threadId || row.thread_id !== threadId) {
      throw new IntegrityError(
        `Thread ${threadId} projection contains identity ${thread.threadId}`,
      );
    }
    const actualHash = threadStateHash(thread);
    if (actualHash !== row.state_hash) {
      throw new IntegrityError(`Thread ${threadId} projection hash does not match state`);
    }
    if (
      thread.version !== Number(row.version) ||
      thread.status !== row.status ||
      thread.provenance.lastEventId !== row.last_event_id
    ) {
      throw new IntegrityError(`Thread ${threadId} projection columns do not match state`);
    }
    const witness = this.#database
      .prepare(`
        SELECT thread_id, resulting_version, state_hash
        FROM thread_events WHERE event_id = ?
      `)
      .get(row.last_event_id);
    if (
      witness === undefined ||
      witness.thread_id !== threadId ||
      Number(witness.resulting_version) !== thread.version ||
      witness.state_hash !== row.state_hash
    ) {
      throw new IntegrityError(`Thread ${threadId} projection does not match its last event`);
    }
    return thread;
  }

  listEvents(threadId) {
    assertId("threadId", threadId);
    return this.#database
      .prepare(`
        SELECT event_id, thread_id, sequence, expected_version, resulting_version,
               event_type, command_id, command_digest, payload_json, actor_json,
               occurred_at, state_hash, authorization_id, causation_id, correlation_id,
               payload_schema_version, provenance_json
        FROM thread_events WHERE thread_id = ? ORDER BY sequence ASC
      `)
      .all(threadId)
      .map(rowToEvent);
  }

  #commandRecord(threadId, commandId) {
    return this.#database
      .prepare(`
        SELECT command_digest, expected_version, resulting_version, event_id, created_at
        FROM commands WHERE thread_id = ? AND command_id = ?
      `)
      .get(threadId, commandId);
  }

  #assertCommandWitness(event) {
    if (UNCOMMANDED_EVENT_TYPES.has(event.eventType)) return;
    const record = this.#commandRecord(event.threadId, event.commandId);
    if (record === undefined) {
      throw new IntegrityError(`event ${event.eventId} has no accepted command witness`);
    }
    if (
      record.command_digest !== event.commandDigest ||
      Number(record.expected_version) !== event.expectedVersion ||
      Number(record.resulting_version) !== event.resultingVersion ||
      record.event_id !== event.eventId ||
      record.created_at !== event.occurredAt
    ) {
      throw new IntegrityError(`event ${event.eventId} disagrees with its command witness`);
    }
  }

  #replayThrough(threadId, stopEventId = null) {
    const events = this.listEvents(threadId);
    if (events.length === 0) {
      throw new ThreadNotFoundError(`Thread ${threadId} has no event history`);
    }
    let replayed = null;
    for (const [index, event] of events.entries()) {
      if (event.sequence !== index + 1) {
        throw new IntegrityError(`Thread ${threadId} event sequence has a gap`);
      }
      this.#assertCommandWitness(event);
      replayed = applyEventToThread(replayed, event);
      const hash = threadStateHash(replayed);
      if (hash !== event.stateHash) {
        throw new IntegrityError(`Event ${event.eventId} state hash failed replay`);
      }
      if (stopEventId !== null && event.eventId === stopEventId) {
        return { thread: replayed, event };
      }
    }
    if (stopEventId !== null) {
      throw new IntegrityError(`Command event ${stopEventId} is absent from Thread ${threadId}`);
    }
    return { thread: replayed, event: events.at(-1) };
  }

  #threadAtVersion(threadId, version) {
    const event = this.listEvents(threadId).find((candidate) => candidate.resultingVersion === version);
    if (event === undefined) {
      throw new IntegrityError(`Thread ${threadId} has no event for snapshot version ${version}`);
    }
    return this.#replayThrough(threadId, event.eventId).thread;
  }

  #idempotentResult(command, digest, prior) {
    if (prior.command_digest !== digest) {
      throw new IdempotencyConflictError(
        `Command ${command.commandId} was already used with different content`,
      );
    }
    const replayed = this.#replayThrough(command.threadId, prior.event_id);
    if (
      replayed.event.commandId !== command.commandId ||
      replayed.event.commandDigest !== digest ||
      replayed.event.expectedVersion !== Number(prior.expected_version) ||
      replayed.event.resultingVersion !== Number(prior.resulting_version) ||
      replayed.thread.version !== Number(prior.resulting_version)
    ) {
      throw new IntegrityError(`Command ${command.commandId} cached metadata failed replay`);
    }
    return {
      thread: replayed.thread,
      event: replayed.event,
      idempotent: true,
    };
  }

  applyCommand(command) {
    validateCommand(command);
    const digest = commandDigest(command);

    const priorRead = this.#commandRecord(command.threadId, command.commandId);
    if (priorRead !== undefined) return this.#idempotentResult(command, digest, priorRead);

    try {
      const transactionResult = this.#database.transaction(() => {
        const prior = this.#commandRecord(command.threadId, command.commandId);
        if (prior !== undefined) {

          return this.#idempotentResult(command, digest, prior);
        }

        const thread = this.getThread(command.threadId);
        if (thread.version !== command.expectedVersion) {
          throw new StaleThreadVersionError(
            `Thread ${command.threadId} is version ${thread.version}; command expected ${command.expectedVersion}`,
          );
        }
        assertCommandLifecycle(thread, command);

        const lastSequenceRow = this.#database
          .prepare(
            "SELECT COALESCE(MAX(sequence), 0) AS last_sequence FROM thread_events WHERE thread_id = ?",
          )
          .get(command.threadId);
        const sequence = Number(lastSequenceRow.last_sequence) + 1;
        const eventId = eventIdForCommand(command, digest);
        const nextThread = applyCommandToThread(thread, command, eventId);
        validateThreadSnapshot(nextThread);
        const stateJson = canonicalJson(nextThread);
        const stateHash = threadStateHash(nextThread);
        const eventType = "SELF_MODEL_UPDATED";
        const payloadJson = canonicalJson(command.payload);
        const actorJson = canonicalJson(command.actor);
        const provenanceJson = canonicalJson({ source: "applyCommand", adapter: "sqlite-v2" });

        this.#database
          .prepare(`
            INSERT INTO thread_events (
              event_id, thread_id, sequence, expected_version, resulting_version,
              event_type, command_id, command_digest, payload_json, actor_json,
              occurred_at, state_hash, authorization_id, causation_id, correlation_id,
              payload_schema_version, provenance_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 1, ?)
          `)
          .run(
            eventId,
            command.threadId,
            sequence,
            command.expectedVersion,
            nextThread.version,
            eventType,
            command.commandId,
            digest,
            payloadJson,
            actorJson,
            command.occurredAt,
            stateHash,
            command.commandId,
            command.commandId,
            provenanceJson,
          );

        const update = this.#database
          .prepare(`
            UPDATE threads
            SET version = ?, status = ?, state_json = ?, state_hash = ?,
                last_event_id = ?, updated_at = ?
            WHERE thread_id = ? AND version = ?
          `)
          .run(
            nextThread.version,
            nextThread.status,
            stateJson,
            stateHash,
            eventId,
            command.occurredAt,
            command.threadId,
            command.expectedVersion,
          );
        if (Number(update.changes) !== 1) {
          throw new StaleThreadVersionError(
            `Thread ${command.threadId} changed while applying command`,
          );
        }

        this.#database
          .prepare(`
            INSERT INTO commands (
              thread_id, command_id, command_digest, expected_version,
              resulting_version, event_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            command.threadId,
            command.commandId,
            digest,
            command.expectedVersion,
            nextThread.version,
            eventId,
            command.occurredAt,
          );

        return {
          thread: nextThread,
          event: this.listEvents(command.threadId).at(-1),
          idempotent: false,
        };
      });
      return transactionResult;
    } catch (error) {
      throw translateStorageError(error);
    }
  }

  #privateRequestRow(threadId, requestId) {
    return this.#database
      .prepare(`
        SELECT
          r.thread_id, r.request_id, r.snapshot_version, r.thread_state_hash,
          r.request_fingerprint, r.request_json, r.record_digest,
          r.occurred_at AS request_occurred_at,
          r.causation_id AS request_causation_id,
          r.correlation_id AS request_correlation_id,
          a.appraisal_id, a.policy_id, a.policy_version,
          a.capsule_json, a.capsule_digest,
          a.occurred_at AS appraisal_occurred_at,
          a.causation_id AS appraisal_causation_id,
          a.correlation_id AS appraisal_correlation_id,
          s.stance_id, s.thread_state_hash AS stance_thread_state_hash,
          s.stance_json, s.stance_digest,
          s.recorded_at AS stance_recorded_at,
          s.causation_id AS stance_causation_id,
          s.correlation_id AS stance_correlation_id
        FROM activation_requests r
        JOIN request_appraisals a
          ON a.thread_id = r.thread_id AND a.request_id = r.request_id
        LEFT JOIN private_participation_stances s
          ON s.appraisal_id = a.appraisal_id
        WHERE r.thread_id = ? AND r.request_id = ?
      `)
      .get(threadId, requestId);
  }

  #privateTraceFromRow(row) {
    if (row === undefined) return null;
    try {
      const request = parseJson(`request ${row.request_id}`, row.request_json);
      const appraisal = parseJson(`appraisal ${row.appraisal_id}`, row.capsule_json);
      validateActivationRequest(request);
      assertId("stored request threadId", row.thread_id);
      assertId("stored request requestId", row.request_id);
      if (!APPRAISAL_ID_PATTERN.test(row.appraisal_id)) {
        throw new IntegrityError("stored appraisal appraisalId is invalid");
      }
      assertIsoTimestamp("stored request occurredAt", row.request_occurred_at);
      assertIsoTimestamp("stored appraisal occurredAt", row.appraisal_occurred_at);
      assertId("stored request causationId", row.request_causation_id);
      assertId("stored request correlationId", row.request_correlation_id);
      assertId("stored appraisal causationId", row.appraisal_causation_id);
      assertId("stored appraisal correlationId", row.appraisal_correlation_id);
      assertStoredDigest("stored request threadStateHash", row.thread_state_hash);
      assertStoredDigest("stored request fingerprint", row.request_fingerprint);
      assertStoredDigest("stored request recordDigest", row.record_digest);
      assertStoredDigest("stored appraisal digest", row.capsule_digest);

      const snapshotVersion = Number(row.snapshot_version);
      if (!Number.isSafeInteger(snapshotVersion) || snapshotVersion < 1) {
        throw new IntegrityError("stored private request snapshot version is invalid");
      }
      const snapshot = this.#threadAtVersion(row.thread_id, snapshotVersion);
      if (threadStateHash(snapshot) !== row.thread_state_hash) {
        throw new IntegrityError(`private request ${row.request_id} Thread witness failed`);
      }
      if (request.requestId !== row.request_id || requestFingerprint(request) !== row.request_fingerprint) {
        throw new IntegrityError(`private request ${row.request_id} fingerprint failed`);
      }
      const expectedRequestDigest = requestRecordDigest({
        threadId: row.thread_id,
        snapshotVersion,
        threadStateHash: row.thread_state_hash,
        request,
        requestFingerprint: row.request_fingerprint,
        occurredAt: row.request_occurred_at,
        causationId: row.request_causation_id,
        correlationId: row.request_correlation_id,
      });
      if (expectedRequestDigest !== row.record_digest) {
        throw new IntegrityError(`private request ${row.request_id} record digest failed`);
      }
      assertCapsuleMatchesThread(snapshot, request, appraisal);
      if (
        appraisalDigest(appraisal) !== row.capsule_digest ||
        appraisal.appraisalPolicy.id !== row.policy_id ||
        appraisal.appraisalPolicy.version !== row.policy_version ||
        row.appraisal_occurred_at !== row.request_occurred_at ||
        row.appraisal_causation_id !== row.request_causation_id ||
        row.appraisal_correlation_id !== row.request_correlation_id
      ) {
        throw new IntegrityError(`private request ${row.request_id} appraisal witness failed`);
      }

      const trace = {
        threadId: row.thread_id,
        requestId: row.request_id,
        snapshotVersion,
        threadStateHash: row.thread_state_hash,
        requestFingerprint: row.request_fingerprint,
        request,
        requestRecordDigest: row.record_digest,
        occurredAt: row.request_occurred_at,
        causationId: row.request_causation_id,
        correlationId: row.request_correlation_id,
        appraisalId: row.appraisal_id,
        appraisal,
        appraisalDigest: row.capsule_digest,
        privateStanceId: null,
        privateStanceThreadStateHash: null,
        privateStance: null,
        privateStanceDigest: null,
        privateStanceRecordedAt: null,
        privateStanceCausationId: null,
        privateStanceCorrelationId: null,
      };

      if (row.stance_id !== null) {
        const stance = parseJson(`private stance ${row.stance_id}`, row.stance_json);
        if (!STANCE_ID_PATTERN.test(row.stance_id)) {
          throw new IntegrityError("stored private stance stanceId is invalid");
        }
        assertIsoTimestamp("stored private stance recordedAt", row.stance_recorded_at);
        assertId("stored private stance causationId", row.stance_causation_id);
        assertId("stored private stance correlationId", row.stance_correlation_id);
        assertStoredDigest("stored private stance threadStateHash", row.stance_thread_state_hash);
        assertStoredDigest("stored private stance digest", row.stance_digest);
        if (row.stance_thread_state_hash !== row.thread_state_hash) {
          throw new IntegrityError(`private stance ${row.stance_id} Thread witness failed`);
        }
        assertStanceMatchesTrace(trace, stance);
        if (stanceDigest(stance) !== row.stance_digest) {
          throw new IntegrityError(`private stance ${row.stance_id} digest failed`);
        }
        trace.privateStanceId = row.stance_id;
        trace.privateStanceThreadStateHash = row.stance_thread_state_hash;
        trace.privateStance = stance;
        trace.privateStanceDigest = row.stance_digest;
        trace.privateStanceRecordedAt = row.stance_recorded_at;
        trace.privateStanceCausationId = row.stance_causation_id;
        trace.privateStanceCorrelationId = row.stance_correlation_id;
      }
      return trace;
    } catch (error) {
      if (error instanceof IntegrityError) throw error;
      throw new IntegrityError(
        `Stored private request ${row.request_id ?? "<unknown>"} is invalid: ${error.message}`,
      );
    }
  }

  getPrivateRequestTrace(threadId, requestId, { required = true } = {}) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    const trace = this.#privateTraceFromRow(this.#privateRequestRow(threadId, requestId));
    if (trace === null && required) {
      throw new PrivateRequestNotFoundError(
        `Private request ${requestId} was not found for Thread ${threadId}`,
      );
    }
    return trace;
  }

  listPrivateRequestTraces(threadId) {
    assertId("threadId", threadId);
    const rows = this.#database
      .prepare("SELECT request_id FROM activation_requests WHERE thread_id = ? ORDER BY occurred_at, request_id")
      .all(threadId);
    if (rows.length === 0) {
      const events = this.listEvents(threadId);
      if (events.length === 0) throw new ThreadNotFoundError(`Thread ${threadId} was not found`);
      return [];
    }
    return rows.map((row) => this.getPrivateRequestTrace(threadId, row.request_id));
  }

  recordRequestAppraisal(record) {
    assertPlainObject("private request record", record);
    assertExactKeys("private request record", record, [
      "threadId", "request", "appraisal", "occurredAt", "causationId", "correlationId",
    ]);
    assertId("private request threadId", record.threadId);
    validateActivationRequest(record.request);
    assertIsoTimestamp("private request occurredAt", record.occurredAt);
    assertId("private request causationId", record.causationId);
    assertId("private request correlationId", record.correlationId);
    if (record.request.requestId !== record.appraisal.requestId) {
      throw new TypeError("request and appraisal request IDs differ");
    }

    const existing = this.getPrivateRequestTrace(
      record.threadId,
      record.request.requestId,
      { required: false },
    );
    if (existing !== null) {
      const candidateRequestDigest = requestRecordDigest({
        threadId: record.threadId,
        snapshotVersion: record.appraisal.snapshotVersion,
        threadStateHash: existing.threadStateHash,
        request: record.request,
        requestFingerprint: requestFingerprint(record.request),
        occurredAt: record.occurredAt,
        causationId: record.causationId,
        correlationId: record.correlationId,
      });
      if (
        candidateRequestDigest === existing.requestRecordDigest &&
        appraisalDigest(record.appraisal) === existing.appraisalDigest
      ) {
        return { trace: existing, idempotent: true };
      }
      throw new PrivateRequestConflictError(
        `Private request ${record.request.requestId} already exists with different content`,
      );
    }

    try {
      const transactionResult = this.#database.transaction(() => {
        const raced = this.#privateRequestRow(record.threadId, record.request.requestId);
        if (raced !== undefined) {

          // The recursive call is bounded: the next entry observes the committed row
          // and returns an idempotent result or a conflict.
          return this.recordRequestAppraisal(record);
        }
        const thread = this.getThread(record.threadId);
        if (thread.version !== record.appraisal.snapshotVersion) {
          throw new StaleAppraisalError(
            `Thread ${record.threadId} is version ${thread.version}; appraisal used ${record.appraisal.snapshotVersion}`,
          );
        }
        assertCapsuleMatchesThread(thread, record.request, record.appraisal);
        const fingerprint = requestFingerprint(record.request);
        const stateHash = threadStateHash(thread);
        const requestDigestValue = requestRecordDigest({
          threadId: record.threadId,
          snapshotVersion: thread.version,
          threadStateHash: stateHash,
          request: record.request,
          requestFingerprint: fingerprint,
          occurredAt: record.occurredAt,
          causationId: record.causationId,
          correlationId: record.correlationId,
        });
        const appraisalIdValue = newPrivateRecordId("app");
        const appraisalDigestValue = appraisalDigest(record.appraisal);

        this.#database.prepare(`
          INSERT INTO activation_requests (
            thread_id, request_id, snapshot_version, thread_state_hash,
            request_fingerprint, request_json, record_digest, occurred_at,
            causation_id, correlation_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          record.threadId,
          record.request.requestId,
          thread.version,
          stateHash,
          fingerprint,
          canonicalJson(record.request),
          requestDigestValue,
          record.occurredAt,
          record.causationId,
          record.correlationId,
        );
        this.#database.prepare(`
          INSERT INTO request_appraisals (
            appraisal_id, thread_id, request_id, snapshot_version, thread_state_hash,
            request_fingerprint, policy_id, policy_version, capsule_json,
            capsule_digest, occurred_at, causation_id, correlation_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          appraisalIdValue,
          record.threadId,
          record.request.requestId,
          thread.version,
          stateHash,
          fingerprint,
          record.appraisal.appraisalPolicy.id,
          record.appraisal.appraisalPolicy.version,
          canonicalJson(record.appraisal),
          appraisalDigestValue,
          record.occurredAt,
          record.causationId,
          record.correlationId,
        );
      });
      if (transactionResult !== undefined) return transactionResult;
    } catch (error) {
      throw translateStorageError(error);
    }
    return {
      trace: this.getPrivateRequestTrace(record.threadId, record.request.requestId),
      idempotent: false,
    };
  }

  recordPrivateStance(record) {
    assertPlainObject("private stance record", record);
    assertExactKeys("private stance record", record, [
      "threadId", "requestId", "stance", "recordedAt", "causationId", "correlationId",
    ]);
    assertId("private stance threadId", record.threadId);
    assertId("private stance requestId", record.requestId);
    assertIsoTimestamp("private stance recordedAt", record.recordedAt);
    assertId("private stance causationId", record.causationId);
    assertId("private stance correlationId", record.correlationId);

    let trace = this.getPrivateRequestTrace(record.threadId, record.requestId);
    assertStanceMatchesTrace(trace, record.stance);
    const stanceDigestValue = stanceDigest(record.stance);
    if (trace.privateStance !== null) {
      if (
        trace.privateStanceDigest === stanceDigestValue &&
        trace.privateStanceRecordedAt === record.recordedAt &&
        trace.privateStanceCausationId === record.causationId &&
        trace.privateStanceCorrelationId === record.correlationId
      ) {
        return { trace, idempotent: true };
      }
      throw new PrivateStanceConflictError(
        `Private stance for request ${record.requestId} was already recorded with different content`,
      );
    }

    try {
      const transactionResult = this.#database.transaction(() => {
        trace = this.getPrivateRequestTrace(record.threadId, record.requestId);
        if (trace.privateStance !== null) {

          // The recursive call is bounded: the next entry observes the committed
          // stance and returns an idempotent result or a conflict.
          return this.recordPrivateStance(record);
        }
        assertStanceMatchesTrace(trace, record.stance);
        const stanceIdValue = newPrivateRecordId("pst");
        this.#database.prepare(`
          INSERT INTO private_participation_stances (
            stance_id, appraisal_id, thread_id, request_id, snapshot_version,
            thread_state_hash, request_fingerprint, policy_id, policy_version,
            stance_json, stance_digest, recorded_at, causation_id, correlation_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          stanceIdValue,
          trace.appraisalId,
          record.threadId,
          record.requestId,
          trace.snapshotVersion,
          trace.threadStateHash,
          trace.requestFingerprint,
          record.stance.policy.id,
          record.stance.policy.version,
          canonicalJson(record.stance),
          stanceDigestValue,
          record.recordedAt,
          record.causationId,
          record.correlationId,
        );
      });
      if (transactionResult !== undefined) return transactionResult;
    } catch (error) {
      throw translateStorageError(error);
    }
    return {
      trace: this.getPrivateRequestTrace(record.threadId, record.requestId),
      idempotent: false,
    };
  }

  verifyPrivateRequestTrace(threadId, requestId) {
    const trace = this.getPrivateRequestTrace(threadId, requestId);
    return {
      threadId: trace.threadId,
      requestId: trace.requestId,
      snapshotVersion: trace.snapshotVersion,
      threadStateHash: trace.threadStateHash,
      requestFingerprint: trace.requestFingerprint,
      requestRecordDigest: trace.requestRecordDigest,
      appraisalId: trace.appraisalId,
      appraisalDigest: trace.appraisalDigest,
      privateStanceId: trace.privateStanceId,
      privateStanceThreadStateHash: trace.privateStanceThreadStateHash,
      privateStanceDigest: trace.privateStanceDigest,
      hasPrivateStance: trace.privateStance !== null,
    };
  }

  replayThread(threadId) {
    assertId("threadId", threadId);
    const replayed = this.#replayThrough(threadId).thread;
    if (replayed.threadId !== threadId) {
      throw new IntegrityError(
        `Thread ${threadId} replay reconstructed identity ${replayed.threadId}`,
      );
    }
    return replayed;
  }

  verifyThreadIntegrity(threadId) {
    const projected = this.getThread(threadId);
    const replayed = this.replayThread(threadId);
    if (projected.threadId !== threadId || replayed.threadId !== threadId) {
      throw new IntegrityError(`Thread ${threadId} identity changed during verification`);
    }
    const projectedHash = threadStateHash(projected);
    const replayedHash = threadStateHash(replayed);
    if (canonicalJson(projected) !== canonicalJson(replayed)) {
      throw new IntegrityError(`Thread ${threadId} projection differs from replay`);
    }
    if (projectedHash !== replayedHash) {
      throw new IntegrityError(`Thread ${threadId} replay hash differs from projection`);
    }
    return {
      threadId: projected.threadId,
      version: projected.version,
      stateHash: projectedHash,
      eventCount: this.listEvents(threadId).length,
    };
  }

  repairThreadProjection(threadId) {
    assertId("threadId", threadId);
    const replayed = this.replayThread(threadId);
    const events = this.listEvents(threadId);
    const lastEvent = events.at(-1);
    const stateJson = canonicalJson(replayed);
    const stateHash = threadStateHash(replayed);
    try {
      this.#database.transaction(() => {
        const result = this.#database
          .prepare(`
            UPDATE threads
            SET version = ?, status = ?, state_json = ?, state_hash = ?,
                last_event_id = ?, updated_at = ?
            WHERE thread_id = ?
          `)
          .run(
            replayed.version,
            replayed.status,
            stateJson,
            stateHash,
            lastEvent.eventId,
            lastEvent.occurredAt,
            threadId,
          );
        if (Number(result.changes) !== 1) {
          throw new ThreadNotFoundError(`Thread ${threadId} was not found`);
        }
      });
    } catch (error) {
      throw translateStorageError(error);
    }
    return {
      thread: replayed,
      stateHash,
      eventCount: events.length,
      repaired: true,
    };
  }
}

export function openWorldStore(storage) {
  return new WorldStore(storage);
}

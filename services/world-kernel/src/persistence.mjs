import { DatabaseSync } from "node:sqlite";

import {
  WORLD_STORE_SCHEMA_VERSION,
  IdempotencyConflictError,
  IntegrityError,
  StaleThreadVersionError,
  ThreadAlreadyExistsError,
  ThreadNotFoundError,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
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
  migrateDatabase,
  normalizeDatabasePath,
  safeRollback,
  translateStorageError,
} from "./persistence-sqlite.mjs";

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
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";
export { normalizeDatabasePath } from "./persistence-sqlite.mjs";

export class WorldStore {
  #database;

  constructor(databasePath) {
    assertNonEmpty("databasePath", databasePath);
    const normalizedPath = normalizeDatabasePath(databasePath);
    this.#database = new DatabaseSync(normalizedPath, {
      enableForeignKeyConstraints: true,
    });
    this.#database.exec(
      "PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;",
    );
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
    const provenanceJson = canonicalJson({ source: "seedThread", adapter: "sqlite-v1" });

    try {
      this.#database.exec("BEGIN IMMEDIATE");
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
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
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
    if (event.eventType === "THREAD_SEEDED") return;
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
      this.#database.exec("BEGIN IMMEDIATE");
      const prior = this.#commandRecord(command.threadId, command.commandId);
      if (prior !== undefined) {
        this.#database.exec("COMMIT");
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
      const provenanceJson = canonicalJson({ source: "applyCommand", adapter: "sqlite-v1" });

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

      this.#database.exec("COMMIT");
      return {
        thread: nextThread,
        event: this.listEvents(command.threadId).at(-1),
        idempotent: false,
      };
    } catch (error) {
      safeRollback(this.#database);
      throw translateStorageError(error);
    }
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
      this.#database.exec("BEGIN IMMEDIATE");
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
      this.#database.exec("COMMIT");
    } catch (error) {
      safeRollback(this.#database);
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

export function openWorldStore(databasePath) {
  return new WorldStore(databasePath);
}

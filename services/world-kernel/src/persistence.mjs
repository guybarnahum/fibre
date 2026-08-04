import { createHash } from "node:crypto";
import { mkdirSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const THREAD_STATUSES = new Set([
  "frozen",
  "thawing",
  "active",
  "freezing",
  "dormant",
  "retired",
]);

const COMMAND_TYPES = new Set(["UPDATE_SELF_MODEL"]);

export class ThreadNotFoundError extends Error {}
export class ThreadAlreadyExistsError extends Error {}
export class StaleThreadVersionError extends Error {}
export class IdempotencyConflictError extends Error {}
export class IntegrityError extends Error {}

function assertNonEmpty(name, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} is required`);
  }
}

function assertPlainObject(name, value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

function assertStringArray(name, value) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  value.forEach((item, index) => assertNonEmpty(`${name}[${index}]`, item));
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function threadStateHash(thread) {
  return `sha256:${sha256(canonicalJson(thread))}`;
}

function validateThreadSnapshot(thread) {
  assertPlainObject("thread", thread);
  assertNonEmpty("thread.threadId", thread.threadId);
  if (!Number.isSafeInteger(thread.version) || thread.version < 1) {
    throw new TypeError("thread.version must be a positive safe integer");
  }
  if (!THREAD_STATUSES.has(thread.status)) {
    throw new TypeError("thread.status is invalid");
  }
  assertPlainObject("thread.identity", thread.identity);
  assertNonEmpty("thread.identity.name", thread.identity.name);
  assertNonEmpty("thread.identity.selfDescription", thread.identity.selfDescription);
  assertPlainObject("thread.currentState", thread.currentState);
  assertStringArray("thread.currentState.needs", thread.currentState.needs);
  assertStringArray("thread.currentState.feelings", thread.currentState.feelings);
  assertNonEmpty("thread.currentState.selfModel", thread.currentState.selfModel);
  assertStringArray(
    "thread.currentState.unresolvedIntentions",
    thread.currentState.unresolvedIntentions,
  );
  assertStringArray("thread.relationshipRefs", thread.relationshipRefs);
  assertStringArray("thread.memoryRefs", thread.memoryRefs);
  assertPlainObject("thread.provenance", thread.provenance);
  assertNonEmpty("thread.provenance.createdAt", thread.provenance.createdAt);
  assertNonEmpty("thread.provenance.createdBy", thread.provenance.createdBy);
}

function validateCommand(command) {
  assertPlainObject("command", command);
  assertNonEmpty("command.commandId", command.commandId);
  assertNonEmpty("command.threadId", command.threadId);
  if (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 1) {
    throw new TypeError("command.expectedVersion must be a positive safe integer");
  }
  if (!COMMAND_TYPES.has(command.type)) {
    throw new TypeError(`unsupported command type: ${command.type}`);
  }
  assertNonEmpty("command.occurredAt", command.occurredAt);
  assertPlainObject("command.actor", command.actor);
  assertNonEmpty("command.actor.entityId", command.actor.entityId);
  assertNonEmpty("command.actor.kind", command.actor.kind);
  assertNonEmpty("command.actor.displayName", command.actor.displayName);
  assertPlainObject("command.payload", command.payload);
  if (command.type === "UPDATE_SELF_MODEL") {
    assertNonEmpty("command.payload.selfModel", command.payload.selfModel);
    assertNonEmpty("command.payload.summary", command.payload.summary);
  }
}

function commandDigest(command) {
  return `sha256:${sha256(canonicalJson(command))}`;
}

function eventIdForCommand(command, digest) {
  return `evt_${command.threadId}_${digest.slice("sha256:".length, "sha256:".length + 24)}`;
}

function applyCommandToThread(thread, command, eventId) {
  if (command.type !== "UPDATE_SELF_MODEL") {
    throw new TypeError(`unsupported command type: ${command.type}`);
  }
  return {
    ...thread,
    version: thread.version + 1,
    status: "frozen",
    currentState: {
      ...thread.currentState,
      selfModel: command.payload.selfModel,
    },
    provenance: {
      ...thread.provenance,
      lastEventId: eventId,
    },
  };
}

function applyEventToThread(thread, event) {
  if (event.eventType === "THREAD_SEEDED") {
    const snapshot = event.payload.snapshot;
    validateThreadSnapshot(snapshot);
    if (event.expectedVersion !== 0 || event.resultingVersion !== snapshot.version) {
      throw new IntegrityError(`seed event ${event.eventId} has invalid version metadata`);
    }
    return snapshot;
  }

  if (event.eventType === "SELF_MODEL_UPDATED") {
    if (thread === null) {
      throw new IntegrityError(`event ${event.eventId} appears before a seed event`);
    }
    if (thread.version !== event.expectedVersion) {
      throw new IntegrityError(
        `event ${event.eventId} expected version ${event.expectedVersion}, replay has ${thread.version}`,
      );
    }
    const replayed = applyCommandToThread(
      thread,
      {
        commandId: event.commandId,
        threadId: event.threadId,
        expectedVersion: event.expectedVersion,
        type: "UPDATE_SELF_MODEL",
        payload: event.payload,
        actor: event.actor,
        occurredAt: event.occurredAt,
      },
      event.eventId,
    );
    if (replayed.version !== event.resultingVersion) {
      throw new IntegrityError(`event ${event.eventId} has an invalid resulting version`);
    }
    return replayed;
  }

  throw new IntegrityError(`unsupported event type during replay: ${event.eventType}`);
}

function parseJson(name, value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new IntegrityError(`${name} is not valid JSON: ${error.message}`);
  }
}

function rowToEvent(row) {
  return {
    eventId: row.event_id,
    threadId: row.thread_id,
    sequence: Number(row.sequence),
    expectedVersion: Number(row.expected_version),
    resultingVersion: Number(row.resulting_version),
    eventType: row.event_type,
    commandId: row.command_id,
    commandDigest: row.command_digest,
    payload: parseJson(`event ${row.event_id} payload`, row.payload_json),
    actor: parseJson(`event ${row.event_id} actor`, row.actor_json),
    occurredAt: row.occurred_at,
    stateHash: row.state_hash,
  };
}

function ensureDatabaseParent(databasePath) {
  if (databasePath === ":memory:") return databasePath;
  const absolutePath = resolve(databasePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  const parent = realpathSync(dirname(absolutePath));
  return resolve(parent, absolutePath.slice(dirname(absolutePath).length + 1));
}

export class WorldStore {
  #database;

  constructor(databasePath) {
    assertNonEmpty("databasePath", databasePath);
    const normalizedPath = ensureDatabaseParent(databasePath);
    this.#database = new DatabaseSync(normalizedPath, {
      enableForeignKeyConstraints: true,
    });
    this.#database.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;");
    this.#migrate();
  }

  #migrate() {
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS threads (
        thread_id TEXT PRIMARY KEY,
        version INTEGER NOT NULL CHECK (version >= 1),
        status TEXT NOT NULL,
        state_json TEXT NOT NULL,
        state_hash TEXT NOT NULL,
        last_event_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS thread_events (
        event_id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        sequence INTEGER NOT NULL CHECK (sequence >= 1),
        expected_version INTEGER NOT NULL CHECK (expected_version >= 0),
        resulting_version INTEGER NOT NULL CHECK (resulting_version >= 1),
        event_type TEXT NOT NULL,
        command_id TEXT,
        command_digest TEXT,
        payload_json TEXT NOT NULL,
        actor_json TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        state_hash TEXT NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
        UNIQUE (thread_id, sequence)
      ) STRICT;

      CREATE TABLE IF NOT EXISTS commands (
        thread_id TEXT NOT NULL,
        command_id TEXT NOT NULL,
        command_digest TEXT NOT NULL,
        expected_version INTEGER NOT NULL,
        resulting_version INTEGER NOT NULL,
        event_id TEXT NOT NULL,
        result_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (thread_id, command_id),
        FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
        FOREIGN KEY (event_id) REFERENCES thread_events(event_id)
      ) STRICT;

      CREATE INDEX IF NOT EXISTS idx_thread_events_thread_sequence
        ON thread_events(thread_id, sequence);

      CREATE TRIGGER IF NOT EXISTS thread_events_no_update
      BEFORE UPDATE ON thread_events
      BEGIN
        SELECT RAISE(ABORT, 'thread_events is append-only');
      END;

      CREATE TRIGGER IF NOT EXISTS thread_events_no_delete
      BEFORE DELETE ON thread_events
      BEGIN
        SELECT RAISE(ABORT, 'thread_events is append-only');
      END;

      CREATE TRIGGER IF NOT EXISTS commands_no_update
      BEFORE UPDATE ON commands
      BEGIN
        SELECT RAISE(ABORT, 'commands is append-only');
      END;

      CREATE TRIGGER IF NOT EXISTS commands_no_delete
      BEFORE DELETE ON commands
      BEGIN
        SELECT RAISE(ABORT, 'commands is append-only');
      END;
    `);
  }

  close() {
    this.#database.close();
  }

  seedThread(thread, { occurredAt = thread?.provenance?.createdAt } = {}) {
    validateThreadSnapshot(thread);
    assertNonEmpty("occurredAt", occurredAt);
    const existing = this.getThread(thread.threadId, { required: false });
    if (existing !== null) {
      if (threadStateHash(existing) === threadStateHash(thread)) {
        return { thread: existing, created: false };
      }
      throw new ThreadAlreadyExistsError(
        `Thread ${thread.threadId} already exists with different state`,
      );
    }

    const eventId = thread.provenance.lastEventId ?? `evt_${thread.threadId}_seeded`;
    const stateJson = canonicalJson(thread);
    const stateHash = threadStateHash(thread);
    const payloadJson = canonicalJson({ snapshot: thread });
    const actorJson = canonicalJson({
      entityId: thread.provenance.createdBy,
      kind: "other",
      displayName: thread.provenance.createdBy,
    });

    this.#database.exec("BEGIN IMMEDIATE");
    try {
      this.#database
        .prepare(`
          INSERT INTO threads (
            thread_id, version, status, state_json, state_hash,
            last_event_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          thread.threadId,
          thread.version,
          thread.status,
          stateJson,
          stateHash,
          eventId,
          thread.provenance.createdAt,
          occurredAt,
        );
      this.#database
        .prepare(`
          INSERT INTO thread_events (
            event_id, thread_id, sequence, expected_version, resulting_version,
            event_type, command_id, command_digest, payload_json, actor_json,
            occurred_at, state_hash
          ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)
        `)
        .run(
          eventId,
          thread.threadId,
          1,
          0,
          thread.version,
          "THREAD_SEEDED",
          payloadJson,
          actorJson,
          occurredAt,
          stateHash,
        );
      this.#database.exec("COMMIT");
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
    return { thread: structuredClone(thread), created: true };
  }

  getThread(threadId, { required = true } = {}) {
    assertNonEmpty("threadId", threadId);
    const row = this.#database
      .prepare(`
        SELECT version, status, state_json, state_hash, last_event_id
        FROM threads
        WHERE thread_id = ?
      `)
      .get(threadId);
    if (row === undefined) {
      if (!required) return null;
      throw new ThreadNotFoundError(`Thread ${threadId} was not found`);
    }
    const thread = parseJson(`Thread ${threadId} state`, row.state_json);
    validateThreadSnapshot(thread);
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
    return thread;
  }

  listEvents(threadId) {
    assertNonEmpty("threadId", threadId);
    return this.#database
      .prepare(`
        SELECT event_id, thread_id, sequence, expected_version, resulting_version,
               event_type, command_id, command_digest, payload_json, actor_json,
               occurred_at, state_hash
        FROM thread_events
        WHERE thread_id = ?
        ORDER BY sequence ASC
      `)
      .all(threadId)
      .map(rowToEvent);
  }

  applyCommand(command) {
    validateCommand(command);
    const digest = commandDigest(command);

    this.#database.exec("BEGIN IMMEDIATE");
    try {
      const prior = this.#database
        .prepare(`
          SELECT command_digest, result_json
          FROM commands
          WHERE thread_id = ? AND command_id = ?
        `)
        .get(command.threadId, command.commandId);
      if (prior !== undefined) {
        if (prior.command_digest !== digest) {
          throw new IdempotencyConflictError(
            `Command ${command.commandId} was already used with different content`,
          );
        }
        const result = parseJson(`command ${command.commandId} result`, prior.result_json);
        this.#database.exec("COMMIT");
        return { ...result, idempotent: true };
      }

      const thread = this.getThread(command.threadId);
      if (thread.version !== command.expectedVersion) {
        throw new StaleThreadVersionError(
          `Thread ${command.threadId} is version ${thread.version}; command expected ${command.expectedVersion}`,
        );
      }

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

      this.#database
        .prepare(`
          INSERT INTO thread_events (
            event_id, thread_id, sequence, expected_version, resulting_version,
            event_type, command_id, command_digest, payload_json, actor_json,
            occurred_at, state_hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

      const result = {
        thread: nextThread,
        event: {
          eventId,
          threadId: command.threadId,
          sequence,
          expectedVersion: command.expectedVersion,
          resultingVersion: nextThread.version,
          eventType,
          commandId: command.commandId,
          commandDigest: digest,
          payload: structuredClone(command.payload),
          actor: structuredClone(command.actor),
          occurredAt: command.occurredAt,
          stateHash,
        },
        idempotent: false,
      };
      this.#database
        .prepare(`
          INSERT INTO commands (
            thread_id, command_id, command_digest, expected_version,
            resulting_version, event_id, result_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          command.threadId,
          command.commandId,
          digest,
          command.expectedVersion,
          nextThread.version,
          eventId,
          canonicalJson(result),
          command.occurredAt,
        );
      this.#database.exec("COMMIT");
      return result;
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
  }

  replayThread(threadId) {
    const events = this.listEvents(threadId);
    if (events.length === 0) {
      throw new ThreadNotFoundError(`Thread ${threadId} has no event history`);
    }
    let replayed = null;
    for (const [index, event] of events.entries()) {
      if (event.sequence !== index + 1) {
        throw new IntegrityError(`Thread ${threadId} event sequence has a gap`);
      }
      replayed = applyEventToThread(replayed, event);
      const hash = threadStateHash(replayed);
      if (hash !== event.stateHash) {
        throw new IntegrityError(`Event ${event.eventId} state hash failed replay`);
      }
    }
    return replayed;
  }

  verifyThreadIntegrity(threadId) {
    const projected = this.getThread(threadId);
    const replayed = this.replayThread(threadId);
    const projectedHash = threadStateHash(projected);
    const replayedHash = threadStateHash(replayed);
    if (canonicalJson(projected) !== canonicalJson(replayed)) {
      throw new IntegrityError(`Thread ${threadId} projection differs from replay`);
    }
    if (projectedHash !== replayedHash) {
      throw new IntegrityError(`Thread ${threadId} replay hash differs from projection`);
    }
    return {
      threadId,
      version: projected.version,
      stateHash: projectedHash,
      eventCount: this.listEvents(threadId).length,
    };
  }
}

export function openWorldStore(databasePath) {
  return new WorldStore(databasePath);
}

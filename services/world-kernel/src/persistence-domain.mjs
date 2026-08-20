import {
  MAX_COMMAND_PAYLOAD_BYTES,
  EVENT_TYPES,
  COMMAND_TYPES,
  THREAD_STATUSES,
  UPDATE_SELF_MODEL_STATUSES,
  IdempotencyConflictError,
  IntegrityError,
  LifecycleCommandError,
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertJsonValue,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  boundedThreadScopedId,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { applyFreezeEventToThread } from "./freeze-domain.mjs";
import { applyInterruptedCompelledEpisodeEventToThread } from "./interrupted-compelled-episode.mjs";
import {
  THREAD_LIFE_EPISODE_RECORDED,
  applyGenesisLifeEpisodeEventToThread,
} from "./genesis-life-episode.mjs";
import {
  AUTOBIOGRAPHICAL_MEMORY_RECORDED,
  applyAutobiographicalMemoryRecordedEvent,
} from "./autobiographical-memory-anchor.mjs";

export function validateThreadSnapshot(thread) {
  assertPlainObject("thread", thread);
  assertExactKeys("thread", thread, ["threadId","version","status","identity","genome","currentState","accounts","relationshipRefs","memoryRefs","provenance"]);
  assertId("thread.threadId", thread.threadId);
  assertFiniteNumber("thread.version", thread.version, { integer: true, minimum: 1 });
  if (!THREAD_STATUSES.has(thread.status)) throw new TypeError("thread.status is invalid");
  assertPlainObject("thread.identity", thread.identity);
  assertNonEmpty("thread.identity.name", thread.identity.name);
  assertNonEmpty("thread.identity.selfDescription", thread.identity.selfDescription);
  assertPlainObject("thread.genome", thread.genome);
  assertPlainObject("thread.genome.textualTraits", thread.genome.textualTraits);
  assertPlainObject("thread.genome.runtimeBaselines", thread.genome.runtimeBaselines);
  assertPlainObject("thread.currentState", thread.currentState);
  assertStringArray("thread.currentState.needs", thread.currentState.needs);
  assertStringArray("thread.currentState.feelings", thread.currentState.feelings);
  assertNonEmpty("thread.currentState.selfModel", thread.currentState.selfModel);
  assertStringArray("thread.currentState.unresolvedIntentions", thread.currentState.unresolvedIntentions);
  if (thread.accounts !== undefined) {
    assertPlainObject("thread.accounts", thread.accounts);
    assertFiniteNumber("thread.accounts.fibreCredits", thread.accounts.fibreCredits, { integer: true, minimum: 0 });
    assertFiniteNumber("thread.accounts.usdAvailable", thread.accounts.usdAvailable, { minimum: 0 });
    assertFiniteNumber("thread.accounts.modelTokensAvailable", thread.accounts.modelTokensAvailable, { integer: true, minimum: 0 });
  }
  assertStringArray("thread.relationshipRefs", thread.relationshipRefs);
  assertStringArray("thread.memoryRefs", thread.memoryRefs);
  assertPlainObject("thread.provenance", thread.provenance);
  assertIsoTimestamp("thread.provenance.createdAt", thread.provenance.createdAt);
  assertNonEmpty("thread.provenance.createdBy", thread.provenance.createdBy);
  if (thread.provenance.lastEventId !== undefined) assertId("thread.provenance.lastEventId", thread.provenance.lastEventId);
  assertJsonValue("thread", thread);
}

export function validateStoredThread(threadId, thread) {
  try { validateThreadSnapshot(thread); }
  catch (error) { throw new IntegrityError(`Stored Thread ${threadId} is invalid: ${error.message}`); }
}

export function validateCommand(command) {
  assertPlainObject("command", command);
  assertExactKeys("command", command, ["commandId","threadId","expectedVersion","type","payload","actor","occurredAt"]);
  assertId("command.commandId", command.commandId);
  assertId("command.threadId", command.threadId);
  assertFiniteNumber("command.expectedVersion", command.expectedVersion, { integer: true, minimum: 1 });
  if (!COMMAND_TYPES.has(command.type)) throw new TypeError(`unsupported command type: ${command.type}`);
  assertIsoTimestamp("command.occurredAt", command.occurredAt);
  assertPlainObject("command.actor", command.actor);
  assertExactKeys("command.actor", command.actor, ["entityId","kind","displayName"]);
  assertId("command.actor.entityId", command.actor.entityId);
  assertNonEmpty("command.actor.kind", command.actor.kind);
  assertNonEmpty("command.actor.displayName", command.actor.displayName);
  assertPlainObject("command.payload", command.payload);
  if (command.type === "UPDATE_SELF_MODEL") {
    assertExactKeys("command.payload", command.payload, ["selfModel","summary"]);
    assertNonEmpty("command.payload.selfModel", command.payload.selfModel);
    assertNonEmpty("command.payload.summary", command.payload.summary);
  }
  const payloadBytes = Buffer.byteLength(canonicalJson(command.payload), "utf8");
  if (payloadBytes > MAX_COMMAND_PAYLOAD_BYTES) throw new TypeError(`command.payload exceeds ${MAX_COMMAND_PAYLOAD_BYTES} UTF-8 bytes`);
  assertJsonValue("command", command);
}

export function commandDigest(command) { return `sha256:${sha256(canonicalJson(command))}`; }
export function eventIdForCommand(command, digest) {
  return boundedThreadScopedId({
    prefix: "evt",
    threadId: command.threadId,
    suffix: digest.slice(7, 31),
  });
}
function seedEventId(thread) {
  const seedIdentity = structuredClone(thread);
  delete seedIdentity.provenance.lastEventId;
  return boundedThreadScopedId({
    prefix: "evt",
    threadId: thread.threadId,
    suffix: `seed_${sha256(canonicalJson(seedIdentity)).slice(0, 24)}`,
  });
}
export function normalizeSeedSnapshot(thread) {
  const normalized = structuredClone(thread);
  normalized.provenance = { ...normalized.provenance, lastEventId: seedEventId(normalized) };
  validateThreadSnapshot(normalized);
  return normalized;
}
export function assertCommandLifecycle(thread, command, ErrorType = LifecycleCommandError) {
  if (command.type === "UPDATE_SELF_MODEL" && !UPDATE_SELF_MODEL_STATUSES.has(thread.status)) throw new ErrorType(`UPDATE_SELF_MODEL cannot act on Thread ${thread.threadId} while status is ${thread.status}`);
}
export function applyCommandToThread(thread, command, eventId, ErrorType = LifecycleCommandError) {
  if (command.type !== "UPDATE_SELF_MODEL") throw new TypeError(`unsupported command type: ${command.type}`);
  assertCommandLifecycle(thread, command, ErrorType);
  return { ...thread, version: thread.version + 1, status: thread.status, currentState: { ...thread.currentState, selfModel: command.payload.selfModel }, provenance: { ...thread.provenance, lastEventId: eventId } };
}
export function parseJson(name, value) {
  try { return JSON.parse(value); }
  catch (error) { throw new IntegrityError(`${name} is not valid JSON: ${error.message}`); }
}

export function rowToEvent(row) {
  try {
    const event = {
      eventId: row.event_id, threadId: row.thread_id, sequence: Number(row.sequence), expectedVersion: Number(row.expected_version), resultingVersion: Number(row.resulting_version), eventType: row.event_type, commandId: row.command_id, commandDigest: row.command_digest,
      payload: parseJson(`event ${row.event_id} payload`, row.payload_json), actor: parseJson(`event ${row.event_id} actor`, row.actor_json), occurredAt: row.occurred_at, stateHash: row.state_hash, authorizationId: row.authorization_id, causationId: row.causation_id, correlationId: row.correlation_id, payloadSchemaVersion: Number(row.payload_schema_version), provenance: parseJson(`event ${row.event_id} provenance`, row.provenance_json),
    };
    assertId("event.eventId", event.eventId);
    assertId(`event ${event.eventId} threadId`, event.threadId);
    if (!EVENT_TYPES.has(event.eventType)) throw new TypeError(`unsupported type ${event.eventType}`);
    if (!Number.isSafeInteger(event.sequence) || event.sequence < 1) throw new TypeError("invalid sequence");
    if (!Number.isSafeInteger(event.expectedVersion) || event.expectedVersion < 0) throw new TypeError("invalid expected version");
    if (!Number.isSafeInteger(event.resultingVersion) || event.resultingVersion < 1) throw new TypeError("invalid resulting version");
    if (!Number.isSafeInteger(event.payloadSchemaVersion) || event.payloadSchemaVersion < 1) throw new TypeError("invalid payload schema version");
    if (event.commandId !== null) assertId(`event ${event.eventId} commandId`, event.commandId);
    if (event.commandDigest !== null && !/^sha256:[0-9a-f]{64}$/.test(event.commandDigest)) throw new TypeError("invalid command digest");
    if (!/^sha256:[0-9a-f]{64}$/.test(event.stateHash)) throw new TypeError("invalid state hash");
    if (event.authorizationId !== null) assertId(`event ${event.eventId} authorizationId`, event.authorizationId);
    assertIsoTimestamp(`event ${event.eventId} occurredAt`, event.occurredAt);
    assertId(`event ${event.eventId} causationId`, event.causationId);
    assertId(`event ${event.eventId} correlationId`, event.correlationId);
    assertPlainObject(`event ${event.eventId} payload`, event.payload);
    assertPlainObject(`event ${event.eventId} actor`, event.actor);
    assertPlainObject(`event ${event.eventId} provenance`, event.provenance);
    return event;
  } catch (error) {
    if (error instanceof IntegrityError) throw error;
    throw new IntegrityError(`Stored event ${row.event_id ?? "<unknown>"} is invalid: ${error.message}`);
  }
}

function commandFromEvent(event) {
  return { commandId: event.commandId, threadId: event.threadId, expectedVersion: event.expectedVersion, type: "UPDATE_SELF_MODEL", payload: event.payload, actor: event.actor, occurredAt: event.occurredAt };
}

export function applyEventToThread(thread, event) {
  if (event.eventType === "THREAD_SEEDED") {
    const snapshot = event.payload.snapshot;
    validateStoredThread(event.threadId, snapshot);
    if (snapshot.threadId !== event.threadId) throw new IntegrityError(`seed event ${event.eventId} snapshot belongs to ${snapshot.threadId}, not ${event.threadId}`);
    if (snapshot.provenance.lastEventId !== event.eventId) throw new IntegrityError(`seed event ${event.eventId} is not the snapshot last event`);
    if (event.expectedVersion !== 0 || event.resultingVersion !== snapshot.version) throw new IntegrityError(`seed event ${event.eventId} has invalid version metadata`);
    if (event.commandId !== null || event.commandDigest !== null) throw new IntegrityError(`seed event ${event.eventId} must not carry command metadata`);
    return snapshot;
  }
  if (event.eventType === THREAD_LIFE_EPISODE_RECORDED) {
    return applyGenesisLifeEpisodeEventToThread(thread, event, IntegrityError);
  }
  if (event.eventType === "SELF_MODEL_UPDATED") {
    if (thread === null) throw new IntegrityError(`event ${event.eventId} appears before a seed event`);
    if (event.threadId !== thread.threadId) throw new IntegrityError(`event ${event.eventId} belongs to another Thread`);
    if (thread.version !== event.expectedVersion) throw new IntegrityError(`event ${event.eventId} expected version ${event.expectedVersion}, replay has ${thread.version}`);
    const command = commandFromEvent(event);
    try { validateCommand(command); }
    catch (error) { throw new IntegrityError(`event ${event.eventId} command is invalid: ${error.message}`); }
    const digest = commandDigest(command);
    if (event.commandDigest !== digest) throw new IntegrityError(`event ${event.eventId} command digest does not match content`);
    if (eventIdForCommand(command, digest) !== event.eventId) throw new IntegrityError(`event ${event.eventId} does not match its command digest`);
    let replayed;
    try { replayed = applyCommandToThread(thread, command, event.eventId, IntegrityError); }
    catch (error) { if (error instanceof IntegrityError) throw error; throw new IntegrityError(`event ${event.eventId} cannot be applied: ${error.message}`); }
    if (replayed.version !== event.resultingVersion) throw new IntegrityError(`event ${event.eventId} has an invalid resulting version`);
    return replayed;
  }
  if (event.eventType === "THREAD_FROZEN") {
    if (event.commandId === null || event.commandDigest === null) throw new IntegrityError(`freeze event ${event.eventId} requires operation metadata`);
    let replayed;
    try { replayed = applyFreezeEventToThread(thread, event); }
    catch (error) { if (error instanceof IntegrityError) throw error; throw new IntegrityError(`freeze event ${event.eventId} cannot be applied: ${error.message}`); }
    if (replayed.version !== event.resultingVersion) throw new IntegrityError(`freeze event ${event.eventId} has an invalid resulting version`);
    return replayed;
  }
  if (event.eventType === "COMPELLED_EPISODE_INTERRUPTED") {
    if (event.commandId === null || event.commandDigest === null) throw new IntegrityError(`interrupted episode event ${event.eventId} requires operation metadata`);
    let replayed;
    try { replayed = applyInterruptedCompelledEpisodeEventToThread(thread, event); }
    catch (error) { if (error instanceof IntegrityError) throw error; throw new IntegrityError(`interrupted episode event ${event.eventId} cannot be applied: ${error.message}`); }
    if (replayed.version !== event.resultingVersion) throw new IntegrityError(`interrupted episode event ${event.eventId} has an invalid resulting version`);
    return replayed;
  }
  if (event.eventType === AUTOBIOGRAPHICAL_MEMORY_RECORDED) {
    if (event.commandId === null || event.commandDigest === null) throw new IntegrityError(`memory event ${event.eventId} requires anchor command metadata`);
    try { return applyAutobiographicalMemoryRecordedEvent(thread, event, IntegrityError); }
    catch (error) { if (error instanceof IntegrityError) throw error; throw new IntegrityError(`memory event ${event.eventId} cannot be applied: ${error.message}`); }
  }
  throw new IntegrityError(`unsupported event type during replay: ${event.eventType}`);
}
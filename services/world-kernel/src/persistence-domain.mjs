import { normalizeGenesisSex } from "#core/src/genesis-sex.mjs";
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
  if (thread.identity.sex !== undefined) normalizeGenesisSex(thread.identity.sex);
  if (thread.identity.birthDate !== undefined) {
    if (typeof thread.identity.birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(thread.identity.birthDate)) {
      throw new TypeError("thread.identity.birthDate must use YYYY-MM-DD");
    }
    const birthInstant = new Date(`${thread.identity.birthDate}T00:00:00.000Z`);
    if (!Number.isFinite(birthInstant.getTime()) || birthInstant.toISOString().slice(0, 10) !== thread.identity.birthDate) {
      throw new TypeError("thread.identity.birthDate is invalid");
    }
  }
  if (thread.identity.birthPlace !== undefined) {
    assertPlainObject("thread.identity.birthPlace", thread.identity.birthPlace);
    assertExactKeys("thread.identity.birthPlace", thread.identity.birthPlace, [
      "displayName","country","city","lat","long",
    ]);
    assertNonEmpty("thread.identity.birthPlace.displayName", thread.identity.birthPlace.displayName);
    assertNonEmpty("thread.identity.birthPlace.country", thread.identity.birthPlace.country);
    assertNonEmpty("thread.identity.birthPlace.city", thread.identity.birthPlace.city);
    assertFiniteNumber("thread.identity.birthPlace.lat", thread.identity.birthPlace.lat, { minimum:-90, maximum:90 });
    assertFiniteNumber("thread.identity.birthPlace.long", thread.identity.birthPlace.long, { minimum:-180, maximum:180 });
    if (
      thread.identity.birthCity !== undefined
      && thread.identity.birthPlace.displayName !== thread.identity.birthCity
    ) {
      throw new TypeError("thread.identity.birthPlace.displayName must match birthCity");
    }
  }
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

function applyGenesisSexMigration(thread, event) {
  if (thread === null) throw new IntegrityError(`migration event ${event.eventId} appears before a seed event`);
  if (event.commandId !== null || event.commandDigest !== null) throw new IntegrityError(`migration event ${event.eventId} must not carry command metadata`);
  if (event.threadId !== thread.threadId) throw new IntegrityError(`migration event ${event.eventId} belongs to another Thread`);
  if (thread.version !== event.expectedVersion) throw new IntegrityError(`migration event ${event.eventId} expected version ${event.expectedVersion}, replay has ${thread.version}`);
  if (thread.identity.sex !== undefined) throw new IntegrityError(`migration event ${event.eventId} attempts to replace existing sex`);
  assertExactKeys(`migration event ${event.eventId} payload`, event.payload, ["sex","genesisId","resultDigest"]);
  const sex = normalizeGenesisSex(event.payload.sex);
  assertId(`migration event ${event.eventId} genesisId`, event.payload.genesisId);
  if (!/^sha256:[0-9a-f]{64}$/u.test(event.payload.resultDigest)) {
    throw new IntegrityError(`migration event ${event.eventId} has invalid Genesis result digest`);
  }
  if (event.provenance.source !== "genesis_birth_publication"
    || event.provenance.genesisId !== event.payload.genesisId
    || event.provenance.resultDigest !== event.payload.resultDigest
    || event.provenance.notThreadLifeEvent !== true) {
    throw new IntegrityError(`migration event ${event.eventId} lacks authoritative Genesis migration provenance`);
  }
  const replayed = {
    ...thread,
    version:thread.version + 1,
    identity:{ ...thread.identity, sex },
    provenance:{ ...thread.provenance, lastEventId:event.eventId },
  };
  validateStoredThread(event.threadId, replayed);
  if (replayed.version !== event.resultingVersion) throw new IntegrityError(`migration event ${event.eventId} has an invalid resulting version`);
  return replayed;
}

function applyThreadIdentityUpdate(thread, event) {
  if (thread === null) throw new IntegrityError(`identity event ${event.eventId} appears before a seed event`);
  if (event.commandId !== null || event.commandDigest !== null) throw new IntegrityError(`identity event ${event.eventId} must not carry command metadata`);
  if (event.threadId !== thread.threadId) throw new IntegrityError(`identity event ${event.eventId} belongs to another Thread`);
  if (thread.version !== event.expectedVersion) throw new IntegrityError(`identity event ${event.eventId} expected version ${event.expectedVersion}, replay has ${thread.version}`);
  if (event.payloadSchemaVersion === 1) {
    assertExactKeys(`identity event ${event.eventId} payload`, event.payload, ["changes","previous","operationKey"]);
  } else if (event.payloadSchemaVersion === 2) {
    assertExactKeys(`identity event ${event.eventId} payload`, event.payload, ["changes","previous","operationKey","derivedSelfModel"]);
  } else {
    throw new IntegrityError(`identity event ${event.eventId} has unsupported payload schema version ${event.payloadSchemaVersion}`);
  }
  assertPlainObject(`identity event ${event.eventId} changes`, event.payload.changes);
  assertPlainObject(`identity event ${event.eventId} previous`, event.payload.previous);
  assertNonEmpty(`identity event ${event.eventId} operationKey`, event.payload.operationKey);
  const keys = Object.keys(event.payload.changes).sort();
  const previousKeys = Object.keys(event.payload.previous).sort();
  if (keys.length === 0 || keys.some((key) => !["name","sex","birthDate","languages"].includes(key))) {
    throw new IntegrityError(`identity event ${event.eventId} has unsupported changes`);
  }
  if (canonicalJson(keys) !== canonicalJson(previousKeys)) {
    throw new IntegrityError(`identity event ${event.eventId} previous identity does not match changes`);
  }
  if (event.provenance.source !== "admin_operator"
    || event.provenance.operationKey !== event.payload.operationKey
    || event.provenance.notThreadLifeEvent !== true) {
    throw new IntegrityError(`identity event ${event.eventId} lacks Admin update provenance`);
  }

  const identity = { ...thread.identity };
  if (keys.includes("name")) {
    assertNonEmpty(`identity event ${event.eventId} name`, event.payload.changes.name);
    if (event.payload.previous.name !== thread.identity.name) {
      throw new IntegrityError(`identity event ${event.eventId} previous name does not match replay`);
    }
    identity.name = event.payload.changes.name;
  }
  if (keys.includes("sex")) {
    if (thread.identity.sex !== undefined || event.payload.previous.sex !== null) {
      throw new IntegrityError(`identity event ${event.eventId} attempts to replace existing sex`);
    }
    identity.sex = normalizeGenesisSex(event.payload.changes.sex);
  }
  if (keys.includes("birthDate")) {
    const birthDate = event.payload.changes.birthDate;
    if (typeof birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(birthDate)) {
      throw new IntegrityError(`identity event ${event.eventId} has invalid birth date`);
    }
    const birthInstant = new Date(`${birthDate}T00:00:00.000Z`);
    if (!Number.isFinite(birthInstant.getTime()) || birthInstant.toISOString().slice(0, 10) !== birthDate) {
      throw new IntegrityError(`identity event ${event.eventId} has invalid birth date`);
    }
    if ((event.payload.previous.birthDate ?? null) !== (thread.identity.birthDate ?? null)) {
      throw new IntegrityError(`identity event ${event.eventId} previous birth date does not match replay`);
    }
    identity.birthDate = birthDate;
  }
  if (keys.includes("languages")) {
    const languages = event.payload.changes.languages;
    if (!Array.isArray(languages) || languages.length < 1 || languages.length > 3
      || languages.some((item) => typeof item !== "string" || item.trim() === "" || item !== item.trim())) {
      throw new IntegrityError(`identity event ${event.eventId} has invalid languages`);
    }
    const languageKeys = languages.map((item) => item.toLocaleLowerCase("en-US"));
    if (new Set(languageKeys).size !== languageKeys.length) {
      throw new IntegrityError(`identity event ${event.eventId} has duplicate languages`);
    }
    if (canonicalJson(event.payload.previous.languages ?? null) !== canonicalJson(thread.identity.languages ?? null)) {
      throw new IntegrityError(`identity event ${event.eventId} previous languages do not match replay`);
    }
    identity.languages = [...languages];
  }

  let currentState = thread.currentState;
  if (event.payloadSchemaVersion === 2 && event.payload.derivedSelfModel !== null) {
    assertPlainObject(`identity event ${event.eventId} derivedSelfModel`, event.payload.derivedSelfModel);
    assertExactKeys(`identity event ${event.eventId} derivedSelfModel`, event.payload.derivedSelfModel, ["previous","next"]);
    if (!keys.includes("name")) {
      throw new IntegrityError(`identity event ${event.eventId} changes self-model without changing name`);
    }
    if (event.payload.derivedSelfModel.previous !== thread.currentState.selfModel) {
      throw new IntegrityError(`identity event ${event.eventId} previous self-model does not match replay`);
    }
    const expected = `I am ${identity.name}.`;
    if (event.payload.derivedSelfModel.next !== expected) {
      throw new IntegrityError(`identity event ${event.eventId} derived self-model does not match updated name`);
    }
    currentState = { ...thread.currentState, selfModel:expected };
  }

  const replayed = {
    ...thread,
    version:thread.version + 1,
    identity,
    currentState,
    provenance:{ ...thread.provenance, lastEventId:event.eventId },
  };
  validateStoredThread(event.threadId, replayed);
  if (replayed.version !== event.resultingVersion) throw new IntegrityError(`identity event ${event.eventId} has an invalid resulting version`);
  return replayed;
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
  if (event.eventType === "GENESIS_SEX_MIGRATED") {
    return applyGenesisSexMigration(thread, event);
  }
  if (event.eventType === "THREAD_IDENTITY_UPDATED") {
    return applyThreadIdentityUpdate(thread, event);
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

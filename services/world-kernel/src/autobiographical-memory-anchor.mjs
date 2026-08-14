import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";

export const AUTOBIOGRAPHICAL_MEMORY_RECORDED = "AUTOBIOGRAPHICAL_MEMORY_RECORDED";

function assertDigest(name, value) {
  if (typeof value !== "string" || !/^sha256:[0-9a-f]{64}$/.test(value)) {
    throw new TypeError(`${name} must be a SHA-256 digest`);
  }
}

export function autobiographicalMemoryAnchorCommand({
  threadId,
  expectedVersion,
  memoryId,
  revision,
  memoryDigest,
  recordedAt,
}) {
  assertId("memory anchor threadId", threadId);
  assertFiniteNumber("memory anchor expectedVersion", expectedVersion, { integer: true, minimum: 1 });
  assertId("memory anchor memoryId", memoryId);
  assertFiniteNumber("memory anchor revision", revision, { integer: true, minimum: 1 });
  assertDigest("memory anchor memoryDigest", memoryDigest);
  assertIsoTimestamp("memory anchor recordedAt", recordedAt);
  const identity = canonicalJson({ threadId, memoryId, revision, memoryDigest });
  const commandId = `cmd_memory_${sha256(identity).slice(0, 40)}`;
  const commandDigest = `sha256:${sha256(canonicalJson({
    type: AUTOBIOGRAPHICAL_MEMORY_RECORDED,
    threadId,
    expectedVersion,
    memoryId,
    revision,
    memoryDigest,
    recordedAt,
  }))}`;
  const eventId = `evt_memory_${sha256(canonicalJson({ commandId, commandDigest })).slice(0, 40)}`;
  return { commandId, commandDigest, eventId };
}

function nextMemoryRefs(thread, memoryId) {
  return thread.memoryRefs.includes(memoryId) ? [...thread.memoryRefs] : [...thread.memoryRefs, memoryId];
}

export function buildAutobiographicalMemoryRecordedEvent(thread, {
  memoryId,
  revision,
  memoryDigest,
  recordedAt,
  sequence,
}) {
  assertPlainObject("memory anchor Thread", thread);
  assertFiniteNumber("memory anchor sequence", sequence, { integer: true, minimum: 2 });
  if (Date.parse(recordedAt) < Date.parse(thread.provenance.createdAt)) {
    throw new TypeError("memory anchor cannot predate Thread creation");
  }
  const expectedVersion = thread.version;
  const { commandId, commandDigest, eventId } = autobiographicalMemoryAnchorCommand({
    threadId: thread.threadId,
    expectedVersion,
    memoryId,
    revision,
    memoryDigest,
    recordedAt,
  });
  const nextThread = {
    ...structuredClone(thread),
    version: expectedVersion + 1,
    memoryRefs: nextMemoryRefs(thread, memoryId),
    provenance: { ...thread.provenance, lastEventId: eventId },
  };
  return {
    nextThread,
    event: {
      eventId,
      threadId: thread.threadId,
      sequence,
      expectedVersion,
      resultingVersion: nextThread.version,
      eventType: AUTOBIOGRAPHICAL_MEMORY_RECORDED,
      commandId,
      commandDigest,
      payload: { memoryId, revision, memoryDigest },
      actor: { entityId: "fibre.world-kernel", kind: "institution", displayName: "Fibre World Kernel" },
      occurredAt: recordedAt,
      stateHash: threadStateHash(nextThread),
      authorizationId: null,
      causationId: eventId,
      correlationId: memoryId,
      payloadSchemaVersion: 1,
      provenance: {
        source: "autobiographical_memory_store",
        meaning: "Fibre recorded this memory revision; the event does not assert that the remembered interpretation is historical fact.",
      },
    },
  };
}

export function applyAutobiographicalMemoryRecordedEvent(thread, event, ErrorType = TypeError) {
  if (thread === null) throw new ErrorType(`memory event ${event.eventId} appears before Thread creation`);
  if (event.threadId !== thread.threadId) throw new ErrorType(`memory event ${event.eventId} belongs to another Thread`);
  if (event.expectedVersion !== thread.version) throw new ErrorType(`memory event ${event.eventId} expected version ${event.expectedVersion}, replay has ${thread.version}`);
  if (event.resultingVersion !== thread.version + 1) throw new ErrorType(`memory event ${event.eventId} has invalid resulting version`);
  assertPlainObject("memory event payload", event.payload);
  assertExactKeys("memory event payload", event.payload, ["memoryId", "revision", "memoryDigest"]);
  assertId("memory event payload.memoryId", event.payload.memoryId);
  assertFiniteNumber("memory event payload.revision", event.payload.revision, { integer: true, minimum: 1 });
  assertDigest("memory event payload.memoryDigest", event.payload.memoryDigest);
  const expected = autobiographicalMemoryAnchorCommand({
    threadId: event.threadId,
    expectedVersion: event.expectedVersion,
    memoryId: event.payload.memoryId,
    revision: event.payload.revision,
    memoryDigest: event.payload.memoryDigest,
    recordedAt: event.occurredAt,
  });
  if (event.commandId !== expected.commandId || event.commandDigest !== expected.commandDigest || event.eventId !== expected.eventId) {
    throw new ErrorType(`memory event ${event.eventId} anchor identity does not match its content`);
  }
  return {
    ...structuredClone(thread),
    version: event.resultingVersion,
    memoryRefs: nextMemoryRefs(thread, event.payload.memoryId),
    provenance: { ...thread.provenance, lastEventId: event.eventId },
  };
}

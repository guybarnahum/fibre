import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertJsonValue,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
} from "./persistence-common.mjs";

export const THREAD_PRESENTATION_STREAM_VERSION = "thread-presentation-stream-v0.1";

export const THREAD_PRESENTATION_EVENT_KINDS = Object.freeze([
  "conversation.message.started",
  "conversation.message.delta",
  "conversation.message.completed",
  "presentation.snapshot.changed",
  "present.updated",
  "media.ready",
  "media.unavailable",
]);

const EVENT_KIND_SET = new Set(THREAD_PRESENTATION_EVENT_KINDS);
const INPUT_KEYS = Object.freeze([
  "streamVersion",
  "eventId",
  "threadId",
  "channelId",
  "occurredAt",
  "emittedAt",
  "kind",
  "provenanceRef",
  "sourceReferences",
  "payload",
]);
const EVENT_KEYS = Object.freeze([...INPUT_KEYS.slice(0, 2), "sequence", ...INPUT_KEYS.slice(2)]);

function uniqueRefs(name, values) {
  assertStringArray(name, values);
  if (new Set(values).size !== values.length) throw new TypeError(`${name} must contain unique references`);
  values.forEach((value, index) => assertId(`${name}[${index}]`, value));
  return [...values];
}

function nullableText(name, value) {
  if (value === null) return null;
  assertNonEmpty(name, value);
  return value;
}

function presentPlace(name, value) {
  if (value === null) return null;
  assertPlainObject(name, value);
  assertExactKeys(name, value, ["displayName", "region"]);
  assertNonEmpty(`${name}.displayName`, value.displayName);
  return {
    displayName: value.displayName,
    region: nullableText(`${name}.region`, value.region),
  };
}

function presentLocation(value) {
  assertPlainObject("presentation event.payload.location", value);
  if (value.kind === "place") {
    assertExactKeys("presentation event.payload.location", value, ["kind", "place"]);
    return {
      kind: "place",
      place: presentPlace("presentation event.payload.location.place", value.place),
    };
  }
  if (value.kind === "transit") {
    assertExactKeys("presentation event.payload.location", value, ["kind", "from", "to", "progress"]);
    assertFiniteNumber("presentation event.payload.location.progress", value.progress, { minimum: 0 });
    if (value.progress > 1) throw new TypeError("presentation event.payload.location.progress must be at most 1");
    return {
      kind: "transit",
      from: presentPlace("presentation event.payload.location.from", value.from),
      to: presentPlace("presentation event.payload.location.to", value.to),
      progress: value.progress,
    };
  }
  throw new TypeError("presentation event.payload.location.kind is invalid");
}

function presentParticipants(value) {
  assertStringArray("presentation event.payload.participants", value);
  value.forEach((name, index) => assertNonEmpty(`presentation event.payload.participants[${index}]`, name));
  if (new Set(value).size !== value.length) {
    throw new TypeError("presentation event.payload.participants must be unique");
  }
  return [...value];
}

function normalizePayload(kind, payload) {
  assertPlainObject("presentation event.payload", payload);
  assertJsonValue("presentation event.payload", payload);

  if (kind === "conversation.message.started") {
    assertExactKeys("presentation event.payload", payload, ["messageId", "speaker"]);
    assertId("presentation event.payload.messageId", payload.messageId);
    assertNonEmpty("presentation event.payload.speaker", payload.speaker);
  } else if (kind === "conversation.message.delta") {
    assertExactKeys("presentation event.payload", payload, ["messageId", "text"]);
    assertId("presentation event.payload.messageId", payload.messageId);
    if (typeof payload.text !== "string" || payload.text.length === 0) {
      throw new TypeError("presentation event.payload.text must be a non-empty string");
    }
  } else if (kind === "conversation.message.completed") {
    assertExactKeys("presentation event.payload", payload, ["messageId"]);
    assertId("presentation event.payload.messageId", payload.messageId);
  } else if (kind === "presentation.snapshot.changed") {
    assertExactKeys("presentation event.payload", payload, ["snapshotVersion", "snapshotDigest", "objectRef"]);
    assertNonEmpty("presentation event.payload.snapshotVersion", payload.snapshotVersion);
    assertNonEmpty("presentation event.payload.snapshotDigest", payload.snapshotDigest);
    assertId("presentation event.payload.objectRef", payload.objectRef);
  } else if (kind === "present.updated") {
    assertExactKeys("presentation event.payload", payload, [
      "presentVersion",
      "situationId",
      "establishedAt",
      "phase",
      "location",
      "mediatedContext",
      "activity",
      "reason",
      "participants",
      "depictionMediaId",
    ]);
    if (payload.presentVersion !== "thread-public-present-v0.1") {
      throw new TypeError(`unsupported public present version ${payload.presentVersion}`);
    }
    assertId("presentation event.payload.situationId", payload.situationId);
    assertIsoTimestamp("presentation event.payload.establishedAt", payload.establishedAt);
    if (!["at_place", "in_transit"].includes(payload.phase)) {
      throw new TypeError("presentation event.payload.phase is invalid");
    }
    const location = presentLocation(payload.location);
    if (payload.phase === "at_place" && location.kind !== "place") {
      throw new TypeError("at-place public present requires a place location");
    }
    if (payload.phase === "in_transit" && location.kind !== "transit") {
      throw new TypeError("in-transit public present requires a transit location");
    }
    nullableText("presentation event.payload.mediatedContext", payload.mediatedContext);
    assertNonEmpty("presentation event.payload.activity", payload.activity);
    nullableText("presentation event.payload.reason", payload.reason);
    presentParticipants(payload.participants);
    assertId("presentation event.payload.depictionMediaId", payload.depictionMediaId);
  } else if (kind === "media.ready") {
    assertExactKeys("presentation event.payload", payload, ["mediaId", "objectRef", "mediaType", "digest"]);
    assertId("presentation event.payload.mediaId", payload.mediaId);
    assertId("presentation event.payload.objectRef", payload.objectRef);
    assertNonEmpty("presentation event.payload.mediaType", payload.mediaType);
    assertNonEmpty("presentation event.payload.digest", payload.digest);
  } else if (kind === "media.unavailable") {
    assertExactKeys("presentation event.payload", payload, ["mediaId", "reason"]);
    assertId("presentation event.payload.mediaId", payload.mediaId);
    assertNonEmpty("presentation event.payload.reason", payload.reason);
  }
  return structuredClone(payload);
}

export function normalizeThreadPresentationEventInput(value) {
  assertPlainObject("presentation event input", value);
  assertExactKeys("presentation event input", value, INPUT_KEYS);
  if (value.streamVersion !== THREAD_PRESENTATION_STREAM_VERSION) {
    throw new TypeError(`unsupported presentation stream version ${value.streamVersion}`);
  }
  assertId("presentation event.eventId", value.eventId);
  assertId("presentation event.threadId", value.threadId);
  assertId("presentation event.channelId", value.channelId);
  assertIsoTimestamp("presentation event.occurredAt", value.occurredAt);
  assertIsoTimestamp("presentation event.emittedAt", value.emittedAt);
  if (Date.parse(value.emittedAt) < Date.parse(value.occurredAt)) {
    throw new TypeError("presentation event.emittedAt cannot precede occurredAt");
  }
  if (!EVENT_KIND_SET.has(value.kind)) throw new TypeError(`unsupported presentation event kind ${value.kind}`);
  assertId("presentation event.provenanceRef", value.provenanceRef);
  return {
    streamVersion: THREAD_PRESENTATION_STREAM_VERSION,
    eventId: value.eventId,
    threadId: value.threadId,
    channelId: value.channelId,
    occurredAt: value.occurredAt,
    emittedAt: value.emittedAt,
    kind: value.kind,
    provenanceRef: value.provenanceRef,
    sourceReferences: uniqueRefs("presentation event.sourceReferences", value.sourceReferences),
    payload: normalizePayload(value.kind, value.payload),
  };
}

export function normalizeThreadPresentationEvent(value) {
  assertPlainObject("presentation event", value);
  assertExactKeys("presentation event", value, EVENT_KEYS);
  assertFiniteNumber("presentation event.sequence", value.sequence, { integer: true, minimum: 1 });
  const { sequence, ...input } = value;
  return { ...normalizeThreadPresentationEventInput(input), sequence };
}

export function materializeThreadPresentationEvent(input, sequence) {
  assertFiniteNumber("presentation event.sequence", sequence, { integer: true, minimum: 1 });
  return normalizeThreadPresentationEvent({ ...normalizeThreadPresentationEventInput(input), sequence });
}
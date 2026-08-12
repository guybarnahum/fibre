import {
  IntegrityError,
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export const COMPELLED_EPISODE_INTERRUPTED_EVENT = "COMPELLED_EPISODE_INTERRUPTED";
export const COMPELLED_EPISODE_INTERRUPTED_REASON = "governing_authority_withdrawn";
export const COMPELLED_EPISODE_HISTORY_PROFILE_VERSION = 2;

const PAYLOAD = Object.freeze({
  episodeKind: "compelled_participation",
  outcome: "interrupted",
  reasonCode: COMPELLED_EPISODE_INTERRUPTED_REASON,
  guardianDecision: "pass",
});
const ACTOR = Object.freeze({
  entityId: "fibre.world-kernel",
  kind: "institution",
  displayName: "Fibre World Kernel",
});
const PROVENANCE = Object.freeze({
  source: "structuredAuthorityWithdrawal",
  adapter: "sqlite-v5",
  visibility: "public_safe_life_event",
});

function same(name, actual, expected) {
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    throw new IntegrityError(`${name} does not match the interrupted-episode contract`);
  }
}

export function interruptedCompelledEpisodePayload() {
  return structuredClone(PAYLOAD);
}

export function interruptedCompelledEpisodeActor() {
  return structuredClone(ACTOR);
}

export function interruptedCompelledEpisodeProvenance() {
  return structuredClone(PROVENANCE);
}

export function interruptedCompelledEpisodeEventId(closureId) {
  assertId("authority-withdrawal closureId", closureId);
  return `evt_interrupted_${sha256(`structured-authority-withdrawal-event:${closureId}`).slice(0, 48)}`;
}

export function interruptedCompelledEpisodeCommandId(closureId) {
  assertId("authority-withdrawal closureId", closureId);
  return `life_${sha256(`structured-authority-withdrawal-command:${closureId}`)}`;
}

export function interruptedCompelledEpisodeCommandDigest({
  closureId,
  threadId,
  eventId,
  commandId,
  occurredAt,
}) {
  assertId("authority-withdrawal closureId", closureId);
  assertId("interrupted episode threadId", threadId);
  assertId("interrupted episode eventId", eventId);
  assertId("interrupted episode commandId", commandId);
  assertIsoTimestamp("interrupted episode occurredAt", occurredAt);
  return `sha256:${sha256(canonicalJson({
    kind: "compelled_episode_interrupted/1",
    closureId,
    threadId,
    eventId,
    commandId,
    payload: interruptedCompelledEpisodePayload(),
    occurredAt,
  }))}`;
}

export function applyInterruptedCompelledEpisodeEventToThread(thread, event) {
  if (thread === null) {
    throw new IntegrityError(`interrupted episode event ${event.eventId} appears before a seed event`);
  }
  if (event.threadId !== thread.threadId) {
    throw new IntegrityError(`interrupted episode event ${event.eventId} belongs to another Thread`);
  }
  if (event.expectedVersion !== thread.version) {
    throw new IntegrityError(
      `interrupted episode event ${event.eventId} expected version ${event.expectedVersion}, replay has ${thread.version}`,
    );
  }
  assertPlainObject("interrupted episode payload", event.payload);
  assertExactKeys("interrupted episode payload", event.payload, [
    "episodeKind", "outcome", "reasonCode", "guardianDecision",
  ]);
  same("interrupted episode payload", event.payload, PAYLOAD);
  same("interrupted episode actor", event.actor, ACTOR);
  same("interrupted episode provenance", event.provenance, PROVENANCE);
  if (event.authorizationId !== null) {
    throw new IntegrityError(`interrupted episode event ${event.eventId} must not expose private authorization`);
  }
  return {
    ...thread,
    version: thread.version + 1,
    provenance: {
      ...thread.provenance,
      lastEventId: event.eventId,
    },
  };
}

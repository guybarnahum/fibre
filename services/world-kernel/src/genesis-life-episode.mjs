import {
  MAX_COMMAND_PAYLOAD_BYTES,
  IntegrityError,
  assertExactKeys,
  assertId,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { normalizeRichPassAEpisode } from "./genesis-rich-life-episode.mjs";

export const THREAD_LIFE_EPISODE_RECORDED = "THREAD_LIFE_EPISODE_RECORDED";

const LEGACY_PAYLOAD_KEYS = Object.freeze([
  "episodeId",
  "ageAtEvent",
  "placeRef",
  "participantRefs",
  "observableAction",
  "structureRef",
  "introducedParticipants",
]);
const RICH_PAYLOAD_KEYS = Object.freeze([...LEGACY_PAYLOAD_KEYS, "intellectualEncounter"]);

function assertPayloadKeys(candidate, name) {
  const actual = Object.keys(candidate).sort();
  const matches = [LEGACY_PAYLOAD_KEYS, RICH_PAYLOAD_KEYS].some((keys) => {
    const expected = [...keys].sort();
    return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
  });
  if (!matches) assertExactKeys(name, candidate, LEGACY_PAYLOAD_KEYS);
}

function payloadFromEpisode(episode) {
  const payload = {
    episodeId: episode.episodeId,
    ageAtEvent: episode.ageAtEvent,
    placeRef: episode.placeRef,
    participantRefs: [...episode.participantRefs],
    observableAction: episode.observableAction,
    structureRef: episode.structureRef,
    introducedParticipants: structuredClone(episode.introducedParticipants),
  };
  if (Object.hasOwn(episode, "intellectualEncounter")) {
    payload.intellectualEncounter = structuredClone(episode.intellectualEncounter);
  }
  const payloadBytes = Buffer.byteLength(canonicalJson(payload), "utf8");
  if (payloadBytes > MAX_COMMAND_PAYLOAD_BYTES) {
    throw new TypeError(`Genesis life episode payload exceeds ${MAX_COMMAND_PAYLOAD_BYTES} UTF-8 bytes`);
  }
  return payload;
}

export function normalizePublishedGenesisEpisode(candidate) {
  const episode = normalizeRichPassAEpisode(candidate);
  return {
    episode,
    payload: payloadFromEpisode(episode),
  };
}

export function genesisLifeEpisodeEventId({ threadId, genesisId, episode: candidate }) {
  assertId("threadId", threadId);
  assertId("genesisId", genesisId);
  const episode = normalizeRichPassAEpisode(candidate, { enforceObservableForm: false });
  const digest = sha256(canonicalJson({ threadId, genesisId, episode }));
  return `evt_${threadId}_life_${digest.slice(0, 24)}`;
}

function assertLifeEpisodeProvenance(event, episode) {
  assertPlainObject(`event ${event.eventId} provenance`, event.provenance);
  assertExactKeys(`event ${event.eventId} provenance`, event.provenance, [
    "source",
    "genesisId",
    "worldSpecRef",
    "episodeId",
    "pass",
  ]);
  if (event.provenance.source !== "genesis_birth") {
    throw new IntegrityError(`life episode event ${event.eventId} is not Genesis-published`);
  }
  assertId(`event ${event.eventId} genesisId`, event.provenance.genesisId);
  assertId(`event ${event.eventId} worldSpecRef`, event.provenance.worldSpecRef);
  if (event.provenance.pass !== "A") {
    throw new IntegrityError(`life episode event ${event.eventId} does not have Pass-A provenance`);
  }
  if (event.provenance.episodeId !== episode.episodeId) {
    throw new IntegrityError(`life episode event ${event.eventId} provenance does not match its episode`);
  }
}

export function applyGenesisLifeEpisodeEventToThread(thread, event, ErrorType = IntegrityError) {
  try {
    if (thread === null) throw new ErrorType(`life episode event ${event.eventId} appears before a seed event`);
    if (event.threadId !== thread.threadId) throw new ErrorType(`life episode event ${event.eventId} belongs to another Thread`);
    if (event.eventType !== THREAD_LIFE_EPISODE_RECORDED) throw new ErrorType(`event ${event.eventId} is not a Genesis life episode`);
    if (event.commandId !== null || event.commandDigest !== null) throw new ErrorType(`life episode event ${event.eventId} must not carry command metadata`);
    if (event.authorizationId !== null) throw new ErrorType(`life episode event ${event.eventId} must not carry authorization metadata`);
    if (event.expectedVersion !== thread.version) throw new ErrorType(`life episode event ${event.eventId} expected version ${event.expectedVersion}, replay has ${thread.version}`);

    assertPlainObject(`event ${event.eventId} payload`, event.payload);
    assertPayloadKeys(event.payload, `event ${event.eventId} payload`);
    const episode = normalizeRichPassAEpisode(
      { ...structuredClone(event.payload), occurredAt: event.occurredAt },
      { enforceObservableForm: false },
    );
    assertLifeEpisodeProvenance(event, episode);

    const expectedEventId = genesisLifeEpisodeEventId({
      threadId: thread.threadId,
      genesisId: event.provenance.genesisId,
      episode,
    });
    if (event.eventId !== expectedEventId) {
      throw new ErrorType(`life episode event ${event.eventId} does not match its Genesis episode content`);
    }

    const nextThread = {
      ...thread,
      version: thread.version + 1,
      provenance: {
        ...thread.provenance,
        lastEventId: event.eventId,
      },
    };
    if (event.resultingVersion !== nextThread.version) {
      throw new ErrorType(`life episode event ${event.eventId} has an invalid resulting version`);
    }
    return nextThread;
  } catch (error) {
    if (error instanceof ErrorType) throw error;
    throw new ErrorType(`life episode event ${event.eventId} cannot be applied: ${error.message}`);
  }
}

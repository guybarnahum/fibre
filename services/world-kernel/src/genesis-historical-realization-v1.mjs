import {
  assertExactKeys,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  GENESIS_RICH_PASS_A_RESPONSE_SCHEMA,
  validateRichPassAEpisode,
} from "./genesis-rich-life-episode.mjs";
import { assertHistoricalEnvelopeRealized } from "./genesis-historical-envelope-v1.mjs";

export const GENESIS_HISTORICAL_REALIZATION_VERSION = "genesis-historical-realization-v1";

const intellectualEncounterSchema = structuredClone(
  GENESIS_RICH_PASS_A_RESPONSE_SCHEMA.properties.episode.properties.intellectualEncounter,
);

export const GENESIS_HISTORICAL_REALIZATION_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["observableAction", "additionalParticipantRefs", "additionalIntroductions", "intellectualEncounter"],
  properties: Object.freeze({
    observableAction: Object.freeze({ type: "string" }),
    additionalParticipantRefs: Object.freeze({ type: "array", items: Object.freeze({ type: "string" }) }),
    additionalIntroductions: Object.freeze({
      type: "array",
      items: Object.freeze({
        type: "object",
        additionalProperties: false,
        required: ["provisionalPersonId", "roleRef"],
        properties: Object.freeze({
          provisionalPersonId: Object.freeze({ type: "string" }),
          roleRef: Object.freeze({ type: "string" }),
        }),
      }),
    }),
    intellectualEncounter: intellectualEncounterSchema,
  }),
});

function fail(message) { throw new TypeError(message); }
function unique(values) { return [...new Set(values)]; }

function normalizeAdditionalIntroduction(candidate, index) {
  const path = `historical realization.additionalIntroductions[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, ["provisionalPersonId", "roleRef"]);
  assertNonEmpty(`${path}.provisionalPersonId`, candidate.provisionalPersonId);
  assertNonEmpty(`${path}.roleRef`, candidate.roleRef);
  return structuredClone(candidate);
}

export function normalizeHistoricalRealizationModelOutput(candidate) {
  assertPlainObject("historical realization", candidate);
  assertExactKeys("historical realization", candidate, [
    "observableAction",
    "additionalParticipantRefs",
    "additionalIntroductions",
    "intellectualEncounter",
  ]);
  assertNonEmpty("historical realization.observableAction", candidate.observableAction);
  assertStringArray("historical realization.additionalParticipantRefs", candidate.additionalParticipantRefs);
  if (!Array.isArray(candidate.additionalIntroductions)) fail("historical realization.additionalIntroductions must be an array");
  const additionalIntroductions = candidate.additionalIntroductions.map(normalizeAdditionalIntroduction);
  const introductionIds = additionalIntroductions.map((item) => item.provisionalPersonId);
  if (new Set(introductionIds).size !== introductionIds.length) fail("historical realization additional introduction IDs must be unique");
  if (new Set(candidate.additionalParticipantRefs).size !== candidate.additionalParticipantRefs.length) fail("historical realization additionalParticipantRefs must be unique");
  return Object.freeze({
    observableAction: candidate.observableAction,
    additionalParticipantRefs: Object.freeze([...candidate.additionalParticipantRefs]),
    additionalIntroductions: Object.freeze(additionalIntroductions),
    intellectualEncounter: candidate.intellectualEncounter === null ? null : structuredClone(candidate.intellectualEncounter),
  });
}

export function historicalEnvelopeEpisodeId({ threadId, envelope }) {
  if (typeof threadId !== "string" || threadId.length === 0) fail("historical realization threadId is required");
  if (!envelope || typeof envelope.ordinal !== "number" || typeof envelope.occurredAt !== "string") fail("historical realization envelope is invalid");
  return `gepv2_${sha256(canonicalJson({
    version: GENESIS_HISTORICAL_REALIZATION_VERSION,
    threadId,
    ordinal: envelope.ordinal,
    occurredAt: envelope.occurredAt,
    placeRef: envelope.placeRef,
    structureRef: envelope.structureRef,
  })).slice(0, 40)}`;
}

export function materializeHistoricalEnvelopeEpisode({
  modelOutput,
  envelope,
  passAInput,
}) {
  const output = normalizeHistoricalRealizationModelOutput(modelOutput);
  const threadId = passAInput?.subject?.provisionalThreadId;
  if (typeof threadId !== "string" || threadId.length === 0) fail("historical realization Pass-A input lacks subject");

  const autoIntroductions = [];
  const autoParticipants = [threadId];
  if (envelope.counterpart !== null) {
    autoParticipants.push(envelope.counterpart.participantId);
    if (envelope.counterpart.introducedHere === true) {
      autoIntroductions.push({
        provisionalPersonId: envelope.counterpart.participantId,
        roleRef: envelope.counterpart.roleRef,
        introducedAt: envelope.occurredAt,
      });
    }
  }

  // The frozen envelope already owns a required counterpart. Models sometimes
  // repeat that exact introduction in the writable realization fields. Treat an
  // exact person+role repetition as redundant syntax rather than as a failed
  // historical fact. A conflicting role for the same frozen person still fails.
  const autoById = new Map(autoIntroductions.map((item) => [item.provisionalPersonId, item]));
  const additionalIntroductions = [];
  for (const item of output.additionalIntroductions) {
    const frozen = autoById.get(item.provisionalPersonId);
    if (frozen) {
      if (frozen.roleRef !== item.roleRef) {
        fail("historical realization cannot re-declare the frozen envelope counterpart with a different role");
      }
      continue;
    }
    additionalIntroductions.push({
      provisionalPersonId: item.provisionalPersonId,
      roleRef: item.roleRef,
      introducedAt: envelope.occurredAt,
    });
  }

  const participantRefs = unique([
    ...autoParticipants,
    ...output.additionalParticipantRefs,
    ...additionalIntroductions.map((item) => item.provisionalPersonId),
  ]);
  const episode = {
    episodeId: historicalEnvelopeEpisodeId({ threadId, envelope }),
    occurredAt: envelope.occurredAt,
    ageAtEvent: envelope.ageAtEvent,
    placeRef: envelope.placeRef,
    participantRefs,
    observableAction: output.observableAction,
    structureRef: envelope.selectionKind === "world_emergent" ? null : envelope.structureRef,
    introducedParticipants: [...autoIntroductions, ...additionalIntroductions],
    intellectualEncounter: output.intellectualEncounter,
  };
  const validated = validateRichPassAEpisode(episode, passAInput);
  assertHistoricalEnvelopeRealized(validated, envelope);
  return Object.freeze(validated);
}

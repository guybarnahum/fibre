import {
  assertExactKeys,
  assertPlainObject,
  canonicalJson,
} from "./persistence-common.mjs";
import {
  GENESIS_PASS_A_RESPONSE_SCHEMA,
  GenesisPassAValidationError,
  assertPassAInputBoundary,
  normalizePassAEpisode,
  validatePassAEpisode,
} from "./genesis-pass-a-domain.mjs";
import {
  GENESIS_INTELLECTUAL_ENCOUNTER_RESPONSE_SCHEMA,
  normalizeGenesisIntellectualEncounter,
} from "./genesis-intellectual-encounter.mjs";

export const GENESIS_RICH_PASS_A_OUTPUT_VERSION = "genesis-rich-pass-a-output-v1";

function splitRichEpisode(candidate) {
  assertPlainObject("rich Pass-A episode", candidate);
  const hasEncounter = Object.hasOwn(candidate, "intellectualEncounter");
  const base = structuredClone(candidate);
  delete base.intellectualEncounter;
  return { base, encounterCandidate: hasEncounter ? candidate.intellectualEncounter : null };
}

function participantRoleMap(input, sameEpisodeIntroductions = []) {
  const roles = new Map();
  for (const participant of input.initialRoster) roles.set(participant.participantId, new Set(participant.factualRoles));
  for (const participant of input.previouslyIntroducedParticipants) roles.set(participant.provisionalPersonId, new Set([participant.roleRef]));
  for (const participant of sameEpisodeIntroductions) roles.set(participant.provisionalPersonId, new Set([participant.roleRef]));
  return roles;
}

// EventStructurePool v2 deliberately treats participatingRoles as alternative
// counterpart roles. This is a rich-life-only policy: legacy Pass A continues to
// require every listed participatingRole. Keeping the rule here prevents Slice E
// from weakening the Gate-C validator while allowing portable affordances such as
// “caregiver OR sibling OR peer” to remain one reviewed structure.
export function assertRichStructureParticipation(episode, input) {
  if (episode.structureRef === null) return;
  const structure = input.offeredStructures.find(({ structureId }) => structureId === episode.structureRef);
  if (structure === undefined) return; // validatePassAEpisode owns the missing-ref error.
  if (structure.participatingRoles.length === 0) return;
  const participantRoles = participantRoleMap(input, episode.introducedParticipants);
  const represented = structure.participatingRoles.some((allowedRole) =>
    episode.participantRefs.some((participantId) => participantRoles.get(participantId)?.has(allowedRole)));
  if (!represented) {
    throw new GenesisPassAValidationError(
      "pass_a_structure_participation",
      `episode ${episode.episodeId} cites ${structure.structureId} without a participant in any allowed counterpart role (${structure.participatingRoles.join(", ")})`,
      { record: episode },
    );
  }
}

export function normalizeRichPassAEpisode(candidate, { enforceObservableForm = true } = {}) {
  const { base, encounterCandidate } = splitRichEpisode(candidate);
  const episode = normalizePassAEpisode(base, { enforceObservableForm });
  if (encounterCandidate === null || encounterCandidate === undefined) return episode;
  const intellectualEncounter = normalizeGenesisIntellectualEncounter(encounterCandidate, {
    participantRefs: episode.participantRefs,
  });
  return Object.freeze({ ...episode, intellectualEncounter });
}

export function validateRichPassAEpisode(candidate, inputCandidate) {
  const input = assertPassAInputBoundary(inputCandidate);
  const { base, encounterCandidate } = splitRichEpisode(candidate);
  const episode = validatePassAEpisode(base, input);
  assertRichStructureParticipation(episode, input);
  if (encounterCandidate === null || encounterCandidate === undefined) return episode;
  try {
    const intellectualEncounter = normalizeGenesisIntellectualEncounter(encounterCandidate, {
      participantRefs: episode.participantRefs,
    });
    return Object.freeze({ ...episode, intellectualEncounter });
  } catch (error) {
    throw new GenesisPassAValidationError("pass_a_intellectual_encounter", error.message, { record: candidate });
  }
}

export function normalizeRichPassAModelOutput(candidate, inputCandidate) {
  assertPlainObject("rich Pass-A model output", candidate);
  assertExactKeys("rich Pass-A model output", candidate, ["episode"]);
  return Object.freeze({
    outputVersion: GENESIS_RICH_PASS_A_OUTPUT_VERSION,
    episode: validateRichPassAEpisode(candidate.episode, inputCandidate),
  });
}

export function assertRichRepairPreservesEpisodeFacts(previousCandidate, repairedCandidate) {
  const previous = normalizeRichPassAEpisode(previousCandidate, { enforceObservableForm: false });
  const repaired = normalizeRichPassAEpisode(repairedCandidate, { enforceObservableForm: false });
  const facts = (episode) => {
    const copy = structuredClone(episode);
    delete copy.observableAction;
    return copy;
  };
  if (canonicalJson(facts(previous)) !== canonicalJson(facts(repaired))) {
    throw new GenesisPassAValidationError(
      "pass_a_record_repair_changed_facts",
      "Pass-A rich-life form repair changed event or intellectual-encounter facts instead of repairing only observableAction",
      { record: repaired },
    );
  }
  return repaired;
}

const encounterSchema = structuredClone(GENESIS_INTELLECTUAL_ENCOUNTER_RESPONSE_SCHEMA);
encounterSchema.type = ["object", "null"];

export const GENESIS_RICH_PASS_A_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["episode"],
  properties: {
    episode: {
      ...structuredClone(GENESIS_PASS_A_RESPONSE_SCHEMA.properties.episode),
      required: [
        ...structuredClone(GENESIS_PASS_A_RESPONSE_SCHEMA.properties.episode.required),
        "intellectualEncounter",
      ],
      properties: {
        ...structuredClone(GENESIS_PASS_A_RESPONSE_SCHEMA.properties.episode.properties),
        intellectualEncounter: encounterSchema,
      },
    },
  },
});

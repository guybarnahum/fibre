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
import { richCounterpartMode } from "./genesis-rich-participation-policy.mjs";

export const GENESIS_RICH_PASS_A_OUTPUT_VERSION = "genesis-rich-pass-a-output-v1";
export const GENESIS_RICH_MODEL_SUBJECT_PERSON_REF_FIELD = "subjectPersonRef";

function canonicalizeModelFacingEncounter(candidate) {
  if (candidate === null || candidate === undefined) return candidate;
  assertPlainObject("intellectualEncounter", candidate);

  // Canonical/persisted encounters continue to use participantRef. Model cognition
  // uses the less ambiguous subjectPersonRef so a teacher/mentor who merely mediates
  // access to a book/path is not mistaken for the encountered subject itself.
  if (!Object.hasOwn(candidate, GENESIS_RICH_MODEL_SUBJECT_PERSON_REF_FIELD)) {
    return structuredClone(candidate);
  }
  if (Object.hasOwn(candidate, "participantRef")) {
    throw new TypeError("model intellectualEncounter cannot contain both subjectPersonRef and participantRef");
  }
  assertExactKeys("model intellectualEncounter", candidate, [
    "kind",
    "subjectKind",
    "subjectLabel",
    GENESIS_RICH_MODEL_SUBJECT_PERSON_REF_FIELD,
    "accessMode",
  ]);
  const canonical = structuredClone(candidate);
  canonical.participantRef = canonical[GENESIS_RICH_MODEL_SUBJECT_PERSON_REF_FIELD];
  delete canonical[GENESIS_RICH_MODEL_SUBJECT_PERSON_REF_FIELD];
  return canonical;
}

function splitRichEpisode(candidate) {
  assertPlainObject("rich Pass-A episode", candidate);
  const hasEncounter = Object.hasOwn(candidate, "intellectualEncounter");
  const base = structuredClone(candidate);
  delete base.intellectualEncounter;
  return {
    base,
    encounterCandidate: hasEncounter
      ? canonicalizeModelFacingEncounter(candidate.intellectualEncounter)
      : null,
  };
}

function participantRoleMap(input, sameEpisodeIntroductions = []) {
  const roles = new Map();
  for (const participant of input.initialRoster) roles.set(participant.participantId, new Set(participant.factualRoles));
  for (const participant of input.previouslyIntroducedParticipants) roles.set(participant.provisionalPersonId, new Set([participant.roleRef]));
  for (const participant of sameEpisodeIntroductions) roles.set(participant.provisionalPersonId, new Set([participant.roleRef]));
  return roles;
}

function knownCounterpartExists(input, structure) {
  const knownRoles = participantRoleMap(input);
  return [...knownRoles.values()].some((roles) =>
    structure.participatingRoles.some((allowedRole) => roles.has(allowedRole)));
}

// EventStructurePool v2 treats participatingRoles as alternative counterpart roles.
// The reviewed rich counterpart policy says whether a counterpart must be present,
// may be absent for a genuinely self-directed realization, or must merely have been
// known before an episode whose subject is that counterpart's unavailability.
// Legacy Pass A remains untouched.
export function assertRichStructureParticipation(episode, input) {
  if (episode.structureRef === null) return;
  const structure = input.offeredStructures.find(({ structureId }) => structureId === episode.structureRef);
  if (structure === undefined) return; // validatePassAEpisode owns the missing-ref error.
  if (structure.participatingRoles.length === 0) return;

  const mode = richCounterpartMode(structure.structureId);
  if (mode === "present_optional") return;

  if (mode === "known_required") {
    if (!knownCounterpartExists(input, structure)) {
      throw new GenesisPassAValidationError(
        "pass_a_structure_participation",
        `episode ${episode.episodeId} cites ${structure.structureId} without a previously known counterpart in any allowed role (${structure.participatingRoles.join(", ")})`,
        { record: episode },
      );
    }
    return;
  }

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
  let split;
  try {
    split = splitRichEpisode(candidate);
  } catch (error) {
    throw new GenesisPassAValidationError("pass_a_intellectual_encounter", error.message, { record: candidate });
  }
  const { base, encounterCandidate } = split;
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
  // Form repair owns only observableAction. Compare the raw remaining model facts
  // without normalizing them: they may still contain an independent mechanical
  // defect that authoritative validation must classify immediately after repair.
  // Normalizing here would let the preservation check accidentally become a second
  // validation path and can leak a raw TypeError instead of a record-retryable gate.
  assertPlainObject("previous rich Pass-A repair candidate", previousCandidate);
  assertPlainObject("repaired rich Pass-A repair candidate", repairedCandidate);
  const facts = (candidate) => {
    const copy = structuredClone(candidate);
    delete copy.observableAction;
    return copy;
  };
  if (canonicalJson(facts(previousCandidate)) !== canonicalJson(facts(repairedCandidate))) {
    throw new GenesisPassAValidationError(
      "pass_a_record_repair_changed_facts",
      "Pass-A rich-life form repair changed event or intellectual-encounter facts instead of repairing only observableAction",
      { record: repairedCandidate },
    );
  }
  return repairedCandidate;
}

const encounterSchema = structuredClone(GENESIS_INTELLECTUAL_ENCOUNTER_RESPONSE_SCHEMA);
encounterSchema.type = ["object", "null"];
encounterSchema.required = encounterSchema.required.map((key) =>
  key === "participantRef" ? GENESIS_RICH_MODEL_SUBJECT_PERSON_REF_FIELD : key);
encounterSchema.properties[GENESIS_RICH_MODEL_SUBJECT_PERSON_REF_FIELD] = {
  ...structuredClone(encounterSchema.properties.participantRef),
  description: "The encountered subject's episode participant ID only when subjectKind=person; otherwise null. A teacher, mentor, caregiver, librarian, or peer who merely mediates access belongs in episode.participantRefs, not here.",
};
delete encounterSchema.properties.participantRef;
encounterSchema.properties.subjectKind = {
  ...structuredClone(encounterSchema.properties.subjectKind),
  description: "What the intellectual encounter is about. Use person only when the encountered subject itself is an episode participant; a mediator who points to a text, path, practice, idea, event, or community is not automatically the subject.",
};

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

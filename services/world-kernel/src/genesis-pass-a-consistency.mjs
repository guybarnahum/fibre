import { canonicalJson } from "./persistence-common.mjs";
import {
  GenesisPassAValidationError,
  assertPassAInputBoundary,
  validatePassAEpisode,
} from "./genesis-pass-a-domain.mjs";
import {
  GENESIS_RICH_COUNTERPART_POLICY_VERSION,
  richCounterpartMode,
} from "./genesis-rich-participation-policy.mjs";

const MILLIS_PER_MEAN_GREGORIAN_YEAR = 365.2425 * 24 * 60 * 60 * 1000;
const AGE_TOLERANCE_YEARS = 0.06;

function measuredAgeYears(bornAt, occurredAt) {
  return (Date.parse(occurredAt) - Date.parse(bornAt)) / MILLIS_PER_MEAN_GREGORIAN_YEAR;
}

function assertAgeWitness(episode, subject) {
  const measured = measuredAgeYears(subject.bornAt, episode.occurredAt);
  if (measured < 0) {
    throw new GenesisPassAValidationError(
      "pass_a_chronology",
      `episode ${episode.episodeId} predates the subject's birth`,
      { record: episode },
    );
  }
  if (Math.abs(measured - episode.ageAtEvent) > AGE_TOLERANCE_YEARS) {
    throw new GenesisPassAValidationError(
      "pass_a_age_witness",
      `episode ${episode.episodeId} ageAtEvent ${episode.ageAtEvent} does not match bornAt/occurredAt chronology (expected about ${measured.toFixed(3)})`,
      { record: episode },
    );
  }
}

function roleMap(input, sameEpisodeIntroductions = []) {
  const roles = new Map();
  for (const participant of input.initialRoster) roles.set(participant.participantId, new Set(participant.factualRoles));
  for (const participant of input.previouslyIntroducedParticipants) roles.set(participant.provisionalPersonId, new Set([participant.roleRef]));
  for (const participant of sameEpisodeIntroductions) roles.set(participant.provisionalPersonId, new Set([participant.roleRef]));
  return roles;
}

function assertStructureRoles(episode, input) {
  if (episode.structureRef === null) return;
  const structure = input.offeredStructures.find(({ structureId }) => structureId === episode.structureRef);
  if (structure === undefined) return; // validatePassAEpisode owns the missing-ref error.
  const participantRoles = roleMap(input, episode.introducedParticipants);
  for (const requiredRole of structure.participatingRoles) {
    const represented = episode.participantRefs.some((participantId) => participantRoles.get(participantId)?.has(requiredRole));
    if (!represented) {
      throw new GenesisPassAValidationError(
        "pass_a_structure_participation",
        `episode ${episode.episodeId} cites ${structure.structureId} without a participant in required role ${requiredRole}`,
        { record: episode },
      );
    }
  }
}

function usesRichAlternativeRolePolicy(input) {
  return input.policyWitness.policyVersion
    .split("+")
    .includes(GENESIS_RICH_COUNTERPART_POLICY_VERSION);
}

function assertOfferedStructureAffordance(input, affordedRoles) {
  const richAlternativeRoles = usesRichAlternativeRolePolicy(input);
  for (const structure of input.offeredStructures) {
    if (!richAlternativeRoles) {
      for (const role of structure.participatingRoles) {
        if (!affordedRoles.has(role)) {
          throw new GenesisPassAValidationError(
            "pass_a_structure_affordance",
            `offered structure ${structure.structureId} requires role ${role}, which the WorldSpec does not afford`,
          );
        }
      }
      continue;
    }

    // EventStructurePool v2 participatingRoles are alternatives, not an all-of list.
    // present_optional structures can be realized subject-only. Other rich structures
    // require at least one alternative counterpart role to be world-afforded; the
    // episode-level rich validator still owns whether a required/known counterpart is
    // actually represented for a selected realization.
    if (structure.participatingRoles.length === 0 || richCounterpartMode(structure.structureId) === "present_optional") {
      continue;
    }
    if (!structure.participatingRoles.some((role) => affordedRoles.has(role))) {
      throw new GenesisPassAValidationError(
        "pass_a_structure_affordance",
        `offered rich structure ${structure.structureId} has no WorldSpec-afforded alternative counterpart role (${structure.participatingRoles.join(", ")})`,
      );
    }
  }
}

export function validateConsistentPassAEpisode(candidate, inputCandidate) {
  const input = assertPassAInputBoundary(inputCandidate);
  const episode = validatePassAEpisode(candidate, input);
  if (!episode.participantRefs.includes(input.subject.provisionalThreadId)) {
    throw new GenesisPassAValidationError(
      "pass_a_subject_participation",
      `episode ${episode.episodeId} does not include the provisional Thread`,
      { record: episode },
    );
  }
  if (input.priorEpisodes.some(({ episodeId }) => episode.episodeId === episodeId)) {
    throw new GenesisPassAValidationError(
      "pass_a_episode_identity",
      `episode ID ${episode.episodeId} already exists in candidate history`,
      { record: episode },
    );
  }
  assertAgeWitness(episode, input.subject);
  assertStructureRoles(episode, input);
  return episode;
}

export function assertPassAHistoryConsistency(inputCandidate) {
  const input = assertPassAInputBoundary(inputCandidate);
  const worldPlaceIds = new Set(input.world.places.map(({ placeId }) => placeId));
  const affordedRoles = new Set(input.world.affordedRoles);
  const knownParticipants = new Set(input.initialRoster.map(({ participantId }) => participantId));
  const seenEpisodeIds = new Set();
  const derivedIntroductions = [];
  let previousOccurredAt = null;

  for (const episode of input.priorEpisodes) {
    if (seenEpisodeIds.has(episode.episodeId)) {
      throw new GenesisPassAValidationError("pass_a_episode_identity", `duplicate prior episode ID ${episode.episodeId}`, { record: episode });
    }
    seenEpisodeIds.add(episode.episodeId);
    if (previousOccurredAt !== null && Date.parse(episode.occurredAt) <= Date.parse(previousOccurredAt)) {
      throw new GenesisPassAValidationError("pass_a_chronology", "prior episode chronology is not strictly increasing", { record: episode });
    }
    previousOccurredAt = episode.occurredAt;
    if (Date.parse(episode.occurredAt) > Date.parse(input.chronologyEndsAt)) {
      throw new GenesisPassAValidationError("pass_a_chronology", `prior episode ${episode.episodeId} exceeds chronologyEndsAt`, { record: episode });
    }
    if (Date.parse(episode.occurredAt) < Date.parse(input.subject.bornAt)) {
      throw new GenesisPassAValidationError("pass_a_chronology", `prior episode ${episode.episodeId} predates birth`, { record: episode });
    }
    if (!worldPlaceIds.has(episode.placeRef)) {
      throw new GenesisPassAValidationError("pass_a_place_ref", `prior episode ${episode.episodeId} uses unknown place ${episode.placeRef}`, { record: episode });
    }
    assertAgeWitness(episode, input.subject);

    const sameEpisodeIds = new Set();
    for (const introduced of episode.introducedParticipants) {
      if (!affordedRoles.has(introduced.roleRef)) {
        throw new GenesisPassAValidationError("pass_a_participant_introduction", `prior introduction role ${introduced.roleRef} is not afforded by the WorldSpec`, { record: episode });
      }
      if (introduced.introducedAt !== episode.occurredAt) {
        throw new GenesisPassAValidationError("pass_a_participant_introduction", `prior participant ${introduced.provisionalPersonId} has inconsistent introducedAt`, { record: episode });
      }
      if (knownParticipants.has(introduced.provisionalPersonId) || sameEpisodeIds.has(introduced.provisionalPersonId)) {
        throw new GenesisPassAValidationError("pass_a_participant_introduction", `prior participant ${introduced.provisionalPersonId} is introduced more than once`, { record: episode });
      }
      sameEpisodeIds.add(introduced.provisionalPersonId);
    }
    for (const id of sameEpisodeIds) knownParticipants.add(id);
    for (const participantRef of episode.participantRefs) {
      if (!knownParticipants.has(participantRef)) {
        throw new GenesisPassAValidationError("pass_a_participant_ref", `prior episode ${episode.episodeId} uses participant ${participantRef} before introduction`, { record: episode });
      }
    }
    if (!episode.participantRefs.includes(input.subject.provisionalThreadId)) {
      throw new GenesisPassAValidationError("pass_a_subject_participation", `prior episode ${episode.episodeId} does not include the provisional Thread`, { record: episode });
    }
    derivedIntroductions.push(...episode.introducedParticipants);
  }

  if (canonicalJson(derivedIntroductions) !== canonicalJson(input.previouslyIntroducedParticipants)) {
    throw new GenesisPassAValidationError(
      "pass_a_participant_history",
      "previouslyIntroducedParticipants does not exactly match introductions in priorEpisodes",
    );
  }

  assertOfferedStructureAffordance(input, affordedRoles);

  return input;
}

import { canonicalJson, sha256 } from "./persistence-common.mjs";
import { assertPassAInputBoundary } from "./genesis-pass-a-domain.mjs";

export const GENESIS_PASS_A_COGNITION_INPUT_VERSION = "genesis-pass-a-cognition-input-v1";

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function projectPriorEpisode(episode) {
  return {
    episodeId: episode.episodeId,
    occurredAt: episode.occurredAt,
    ageAtEvent: episode.ageAtEvent,
    placeRef: episode.placeRef,
    participantRefs: [...episode.participantRefs],
    observableAction: episode.observableAction,
    introducedParticipants: structuredClone(episode.introducedParticipants),
  };
}

function projectCurrentAffordance(structure) {
  return {
    structureId: structure.structureId,
    abstractSituation: structure.abstractSituation,
    participatingRoles: [...structure.participatingRoles],
  };
}

export function projectPassAInputForCognition(candidate) {
  const input = assertPassAInputBoundary(candidate);
  return Object.freeze({
    inputVersion: GENESIS_PASS_A_COGNITION_INPUT_VERSION,
    subject: structuredClone(input.subject),
    world: structuredClone(input.world),
    developmentalWindow: structuredClone(input.developmentalWindow),
    chronologyEndsAt: input.chronologyEndsAt,
    initialRoster: structuredClone(input.initialRoster),
    priorEpisodes: Object.freeze(input.priorEpisodes.map((episode) => Object.freeze(projectPriorEpisode(episode)))),
    previouslyIntroducedParticipants: structuredClone(input.previouslyIntroducedParticipants),
    offeredStructures: Object.freeze(input.offeredStructures.map((structure) => Object.freeze(projectCurrentAffordance(structure)))),
    policyWitness: structuredClone(input.policyWitness),
  });
}

export function passACognitionInputDigest(candidate) {
  return digest(candidate);
}

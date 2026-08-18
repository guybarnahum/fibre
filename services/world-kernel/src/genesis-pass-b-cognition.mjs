import { canonicalJson, sha256 } from "./persistence-common.mjs";
import { normalizePassBInput } from "./genesis-pass-b-domain.mjs";

export const GENESIS_PASS_B_COGNITION_INPUT_VERSION = "genesis-pass-b-cognition-input-v1";

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function projectPriorMemory(memory) {
  return {
    memoryRef: memory.memoryRef,
    episodeRefs: [...memory.episodeRefs],
    rememberedContent: memory.rememberedContent,
    uncertainty: [...memory.uncertainty],
  };
}

export function projectPassBInputForCognition(candidate) {
  const input = normalizePassBInput(candidate);
  return Object.freeze({
    inputVersion: GENESIS_PASS_B_COGNITION_INPUT_VERSION,
    subject: structuredClone(input.subject),
    world: structuredClone(input.world),
    rememberingAt: input.rememberingAt,
    ageAtRemembering: input.ageAtRemembering,
    chronologyEndsAt: input.chronologyEndsAt,
    history: Object.freeze(input.history.map((episode) => Object.freeze(structuredClone(episode)))),
    priorMemories: Object.freeze(input.priorMemories.map((memory) => Object.freeze(projectPriorMemory(memory)))),
    genomeExposure: input.genomeExposure === null ? null : structuredClone(input.genomeExposure),
    policyWitness: Object.freeze({ policyVersion: input.policyWitness.policyVersion }),
  });
}

export function passBCognitionInputDigest(candidate) {
  return digest(projectPassBInputForCognition(candidate));
}

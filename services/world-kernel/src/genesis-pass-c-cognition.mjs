import { canonicalJson, sha256 } from "./persistence-common.mjs";
import { normalizePassCInput } from "./genesis-pass-c-domain.mjs";

export const GENESIS_PASS_C_COGNITION_INPUT_VERSION = "genesis-pass-c-cognition-input-v1";

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

export function projectPassCInputForCognition(candidate) {
  const input = normalizePassCInput(candidate);
  return Object.freeze({
    inputVersion: GENESIS_PASS_C_COGNITION_INPUT_VERSION,
    mode: input.mode,
    targetMemory: structuredClone(input.targetMemory),
    formation: structuredClone(input.formation),
    priorMeaning: input.priorMeaning === null ? null : structuredClone(input.priorMeaning),
    trigger: input.trigger === null ? null : structuredClone(input.trigger),
    policyWitness: structuredClone(input.policyWitness),
  });
}

export function passCCognitionInputDigest(candidate) {
  return digest(projectPassCInputForCognition(candidate));
}

import { canonicalJson } from "./persistence-common.mjs";
import {
  DIGNITY_GUARDIAN_V4_POLICY,
  DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
  DIGNITY_GUARDIAN_V4_SYSTEM_PROMPT,
  DIGNITY_GUARDIAN_V4_PROMPT_HASH,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  buildDignityGuardianV4Evidence,
  buildDignityGuardianV4ModelInput,
  buildDignityGuardianV4ResponseSchema,
  dignityGuardianV4ResolvedSchemaHash,
  validateDignityGuardianV4Output,
  derivePrivateAssessmentFromV4Output,
  semanticDignityGuardianV4,
} from "./dignity-guardian-v4.mjs";

// One current Guardian in the active code path. Historical v2/v3/v4 evidence
// remains immutable in committed validation artifacts and Git history; active
// runtime code does not keep parallel executable Guardians merely for replay.
export const DIGNITY_GUARDIAN_POLICY = DIGNITY_GUARDIAN_V4_POLICY;
export const DIGNITY_GUARDIAN_PROMPT_SCHEMA_VERSION = DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION;
export const DIGNITY_GUARDIAN_RESPONSE_SCHEMA_VERSION = DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION;
export const DIGNITY_GUARDIAN_SYSTEM_PROMPT = DIGNITY_GUARDIAN_V4_SYSTEM_PROMPT;
export const DIGNITY_GUARDIAN_PROMPT_HASH = DIGNITY_GUARDIAN_V4_PROMPT_HASH;
export const DIGNITY_GUARDIAN_RESPONSE_SCHEMA_GENERATOR_HASH =
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH;

export const buildGuardianEvidence = buildDignityGuardianV4Evidence;
export const buildGuardianModelInput = buildDignityGuardianV4ModelInput;
export const buildGuardianResponseSchema = buildDignityGuardianV4ResponseSchema;
export const guardianResolvedSchemaHash = dignityGuardianV4ResolvedSchemaHash;
export const runGuardian = semanticDignityGuardianV4;

function rawV4Output(output) {
  if (output !== null && typeof output === "object" && !Array.isArray(output) &&
      Object.hasOwn(output, "decision")) {
    return output;
  }
  if (output === null || typeof output !== "object" || Array.isArray(output)) {
    return output;
  }
  if (!Object.hasOwn(output, "modelDecision") || !Object.hasOwn(output, "factors")) {
    return output;
  }
  return {
    decision: output.modelDecision,
    rationale: output.rationale,
    factors: Object.fromEntries(
      Object.entries(output.factors).map(([name, factor]) => [name, {
        effect: factor.effect,
        evidenceRefs: [...factor.evidenceRefs],
      }]),
    ),
  };
}

// Generic names are retained only as the stable active Guardian API used by
// persistence/inspection code. They resolve to the current policy, not to v3.
export function validateSemanticGuardianModelOutput(capsule, output) {
  const normalized = validateDignityGuardianV4Output(capsule, rawV4Output(output));
  if (Object.hasOwn(output ?? {}, "modelDecision") && canonicalJson(normalized) !== canonicalJson(output)) {
    throw new TypeError("persisted Guardian output does not match the current Guardian normalization");
  }
  return normalized;
}

export function derivePrivateAssessmentFromSemanticOutput(capsule, output) {
  return derivePrivateAssessmentFromV4Output(capsule, rawV4Output(output));
}

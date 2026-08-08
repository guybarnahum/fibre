import {
  IntegrityError,
  assertPlainObject,
  canonicalJson,
} from "./persistence-common.mjs";
import {
  assertStanceMatchesTrace,
  formPrivateParticipationStance,
} from "./private-participation.mjs";
import { derivePrivateAssessmentFromSemanticOutput } from "./dignity-guardian.mjs";

export function deriveDignityTraceFromPersistedRequest(trace, guardianInput, guardianAssessment) {
  if (trace === null || typeof trace !== "object" || Array.isArray(trace)) {
    throw new TypeError("persisted private request trace is required");
  }
  if (trace.privateStance === null || trace.privateStance === undefined) {
    throw new TypeError("persisted private stance is required");
  }
  if (trace.appraisal?.causalContext?.selectionAuthority !== "fibre") {
    throw new TypeError("causal dignity inspection requires Fibre-owned appraisal context");
  }
  assertPlainObject("persisted Guardian input", guardianInput);
  assertPlainObject("persisted Guardian assessment", guardianAssessment);
  if (guardianInput.appraisalId !== trace.appraisalId ||
      guardianAssessment.appraisalId !== trace.appraisalId ||
      guardianAssessment.inputId !== guardianInput.inputId) {
    throw new IntegrityError("persisted Guardian evidence does not match the private request appraisal");
  }

  // Replay is intentionally not a model call. Re-validate the stored bounded
  // output against the stored cognition capsule and deterministically derive
  // the stance that the model judgment authorized Fibre to persist.
  const derivedAssessment = derivePrivateAssessmentFromSemanticOutput(
    guardianInput.capsule,
    guardianAssessment.modelOutput,
  );
  if (canonicalJson(derivedAssessment) !== canonicalJson(guardianAssessment.derivedAssessment)) {
    throw new IntegrityError("persisted Guardian derived assessment does not match stored model output");
  }
  const derivedStance = formPrivateParticipationStance(derivedAssessment);
  assertStanceMatchesTrace(trace, derivedStance);
  if (canonicalJson(derivedStance) !== canonicalJson(trace.privateStance)) {
    throw new IntegrityError(
      "persisted private stance does not match persisted semantic Guardian evidence",
    );
  }

  return {
    policy: structuredClone(guardianAssessment.policy),
    model: {
      provider: guardianAssessment.provider,
      modelId: guardianAssessment.modelId,
      promptSchemaVersion: guardianAssessment.promptSchemaVersion,
      promptHash: guardianAssessment.promptHash,
      responseSchemaVersion: guardianAssessment.responseSchemaVersion,
      responseSchemaHash: guardianAssessment.responseSchemaHash,
    },
    stateSelection: structuredClone(guardianInput.stateSelection),
    factors: structuredClone(derivedAssessment.factors),
    rationale: derivedAssessment.rationale,
    evidenceRefs: [...derivedAssessment.evidenceRefs],
    feelings: [...derivedAssessment.feelings],
    conflictingMotives: [...derivedAssessment.conflictingMotives],
    uncertainties: [...derivedAssessment.uncertainties],
    repairQuestions: [...derivedAssessment.repairQuestions],
    knownAlternatives: derivedAssessment.knownAlternatives.map((entity) => ({ ...entity })),
    relationshipImpact: structuredClone(derivedAssessment.relationshipImpact),
    desiredAction: derivedStance.desiredAction,
    dignityBand: derivedStance.dignityBand,
    score: derivedStance.score,
    replaySource: "persisted_guardian_assessment",
    modelRecalled: false,
    matchesPersistedStance: true,
  };
}

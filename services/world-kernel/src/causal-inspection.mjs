import {
  IntegrityError,
  canonicalJson,
} from "./persistence-common.mjs";
import {
  assertStanceMatchesTrace,
  formPrivateParticipationStance,
} from "./private-participation.mjs";
import { dignityGuardianV2 } from "./dignity-guardian.mjs";

export function deriveDignityTraceFromPersistedRequest(trace) {
  if (trace === null || typeof trace !== "object" || Array.isArray(trace)) {
    throw new TypeError("persisted private request trace is required");
  }
  if (trace.privateStance === null || trace.privateStance === undefined) {
    throw new TypeError("persisted private stance is required");
  }
  if (trace.appraisal?.causalContext?.selectionAuthority !== "fibre") {
    throw new TypeError("causal dignity inspection requires Fibre-owned appraisal context");
  }

  // Re-derive from the persisted capsule only. This deliberately has no Thread,
  // store, request, fixture, or runtime side channel.
  const assessment = dignityGuardianV2(structuredClone(trace.appraisal));
  const derivedStance = formPrivateParticipationStance(assessment);
  assertStanceMatchesTrace(trace, derivedStance);
  if (canonicalJson(derivedStance) !== canonicalJson(trace.privateStance)) {
    throw new IntegrityError(
      "persisted private stance does not match Dignity Guardian V2 re-derivation from its capsule",
    );
  }

  return {
    policy: structuredClone(assessment.policy),
    factors: structuredClone(assessment.factors),
    rationale: assessment.rationale,
    evidenceRefs: [...assessment.evidenceRefs],
    feelings: [...assessment.feelings],
    conflictingMotives: [...assessment.conflictingMotives],
    uncertainties: [...assessment.uncertainties],
    repairQuestions: [...assessment.repairQuestions],
    knownAlternatives: assessment.knownAlternatives.map((entity) => ({ ...entity })),
    relationshipImpact: structuredClone(assessment.relationshipImpact),
    desiredAction: derivedStance.desiredAction,
    dignityBand: derivedStance.dignityBand,
    score: derivedStance.score,
    matchesPersistedStance: true,
  };
}

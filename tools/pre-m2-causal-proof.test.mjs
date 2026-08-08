import assert from "node:assert/strict";
import test from "node:test";

import { runPreM2CausalProof } from "./pre-m2-causal-proof.mjs";

test("pre-M2 causal report proves semantic wiring without claiming personhood evidence", () => {
  const report = runPreM2CausalProof();
  assert.equal(report.version, 4);
  assert.equal(report.evidenceClass, "scripted_wiring_only");
  assert.equal(report.architecturePassed, true);
  assert.equal(report.standingDifferentialGatePassed, false);
  assert.equal(report.standingGateBlockers.length, 3);

  assert.equal(report.architecture.sameMaterialRequest, true);
  assert.equal(report.architecture.callerAuthoredJudgmentReachable, false);
  assert.equal(report.architecture.semanticFitClaimed, false);
  assert.equal(report.architecture.persistedCognitionInput, true);
  assert.equal(report.architecture.persistedGuardianAssessment, true);
  assert.equal(report.architecture.fibreOwnedStateSelection, true);
  assert.equal(report.architecture.mina.desiredAction, "clarify");
  assert.equal(report.architecture.daniel.desiredAction, "clarify");
  assert.equal(report.architecture.restart.survived, true);
  assert.equal(report.architecture.restart.replaySource, "persisted_guardian_assessment");
  assert.equal(report.architecture.restart.modelRecalled, false);
  assert.equal(report.architecture.restart.modelCallCountAfterRestart, 0);

  assert.equal(report.modelFailure.cognitionInputPersisted, true);
  assert.equal(report.modelFailure.guardianAssessmentPersisted, false);
  assert.equal(report.modelFailure.privateStancePersisted, false);
  assert.equal(report.modelFailure.fallbackJudgmentSynthesized, false);

  assert.equal(report.semanticState.evidenceClass, "scripted_supporting_causality_only");
  assert.equal(report.semanticState.standingGateClaimed, false);
  assert.equal(report.semanticState.selected, true);
  assert.equal(report.semanticState.stateCited, true);
  assert.equal(report.semanticState.desiredAction, "refuse");

  assert.equal(report.alignedAuthority.evidenceClass, "scripted_authority_wiring_only");
  assert.equal(report.alignedAuthority.desiredAction, "accept");
  assert.equal(report.alignedAuthority.dignityBand, "high");
  assert.equal(report.alignedAuthority.authorizedAction, "accept");
  assert.equal(report.alignedAuthority.aligned, true);
  assert.deepEqual(report.alignedAuthority.obligationReferences, []);

  assert.equal(report.liveCanonicalBasis.modelBackedSemanticPathImplemented, true);
  assert.equal(report.liveCanonicalBasis.willingSemanticAcceptArchitecturallyReachable, true);
  assert.equal(report.liveCanonicalBasis.semanticIndividualityProved, false);
  assert.equal(report.liveCanonicalBasis.semanticStateBehaviorallyCausalInScriptedSupportingEvidence, true);
  assert.equal(report.liveCanonicalBasis.developmentLive, false);
  assert.equal(report.liveCanonicalBasis.relationshipStateV0Persistable, true);

  assert.equal(report.scoreClaims.m1Frozen, "11/26");
  assert.equal(report.scoreClaims.preM2Checkpoint, "11/26");
  assert.match(report.scoreClaims.nonInterchangeability, /remains 0/i);
  assert.match(report.scoreClaims.dignityAndConsent, /remains 1/i);
  assert.equal(report.scoreClaims.development, "remains 0");
  assert.equal(report.scoreClaims.cognitionReplaceability, "remains 1");
});

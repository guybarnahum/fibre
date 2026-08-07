import assert from "node:assert/strict";
import test from "node:test";

import { runPreM2CausalProof } from "./pre-m2-causal-proof.mjs";

const FACTOR_KEYS = [
  "identityAlignment",
  "individualizedAdvantage",
  "requesterNeed",
  "relationalMeaning",
  "respectAndReciprocity",
  "participationTerms",
  "obligationsAndOpportunityCost",
];

test("pre-M2 causal report proves the socket while keeping the individuality gate open", () => {
  const report = runPreM2CausalProof();
  assert.equal(report.version, 3);
  assert.equal(report.architecturePassed, true);
  assert.equal(report.standingDifferentialGatePassed, false);
  assert.equal(report.standingGateBlockers.length, 3);

  assert.equal(report.architecture.sameMaterialRequest, true);
  assert.equal(report.architecture.callerAuthoredJudgmentReachable, false);
  assert.equal(report.architecture.semanticFitClaimed, false);
  assert.equal(report.architecture.mina.desiredAction, "clarify");
  assert.equal(report.architecture.daniel.desiredAction, "clarify");
  assert.match(report.architecture.downstream.mina, /no runtime acquired/);
  assert.match(report.architecture.downstream.daniel, /no runtime acquired/);
  assert.equal(report.architecture.restart.survived, true);
  assert.equal(report.architecture.restart.factorTraceRederived, true);
  assert.deepEqual(
    Object.keys(report.architecture.mina.factorJudgments).sort(),
    [...FACTOR_KEYS].sort(),
  );
  assert.equal(report.architecture.mina.factorTraceMatchesPersistedStance, true);
  assert.equal(report.architecture.daniel.factorTraceMatchesPersistedStance, true);

  assert.equal(report.canonicalObligationLifecycle.currentGuardianDesiredAction, "clarify");
  assert.equal(report.canonicalObligationLifecycle.kernelAuthorizedAction, "accept");
  assert.equal(report.canonicalObligationLifecycle.participationBasis, "obligation_override");
  assert.equal(report.canonicalObligationLifecycle.actorRan, true);
  assert.equal(report.canonicalObligationLifecycle.goalGuardianDecision, "pass");
  assert.equal(report.canonicalObligationLifecycle.freezeCompleted, true);
  assert.equal(report.canonicalObligationLifecycle.obligationDischarged, true);
  assert.equal(report.canonicalObligationLifecycle.restartSurvived, true);
  assert.equal(report.canonicalObligationLifecycle.memoryCreationInThisFreshFixture, false);

  assert.equal(report.liveCanonicalBasis.willingSemanticAcceptReachable, false);
  assert.equal(report.liveCanonicalBasis.obligationOverrideExecutionReachable, true);
  assert.equal(report.liveCanonicalBasis.authorizationIntegrityLive, true);
  assert.equal(report.liveCanonicalBasis.developmentLive, false);
  assert.match(report.liveCanonicalBasis.reversalCondition, /semantic Guardian/i);

  assert.equal(report.selfModelSwap.namedCandidateField, "currentState.selfModel");
  assert.equal(report.selfModelSwap.standingCounterfactualSatisfied, false);
  assert.equal(report.selfModelSwap.minaAfterSwap.desiredAction, "clarify");
  assert.equal(report.selfModelSwap.danielAfterSwap.desiredAction, "clarify");

  assert.match(report.proseHonesty.purpose, /cannot manufacture semantic fit/i);
  assert.equal(report.proseHonesty.results.length, 3);
  for (const result of report.proseHonesty.results) {
    assert.equal(result.desiredAction, "clarify");
    assert.equal(result.dignityBand, "contested");
    assert.ok(result.score < 70);
  }

  assert.match(report.otherDomain.purpose, /no privileged infrastructure vocabulary/i);
  assert.equal(report.otherDomain.copywriter.desiredAction, "clarify");

  assert.equal(report.scoreClaims.m1Frozen, "11/26");
  assert.equal(report.scoreClaims.preM2Checkpoint, "11/26");
  assert.equal(report.scoreClaims.nonInterchangeability, "remains 0");
  assert.equal(report.scoreClaims.dignityAndConsent, "remains 1");
  assert.equal(report.scoreClaims.development, "remains 0");
  assert.equal(report.scoreClaims.cognitionReplaceability, "remains 1");
});

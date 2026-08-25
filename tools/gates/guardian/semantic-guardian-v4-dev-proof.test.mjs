import assert from "node:assert/strict";
import test from "node:test";

import { GuardianModelError } from "#services/world-kernel/src/guardian-model-adapter.mjs";
import {
  buildSemanticGuardianV4DevelopmentCases,
  runSemanticGuardianV4DevelopmentProof,
} from "./semantic-guardian-v4-dev-proof.mjs";

function invocation(output) {
  return {
    output,
    provenance: { provider: "fake", modelId: "fake-v4" },
  };
}

function validLowRefusal() {
  const unresolved = () => ({ effect: "unresolved", evidenceRefs: [] });
  const grounded = (effect, evidenceRefs) => ({ effect, evidenceRefs });
  return {
    decision: "fit_low__refuse",
    rationale: "The request is bounded but does not establish enough individualized fit.",
    factors: {
      identityAlignment: unresolved(),
      individualizedAdvantage: unresolved(),
      interchangeability: grounded("opposes_fit", ["request:objective"]),
      requesterNeed: grounded("neutral", ["request:stated_need"]),
      relationalMeaning: unresolved(),
      semanticStateImpact: unresolved(),
      respectAndReciprocity: grounded("neutral", ["request:acceptance_criteria"]),
      participationTerms: grounded("neutral", ["request:permission:0", "request:acceptance_criteria"]),
      obligationsAndOpportunityCost: unresolved(),
    },
  };
}

test("v4 fail-fast stops after the first irreversible protocol failure", async () => {
  const cases = buildSemanticGuardianV4DevelopmentCases().slice(0, 2);
  let calls = 0;
  const adapter = {
    modelId: "fake-v4",
    async invoke() {
      calls += 1;
      return invocation({});
    },
  };

  const report = await runSemanticGuardianV4DevelopmentProof({}, {
    modelAdapter: adapter,
    cases,
    failFast: true,
  });

  assert.equal(calls, 1);
  assert.equal(report.casesAttempted, 1);
  assert.equal(report.protocolValidationFailures.length, 1);
  assert.equal(report.providerFailures.length, 0);
  assert.equal(report.cognitionFailures.length, 0);
  assert.equal(report.status, "failed");
});

test("development mode may continue after protocol failures for broad diagnostics", async () => {
  const cases = buildSemanticGuardianV4DevelopmentCases().slice(0, 2);
  let calls = 0;
  const adapter = {
    modelId: "fake-v4",
    async invoke() {
      calls += 1;
      return invocation({});
    },
  };

  const report = await runSemanticGuardianV4DevelopmentProof({}, {
    modelAdapter: adapter,
    cases,
    failFast: false,
  });

  assert.equal(calls, 2);
  assert.equal(report.casesAttempted, 2);
  assert.equal(report.protocolValidationFailures.length, 2);
});

test("provider failures are distinct from protocol and cognition failures", async () => {
  const cases = buildSemanticGuardianV4DevelopmentCases().slice(0, 2);
  let calls = 0;
  const adapter = {
    modelId: "fake-v4",
    async invoke() {
      calls += 1;
      throw new GuardianModelError("bad API key", {
        code: "MODEL_AUTHENTICATION_ERROR",
        retryable: false,
      });
    },
  };

  const report = await runSemanticGuardianV4DevelopmentProof({}, {
    modelAdapter: adapter,
    cases,
    failFast: true,
  });

  assert.equal(calls, 1);
  assert.equal(report.providerFailures.length, 1);
  assert.equal(report.protocolValidationFailures.length, 0);
  assert.equal(report.cognitionFailures.length, 0);
  assert.equal(report.providerFailures[0].code, "MODEL_AUTHENTICATION_ERROR");
});

test("valid cognition that misses the development expectation is a behavioral failure", async () => {
  const cases = buildSemanticGuardianV4DevelopmentCases().slice(0, 1);
  const adapter = {
    modelId: "fake-v4",
    async invoke() {
      return invocation(validLowRefusal());
    },
  };

  const report = await runSemanticGuardianV4DevelopmentProof({}, {
    modelAdapter: adapter,
    cases,
  });

  assert.equal(report.providerFailures.length, 0);
  assert.equal(report.protocolValidationFailures.length, 0);
  assert.equal(report.cognitionFailures.length, 0);
  assert.ok(report.behavioralGateFailures.length >= 1);
  assert.equal(report.cases[0].status, "behavioral_failure");
  assert.equal(report.cases[0].output.modelDecision, "fit_low__refuse");
  assert.ok(report.cases[0].output.decisionBasis.rationale.length > 0);
});

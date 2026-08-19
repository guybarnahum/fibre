import assert from "node:assert/strict";
import test from "node:test";

import {
  E2_H6_PARTICIPATION_ARM,
  E2_H6_PARTICIPATION_EVIDENCE_VERSION,
  E2_H6_PARTICIPATION_PROTOCOL_VERSION,
  asE2H6ParticipationEvidence,
} from "./genesis-rich-life-e2-h6-participation.mjs";

test("E2 H6 participation evidence preserves the failed A0 baseline boundary and witnesses only mechanical corrections", () => {
  const source = {
    evidenceVersion: "a0",
    protocolVersion: "a0-protocol",
    status: "complete",
    arm: "A0_current_pass_a",
    generator: { promptHash: "sha256:fixture" },
    worlds: [],
    admissionVerdict: null,
  };
  const result = asE2H6ParticipationEvidence(source);

  assert.equal(result.evidenceVersion, E2_H6_PARTICIPATION_EVIDENCE_VERSION);
  assert.equal(result.protocolVersion, E2_H6_PARTICIPATION_PROTOCOL_VERSION);
  assert.equal(result.arm, E2_H6_PARTICIPATION_ARM);
  assert.equal(result.pairedBaselineArm, "A0_current_pass_a_failed");
  assert.equal(result.correction.kind, "mechanical_affordance_truthfulness_and_retry_scope");
  assert.equal(result.correction.recordLocalRetry.rejectedRecordVisibleToRetryCognition, false);
  assert.equal(result.correction.recordLocalRetry.qualitySignalVisibleToRetryCognition, false);
  assert.match(result.correction.counterpartPolicyWitness.digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(result.generator.promptHash, source.generator.promptHash);
  assert.equal(result.generator.counterpartPolicyWitness.digest, result.correction.counterpartPolicyWitness.digest);
  assert.equal(result.admissionVerdict, null);
  assert.equal(source.arm, "A0_current_pass_a");
});

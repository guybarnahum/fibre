import assert from "node:assert/strict";
import test from "node:test";

import {
  G4_V3_CALIBRATION_CORPUS_DIGEST,
  G4_V3_CALIBRATION_CORPUS_FREEZE_COMMIT,
  G4_V3_CALIBRATION_FIFTY_EPISODE_MINIMUM,
  G4_V3_CALIBRATION_INITIAL_COMPLIANCE_REQUIRED,
  G4_V3_CALIBRATION_MODEL_ID,
  G4_V3_CALIBRATION_RUNNER_POLICY,
  G4_V3_CALIBRATION_TRIAL_COUNT,
  calibrationPreflight,
  evaluateCalibrationResults,
  initialDraftMechanicalMetric,
} from "./genesis-g4-v3-calibration-runner.mjs";

function terminalResult(index, { admitted = true, initialWithin1200 = true, terminalGate = null } = {}) {
  return {
    status: admitted ? "ADMITTED" : "MECHANICAL_FAILURE",
    trialOrdinal: index + 1,
    mechanical: {
      terminalGate,
      initialDraft: {
        withinAuthoritative1200ByteLimit: initialWithin1200,
      },
      failedGateCensus: {},
    },
  };
}

function fullSample({ admittedCount = 225, initialWithin1200Count = 225 } = {}) {
  return Array.from({ length: G4_V3_CALIBRATION_TRIAL_COUNT }, (_, index) => terminalResult(index, {
    admitted: index < admittedCount,
    initialWithin1200: index < initialWithin1200Count,
    terminalGate: index < admittedCount ? null : "record_repair_exhausted",
  }));
}

test("G4-v3 calibration runner is pinned to the frozen corpus and runtime", () => {
  assert.equal(G4_V3_CALIBRATION_CORPUS_FREEZE_COMMIT, "8344f0cd987c544d7647386e726a3f07579b5bfa");
  assert.equal(G4_V3_CALIBRATION_CORPUS_DIGEST, "sha256:098ee9e838d3027aa02cfc97bcc83f028919f993e8f0285d6f1e1a9d9e94b59a");
  assert.equal(G4_V3_CALIBRATION_MODEL_ID, "gpt-5.1-2025-11-13");
  assert.equal(G4_V3_CALIBRATION_TRIAL_COUNT, 225);
  assert.equal(G4_V3_CALIBRATION_INITIAL_COMPLIANCE_REQUIRED, 203);
  assert.equal(G4_V3_CALIBRATION_FIFTY_EPISODE_MINIMUM, 0.8);
  assert.equal(G4_V3_CALIBRATION_RUNNER_POLICY.executeMechanicalFailuresThroughFullFrozenSample, true);
  assert.equal(G4_V3_CALIBRATION_RUNNER_POLICY.passBCallsAllowed, false);
  assert.equal(G4_V3_CALIBRATION_RUNNER_POLICY.passCCallsAllowed, false);
  assert.equal(G4_V3_CALIBRATION_RUNNER_POLICY.genomeExposureAllowed, false);
  assert.equal(G4_V3_CALIBRATION_RUNNER_POLICY.semanticQualityScoringAllowed, false);
});

test("G4-v3 calibration CLEAR requires the full 225 mechanical admissions", () => {
  const evaluation = evaluateCalibrationResults(fullSample());
  assert.equal(evaluation.admitted, 225);
  assert.equal(evaluation.terminalMechanicalFailures, 0);
  assert.equal(evaluation.terminalMechanicalExhaustions, 0);
  assert.equal(evaluation.laplaceEpisodeSurvivalEstimate, 226 / 227);
  assert.ok(Math.abs(evaluation.estimatedFiftyEpisodeCompletion - 0.8019164044061948) < 1e-15);
  assert.equal(evaluation.allPassed, true);
});

test("G4-v3 calibration keeps the predeclared 203-of-225 initial-byte threshold", () => {
  const boundary = evaluateCalibrationResults(fullSample({ initialWithin1200Count: 203 }));
  assert.equal(boundary.initialWithin1200, 203);
  assert.equal(boundary.checks.initialDraftCompliance, true);
  assert.equal(boundary.allPassed, true);

  const below = evaluateCalibrationResults(fullSample({ initialWithin1200Count: 202 }));
  assert.equal(below.checks.initialDraftCompliance, false);
  assert.equal(below.allPassed, false);
});

test("one terminal mechanical failure makes the fixed 225-trial calibration HOLD", () => {
  const evaluation = evaluateCalibrationResults(fullSample({ admittedCount: 224 }));
  assert.equal(evaluation.admitted, 224);
  assert.equal(evaluation.terminalMechanicalFailures, 1);
  assert.equal(evaluation.terminalMechanicalExhaustions, 1);
  assert.equal(evaluation.checks.mechanicallyAdmittedRecords, false);
  assert.equal(evaluation.checks.terminalMechanicalExhaustions, false);
  assert.equal(evaluation.allPassed, false);
});

test("initial-draft metric measures UTF-8 bytes from the exact initial response only", () => {
  const events = [
    {
      type: "model_response",
      clientRequestId: "cal_g4v3_001:initial",
      modelOutput: { episode: { observableAction: "éé" } },
    },
    {
      type: "model_response",
      clientRequestId: "cal_g4v3_001:repair:1",
      modelOutput: { observableAction: "short" },
    },
  ];
  const metric = initialDraftMechanicalMetric(events, "cal_g4v3_001");
  assert.equal(metric.observableActionUtf8Bytes, 4);
  assert.equal(metric.withinAuthoritative1200ByteLimit, true);
});

test("zero-call calibration preflight reconstructs the exact frozen 225-input corpus", () => {
  const { corpus, state } = calibrationPreflight();
  assert.equal(corpus.corpusDigest, G4_V3_CALIBRATION_CORPUS_DIGEST);
  assert.equal(corpus.trials.length, G4_V3_CALIBRATION_TRIAL_COUNT);
  assert.ok([
    "READY_FIRST_EXECUTION",
    "READY_EXACT_RESUME",
    "PARTIAL_TRIAL_INTERRUPTION_REVIEW_REQUIRED",
    "FINAL_RESULT_EXISTS_EXECUTION_BLOCKED",
  ].includes(state.status));
});

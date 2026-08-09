import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_4 as FROZEN } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-4.mjs";
import { HISTORY_BENDS_JUDGMENT_STANDING_GATE_V4 as SET } from
  "../experiments/history-bends-judgment/standing-gate-v4.mjs";
import {
  HISTORY_STANDING_V4_EVIDENCE,
  formatSealedHistoryStandingSummary,
  parseSealedHistoryInspectorArgs,
  readSealedHistoryStandingEvidence,
} from "./history-bends-judgment-sealed-inspector.mjs";

const EXPECTED_MEMORY =
  "mem_b88e7e64a7e3f64bfe0752249eeb1fb750d2e2e5b5d8a209c6b51812c60b7ca0";
const EXPECTED_REQUEST_FINGERPRINT =
  "sha256:7d57002e7740d87607bcd6dba441009a059fa3af4fddc173337e951bd417fba2";

test("sealed history evidence is committed and self-consistent with Candidate 4 and standing v4", () => {
  const bundle = readSealedHistoryStandingEvidence();
  assert.equal(bundle.cycleSealed, true);
  assert.equal(bundle.acceptanceSetId, SET.id);
  assert.equal(bundle.frozenCandidateId, FROZEN.id);
  assert.deepEqual(bundle.frozenBoundary.sourceBlobs, FROZEN.sourceBlobs);
  assert.equal(bundle.frozenBoundary.sourceHead, FROZEN.sourceHead);
  assert.equal(bundle.heldOutScenario.id, SET.id);
  assert.equal(bundle.heldOutScenario.direction, SET.direction);
  assert.equal(bundle.heldOutScenario.authorship.freshThreadFixtureCommit,
    SET.authorship.freshThreadFixtureCommit);
  assert.equal(bundle.heldOutScenario.authorship.freshThreadFixtureBlob,
    SET.authorship.freshThreadFixtureBlob);
});

test("sealed bundle proves frozen-source/runtime/scenario preflight passed before provider execution", () => {
  const { preflight } = readSealedHistoryStandingEvidence();
  assert.deepEqual(preflight, {
    candidateId: FROZEN.id,
    sourceIdentityPassed: true,
    runtimeBoundaryPassed: true,
    scenarioFreshnessPassed: true,
    checkedBeforeProviderCall: true,
  });
  assert.equal(
    FROZEN.standingGatePreflight.verifyFrozenSourceBlobsBeforeFirstProviderCall,
    true,
  );
  assert.equal(FROZEN.standingGatePreflight.rejectOnDrift, true);
});

test("sealed evidence records the authoritative causal differential and load-bearing memory", () => {
  const bundle = readSealedHistoryStandingEvidence();
  const report = bundle.report;
  assert.equal(report.status, "passed");
  assert.equal(report.standingGatePassed, true);
  assert.equal(report.scoreMovementPermitted, true);
  assert.equal(report.counterfactual.requestFingerprint, EXPECTED_REQUEST_FINGERPRINT);
  assert.equal(report.counterfactual.causalMemoryId, EXPECTED_MEMORY);
  assert.deepEqual(report.counterfactual.canonicalResolvedMemoryIds, [EXPECTED_MEMORY]);
  assert.deepEqual(report.counterfactual.counterfactualResolvedMemoryIds, []);
  assert.deepEqual(report.counterfactual.counterfactualUnresolvedMemoryIds, [EXPECTED_MEMORY]);
  assert.equal(report.counterfactual.sameThreadState, true);
  assert.equal(report.counterfactual.semanticStateHeldConstant, true);
  assert.equal(report.withHistory.proposedAction, "accept");
  assert.equal(report.withHistory.participationFit, "high");
  assert.equal(report.withoutHistory.proposedAction, "refuse");
  assert.equal(report.withoutHistory.participationFit, "low");
  for (const factor of ["individualizedAdvantage", "interchangeability"]) {
    assert.ok(
      report.withHistory.factors[factor].evidenceRefs.includes(`memory:${EXPECTED_MEMORY}`),
      `${factor} must cite the causal memory`,
    );
  }
});

test("sealed evidence preserves the actual model rationale, normalizations and retry record", () => {
  const bundle = readSealedHistoryStandingEvidence();
  assert.match(bundle.report.withHistory.rationale, /same requester.*personal.*family artifact/i);
  assert.match(bundle.report.withoutHistory.rationale, /no.*individualized advantage|generic card/i);
  assert.deepEqual(bundle.report.withHistory.normalizations, []);
  assert.deepEqual(bundle.report.withoutHistory.normalizations, []);
  assert.equal(bundle.judgments.length, 2);
  assert.equal(bundle.operationalAttempts.length, 1);
  assert.equal(bundle.operationalAttempts[0].failure.code, "MODEL_TIMEOUT");
  assert.equal(bundle.operationalAttempts[0].retrying, true);
});

test("history standing inspector is structurally read-only and has no provider runtime imports", () => {
  const source = readFileSync(
    new URL("./history-bends-judgment-sealed-inspector.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /createModelRuntime|semanticDignityGuardian|model-runtime|OPENAI_API_KEY/);
  assert.doesNotMatch(source, /runHistoryStandingProof|runSealedHistoryStandingGate/);
  assert.match(source, /READ-ONLY/);
});

test("history standing inspector CLI defaults to summary and rejects unknown options", () => {
  assert.deepEqual(parseSealedHistoryInspectorArgs([]), {
    summary: true,
    json: false,
    evidencePath: HISTORY_STANDING_V4_EVIDENCE,
    help: false,
  });
  assert.equal(parseSealedHistoryInspectorArgs(["--json"]).json, true);
  assert.throws(() => parseSealedHistoryInspectorArgs(["--rerun"]), /unknown option/);
});

test("history standing inspector summary reports the sealed v4 result, not a blocked pseudo-result", () => {
  const summary = formatSealedHistoryStandingSummary(readSealedHistoryStandingEvidence());
  assert.match(summary, /History bends judgment standing gate v4/);
  assert.match(summary, /RESULT: PASSED/);
  assert.match(summary, /Standing gate: PASSED/);
  assert.match(summary, /With history:\s+accept\/high/);
  assert.match(summary, /Without history:\s+refuse\/low/);
  assert.match(summary, /READ-ONLY/);
  assert.doesNotMatch(summary, /standing gate v1/i);
  assert.doesNotMatch(summary, /RESULT: BLOCKED/);
});

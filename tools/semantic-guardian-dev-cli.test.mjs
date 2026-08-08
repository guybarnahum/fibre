import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDevelopmentBundle,
  formatDevelopmentInterrupt,
  formatDevelopmentProgress,
  formatDevelopmentSummary,
  parseDevelopmentArgs,
} from "./semantic-guardian-dev-cli.mjs";

const DEFAULT_OPTIONS = {
  summary: true,
  json: false,
  help: false,
  failFast: false,
};

test("development runner defaults to v4 summary and remains explicitly non-evidentiary", () => {
  assert.deepEqual(parseDevelopmentArgs([]), DEFAULT_OPTIONS);

  const report = {
    developmentSetId: "semantic_guardian_v4_development_v1",
    modelProvider: "openai",
    modelId: "gpt-5.1-2025-11-13",
    status: "failed",
    casesPlanned: 2,
    casesAttempted: 2,
    providerFailures: [],
    protocolValidationFailures: [],
    cognitionFailures: [],
    behavioralGateFailures: [
      { caseId: "generic_control", message: "expected action refuse, got accept" },
    ],
    cases: [
      {
        caseId: "identity_match",
        status: "passed",
        output: { proposedAction: "accept", participationFit: "high" },
      },
      {
        caseId: "generic_control",
        status: "behavioral_failure",
        output: { proposedAction: "accept", participationFit: "high" },
      },
    ],
    standingDifferentialGatePassed: false,
    scoreMovementPermitted: false,
  };
  const journal = [
    {
      type: "model_response",
      clientRequestId: "guardian-v4-dev:generic_control",
      modelOutput: { proposedAction: "accept", participationFit: "high" },
    },
  ];
  const bundle = buildDevelopmentBundle(report, journal, "dev_test");

  assert.equal(bundle.evidenceClass, "development");
  assert.equal(bundle.cycleSealed, false);
  assert.equal(bundle.standingDifferentialGatePassed, false);
  assert.equal(bundle.scoreMovementPermitted, false);
  assert.equal(bundle.judgments.length, 1);

  const text = formatDevelopmentSummary(bundle);
  assert.match(text, /Semantic Guardian v4 development summary/);
  assert.match(text, /NON-EVIDENTIARY · repeatable/);
  assert.match(text, /Model: openai\/gpt-5\.1-2025-11-13/);
  assert.match(text, /Standing gate: NOT EVALUATED/);
  assert.match(text, /Score movement: NEVER/);
  assert.match(text, /Behavioral findings/);
  assert.match(text, /generic_control/);
});

test("development runner keeps CLI options small; model routing belongs in models.yaml", () => {
  assert.deepEqual(parseDevelopmentArgs(["--summary", "--json", "--fail-fast"]), {
    summary: true,
    json: true,
    help: false,
    failFast: true,
  });
  assert.throws(() => parseDevelopmentArgs(["--model", "gpt-test"]), /unknown option/);
  assert.throws(() => parseDevelopmentArgs(["--reasoning", "low"]), /unknown option/);
  assert.throws(() => parseDevelopmentArgs(["--wat"]), /unknown option/);
});

test("Ctrl-C summary is explicit about cleanup and non-evidentiary status", () => {
  const zero = formatDevelopmentInterrupt({ responses: 0, providerFailures: 0 });
  assert.match(zero, /Interrupted by Ctrl-C/);
  assert.match(zero, /NON-EVIDENTIARY · development run stopped/);
  assert.match(zero, /No model responses were received before interruption/);
  assert.match(zero, /Temporary development state cleaned up/);
  assert.match(zero, /Nothing sealed; Fibre score unchanged/);

  const partial = formatDevelopmentInterrupt({ responses: 2, providerFailures: 1 });
  assert.match(partial, /2 model responses were received before interruption/);
  assert.match(partial, /1 provider attempt failure was recorded before interruption/);
});

test("development progress shows the active case, provider attempt, and retries", () => {
  const selection = { provider: "openai", modelId: "gpt-test" };
  const waiting = formatDevelopmentProgress({
    responses: 0,
    providerFailures: 0,
    lastEvent: {
      type: "model_attempt",
      attempt: 1,
      maximumAttempts: 3,
    },
  }, selection, 12_000);
  assert.match(waiting, /case 1\/13/);
  assert.match(waiting, /attempt 1\/3/);
  assert.match(waiting, /waiting for openai/);
  assert.match(waiting, /12s/);

  const retrying = formatDevelopmentProgress({
    responses: 0,
    providerFailures: 1,
    lastEvent: {
      type: "operational_failure",
      attempt: 1,
      maximumAttempts: 3,
      retrying: true,
      failure: { code: "MODEL_TIMEOUT" },
    },
  }, selection, 46_000);
  assert.match(retrying, /attempt 1\/3 failed MODEL_TIMEOUT/);
  assert.match(retrying, /retrying/);
});

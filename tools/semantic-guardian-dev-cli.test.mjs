import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDevelopmentBundle,
  formatDevelopmentSummary,
  parseDevelopmentArgs,
} from "./semantic-guardian-dev-cli.mjs";

const DEFAULT_OPTIONS = {
  summary: true,
  json: false,
  help: false,
  modelId: "gpt-5.1-2025-11-13",
  reasoningEffort: "none",
  failFast: false,
};

test("development runner defaults to v4 summary and remains explicitly non-evidentiary", () => {
  assert.deepEqual(parseDevelopmentArgs([]), DEFAULT_OPTIONS);

  const report = {
    developmentSetId: "semantic_guardian_v4_development_v1",
    modelId: "gpt-5.1-2025-11-13",
    reasoningEffort: "none",
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
  assert.match(text, /Standing gate: NOT EVALUATED/);
  assert.match(text, /Score movement: NEVER/);
  assert.match(text, /Behavioral findings/);
  assert.match(text, /generic_control/);
});

test("development runner accepts model, reasoning, fail-fast, summary, and json options", () => {
  assert.deepEqual(
    parseDevelopmentArgs([
      "--summary", "--json", "--model", "gpt-test", "--reasoning", "low", "--fail-fast",
    ]),
    {
      summary: true,
      json: true,
      help: false,
      modelId: "gpt-test",
      reasoningEffort: "low",
      failFast: true,
    },
  );
  assert.throws(() => parseDevelopmentArgs(["--reasoning", "extreme"]), /reasoning must be one of/);
  assert.throws(() => parseDevelopmentArgs(["--model"]), /model requires a model ID/);
  assert.throws(() => parseDevelopmentArgs(["--wat"]), /unknown option/);
});

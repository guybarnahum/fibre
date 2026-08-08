import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDevelopmentBundle,
  formatDevelopmentSummary,
  parseDevelopmentArgs,
} from "./semantic-guardian-dev-cli.mjs";

test("development runner defaults to summary and remains explicitly non-evidentiary", () => {
  assert.deepEqual(parseDevelopmentArgs([]), {
    summary: true,
    json: false,
    help: false,
  });

  const report = {
    acceptanceSetId: "semantic_guardian_v3_acceptance_v2",
    status: "failed",
    standingDifferentialGatePassed: false,
    scoreMovementPermitted: false,
    operationalErrors: [
      {
        code: "INVALID_MODEL_OUTPUT",
        message: "semantic Guardian factors.identityAlignment cites evidence not supplied by Fibre: identity",
      },
    ],
  };
  const journal = [
    {
      type: "model_response",
      clientRequestId: "guardian:thr_mina_001:req_semantic_gate_universal_low_dignity",
      modelOutput: {
        proposedAction: "accept",
        score: 9,
        factors: { relationalMeaning: { status: "unresolved", evidenceRefs: [] } },
      },
    },
  ];
  const bundle = buildDevelopmentBundle(report, journal, "dev_test");

  assert.equal(bundle.evidenceClass, "development");
  assert.equal(bundle.cycleSealed, false);
  assert.equal(bundle.scoreMovementPermitted, false);
  assert.equal(bundle.judgments.length, 1);

  const text = formatDevelopmentSummary(bundle);
  assert.match(text, /NON-EVIDENTIARY · repeatable/);
  assert.match(text, /Standing gate: NOT EVALUATED/);
  assert.match(text, /Score movement: NEVER/);
  assert.match(text, /Interchangeability control/);
});

test("development runner accepts explicit summary and json output modes", () => {
  assert.deepEqual(parseDevelopmentArgs(["--summary", "--json"]), {
    summary: true,
    json: true,
    help: false,
  });
  assert.throws(() => parseDevelopmentArgs(["--wat"]), /unknown option/);
});

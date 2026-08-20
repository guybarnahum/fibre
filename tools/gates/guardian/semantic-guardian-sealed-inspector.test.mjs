import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SEMANTIC_GUARDIAN_V4_EVIDENCE,
  formatSealedSemanticGuardianSummary,
  parseSemanticGuardianInspectorArgs,
  readSealedSemanticGuardianEvidence,
} from "./semantic-guardian-sealed-inspector.mjs";

const EXPECTED_PROMPT_HASH =
  "sha256:587c6c04d933cdc052ea08057ee16236883a9c8af44e055a19413fa0ee44acb3";

test("Semantic Guardian v4 sealed evidence is committed and authoritative", () => {
  const bundle = readSealedSemanticGuardianEvidence();
  assert.equal(bundle.cycleSealed, true);
  assert.equal(bundle.acceptanceSetId, "semantic_guardian_v4_standing_gate_v4");
  assert.equal(bundle.frozenCandidateId, "semantic_guardian_v4_candidate_4");
  assert.equal(bundle.report.status, "passed");
  assert.equal(bundle.report.casesAttempted, 18);
  assert.equal(bundle.report.casesPlanned, 18);
  assert.equal(bundle.report.cases.filter((entry) => entry.status === "passed").length, 18);
  assert.deepEqual(bundle.report.providerFailures, []);
  assert.deepEqual(bundle.report.protocolValidationFailures, []);
  assert.deepEqual(bundle.report.cognitionFailures, []);
  assert.deepEqual(bundle.report.behavioralGateFailures, []);
  assert.deepEqual(bundle.report.differentialGateFailures, []);
  assert.equal(bundle.report.promptHash, EXPECTED_PROMPT_HASH);
});

test("Semantic Guardian inspector is structurally read-only", () => {
  const source = readFileSync(new URL("./semantic-guardian-sealed-inspector.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /createModelRuntime|semanticDignityGuardian|model-runtime|OPENAI_API_KEY/);
  assert.doesNotMatch(source, /invoke\(|runStanding|runGate/);
  assert.match(source, /READ-ONLY/);
});

test("Semantic Guardian inspector CLI defaults to summary", () => {
  assert.deepEqual(parseSemanticGuardianInspectorArgs([]), {
    summary: true,
    json: false,
    evidencePath: SEMANTIC_GUARDIAN_V4_EVIDENCE,
    help: false,
  });
  assert.equal(parseSemanticGuardianInspectorArgs(["--json"]).json, true);
  assert.throws(() => parseSemanticGuardianInspectorArgs(["--rerun"]), /unknown option/);
});

test("Semantic Guardian inspector summary reports sealed v4 pass", () => {
  const summary = formatSealedSemanticGuardianSummary(readSealedSemanticGuardianEvidence());
  assert.match(summary, /Semantic Guardian standing gate v4/);
  assert.match(summary, /RESULT: PASSED/);
  assert.match(summary, /Cases passed: 18\/18/);
  assert.match(summary, /READ-ONLY/);
});

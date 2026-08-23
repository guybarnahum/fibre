import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPLACEMENT_EXECUTION_BINDING_PATH,
  verifyReplacementFinalCohortPreflight,
} from "./genesis-replacement-final-cohort.mjs";

const readJson = (path) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));

test("replacement final-cohort packet is complete but remains blocked before Gate-G(2) CLEAR", () => {
  const result = verifyReplacementFinalCohortPreflight({ requireGateClear: false, enforceReviewedSource: false });
  assert.equal(result.status, "CLEAR_PACKET_GATE_G2_HOLD");
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.gateStatus, "MISSING_GATE_G2_CLEAR_WITNESS");
  assert.equal(result.slots.length, 5);
  assert.deepEqual(result.slots.map((slot) => slot.passAEpisodes), [10, 10, 10, 10, 10]);
  assert.deepEqual(result.slots[0].passBHorizons, [4, 5, 6, 7, 8, 10]);
  assert.deepEqual(result.slots[0].passBModes, [
    "life_only", "life_only", "life_plus_genome", "life_only", "life_only", "life_plus_genome",
  ]);
  assert.equal(result.generationPolicyVersion, "pr39-g4-pass-a-reliability-amendment-v3");
  assert.equal(result.generationPolicy.maxFormRepairsPerRecord, 2);
  assert.equal(result.generationPolicy.maxRecordRetriesPerRecord, 2);
  assert.equal(result.generationPolicy.maxTotalGeneratedVersionsPerRecord, 5);
  assert.equal(result.oneShot.wholeCandidateAttemptCap, 1);
  assert.equal(result.oneShot.qualityDrivenRegeneration, false);
  assert.equal(result.durability.guaranteedScope, "process_restart_replay_of_committed_invocations");
  assert.equal(result.durability.hostCrashFsyncDurabilityClaimed, false);
});

test("replacement execution binding hard-pins the runner, output and G4-v3 selection", () => {
  const binding = readJson(REPLACEMENT_EXECUTION_BINDING_PATH);
  assert.equal(binding.runner.path, "tools/genesis/genesis-replacement-final-cohort.mjs");
  assert.equal(binding.runner.bindingPathHardcoded, true);
  assert.equal(binding.runner.bindingEnvOverrideAllowed, false);
  assert.equal(binding.runner.providerOrModelCliOverrideAllowed, false);
  assert.equal(binding.runner.seedCliOverrideAllowed, false);
  assert.equal(binding.generationPolicy.version, "pr39-g4-pass-a-reliability-amendment-v3");
  assert.equal(binding.generationPolicy.mustBePassedExplicitlyAtPassACallSite, true);
  assert.equal(binding.generationPolicy.legacySharedThreeVersionDefaultAllowed, false);
  assert.equal(binding.oneShot.outputRoot, "artifacts/validation/m2-pr39/replacement-v1/final-cohort-v1");
});

test("replacement runner source explicitly passes G4-v3 and has no binding env override", () => {
  const source = readFileSync(new URL("./genesis-replacement-final-cohort.mjs", import.meta.url), "utf8");
  assert.match(source, /generationPolicy:\s*GENESIS_PASS_A_RELIABILITY_POLICY_V3/);
  assert.match(source, /REPLACEMENT_EXECUTION_BINDING_PATH = "artifacts\/validation\/m2-pr39\/replacement-v1\/protocol\/replacement-execution-binding-v1\.json"/);
  assert.doesNotMatch(source, /FIBRE_H_EXECUTION_BINDING_PATH/);
  assert.doesNotMatch(source, /process\.env/);
});

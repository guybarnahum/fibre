import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  REPLACEMENT_CORE_PATH,
  REPLACEMENT_EXECUTION_BINDING_PATH,
  verifyReplacementFinalCohortPreflight,
  verifyReplacementInheritedAuthorityBinding,
} from "./genesis-replacement-final-cohort.mjs";
import { verifyReplacementFinalCohortPreflight as verifyCoreReplacementFinalCohortPreflight } from "./genesis-replacement-final-cohort-core.mjs";

const readJson = (path) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
const AUTHORIZED_WRAPPER_BLOB = "5b67674e36b43766f416e0a1aab9a0b8e41dbc36";
const IMPORT_ONLY_CORE_BLOB = "a8acd1b1dd47ef427397056cee2958cea7ae0b7c";

test("replacement final-cohort packet is complete, authority-bound and blocked before Gate-G(2) CLEAR", () => {
  const authority = verifyReplacementInheritedAuthorityBinding();
  const result = verifyReplacementFinalCohortPreflight({ requireGateClear: false, enforceReviewedSource: false });
  assert.equal(authority.status, "CLEAR_INHERITED_AUTHORITY_BOUND");
  assert.equal(authority.wrapperBlobSha, AUTHORIZED_WRAPPER_BLOB);
  assert.equal(result.inheritedAuthority.status, "CLEAR_INHERITED_AUTHORITY_BOUND");
  assert.equal(result.inheritedAuthority.wrapperBlobSha, AUTHORIZED_WRAPPER_BLOB);
  assert.equal(result.inheritedAuthority.coreBlobSha, IMPORT_ONLY_CORE_BLOB);
  assert.equal(result.inheritedAuthority.residualIntegrity.uncertaintyPostGenerationScanRequired, true);
  assert.equal(result.inheritedAuthority.residualIntegrity.uncertaintyConfirmedLeakDisposition, "REDESIGN_AFFECTED_INFERENCE_NO_REGENERATION");
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

test("directly imported replacement core preflight runs the same inherited-authority gate", () => {
  const result = verifyCoreReplacementFinalCohortPreflight({ requireGateClear: false, enforceReviewedSource: false });
  assert.equal(result.inheritedAuthority.status, "CLEAR_INHERITED_AUTHORITY_BOUND");
  assert.equal(result.inheritedAuthority.wrapperBlobSha, AUTHORIZED_WRAPPER_BLOB);
  assert.equal(result.inheritedAuthority.coreBlobSha, IMPORT_ONLY_CORE_BLOB);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.gateStatus, "MISSING_GATE_G2_CLEAR_WITNESS");
});

test("replacement execution binding hard-pins the authorized runner, import-only core and G4-v3 selection", () => {
  const binding = readJson(REPLACEMENT_EXECUTION_BINDING_PATH);
  assert.equal(binding.runner.path, "tools/genesis/genesis-replacement-final-cohort.mjs");
  assert.equal(binding.runner.wrapperGitBlobSha, AUTHORIZED_WRAPPER_BLOB);
  assert.equal(REPLACEMENT_CORE_PATH, "tools/genesis/genesis-replacement-final-cohort-core.mjs");
  assert.equal(binding.runner.corePath, REPLACEMENT_CORE_PATH);
  assert.equal(binding.runner.coreGitBlobSha, IMPORT_ONLY_CORE_BLOB);
  assert.equal(binding.runner.bindingPathHardcoded, true);
  assert.equal(binding.runner.bindingEnvOverrideAllowed, false);
  assert.equal(binding.runner.providerOrModelCliOverrideAllowed, false);
  assert.equal(binding.runner.seedCliOverrideAllowed, false);
  assert.equal(binding.generationPolicy.version, "pr39-g4-pass-a-reliability-amendment-v3");
  assert.equal(binding.generationPolicy.mustBePassedExplicitlyAtPassACallSite, true);
  assert.equal(binding.generationPolicy.legacySharedThreeVersionDefaultAllowed, false);
  assert.equal(binding.oneShot.outputRoot, "artifacts/validation/m2-pr39/replacement-v1/final-cohort-v1");
  assert.equal(binding.publication.atomicPerThreadWorldKernelPublication, true);
  assert.equal(binding.publication.cohortLevelAtomicPublication, false);
  assert.equal(typeof binding.authorityBoundary.passBGenomeCopyReviewNotePath, "string");
  assert.equal(typeof binding.authorityBoundary.residualGateG2DisclosurePath, "string");
});

test("shared authority module gates both wrapper and core while core retains G4-v3 generation logic", () => {
  const entrypoint = readFileSync(new URL("./genesis-replacement-final-cohort.mjs", import.meta.url), "utf8");
  const authority = readFileSync(new URL("./genesis-replacement-inherited-authority.mjs", import.meta.url), "utf8");
  const core = readFileSync(new URL("./genesis-replacement-final-cohort-core.mjs", import.meta.url), "utf8");
  assert.match(entrypoint, /verifyReplacementInheritedAuthorityBinding\(\)/);
  assert.match(core, /verifyReplacementInheritedAuthorityBinding\(\)/);
  assert.match(authority, /verifyG4CognitionFreeze/);
  assert.match(authority, /verifyG34ReviewAmendments/);
  assert.match(authority, /verifyG4V3ReliabilityImplementation/);
  assert.match(authority, /verifyG5DiagnosticsFreeze/);
  assert.match(authority, /verifyG6VerdictFreeze/);
  assert.match(authority, /findVerbatimGenomeNgram/);
  assert.match(authority, /"tools\/genesis"/);
  assert.match(authority, /"artifacts\/validation\/m2-pr39\/g\/protocol"/);
  assert.match(authority, /merge-base/);
  assert.doesNotMatch(entrypoint, /FIBRE_H_EXECUTION_BINDING_PATH/);
  assert.doesNotMatch(entrypoint, /process\.env/);
  assert.doesNotMatch(core, /process\.env/);
  assert.match(core, /generationPolicy:\s*GENESIS_PASS_A_RELIABILITY_POLICY_V3/);
  assert.match(core, /REPLACEMENT_EXECUTION_BINDING_PATH = "artifacts\/validation\/m2-pr39\/replacement-v1\/protocol\/replacement-execution-binding-v1\.json"/);
  assert.match(core, /is import-only; use tools\/genesis\/genesis-replacement-final-cohort\.mjs/);
});

test("replacement generation core cannot be executed directly", () => {
  const corePath = fileURLToPath(new URL("./genesis-replacement-final-cohort-core.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [corePath, "--preflight"], { encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /is import-only/);
});

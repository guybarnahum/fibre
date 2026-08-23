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
const REDESIGN_DRIFT = /replacement execution authority changed after Gate-G\(2\)/;

test("replacement-v1 Gate-G(2) authority fails closed after replacement-v2 redesign begins", () => {
  assert.throws(() => verifyReplacementInheritedAuthorityBinding(), REDESIGN_DRIFT);
  assert.throws(
    () => verifyReplacementFinalCohortPreflight({ requireGateClear: false, enforceReviewedSource: false }),
    REDESIGN_DRIFT,
  );
});

test("directly imported replacement-v1 core also fails closed after replacement-v2 redesign begins", () => {
  assert.throws(
    () => verifyCoreReplacementFinalCohortPreflight({ requireGateClear: false, enforceReviewedSource: false }),
    REDESIGN_DRIFT,
  );
});

test("replacement-v1 execution binding remains frozen as historical evidence", () => {
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

test("historical shared authority topology remains auditable after redesign invalidates execution", () => {
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

test("replacement-v1 generation core remains non-executable directly", () => {
  const corePath = fileURLToPath(new URL("./genesis-replacement-final-cohort-core.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [corePath, "--preflight"], { encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /is import-only/);
});

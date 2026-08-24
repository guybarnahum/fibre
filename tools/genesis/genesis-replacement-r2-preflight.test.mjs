// fibre-test-lifecycle: milestone
// fibre-test-scope: pr39
// fibre-test-purpose: replacement-v2-r2-zero-call-execution-authority
// fibre-test-disposition: remove-or-consolidate-after-pr39

import assert from "node:assert/strict";
import test from "node:test";

import { verifyReplacementR2Preflight } from "./genesis-replacement-r2-preflight.mjs";
import { runReplacementCandidateAttempt } from "./genesis-replacement-runner.mjs";

test("R2 preflight binds current rich-life compilation while keeping cognition and publication closed", () => {
  const result = verifyReplacementR2Preflight();
  assert.equal(result.status, "CLEAR_R2_IMPLEMENTATION_PRE_REVIEW_ZERO_CALL");
  assert.equal(result.providerCallsAuthorized, false);
  assert.equal(result.candidateGenerationAuthorized, false);
  assert.equal(result.publicationAuthorized, false);
  assert.equal(result.outputRootAbsent, true);
  assert.equal(result.attemptGuardAbsent, true);
  assert.deepEqual(result.passBProtocolWitness.historyHorizons, [4, 6, 8, 10, 12, 14]);
  assert.deepEqual(result.passBProtocolWitness.formationModes, [
    "life_only",
    "life_only",
    "life_plus_genome",
    "life_only",
    "life_only",
    "life_plus_genome",
  ]);
  assert.deepEqual(result.passBProtocolWitness.treatedOrdinals, [3, 6]);
  assert.deepEqual(result.passBProtocolWitness.primaryHorizons, [8, 14]);
  assert.equal(result.richBuilderWitnesses.length, 5);
  assert.equal(result.richBuilderWitnesses.every((item) => /event-structure-pool-v3/u.test(item.currentPoolPolicyVersion)), true);
  assert.equal(result.richBuilderWitnesses.every((item) => item.constrainedWorldPlaceCount === 1), true);
});

test("candidate runner refuses before the provider adapter factory can be constructed", async () => {
  let adapterFactoryCalls = 0;
  await assert.rejects(
    () => runReplacementCandidateAttempt({
      adapterFactory: () => {
        adapterFactoryCalls += 1;
        throw new Error("adapter factory must be unreachable before R2 CLEAR");
      },
    }),
    /R2 CLEAR witness is absent|not cleared|not authorize/iu,
  );
  assert.equal(adapterFactoryCalls, 0);
});
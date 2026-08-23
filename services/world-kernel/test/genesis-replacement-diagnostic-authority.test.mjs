// fibre-test-lifecycle: milestone
// fibre-test-scope: pr39
// fibre-test-purpose: replacement-v2-r2-diagnostic-threshold-binding
// fibre-test-disposition: remove-or-consolidate-after-pr39

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REPLACEMENT_V2_D3_AT_LEAST_ONE_ORDINAL_CORRECT_CORE_EDGES,
  REPLACEMENT_V2_D3_EACH_ORDINAL_MINIMUM_CORRECT_CORE_EDGES,
  assertReplacementV2DiagnosticAuthority,
} from "../src/genesis-replacement-diagnostic-authority.mjs";

const reconciliation = () => JSON.parse(readFileSync(
  new URL("../../../artifacts/validation/m2-pr39/replacement-v2/protocol/g5-g6-horizon-reconciliation-v1.json", import.meta.url),
  "utf8",
));

test("replacement-v2 diagnostic authority pins the untunable 4/5 plus one 5/5 threshold", () => {
  const authority = assertReplacementV2DiagnosticAuthority(reconciliation());
  assert.equal(authority.eachOrdinalMinimumCorrectCoreEdges, 4);
  assert.equal(authority.atLeastOneOrdinalCorrectCoreEdges, 5);
  assert.equal(REPLACEMENT_V2_D3_EACH_ORDINAL_MINIMUM_CORRECT_CORE_EDGES, 4);
  assert.equal(REPLACEMENT_V2_D3_AT_LEAST_ONE_ORDINAL_CORRECT_CORE_EDGES, 5);
  assert.match(authority.digest, /^sha256:[0-9a-f]{64}$/u);
});

test("replacement-v2 diagnostic authority refuses the R1 N1 threshold mutation", () => {
  const weakened = reconciliation();
  weakened.effectiveReplacementV2D3.clearRequirement.eachOrdinalMinimumCorrectCoreEdges = 3;
  weakened.effectiveReplacementV2D3.clearRequirement.atLeastOneOrdinalCorrectCoreEdges = 4;
  assert.throws(() => assertReplacementV2DiagnosticAuthority(weakened), /threshold drift/u);
});

test("replacement-v2 diagnostic authority refuses a self-contradictory threshold statement", () => {
  const contradictory = reconciliation();
  contradictory.effectiveReplacementV2D3.clearRequirement.statement = "Three of five is enough.";
  assert.throws(() => assertReplacementV2DiagnosticAuthority(contradictory), /statement drift/u);
});

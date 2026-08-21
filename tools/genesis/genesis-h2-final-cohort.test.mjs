import assert from "node:assert/strict";
import test from "node:test";

import {
  H2_EXECUTION_BINDING_PATH,
  verifyH2CompatibilityBoundary,
  verifyH2FinalCohortPreflight,
} from "./genesis-h2-final-cohort.mjs";

const EXPECTED_CANONICAL = "sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a";
const EXPECTED_TRANSPORT = "sha256:9c5c75641d46306cac8df457fc4495e09b53db4a930b9f5fe3f8e75863d3556c";

test("H-v2 compatibility boundary preserves H-v1 HOLD and freezes a separate output root", () => {
  const result = verifyH2CompatibilityBoundary();
  assert.equal(result.status, "H2_COMPATIBILITY_BOUNDARY_VERIFIED");
  assert.equal(result.h1FreezeCommit, "448bd669f742a566da289cc4117907f2d37e32e3");
  assert.equal(result.h1RunnerBlob, "b3f8dc0b382ea64431df866a80ab91804021431f");
  assert.equal(result.bindingPath, H2_EXECUTION_BINDING_PATH);
  assert.equal(result.canonicalPassBSchemaHash, EXPECTED_CANONICAL);
  assert.equal(result.transportPassBSchemaHash, EXPECTED_TRANSPORT);
  assert.equal(result.outputRoot, "artifacts/validation/m2-pr39/h/cohort-v2");
  assert.equal(result.removedConstraints.length, 4);
});

test("H-v2 zero-call preflight reuses the frozen G1-G6 plan and does not leak process overrides", async () => {
  const priorBinding = process.env.FIBRE_H_EXECUTION_BINDING_PATH;
  const priorFetch = globalThis.fetch;
  const result = await verifyH2FinalCohortPreflight();
  assert.equal(result.status, "CLEAR_TO_EXECUTE_H");
  assert.equal(result.oneShot.outputRoot, "artifacts/validation/m2-pr39/h/cohort-v2");
  assert.equal(result.slots.length, 5);
  assert.deepEqual(result.slots[0].passBHorizons, [4, 5, 6, 7, 8, 10]);
  assert.deepEqual(result.slots[0].passBModes, ["life_only", "life_only", "life_plus_genome", "life_only", "life_only", "life_plus_genome"]);
  assert.equal(process.env.FIBRE_H_EXECUTION_BINDING_PATH, priorBinding);
  assert.equal(globalThis.fetch, priorFetch);
});

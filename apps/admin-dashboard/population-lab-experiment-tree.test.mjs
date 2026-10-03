import test from "node:test";
import assert from "node:assert/strict";

import {populationLabExperimentRows} from "./population-lab-experiment-tree.js";

test("Population Lab keeps refinement branches under their baseline family",()=>{
  const rows=populationLabExperimentRows([
    {experimentId:"shadow_new",baselineExperimentId:"baseline_egypt",requestedAt:"2026-10-03T18:00:00Z"},
    {experimentId:"baseline_korea",requestedAt:"2026-10-03T17:00:00Z"},
    {experimentId:"baseline_egypt",requestedAt:"2026-10-01T12:00:00Z"},
    {experimentId:"shadow_old",summary:{shadowOfExperimentId:"baseline_egypt"},requestedAt:"2026-10-02T18:00:00Z"},
  ]);

  assert.deepEqual(
    rows.map(({experiment,depth})=>[experiment.experimentId,depth]),
    [
      ["baseline_egypt",0],
      ["shadow_new",1],
      ["shadow_old",1],
      ["baseline_korea",0],
    ],
    "refinements stopped grouping beneath the active baseline",
  );
});

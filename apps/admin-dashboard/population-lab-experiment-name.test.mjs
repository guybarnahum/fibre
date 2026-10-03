import test from "node:test";
import assert from "node:assert/strict";

import {populationLabExperimentName} from "./population-lab-experiment-name.js";

test("Population Lab names stay readable and distinct for parallel runs",()=>{
  assert.equal(
    populationLabExperimentName({
      experimentId:"plexp_1234567890abcdef7a3c",
      referencePopulation:"middle_east.egypt",
      experimentKind:"baseline",
    }),
    "middle_east.egypt · 7a3c",
    "baseline experiment name lost population or unique suffix",
  );
  assert.equal(
    populationLabExperimentName({
      experimentId:"plexp_1234567890abcdefb912",
      referencePopulation:"middle_east.egypt",
      experimentKind:"refinement",
    }),
    "middle_east.egypt · refine · b912",
    "refinement experiment name lost type or unique suffix",
  );
});

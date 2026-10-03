import test from "node:test";
import assert from "node:assert/strict";

import {applyReferencePopulationAdmissions} from "../src/human-phenotype/reference-population-admission.mjs";

test("source admission advances only the reviewed calibration node",()=>{
  const base={
    parent:{version:1,parent:null,values:{faceBreadth:.1},variation:{familyFactorMultiplier:1}},
    child:{version:1,parent:"parent",values:{noseBreadth:.2}},
  };
  const admitted=applyReferencePopulationAdmissions(base,[{
    id:"child",
    version:2,
    values:{noseBreadth:.3},
    variation:{familyFactorMultiplier:1.08},
    evidence:{approvalExperimentId:"exp_fixture"},
  }]);

  assert.equal(admitted.child.version,2,"source admission did not advance local version");
  assert.equal(admitted.child.values.noseBreadth,.3,"source admission lost reviewed value");
  assert.equal(admitted.child.parent,"parent","source admission changed calibration hierarchy");
  assert.equal(admitted.parent.version,1,"source admission changed unrelated parent authority");
  assert.equal(base.child.version,1,"source admission mutated base definitions");

  assert.throws(
    ()=>applyReferencePopulationAdmissions(base,[{
      id:"child",
      version:3,
      values:{noseBreadth:.3},
    }]),
    /advance exactly one local version/u,
    "source admission skipped a calibration version",
  );
});

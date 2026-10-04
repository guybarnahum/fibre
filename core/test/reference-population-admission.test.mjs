import test from "node:test";
import assert from "node:assert/strict";

import {applyReferencePopulationAdmissions} from "../src/human-phenotype/reference-population-admission.mjs";
import {
  referencePopulationCalibration,
  referencePopulationCalibrationHistory,
} from "../src/human-phenotype/reference-populations.mjs";

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


test("calibration history preserves every local baseline through current authority",()=>{
  const history=referencePopulationCalibrationHistory("middle_east.egypt");
  const current=referencePopulationCalibration("middle_east.egypt");
  assert.equal(history[0].origin,true,"calibration history lost its source baseline");
  assert.equal(history.at(-1).version,current.version,"calibration history does not reach current authority");
  for(let index=1;index<history.length;index+=1){
    assert.equal(
      history[index].version,
      history[index-1].version+1,
      "calibration history skipped a local version",
    );
  }
});

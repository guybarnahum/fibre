import assert from "node:assert/strict";
import test from "node:test";

import {
  generatePhysicalCalibrationCohort,
  physicalCalibrationDiagnostics,
} from "./physical-cohort.mjs";

const POPULATIONS=[
  "east_asia.han_chinese",
  "east_asia.korean",
  "east_asia.japanese",
];

test("Population Lab physical cohort preserves calibrated structure and individuality",()=>{
  const people=generatePhysicalCalibrationCohort({
    referencePopulations:POPULATIONS,
    count:96,
    seed:"east-asian-calibration-proof",
  });
  const diagnostics=physicalCalibrationDiagnostics({
    people,
    referencePopulations:POPULATIONS,
    seed:"east-asian-calibration-proof",
  });

  assert.equal(people.length,96,"physical cohort count changed");
  assert.deepEqual(diagnostics.warnings,[],"physical cohort calibration failed");

  for(const population of POPULATIONS){
    const result=diagnostics.populations[population];
    assert.equal(result.count,32,`${population} cohort size changed`);
    assert.ok(result.uniqueShare>=.95,`${population} individuality collapsed`);
    assert.ok(result.maxCenterError<=.08,`${population} drifted from calibrated center`);
    assert.ok(result.resemblance.siblingToUnrelatedRatio<.9,`${population} siblings lost resemblance`);
    assert.ok(result.resemblance.childToUnrelatedRatio<.9,`${population} children lost parent resemblance`);
  }

  assert.ok(diagnostics.mixed.maxAbsoluteMidpointError<=.08,"mixed-parent inheritance drifted");
  for(const person of people){
    assert.doesNotMatch(
      person.renderDescription,
      /east_asia|han_chinese|korean|japanese|calibration lineage/u,
      "population label leaked into renderer",
    );
  }
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  referencePopulationCalibration,
  referencePopulationPrior,
  referencePopulationVariation,
} from "../../../core/src/human-appearance/index.mjs";
import {
  normalizePopulationLabShadowCalibration,
  populationLabShadowCalibrationResolvers,
} from "../src/shadow-calibration.mjs";

function proposal(){
  const calibration=referencePopulationCalibration("east_asia.japanese");
  return {
    referencePopulation:"east_asia.japanese",
    baseCalibration:{id:calibration.id,version:calibration.version},
    values:{faceBreadth:.18},
    variation:{familyFactorMultiplier:1.08},
    rationale:"Explicit research evidence proposes a narrower center and slightly broader family variation.",
    evidence:[
      {source:"doi:10.0000/fibre-fixture",note:"Fixture provenance for bounded shadow evaluation."},
    ],
  };
}

test("shadow calibration changes only the lab resolver, never canonical authority",()=>{
  const beforePrior=referencePopulationPrior("east_asia.japanese");
  const beforeVariation=referencePopulationVariation("east_asia.japanese");
  const shadow=normalizePopulationLabShadowCalibration(proposal());
  const resolvers=populationLabShadowCalibrationResolvers(shadow);

  assert.equal(resolvers.priorFor("east_asia.japanese").faceBreadth,.18,
    "shadow resolver lost proposed physical center");
  assert.equal(resolvers.variationFor("east_asia.japanese").familyFactorMultiplier,1.08,
    "shadow resolver lost proposed variation");
  assert.deepEqual(referencePopulationPrior("east_asia.japanese"),beforePrior,
    "shadow proposal changed canonical physical prior");
  assert.deepEqual(referencePopulationVariation("east_asia.japanese"),beforeVariation,
    "shadow proposal changed canonical variation");
});

test("shadow calibration requires current versioned evidence and explicit provenance",()=>{
  const stale=proposal();
  stale.baseCalibration={...stale.baseCalibration,version:stale.baseCalibration.version-1};
  assert.throws(
    ()=>normalizePopulationLabShadowCalibration(stale),
    /no longer current/u,
    "stale calibration evidence entered shadow evaluation",
  );

  const noEvidence=proposal();
  noEvidence.evidence=[];
  assert.throws(
    ()=>normalizePopulationLabShadowCalibration(noEvidence),
    /requires research evidence/u,
    "shadow proposal without provenance was accepted",
  );
});

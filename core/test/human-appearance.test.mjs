import assert from "node:assert/strict";
import test from "node:test";

import {
  referencePhysicalState,
  resolveHumanPhysicalInheritance,
} from "../src/human-appearance/index.mjs";

const lineage=referencePopulation=>[{
  population:"family lineage",
  share:1,
  referencePopulation,
}];

const genome=resolveHumanPhysicalInheritance({
  maternal:{physicalLineage:lineage("east_asia.han_chinese")},
  paternal:{physicalLineage:lineage("east_asia.han_chinese")},
  conceptionSeed:"ordinary-human-reference-genome",
}).physicalGenome;

test("reference physical state is replayable but preserves ordinary human diversity",()=>{
  const first=referencePhysicalState({
    physicalGenome:genome,
    sex:"female",
    stateSeed:"reference-person-1",
  });
  assert.deepEqual(
    first,
    referencePhysicalState({
      physicalGenome:genome,
      sex:"female",
      stateSeed:"reference-person-1",
    }),
    "reference body state did not replay",
  );

  const cohort=Array.from({length:128},(_,index)=>referencePhysicalState({
    physicalGenome:genome,
    sex:"female",
    stateSeed:`reference-person-${index}`,
  }));

  const bodyStates=new Set(cohort.map(person=>person.bodyComposition));
  const skinStates=new Set(cohort.map(person=>person.skinTexture));
  const sides=new Set(cohort.map(person=>person.asymmetry.dominantSide));

  assert.ok(bodyStates.size>=4,"ordinary body-shape variation collapsed");
  assert.ok(
    cohort.some(person=>["fuller","heavy"].includes(person.bodyComposition)),
    "female reference cohort collapsed toward slim bodies",
  );
  assert.ok(skinStates.size>=3,"ordinary skin variation collapsed");
  assert.deepEqual([...sides].sort(),["left","right"],"ordinary facial asymmetry collapsed");

  const maleCohort=Array.from({length:128},(_,index)=>referencePhysicalState({
    physicalGenome:genome,
    sex:"male",
    stateSeed:`reference-man-${index}`,
  }));
  const facialHair=new Set(maleCohort.map(person=>person.facialHairPresentation));
  const headHair=new Set(maleCohort.map(person=>person.headHairPresentation));
  assert.ok(facialHair.has("clean-shaven"),"male reference cohort lost clean-shaven people");
  assert.ok(facialHair.size>=3,"male facial-hair presentation collapsed");
  assert.ok(headHair.size>=4,"reference hair presentation collapsed");
});

test("reference physical state never carries demographic rendering labels",()=>{
  const state=referencePhysicalState({
    physicalGenome:genome,
    sex:"female",
    stateSeed:"no-demographic-rendering-labels",
  });
  assert.doesNotMatch(
    state.description,
    /east_asia|han_chinese|ancestry|ethnicity|nationality/u,
    "population label leaked into reference physical state",
  );
});


test("reference physical state keeps geometry separate from surface presentation",()=>{
  const state=referencePhysicalState({
    physicalGenome:genome,
    sex:"male",
    stateSeed:"reference-layer-boundary",
  });

  assert.match(state.geometryDescription,/Body composition:/u,"geometry state lost body composition");
  assert.match(state.geometryDescription,/facial fullness:/u,"geometry state lost facial fullness");
  assert.doesNotMatch(
    state.geometryDescription,
    /Skin:|facial hair:|hairline:|head hair:/u,
    "surface presentation leaked into geometry state",
  );

  assert.match(state.surfaceDescription,/Skin:/u,"surface state lost skin");
  assert.match(state.surfaceDescription,/facial hair:/u,"surface state lost grooming");
  assert.doesNotMatch(
    state.surfaceDescription,
    /Body composition:|facial fullness:|eye-opening offset/u,
    "geometry state leaked into surface presentation",
  );
});

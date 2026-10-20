import test from "node:test";
import assert from "node:assert/strict";
import {createPhysicalGenome,physicalGenomeLoci} from "../src/human-phenotype/physical-genome.mjs";
import {referencePhysicalState} from "../src/human-appearance/reference-physical-state.mjs";
import {physicalDevelopmentAtAge} from "../src/human-appearance/physical-development.mjs";

function genome({adiposity=0,loss=0,density=0}={}){
  const loci=Object.fromEntries(physicalGenomeLoci.map(name=>[name,[{value:0},{value:0}]]));
  for(const [name,value] of [
    ["adiposityTendency",adiposity],
    ["hairlineLossTendency",loss],
    ["hairDensity",density],
  ])loci[name]=[{value},{value}];
  return createPhysicalGenome(loci);
}
const project=(threadId,physicalGenome,ageYears,sex="male")=>physicalDevelopmentAtAge({
  threadId,physicalGenome,sex,ageYears,
});

test("physical development preserves the canonical 25-year baseline and never invents childhood baldness",()=>{
  const g=genome({adiposity:.85,loss:1,density:-.8});
  const threadId="thr_development_childhood";
  const reference=referencePhysicalState({
    physicalGenome:g,sex:"male",stateSeed:`canonical-reference:${threadId}`,
  });
  const at25=project(threadId,g,25);
  assert.equal(at25.bodyComposition,reference.bodyComposition,
    "Age-25 development diverged from the canonical body");
  assert.equal(at25.relativeBody,"similar in body composition");
  for(const age of [5,12]){
    const child=project(threadId,g,age);
    assert.equal(child.bodyComposition,null,"Child assigned adult weight trajectory");
    assert.equal(child.scalpHair,"childhood hair coverage",
      "Child was assigned adult-pattern baldness");
  }
  assert.deepEqual(project(threadId,g,85),project(threadId,g,85),
    "Thread's age-local body changed across repeated projections");
  assert.equal(at25.kind,"provisional_nonhistorical_projection",
    "Generated appearance was misrepresented as lived history");
});

test("genetic predisposition and individuality yield different weight and scalp trajectories",()=>{
  const susceptible=genome({adiposity:.65,loss:1,density:-1});
  const resistant=genome({adiposity:-.65,loss:-1,density:1});
  const changes=[];
  const scalps=[];
  for(let n=0;n<64;n++){
    const id=`thr_development_varied_${n}`;
    const earlier=project(id,susceptible,25);
    const older=project(id,susceptible,80);
    assert.equal(earlier.relativeBody,"similar in body composition");
    changes.push(older.relativeBody);
    scalps.push(older.scalpHair);
  }
  assert.ok(changes.some(x=>x==="substantially fuller")
    &&changes.some(x=>x==="substantially leaner"),
    "Individual body trajectories cannot gain or lose substantial weight");
  assert.ok(scalps.some(x=>x.startsWith("extensive scalp hair loss")),
    "High hair-loss propensity never produced substantial balding");
  assert.ok(Array.from({length:64},(_,n)=>project(`thr_development_varied_${n}`,resistant,80))
    .some(x=>x.scalpHair.includes("close to the canonical")),
    "Hair retention is impossible despite low inherited susceptibility");
});

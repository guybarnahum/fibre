import assert from "node:assert/strict";
import test from "node:test";

import {normalizeFamilyProfiles,sampleFamilyProfile,validateFamilyProfiles} from "../../core/src/population-context/index.mjs";

const names=prefix=>Array.from({length:12},(_,index)=>`${prefix}${index+1}`);
const ancestry=population=>({maternal:[{population,share:1,referencePopulation:"eur_north"}],paternal:[{population,share:1,referencePopulation:"eur_north"}]});
const profile=(id,share)=>({
  id,share,familyOriginContext:`${id} family roots`,languages:["English"],raisedLanguages:["English"],nameOrder:"given_family",
  femaleGivenNames:names(id+"f"),maleGivenNames:names(id+"m"),familyNames:names(id+"s"),physicalAncestry:ancestry(id)
});

test("family profiles reject packed language inventories",()=>{
  const broken={...profile("local",1),languages:["Hindi","Bhojpuri","Awadhi」「Marathi」「English"]};
  assert.throws(()=>validateFamilyProfiles([broken]),/one bare language name per item/u);
});

test("family profile authoring redundancy is canonicalized locally",()=>{
  const original=profile("mixed",1);
  original.femaleGivenNames=[...names("mf"),"mf1"];
  original.maleGivenNames=[...names("mm"),"mm1"];
  original.familyNames=[...names("ms"),"ms1"];
  original.languages=["English","english"];
  original.raisedLanguages=["English","ENGLISH"];
  const [normalized]=normalizeFamilyProfiles([original]);
  assert.equal(normalized.femaleGivenNames.length,12);
  assert.equal(normalized.maleGivenNames.length,12);
  assert.equal(normalized.familyNames.length,12);
  assert.deepEqual(normalized.languages,["English"]);
  assert.deepEqual(normalized.raisedLanguages,["English"]);
  assert.doesNotThrow(()=>validateFamilyProfiles([normalized]));
});

test("production family sampler follows authored weights at population scale",()=>{
  const profiles=[profile("common",7),profile("mixed",2),profile("rare",1)];
  const counts=new Map(profiles.map(item=>[item.id,0]));
  const n=10_000;
  for(let index=0;index<n;index++){
    const sampled=sampleFamilyProfile({profiles,requestId:`weight-probe-${index}`});
    counts.set(sampled.id,counts.get(sampled.id)+1);
  }
  const expected=new Map([["common",.7],["mixed",.2],["rare",.1]]);
  for(const [id,share] of expected){
    const observed=counts.get(id)/n;
    assert.ok(Math.abs(observed-share)<.025,`${id} sampling drifted: ${observed.toFixed(3)} vs ${share.toFixed(3)}`);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import {selectWorldLifeWave,waveResponseFailure} from "./world-life-wave.mjs";

const evidence={
  contract:"fibre-social-city-candidates-v0.1",
  sampledThreadIds:["thr_c","thr_a","thr_b","thr_a","thr_d"],
};
test("one bounded population wave never duplicates or silently skips a selected Thread",()=>{
  const first=selectWorldLifeWave(evidence,{offset:0,limit:2});
  const second=selectWorldLifeWave(evidence,{offset:2,limit:2});
  assert.deepEqual([...first.ids,...second.ids],["thr_a","thr_b","thr_c","thr_d"],
    "population waves repeated or lost a Thread");
  assert.equal(first.total,4);
});

test("population waves require an explicit bounded existing cohort",()=>{
  assert.throws(()=>selectWorldLifeWave({sampledThreadIds:["thr_a"]}),
    /world-social:candidates/,"an ungrounded list was treated as World evidence");
  assert.throws(()=>selectWorldLifeWave(evidence,{offset:0,limit:42}),
    /--limit 1-21/,"a bulk population wake bypassed the per-wave bound");
});

test("city-scoped waves select only enacted residents across successive small batches",()=>{
  const cities={...evidence,pairedCities:[{
    locality:"Tbilisi",countryCode:"GE",threads:[
      {threadId:"thr_d"},{threadId:"thr_a"},{threadId:"thr_c"},
    ],
  },{
    locality:"London",countryCode:"GB",threads:[{threadId:"thr_b"}],
  }]};
  const first=selectWorldLifeWave(cities,{
    city:"Tbilisi",countryCode:"GE",offset:0,limit:2,
  });
  const next=selectWorldLifeWave(cities,{
    city:"Tbilisi",countryCode:"GE",offset:2,limit:2,
  });
  assert.deepEqual([first.total,first.ids,next.ids],[3,["thr_a","thr_c"],["thr_d"]],
    "the Tbilisi wave mixed Threads from another city or repeated one");
  assert.deepEqual(selectWorldLifeWave(cities,{
    city:"London",countryCode:"GB",limit:3,
  }).ids,["thr_b"],"a named city wave used the global cohort");
  assert.throws(()=>selectWorldLifeWave(cities,{city:"Tbilisi",limit:2}),
    /--city and an ISO-2 --country-code/);
  assert.throws(()=>selectWorldLifeWave(cities,{
    city:"Tbilisi",countryCode:"US",limit:2,
  }),/absent from the sampled/);
});

test("failed wave retains World reconciliation stage and provider diagnostic rather than generic 503",()=>{
  const error=waveResponseFailure(503,{
    error:"lived_now_reconciliation_failed",
    code:"LIVED_NOW_RECONCILIATION_FAILED",
    detail:"Planning integration failed",
    diagnostics:{
      stage:"lived_now.ensure",errorName:"Error",retryable:true,
      providerErrorCode:"upstream_timeout",
    },
  });
  assert.equal(error.httpStatus,503);
  assert.equal(error.code,"LIVED_NOW_RECONCILIATION_FAILED");
  assert.equal(error.diagnostics.stage,"lived_now.ensure");
  assert.equal(error.diagnostics.providerErrorCode,"upstream_timeout");
  assert.equal(error.detail,"Planning integration failed");
});

test("one known Thread can be verified before the first population wave",()=>{
  const selected=selectWorldLifeWave(evidence,{thread:"thr_b"});
  assert.deepEqual(selected,{total:1,ids:["thr_b"]},
    "a single-Thread canary unexpectedly included another person's life");
  assert.throws(()=>selectWorldLifeWave(evidence,{thread:"thr_unknown"}),
    /absent from the sampled/,"canary accepted a Thread outside the World census");
  assert.throws(()=>selectWorldLifeWave(evidence,{thread:"thr_b",city:"London",countryCode:"GB"}),
    /--thread alone/,"canary mixed two independent selection modes");
});

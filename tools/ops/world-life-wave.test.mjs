import assert from "node:assert/strict";
import test from "node:test";
import {selectWorldLifeWave} from "./world-life-wave.mjs";

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

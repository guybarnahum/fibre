import assert from "node:assert/strict";
import test from "node:test";
import { planLifeRest } from "./world-life-rest.mjs";

test("resting the World keeps exactly the named lives and refuses an unknown keep",()=>{
  const lives=["thr_a","thr_b","thr_c","thr_d"].map(threadId=>({threadId,resting:threadId==="thr_c"}));
  const plan=planLifeRest(lives,{keep:["thr_a"]});
  assert.deepEqual(plan.rest,["thr_b","thr_d"],"a kept life would rest or a resting one rest twice");
  assert.deepEqual(plan.alreadyResting,["thr_c"]);
  assert.throws(()=>planLifeRest(lives,{keep:["thr_a","thr_typo"]}),/unknown/u,
    "a mistyped keep would let a kept Thread rest");
});

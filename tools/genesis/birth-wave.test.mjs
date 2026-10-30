// fibre-test-lifecycle: regression
// fibre-test-scope: birth-center
// fibre-test-purpose: wave uses distinct durable births and one list read per interval
import assert from "node:assert/strict";
import test from "node:test";
import {runGenesisBirthWave} from "./birth-wave.mjs";
import {createBirthLifecycleStore} from "../../services/birth-center/src/birth-lifecycle-store.mjs";
import {tempBirthState} from "../../services/birth-center/test/support/birth-state-fixture.mjs";

test("a wave creates distinct lifecycle births and monitors via one indexed page read per interval",async t=>{
  const state=tempBirthState(t);
  const store=createBirthLifecycleStore(state.storage());
  t.after(()=>store.close());
  let ids=0,posts=0,pages=0,detailReads=0;
  const out=[],err=[];
  const readRemote=async(_remote,path,{method="GET",body}={})=>{
    if(path==="/births"&&method==="POST"){
      posts++;
      const birth=store.enqueue(body);
      return {birth};
    }
    if(path.startsWith("/births?")){
      pages++;
      assert.equal(path,"/births?limit=40&all=1","Wave should use a single indexed page");
      // The remote API projects parentage from the durable lifecycle data.
      return {births:store.list({limit:40,includeCancelled:true}).births.map(b=>({
        ...b,parentage:b.data?.parentage??null,
      })),nextCursor:null};
    }
    detailReads++;
    throw new Error("Wave performed per-birth polling: "+path);
  };
  const result=await runGenesisBirthWave({
    remote:{},environment:"staging",options:{
      world:{display:"United Kingdom/London"},sex:null,heritage:null,
      forceNewWorld:false,
    },count:8,readRemote,
    now:()=>Date.parse("2026-10-30T05:00:00Z"),
    idFactory:()=>("unique-"+(++ids)),
    sleep:async()=>{
      for(const birth of store.list({limit:40}).births)
        store.progress(birth.requestId,{stage:"complete",status:"published",
          nextAttemptAt:null,
          data:{parentage:{mother:{name:"Mara Quinn"},father:{name:"Noah Quinn"},mixed:false}},
          result:{
            event:"thread-birth-complete",requestId:birth.requestId,
            threadId:"thr_"+birth.requestId,name:"Joanna Quinn",
            sex:"female",birthCity:"London",languages:["English"],
          }});
    },
    stdout:{write:text=>out.push(text)},
    stderr:{write:text=>err.push(text),isTTY:false},
  });
  assert.equal(posts,8);
  assert.equal(new Set(store.list({limit:40}).births.map(x=>x.requestId)).size,8);
  assert.equal(pages,2,"Wave read more than one birth-list page per interval");
  assert.equal(detailReads,0,"Wave made an individual birth status request");
  assert.equal(result.complete,8);
  assert.equal(out.length,8);
  assert.equal(new Set(out.map(line=>JSON.parse(line).requestId)).size,8);
  assert.ok(err.join("").includes("8/8 complete"));
  assert.equal(err.filter(line=>line.includes("parents Mara Quinn / Noah Quinn")).length,8,
    "A completed wave birth had no family summary on stderr");
  assert.ok(out.every(line=>JSON.parse(line).event==="thread-birth-complete"),
    "Human summaries changed the machine-readable JSON output");
});

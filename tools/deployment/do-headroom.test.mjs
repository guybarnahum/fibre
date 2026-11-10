import test from "node:test";
import assert from "node:assert/strict";
import {checkDoHeadroom} from "./do-headroom.mjs";

function sample({read=0,written=0}){
  return async(_url,request)=>{
    const body=JSON.parse(request.body);
    assert.equal(body.variables.date,"2026-11-02");
    return Response.json({data:{viewer:{accounts:[{
      durableObjectsPeriodicGroups:[{sum:{rowsRead:read,rowsWritten:written}}],
    }]}}});
  };
}

test("deployment refuses an exhausted account-wide DO read or write budget before upload",async()=>{
  const messages=[];
  const args={accountId:"account",apiToken:"token",
    now:new Date("2026-11-02T01:00:00Z"),log:line=>messages.push(line)};
  const allowed=await checkDoHeadroom({...args,fetchImpl:sample({read:1_000_000,written:88_000})});
  assert.equal(allowed.written.remaining,12_000);
  assert.match(messages[0],/12000\/100000 rows written remaining/u);
  await assert.rejects(checkDoHeadroom({...args,fetchImpl:sample({written:92_000})}),
    /DO HEADROOM LOW.*written.*upload refused/u);
  await assert.rejects(checkDoHeadroom({...args,fetchImpl:sample({read:4_800_000})}),
    /DO HEADROOM LOW.*read.*upload refused/u,"a spent read budget did not stop the upload");
  await assert.rejects(checkDoHeadroom({...args,
    fetchImpl:async()=>Response.json({errors:[{message:"analytics unavailable"}]})}),
  /DO HEADROOM UNAVAILABLE.*upload refused/u);
});

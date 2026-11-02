import test from "node:test";
import assert from "node:assert/strict";
import {checkDoWriteHeadroom} from "./do-write-headroom.mjs";

function sample(written){
  return async(_url,request)=>{
    const body=JSON.parse(request.body);
    assert.equal(body.variables.date,"2026-11-02");
    return Response.json({data:{viewer:{accounts:[{
      durableObjectsPeriodicGroups:[{sum:{rowsWritten:written}}],
    }]}}});
  };
}

test("deployment refuses an exhausted account-wide DO budget before upload",async()=>{
  const messages=[];
  const args={accountId:"account",apiToken:"token",
    now:new Date("2026-11-02T01:00:00Z"),log:line=>messages.push(line)};
  const allowed=await checkDoWriteHeadroom({...args,fetchImpl:sample(88_000)});
  assert.equal(allowed.remaining,12_000);
  assert.match(messages[0],/12000\/100000 rows remaining/u);
  await assert.rejects(checkDoWriteHeadroom({...args,
    fetchImpl:sample(92_000)}),/DO WRITE HEADROOM LOW.*upload refused/u);
  await assert.rejects(checkDoWriteHeadroom({...args,
    fetchImpl:async()=>Response.json({errors:[{message:"analytics unavailable"}]})}),
  /DO WRITE HEADROOM UNAVAILABLE.*upload refused/u);
});

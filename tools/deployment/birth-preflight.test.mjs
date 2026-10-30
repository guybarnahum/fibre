// fibre-test-lifecycle: regression
// fibre-test-scope: deployment
// fibre-test-purpose: reject-deployments-with-failed-birth-provider-preflight
import assert from "node:assert/strict";
import test from "node:test";
import {runBirthPreflight} from "./birth-preflight.mjs";

test("deployment birth preflight fails on provider rejection and accepts exact revision",async()=>{
  const log=[],requests=[];
  const fetchImpl=async (_url,init)=>{
    requests.push(JSON.parse(init.body));
    return Response.json({ok:true,schemas:7,place:"United States/Hilo",
      deploymentGitSha:"a".repeat(40)});
  };
  await runBirthPreflight({baseUrl:"https://birth.example",privateToken:"test",
    expectedSha:"a".repeat(40),fetchImpl,log:x=>log.push(x)});
  assert.deepEqual(log,["BIRTH PREFLIGHT ok (7 schemas, place United States/Hilo)"]);
  assert.deepEqual(requests,[{place:"United States/Hilo"}]);
  await assert.rejects(runBirthPreflight({baseUrl:"https://birth.example",
    privateToken:"test",expectedSha:"b".repeat(40),fetchImpl,log:()=>{}}),
    /deployed revision/);
  await assert.rejects(runBirthPreflight({baseUrl:"https://birth.example",
    privateToken:"test",fetchImpl:async()=>Response.json({
      ok:false,detail:"schema Naming Tradition: Invalid schema regex",
    },{status:422}),log:()=>{}}),/schema Naming Tradition: Invalid schema regex/);
});

// fibre-test-lifecycle: regression
// fibre-test-scope: deployment
// fibre-test-purpose: reject-deployments-with-failed-birth-provider-preflight
import assert from "node:assert/strict";
import test from "node:test";
import {runBirthPreflight,runLocalBirthPreflight} from "./birth-preflight.mjs";

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

test("bootstrap flag is refused once the snapshot route exists",async()=>{
  let probes=0;
  const options={
    repoRoot:new URL("../..",import.meta.url).pathname,
    environment:"staging",bootstrapPreflight:true,
    deployment:()=>({baseUrl:"https://birth.example",privateToken:"test"}),
    probeSchemas:async()=>{probes++;return 7;},
    log:()=>{},
  };
  await assert.rejects(runLocalBirthPreflight({
    ...options,fetchMaterial:async()=>({place:"United States/Hilo",places:[]}),
  }),/--bootstrap-preflight refused; snapshot route already exists/);
  assert.equal(probes,0,"Existing snapshot route was incorrectly bypassed");

  const messages=[];
  const result=await runLocalBirthPreflight({
    ...options,
    fetchMaterial:async()=>{throw Object.assign(new Error("HTTP 404"),{status:404});},
    log:line=>messages.push(line),
  });
  assert.equal(probes,1,"Bootstrap must still probe all provider schemas");
  assert.equal(result.schemas,7);
  assert.equal(result.rehearsal,null);
  assert.equal(messages.filter(line=>line.includes("WARNING")).length,1);
});

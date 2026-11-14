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
  await runBirthPreflight({baseUrl:"https://birth.example",privateToken:"test",probeSchemas:false,
    fetchImpl,log:()=>{}});
  assert.equal(requests.at(-1).probeSchemas,false,"the deployed check probed schemas found unchanged");
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
    acceptance:{read:async()=>null,write:async()=>{}},
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

test("the provider is probed only when the Birth schemas or model profiles changed since it accepted them",async()=>{
  let probes=0,record=null;
  const options={
    repoRoot:new URL("../..",import.meta.url).pathname,environment:"staging",
    deployment:()=>({baseUrl:"https://birth.example",privateToken:"test"}),
    fetchMaterial:async()=>{throw Object.assign(new Error("HTTP 404"),{status:404});},
    bootstrapPreflight:true,log:()=>{},
    acceptance:{read:async()=>record,write:async(value)=>{record=value;}},
  };
  const unpaid=async()=>{probes++;throw new Error("schema Place Population: OpenAI API billing quota is unavailable");};
  await assert.rejects(runLocalBirthPreflight({...options,probeSchemas:unpaid}),/billing quota/,
    "unproven schemas were let through");
  assert.equal(record,null,"a failed probe was recorded as accepted");
  await runLocalBirthPreflight({...options,probeSchemas:async()=>{probes++;return 7;}});
  const afterAcceptance=probes;
  const unchanged=await runLocalBirthPreflight({...options,probeSchemas:unpaid});
  assert.equal(probes,afterAcceptance,"an unrelated deploy still depended on the provider");
  assert.equal(unchanged.probed,false);
  record={...record,fingerprint:"0".repeat(64)};
  await assert.rejects(runLocalBirthPreflight({...options,probeSchemas:unpaid}),/billing quota/,
    "changed schemas deployed without the provider accepting them");
});

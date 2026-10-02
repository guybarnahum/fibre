import test from "node:test";
import assert from "node:assert/strict";

import {
  createLocalInfraDriver,
  createMemoryInfraDriver,
} from "#infra/providers/local";

test("service calls stay provider-neutral through InfraDriver",async()=>{
  const observed=[];
  const infra=createMemoryInfraDriver({
    serviceHandlers:{
      asset_generator:async(operation,input)=>{
        observed.push({operation,input});
        return {state:"pending"};
      },
    },
  });

  const result=await infra.services.call("asset_generator","generation.reconcile",{job:{jobId:"job_1"}});
  assert.deepEqual(result,{state:"pending"},"service result changed across InfraDriver");
  assert.deepEqual(observed,[{
    operation:"generation.reconcile",
    input:{job:{jobId:"job_1"}},
  }],"service call lost semantic operation or input");
});


test("local InfraDriver exposes the same service-call semantics",async()=>{
  const infra=createLocalInfraDriver({
    serviceHandlers:{
      asset_generator:async(operation,input)=>({
        operation,
        jobId:input.job.jobId,
      }),
    },
  });

  const result=await infra.services.call("asset_generator","generation.reconcile",{job:{jobId:"job_local"}});
  assert.deepEqual(result,{
    operation:"generation.reconcile",
    jobId:"job_local",
  },"local service call changed provider-neutral semantics");
});

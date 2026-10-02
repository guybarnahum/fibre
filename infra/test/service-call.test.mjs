import test from "node:test";
import assert from "node:assert/strict";

import {createMemoryInfraDriver} from "#infra/providers/local";

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

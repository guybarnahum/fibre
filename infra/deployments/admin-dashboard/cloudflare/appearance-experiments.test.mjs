import test from "node:test";
import assert from "node:assert/strict";
import {reconcileAdminPopulationLabAsset} from "./appearance-experiments.mjs";

test("Admin visual experiments delegate generation only to Asset Generator reconcile",async()=>{
  let observed=null;
  const job={jobId:"assetjob_fixture"};
  const result=await reconcileAdminPopulationLabAsset({
    FIBRE_PRIVATE_TOKEN:"fixture-private-token-12345",
    ASSET_GENERATOR:{
      async fetch(request){
        observed={
          url:request.url,
          method:request.method,
          token:request.headers.get("x-fibre-private-token"),
          body:await request.json(),
        };
        return Response.json({ok:true,result:{state:"pending",workflowStatus:"queued"}});
      },
    },
  },job);

  assert.equal(result.state,"pending","Admin changed Asset Generator reconciliation state");
  assert.equal(observed.url,"https://fibre.internal/internal/generation/reconcile","Admin did not route service call through InfraDriver");
  assert.equal(observed.method,"POST","Admin used the wrong Asset Generator method");
  assert.equal(observed.token,"fixture-private-token-12345","Admin did not use the private service boundary");
  assert.deepEqual(observed.body,{job},"Admin changed the deterministic Asset Generator job");
});



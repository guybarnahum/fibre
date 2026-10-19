import assert from "node:assert/strict";
import test from "node:test";
import {genesisExecutionEvidence} from "./life-genesis-model.mjs";

test("Birth execution never promotes provisional work to an admitted Thread",()=>{
  const provisional=genesisExecutionEvidence({
    requestId:"req_test",
    pending:[{requestId:"req_test",threadId:"thr_candidate",genesisId:"gen_test",
      stage:"developing",status:"developing",createdAt:"2026-10-19T12:00:00Z"}],
    inspection:{requestId:"req_test",provisionalStatus:"reserved",
      requestStatus:"reserved",invocationCount:2},
  });
  assert.equal(provisional.publication,"not_established",
    "a provisional candidate was mistaken for an admitted person");
  assert.equal(provisional.state,"pending");

  const stillborn=genesisExecutionEvidence({
    requestId:"req_test",stillborn:[{requestId:"req_test",
      failureCode:"NO_WORLD_PUBLICATION",failureMessage:"No birth admitted"}],
    inspection:{requestId:"req_test",provisionalStatus:"ready",
      disposition:{outcome:"stillborn"}},
  });
  assert.equal(stillborn.publication,"world_confirmed_not_admitted",
    "a World-confirmed failure lost its non-admission evidence");
  assert.equal(stillborn.failureCode,"NO_WORLD_PUBLICATION");

  const unknown=genesisExecutionEvidence({requestId:"req_missing"});
  assert.equal(unknown.state,"not_in_bounded_lists",
    "a bounded lookup miss was misrepresented as a failed birth");
  assert.equal(unknown.publication,"not_established");
});

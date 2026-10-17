import assert from "node:assert/strict";
import test from "node:test";

import { firstLifeRecoveryCandidates } from "./first-life-recovery.mjs";

test("only unpublished First Life obligations with grounded history are eligible",()=>{
  const backlog=[
    {threadId:"thr_b",state:"missing_obligation",hasGroundedPlace:true},
    {threadId:"thr_a",state:"missing_obligation",hasGroundedPlace:true},
    {threadId:"thr_c",state:"missing_obligation",hasGroundedPlace:false},
    {threadId:"thr_d",state:"blocked",hasGroundedPlace:true},
    {threadId:"thr_e",state:"no_birth_publication",hasGroundedPlace:true},
  ];
  assert.deepEqual(firstLifeRecoveryCandidates(backlog),["thr_a","thr_b"],
    "First Life recovery attempted a Thread without a published, grounded obligation");
});

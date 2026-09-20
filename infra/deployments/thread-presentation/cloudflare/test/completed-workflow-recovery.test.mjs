import assert from "node:assert/strict";
import test from "node:test";

import { createCompletedWorkflowRecoveryReconciler } from "../completed-workflow-recovery.mjs";

const DIGEST = `sha256:${"a".repeat(64)}`;
const JOB_ID = "assetjob_interrupted_completion";
const RECEIPT_REF = "assetreceipt_interrupted_completion";

function pending() {
  return Object.freeze({
    complete:false,
    stage:"official_photo_pending",
    detail:Object.freeze({ jobId:JOB_ID, workflowStatus:"complete" }),
  });
}

test("durable asset completion converges Presentation after an interrupted handoff", async () => {
  let reconciles = 0;
  const consumed = [];
  const reconciler = createCompletedWorkflowRecoveryReconciler({
    reconciler:{
      async reconcileAvailableEmbodiment() {
        reconciles += 1;
        return reconciles === 1
          ? pending()
          : Object.freeze({ complete:true, stage:"complete", detail:Object.freeze({}) });
      },
    },
    infra:{
      workflows:{
        async get() {
          return { status:"complete", input:{ jobId:JOB_ID, receiptObjectRef:RECEIPT_REF } };
        },
      },
      objects:{
        async get() { return { digest:DIGEST, bytes:new Uint8Array([1]) }; },
      },
    },
    completionConsumer:{
      async consume(completion) { consumed.push(completion); },
    },
  });

  const result = await reconciler.reconcileAvailableEmbodiment({ threadId:"thr_interrupted_completion" });

  assert.equal(result.complete, true);
  assert.equal(reconciles, 2);
  assert.equal(consumed.length, 1);
  assert.equal(consumed[0].jobId, JOB_ID);
  assert.equal(consumed[0].receiptDigest, DIGEST);
});

test("Presentation stays pending until the durable completion receipt is readable", async () => {
  let consumed = false;
  const reconciler = createCompletedWorkflowRecoveryReconciler({
    reconciler:{ async reconcileAvailableEmbodiment() { return pending(); } },
    infra:{
      workflows:{
        async get() {
          return { status:"complete", input:{ jobId:JOB_ID, receiptObjectRef:RECEIPT_REF } };
        },
      },
      objects:{ async get() { return null; } },
    },
    completionConsumer:{ async consume() { consumed = true; } },
  });

  const result = await reconciler.reconcileAvailableEmbodiment({ threadId:"thr_receipt_not_durable" });

  assert.equal(result.stage, "official_photo_pending");
  assert.equal(consumed, false);
});

import assert from "node:assert/strict";
import test from "node:test";

import { createCompletedWorkflowRecoveryReconciler } from "../completed-workflow-recovery.mjs";

const DIGEST = `sha256:${"a".repeat(64)}`;
const JOB_ID = "assetjob_h1_completed_before_demand";
const RECEIPT_REF = "assetreceipt_h1_completed_before_demand";

function pending() {
  return Object.freeze({
    complete: false,
    stage: "official_photo_pending",
    detail: Object.freeze({ jobId: JOB_ID, workflowStatus: "complete" }),
  });
}

function complete() {
  return Object.freeze({ complete: true, stage: "complete", detail: Object.freeze({}) });
}

test("H1 re-drives durable completion after recovered demand becomes durable", async () => {
  let reconciles = 0;
  const consumed = [];
  const wrapped = createCompletedWorkflowRecoveryReconciler({
    reconciler: {
      async reconcileAvailableEmbodiment() {
        reconciles += 1;
        return reconciles === 1 ? pending() : complete();
      },
    },
    infra: {
      workflows: {
        async get(name, instanceId) {
          assert.equal(name, "asset_generation_v1");
          assert.equal(instanceId, JOB_ID);
          return {
            status: "complete",
            input: { jobId: JOB_ID, receiptObjectRef: RECEIPT_REF },
          };
        },
      },
      objects: {
        async get(objectRef) {
          assert.equal(objectRef, RECEIPT_REF);
          return { digest: DIGEST, bytes: new Uint8Array([1]) };
        },
      },
    },
    completionConsumer: {
      async consume(completion) { consumed.push(completion); },
    },
  });

  const result = await wrapped.reconcileAvailableEmbodiment({ threadId: "thr_h1" });

  assert.equal(result.complete, true);
  assert.equal(result.stage, "complete");
  assert.equal(reconciles, 2);
  assert.deepEqual(consumed, [{
    completionVersion: "asset-generation-completion-v0.1",
    jobId: JOB_ID,
    receiptObjectRef: RECEIPT_REF,
    receiptDigest: DIGEST,
  }]);
});

test("H1 remains pending when completed Workflow receipt is not yet readable", async () => {
  let reconciles = 0;
  let consumes = 0;
  const wrapped = createCompletedWorkflowRecoveryReconciler({
    reconciler: {
      async reconcileAvailableEmbodiment() {
        reconciles += 1;
        return pending();
      },
    },
    infra: {
      workflows: {
        async get() {
          return { status: "complete", input: { jobId: JOB_ID, receiptObjectRef: RECEIPT_REF } };
        },
      },
      objects: { async get() { return null; } },
    },
    completionConsumer: { async consume() { consumes += 1; } },
  });

  const result = await wrapped.reconcileAvailableEmbodiment({ threadId: "thr_h1" });
  assert.equal(result.stage, "official_photo_pending");
  assert.equal(reconciles, 1);
  assert.equal(consumes, 0);
});

test("H1 does not redrive non-complete workflows", async () => {
  let workflowReads = 0;
  const wrapped = createCompletedWorkflowRecoveryReconciler({
    reconciler: {
      async reconcileAvailableEmbodiment() {
        return {
          complete: false,
          stage: "official_photo_pending",
          detail: { jobId: JOB_ID, workflowStatus: "running" },
        };
      },
    },
    infra: {
      workflows: { async get() { workflowReads += 1; return null; } },
      objects: { async get() { throw new Error("not reached"); } },
    },
    completionConsumer: { async consume() { throw new Error("not reached"); } },
  });

  const result = await wrapped.reconcileAvailableEmbodiment({ threadId: "thr_h1" });
  assert.equal(result.detail.workflowStatus, "running");
  assert.equal(workflowReads, 0);
});

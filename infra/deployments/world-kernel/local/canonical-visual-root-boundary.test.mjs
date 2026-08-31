import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { createCanonicalVisualRootBoundary } from "./canonical-visual-root-boundary.mjs";

const JOB = Object.freeze({
  jobVersion: "asset-generation-job-v0.1",
  jobId: "assetjob_123456789abc",
  assetKind: "image",
  role: "canonical_visual_identity",
  variant: "default",
  brief: {
    description: "Generate one canonical identity reference portrait.",
    constraints: ["Synthetic identity reference only."],
  },
  inputReferences: ["embodiment_1"],
  referenceObjectRefs: [],
  outputObjectRef: "asset_123456789abc",
  receiptObjectRef: "assetreceipt_123456789abc",
  requestedAt: "2026-08-30T18:36:00Z",
  providerProfile: "openai-gpt-image-2-medium-v1",
  context: {
    kind: "canonical_visual_identity",
    threadId: "thr_1",
    embodimentId: "embodiment_1",
  },
});

const signer = Object.freeze({
  async verify() {
    throw new Error("verification must not run before a durable receipt exists");
  },
});

test("canonical visual root boundary schedules one durable workflow and reuses it while pending", async () => {
  const infra = createMemoryInfraDriver();
  const boundary = createCanonicalVisualRootBoundary({ infra, credentialSigner: signer });

  const first = await boundary.reconcile({ job: JOB });
  assert.equal(first.state, "pending");
  assert.equal(first.instanceId, JOB.jobId);
  assert.equal(first.workflowStatus, "queued");
  assert.equal(first.duplicate, false);

  const second = await boundary.reconcile({ job: JOB });
  assert.equal(second.state, "pending");
  assert.equal(second.instanceId, JOB.jobId);
  assert.equal(second.workflowStatus, "queued");
  assert.equal(second.duplicate, true);

  const stored = await infra.workflows.get("asset_generation_v1", JOB.jobId);
  assert.ok(stored);
  assert.deepEqual(stored.input, JOB);
});

test("canonical visual root boundary requires durable workflow capability", () => {
  assert.throws(
    () => createCanonicalVisualRootBoundary({
      infra: { objects: { async get() { return null; } } },
      credentialSigner: signer,
    }),
    /requires durable workflows/,
  );
});

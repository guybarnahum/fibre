import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { ASSET_GENERATION_JOB_VERSION } from "#services/asset-generator/src/asset-generation-domain.mjs";
import { createAssetGenerationControlService } from "#services/asset-generator/src/asset-generation-control-service.mjs";
import { createAssetGenerationControlApi } from "#services/asset-generator/src/http/asset-generation-control-api.mjs";
import { createCanonicalVisualRootHttpBoundary } from "./canonical-visual-root-http-boundary.mjs";

function job() {
  return {
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: "asset_remote_root_job_1",
    assetKind: "image",
    role: "canonical_identity_portrait",
    variant: "canonical",
    brief: { description: "Synthetic canonical portrait.", constraints: [] },
    inputReferences: ["evt_seed_thr_remote_root"],
    referenceObjectRefs: [],
    outputObjectRef: "asset_remote_root_output_1",
    receiptObjectRef: "asset_remote_root_receipt_1",
    requestedAt: "2026-08-31T01:35:00Z",
    providerProfile: "openai-gpt-image-2-medium-v1",
    context: { kind: "thread_embodiment_canonical_visual_identity", threadId: "thr_remote_root" },
  };
}

function fixture() {
  const infra = createMemoryInfraDriver();
  const api = createAssetGenerationControlApi({
    privateToken: "shared-private-token",
    controlService: createAssetGenerationControlService({
      infra,
      credentialSigner: { verify() { throw new Error("not reached without receipt"); } },
    }),
  });
  const boundary = createCanonicalVisualRootHttpBoundary({
    baseUrl: "https://asset.example/ignored",
    privateToken: "shared-private-token",
    fetchImpl(url, init) { return api.fetch(new Request(url, init)); },
  });
  return { infra, boundary };
}

test("World canonical-root HTTP boundary schedules through authenticated Asset Generator control API", async () => {
  const { infra, boundary } = fixture();
  const first = await boundary.reconcile({ job: job() });
  const second = await boundary.reconcile({ job: job() });
  assert.equal(first.state, "pending");
  assert.equal(first.duplicate, false);
  assert.equal(second.state, "pending");
  assert.equal(second.duplicate, true);
  const workflow = await infra.workflows.get("asset_generation_v1", job().jobId);
  assert.ok(workflow);
  assert.deepEqual(workflow.input, job());
});

test("World canonical-root HTTP boundary marks transient Asset Generator failures retryable", async () => {
  const boundary = createCanonicalVisualRootHttpBoundary({
    baseUrl: "https://asset.example",
    privateToken: "shared-private-token",
    fetchImpl() { return new Response(JSON.stringify({ ok: false, error: "temporary" }), { status: 503 }); },
  });
  await assert.rejects(
    () => boundary.reconcile({ job: job() }),
    (error) => {
      assert.equal(error.code, "CANONICAL_VISUAL_ROOT_HANDOFF_FAILED");
      assert.equal(error.httpStatus, 503);
      assert.equal(error.retryable, true);
      return true;
    },
  );
});

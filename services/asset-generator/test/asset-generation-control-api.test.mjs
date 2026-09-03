import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryInfraDriver } from "#infra/providers/local";
import { ASSET_GENERATION_JOB_VERSION } from "../src/asset-generation-domain.mjs";
import { createAssetGenerationControlService } from "../src/asset-generation-control-service.mjs";
import { createAssetGenerationControlApi } from "../src/http/asset-generation-control-api.mjs";

function job() {
  return {
    jobVersion: ASSET_GENERATION_JOB_VERSION,
    jobId: "asset_control_job_1",
    assetKind: "image",
    role: "canonical_identity_portrait",
    variant: "canonical",
    brief: { description: "Synthetic canonical portrait.", constraints: [] },
    inputReferences: ["evt_seed_thr_control"],
    referenceObjectRefs: [],
    outputObjectRef: "asset_control_output_1",
    receiptObjectRef: "asset_control_receipt_1",
    requestedAt: "2026-08-31T01:30:00Z",
    providerProfile: "openai-gpt-image-2-medium-v1",
    context: { kind: "thread_embodiment_canonical_visual_identity", threadId: "thr_control" },
  };
}

function request(token = "shared-private-token") {
  return new Request("https://asset.example/internal/generation/reconcile", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token === null ? {} : { "x-fibre-private-token": token }),
    },
    body: JSON.stringify({ job: job() }),
  });
}

function apiFixture() {
  const infra = createMemoryInfraDriver();
  const controlService = createAssetGenerationControlService({
    infra,
    credentialSigner: { verify() { throw new Error("not reached without receipt"); } },
  });
  return {
    infra,
    api: createAssetGenerationControlApi({
      privateToken: "shared-private-token",
      controlService,
    }),
  };
}

test("Asset Generator control API authenticates and schedules one durable workflow", async () => {
  const { infra, api } = apiFixture();

  const first = await (await api.fetch(request())).json();
  const second = await (await api.fetch(request())).json();
  assert.equal(first.ok, true);
  assert.equal(first.result.state, "pending");
  assert.equal(first.result.duplicate, false);
  assert.equal(second.ok, true);
  assert.equal(second.result.state, "pending");
  assert.equal(second.result.duplicate, true);

  const workflow = await infra.workflows.get("asset_generation_v1", job().jobId);
  assert.ok(workflow);
  assert.equal(workflow.status, "queued");
  assert.deepEqual(workflow.input, job());
});

test("Asset Generator control API rejects unauthenticated requests", async () => {
  const { api } = apiFixture();
  const response = await api.fetch(request(null));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { ok: false, error: "private_token_required" });
});

test("Asset Generator control API preserves terminal workflow classification", async () => {
  const api = createAssetGenerationControlApi({
    privateToken: "shared-private-token",
    controlService: {
      async reconcile() {
        const error = new Error("asset generation workflow asset_control_job_1 ended as errored: provider rejected request");
        error.code = "ASSET_GENERATION_WORKFLOW_TERMINAL";
        error.retryable = false;
        throw error;
      },
    },
  });
  const response = await api.fetch(request());
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "asset_generation_control_failed",
    code: "ASSET_GENERATION_WORKFLOW_TERMINAL",
    detail: "asset generation workflow asset_control_job_1 ended as errored: provider rejected request",
    retryable: false,
  });
});

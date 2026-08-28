import test from "node:test";
import assert from "node:assert/strict";

import { buildLiveAssetSmokeJob } from "./asset-generation-live-smoke.mjs";

test("live asset smoke is grounded in a real Thread Presentation memory with uncertainty intact", async () => {
  const { bundle, memory, job, snapshotDigest } = await buildLiveAssetSmokeJob({
    requestedAt: "2026-08-26T06:00:00Z",
  });

  assert.equal(bundle.presentation.manifest.threadId, "thr_pr39_g2_04");
  assert.equal(memory.title, "Tomatoes and change");
  assert.match(memory.rememberedContent, /crowded market/);
  assert.match(memory.rememberedContent, /20,000 đồng/);
  assert.deepEqual(memory.uncertainty, [
    "Exact words spoken in Vietnamese",
    "Exact amount of change received",
  ]);

  assert.equal(job.context.mediaId, "media_memory_tomatoes");
  assert.equal(job.role, "memory_reconstruction");
  assert.equal(job.assetKind, "image");
  assert.match(job.brief.description, /20,000 đồng/);
  assert.match(job.brief.description, /Exact amount of change received/);
  assert.equal(job.brief.constraints.some((value) => value.includes("not a documentary photograph")), true);
  assert.equal(job.brief.constraints.some((value) => value.includes("Do not convert uncertainty")), true);
  assert.equal(job.inputReferences.includes(memory.memoryRef), true);
  assert.equal(job.inputReferences.includes("epi_thr_pr39_g2_04_0004"), true);
  assert.deepEqual(job.referenceObjectRefs, []);
  assert.match(snapshotDigest, /^sha256:[0-9a-f]{64}$/);
});

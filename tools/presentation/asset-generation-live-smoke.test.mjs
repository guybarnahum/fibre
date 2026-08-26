import test from "node:test";
import assert from "node:assert/strict";

import { buildLiveAssetSmokeJob } from "./asset-generation-live-smoke.mjs";
import { parseLiveTargetArgs } from "./thread-presentation-live-target.mjs";

test("live asset smoke defaults to a real Thread memory with uncertainty intact", async () => {
  const prepared = await buildLiveAssetSmokeJob({ requestedAt: "2026-08-26T06:00:00Z" });

  assert.equal(prepared.threadId, "thr_pr39_g2_04");
  assert.equal(prepared.memory.title, "Tomatoes and change");
  assert.match(prepared.memory.rememberedContent, /20,000 đồng/);
  assert.deepEqual(prepared.memory.uncertainty, [
    "Exact words spoken in Vietnamese",
    "Exact amount of change received",
  ]);
  assert.equal(prepared.job.context.mediaId, "media_memory_tomatoes");
  assert.equal(prepared.job.role, "memory_reconstruction");
  assert.equal(prepared.job.assetKind, "image");
  assert.match(prepared.job.brief.description, /20,000 đồng/);
  assert.equal(prepared.job.brief.constraints.some((value) => value.includes("Do not convert uncertainty")), true);
  assert.equal(prepared.job.inputReferences.includes(prepared.memory.memoryRef), true);
  assert.deepEqual(prepared.job.referenceObjectRefs, []);
  assert.match(prepared.snapshotDigest, /^sha256:[0-9a-f]{64}$/);
});

test("live asset smoke target is selectable instead of hardcoded to one memory", async () => {
  const prepared = await buildLiveAssetSmokeJob({
    requestedAt: "2026-08-26T06:00:00Z",
    fixture: "can-tho",
    mediaId: "media_memory_sandals",
  });

  assert.equal(prepared.mediaAsset.mediaId, "media_memory_sandals");
  assert.equal(prepared.memory.title, "Blue or red sandals");
  assert.match(prepared.job.brief.description, /blue and red sandals/i);
  assert.equal(prepared.job.context.mediaId, "media_memory_sandals");
  assert.notEqual(prepared.job.jobId, (await buildLiveAssetSmokeJob({ requestedAt: "2026-08-26T06:00:00Z" })).job.jobId);
});

test("live asset target CLI rejects path traversal and accepts fixture/media selection", () => {
  assert.deepEqual(parseLiveTargetArgs(["--fixture", "can-tho", "--media-id", "media_memory_soap", "--dry-run"]), {
    fixture: "can-tho",
    mediaId: "media_memory_soap",
    dryRun: true,
  });
  assert.throws(() => parseLiveTargetArgs(["--fixture", "../secret"]), /simple fixtures\/thread-presentation/);
});

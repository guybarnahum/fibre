import test from "node:test";
import assert from "node:assert/strict";

import { buildLiveAssetSmokeJob } from "./asset-generation-live-smoke.mjs";
import { parseLiveTargetArgs } from "./thread-presentation-live-target.mjs";

test("live asset smoke defaults to a real reference-free Thread place", async () => {
  const prepared = await buildLiveAssetSmokeJob({ requestedAt: "2026-08-26T06:00:00Z" });

  assert.equal(prepared.threadId, "thr_pr39_g2_04");
  assert.equal(prepared.place.displayName, "Neighborhood market");
  assert.match(prepared.place.summary, /groceries, prepared food, household goods/);
  assert.equal(prepared.job.context.mediaId, "media_place_market");
  assert.equal(prepared.job.role, "place");
  assert.equal(prepared.job.assetKind, "image");
  assert.match(prepared.job.brief.description, /Neighborhood market/);
  assert.equal(prepared.job.inputReferences.includes(prepared.place.placeRef), true);
  assert.deepEqual(prepared.job.referenceObjectRefs, []);
  assert.match(prepared.snapshotDigest, /^sha256:[0-9a-f]{64}$/);
});

test("live asset smoke target is selectable instead of hardcoded to one place", async () => {
  const prepared = await buildLiveAssetSmokeJob({
    requestedAt: "2026-08-26T06:00:00Z",
    fixture: "can-tho",
    mediaId: "media_place_home",
  });

  assert.equal(prepared.mediaAsset.mediaId, "media_place_home");
  assert.equal(prepared.place.displayName, "Home in Ninh Kiều");
  assert.match(prepared.job.brief.description, /mixed residential-commercial street/i);
  assert.equal(prepared.job.context.mediaId, "media_place_home");
  assert.notEqual(prepared.job.jobId, (await buildLiveAssetSmokeJob({ requestedAt: "2026-08-26T06:00:00Z" })).job.jobId);
});

test("pre-embodiment self-memory is not a valid live generation target", async () => {
  await assert.rejects(
    buildLiveAssetSmokeJob({
      requestedAt: "2026-08-26T06:00:00Z",
      fixture: "can-tho",
      mediaId: "media_memory_tomatoes",
    }),
    /did not produce generation job for media_memory_tomatoes/,
  );
});

test("live asset target CLI rejects path traversal and accepts fixture/media selection", () => {
  assert.deepEqual(parseLiveTargetArgs(["--fixture", "can-tho", "--media-id", "media_memory_soap", "--dry-run"]), {
    fixture: "can-tho",
    mediaId: "media_memory_soap",
    dryRun: true,
  });
  assert.throws(() => parseLiveTargetArgs(["--fixture", "../secret"]), /simple fixtures\/thread-presentation/);
});

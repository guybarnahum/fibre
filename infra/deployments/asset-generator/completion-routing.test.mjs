import assert from "node:assert/strict";
import test from "node:test";

import {
  ASSET_COMPLETION_ROUTE_NONE,
  ASSET_COMPLETION_ROUTE_PRESENTATION,
  ASSET_COMPLETION_ROUTE_WORLD_WAKE,
  assetGenerationCompletionRoute,
  shouldPublishAssetGenerationCompletion,
  shouldWakeWorldAfterAssetCompletion,
} from "./completion-routing.mjs";

test("Thread Presentation media completion routes to Presentation", () => {
  const job = { context: { kind: "thread_presentation_media", role: "memory_reconstruction" } };
  assert.equal(assetGenerationCompletionRoute(job), ASSET_COMPLETION_ROUTE_PRESENTATION);
  assert.equal(shouldPublishAssetGenerationCompletion(job), true);
  assert.equal(shouldWakeWorldAfterAssetCompletion(job), false);
});

test("canonical visual completion wakes World instead of waiting for polling", () => {
  for (const kind of [
    "thread_embodiment_canonical_visual_identity_geometry",
    "thread_embodiment_canonical_visual_identity",
  ]) {
    const job = { context: { kind, threadId: "thr_visual_001" } };
    assert.equal(assetGenerationCompletionRoute(job), ASSET_COMPLETION_ROUTE_WORLD_WAKE);
    assert.equal(shouldPublishAssetGenerationCompletion(job), true);
    assert.equal(shouldWakeWorldAfterAssetCompletion(job), true);
  }
});

test("official identity photo completion wakes pending World visual reconciliation", () => {
  const job = {
    context: {
      kind: "thread_presentation_media",
      role: "official_id_photo",
      threadId: "thr_visual_001",
    },
  };
  assert.equal(assetGenerationCompletionRoute(job), ASSET_COMPLETION_ROUTE_PRESENTATION);
  assert.equal(shouldWakeWorldAfterAssetCompletion(job), true);
});

test("FID photo derivation completion wakes World instead of waiting for reconciliation backoff", () => {
  const job = {
    context: {
      kind: "fid_photo_derivation",
      threadId: "thr_visual_001",
    },
  };
  assert.equal(assetGenerationCompletionRoute(job), ASSET_COMPLETION_ROUTE_WORLD_WAKE);
  assert.equal(shouldPublishAssetGenerationCompletion(job), true);
  assert.equal(shouldWakeWorldAfterAssetCompletion(job), true);
});

test("unknown completion contexts stay off the completion queue", () => {
  const job = { context: { kind: "future_asset_kind" } };
  assert.equal(assetGenerationCompletionRoute(job), ASSET_COMPLETION_ROUTE_NONE);
  assert.equal(shouldPublishAssetGenerationCompletion(job), false);
  assert.equal(shouldWakeWorldAfterAssetCompletion(job), false);
  assert.equal(assetGenerationCompletionRoute({}), ASSET_COMPLETION_ROUTE_NONE);
});

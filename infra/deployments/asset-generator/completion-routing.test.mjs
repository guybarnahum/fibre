import assert from "node:assert/strict";
import test from "node:test";

import {
  ASSET_COMPLETION_ROUTE_NONE,
  ASSET_COMPLETION_ROUTE_PRESENTATION,
  assetGenerationCompletionRoute,
  shouldPublishPresentationAssetCompletion,
} from "./completion-routing.mjs";

test("Thread Presentation media completion routes to Presentation", () => {
  const job = { context: { kind: "thread_presentation_media" } };
  assert.equal(assetGenerationCompletionRoute(job), ASSET_COMPLETION_ROUTE_PRESENTATION);
  assert.equal(shouldPublishPresentationAssetCompletion(job), true);
});

test("canonical visual identity completion remains durable for World polling", () => {
  const job = { context: { kind: "thread_embodiment_canonical_visual_identity" } };
  assert.equal(assetGenerationCompletionRoute(job), ASSET_COMPLETION_ROUTE_NONE);
  assert.equal(shouldPublishPresentationAssetCompletion(job), false);
});

test("unknown completion contexts do not leak into Presentation", () => {
  assert.equal(assetGenerationCompletionRoute({ context: { kind: "future_asset_kind" } }), ASSET_COMPLETION_ROUTE_NONE);
  assert.equal(assetGenerationCompletionRoute({}), ASSET_COMPLETION_ROUTE_NONE);
});

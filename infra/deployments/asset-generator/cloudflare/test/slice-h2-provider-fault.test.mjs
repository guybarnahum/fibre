import assert from "node:assert/strict";
import test from "node:test";

import { maybeInjectSliceH2ProviderTransientFailure } from "../slice-h2-provider-fault.mjs";

function h2Job() {
  return {
    providerProfile: "bfl-flux-2-pro-v1",
    context: {
      kind: "thread_presentation_media",
      threadId: "thr_h2",
      mediaId: "media_h2",
      sliceH2ProviderTransientFailure: true,
    },
  };
}

test("H2 injector produces one retryable provider_unavailable failure on attempt 1", () => {
  assert.throws(
    () => maybeInjectSliceH2ProviderTransientFailure(h2Job(), 1),
    (error) => {
      assert.equal(error.name, "AssetGenerationError");
      assert.equal(error.phase, "provider_generation");
      assert.equal(error.category, "provider_unavailable");
      assert.equal(error.retryable, true);
      assert.equal(error.httpStatus, 503);
      return true;
    },
  );
});

test("H2 injector allows the same job through on retry attempts", () => {
  assert.doesNotThrow(() => maybeInjectSliceH2ProviderTransientFailure(h2Job(), 2));
  assert.doesNotThrow(() => maybeInjectSliceH2ProviderTransientFailure(h2Job(), 3));
});

test("ordinary jobs are never touched by H2 injector", () => {
  const ordinary = {
    providerProfile: "bfl-flux-2-pro-v1",
    context: { kind: "thread_presentation_media", threadId: "thr_normal", mediaId: "media_normal" },
  };
  assert.doesNotThrow(() => maybeInjectSliceH2ProviderTransientFailure(ordinary, 1));
});

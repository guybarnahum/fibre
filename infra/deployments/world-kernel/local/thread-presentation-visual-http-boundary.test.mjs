import assert from "node:assert/strict";
import test from "node:test";

import { createVisualPublicationWriteApi } from "#services/thread-presentation/src/http/visual-publication-write-api.mjs";
import { createThreadPresentationVisualHttpBoundary } from "./thread-presentation-visual-http-boundary.mjs";

const HANDOFF = Object.freeze({
  threadId: "thr_remote_visual_handoff",
  embodiment: Object.freeze({
    embodimentId: "emb_remote_visual_handoff",
    threadId: "thr_remote_visual_handoff",
    kind: "portrait",
    visibility: "public",
    status: "available",
    asset: Object.freeze({ referenceObjectRef: "asset_remote_visual_root" }),
  }),
  observedAt: "2026-08-31T01:00:00Z",
});

test("World visual HTTP boundary crosses the authenticated Presentation API contract", async () => {
  const calls = [];
  const api = createVisualPublicationWriteApi({
    privateToken: "shared-private-token",
    reconciler: {
      async reconcileAvailableEmbodiment(input) {
        calls.push(input);
        return { complete: true, stage: "complete", detail: { officialPhotoMediaId: "media_official" } };
      },
    },
  });
  const boundary = createThreadPresentationVisualHttpBoundary({
    baseUrl: "https://presentation.example/ignored/path",
    privateToken: "shared-private-token",
    fetchImpl(requestUrl, init) {
      return api.fetch(new Request(requestUrl, init));
    },
  });

  const result = await boundary.reconcileAvailableEmbodiment(HANDOFF);
  assert.deepEqual(calls, [HANDOFF]);
  assert.deepEqual(result, {
    complete: true,
    stage: "complete",
    detail: { officialPhotoMediaId: "media_official" },
  });
});

test("World visual HTTP boundary surfaces Presentation rejection with HTTP status", async () => {
  const boundary = createThreadPresentationVisualHttpBoundary({
    baseUrl: "https://presentation.example",
    privateToken: "wrong-token",
    fetchImpl(requestUrl, init) {
      const api = createVisualPublicationWriteApi({
        privateToken: "right-token",
        reconciler: { async reconcileAvailableEmbodiment() { throw new Error("must not run"); } },
      });
      return api.fetch(new Request(requestUrl, init));
    },
  });

  await assert.rejects(
    () => boundary.reconcileAvailableEmbodiment(HANDOFF),
    (error) => {
      assert.equal(error.code, "THREAD_PRESENTATION_VISUAL_HANDOFF_FAILED");
      assert.equal(error.httpStatus, 403);
      assert.match(error.message, /private_token_required/);
      return true;
    },
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { createVisualPublicationWriteApi } from "../src/http/visual-publication-write-api.mjs";

const BODY = Object.freeze({
  threadId: "thr_visual_handoff",
  embodiment: Object.freeze({ embodimentId: "emb_visual_handoff", threadId: "thr_visual_handoff" }),
  observedAt: "2026-08-31T01:00:00Z",
});

function request({ token = "secret", body = BODY, method = "POST" } = {}) {
  return new Request("https://presentation.example/internal/visual-publication/reconcile", {
    method,
    headers: {
      "content-type": "application/json",
      ...(token === null ? {} : { "x-fibre-private-token": token }),
    },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
}

test("visual publication write API authenticates and forwards admitted Embodiment handoff", async () => {
  const calls = [];
  const api = createVisualPublicationWriteApi({
    privateToken: "secret",
    reconciler: {
      async reconcileAvailableEmbodiment(input) {
        calls.push(input);
        return { complete: false, stage: "official_photo_pending", detail: { jobId: "assetjob_photo" } };
      },
    },
  });

  const response = await api.fetch(request());
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [BODY]);
  assert.deepEqual(await response.json(), {
    ok: true,
    result: { complete: false, stage: "official_photo_pending", detail: { jobId: "assetjob_photo" } },
  });
});

test("visual publication write API rejects unauthenticated handoff", async () => {
  const api = createVisualPublicationWriteApi({
    privateToken: "secret",
    reconciler: { async reconcileAvailableEmbodiment() { throw new Error("must not run"); } },
  });
  const response = await api.fetch(request({ token: null }));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "private_token_required" });
});

test("visual publication write API isolates invalid reconciliation input", async () => {
  const api = createVisualPublicationWriteApi({
    privateToken: "secret",
    reconciler: { async reconcileAvailableEmbodiment() { throw new TypeError("bad embodiment"); } },
  });
  const response = await api.fetch(request());
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "invalid_visual_publication_handoff",
    detail: "bad embodiment",
  });
});

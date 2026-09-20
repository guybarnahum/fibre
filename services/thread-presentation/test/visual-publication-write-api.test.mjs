import assert from "node:assert/strict";
import test from "node:test";

import { createVisualPublicationWriteApi } from "../src/http/visual-publication-write-api.mjs";

const BODY = Object.freeze({
  threadId:"thr_visual_handoff",
  embodiment:Object.freeze({ embodimentId:"emb_visual_handoff", threadId:"thr_visual_handoff" }),
  observedAt:"2026-08-31T01:00:00Z",
});

function request(body = BODY) {
  return new Request("https://presentation.example/internal/visual-publication/reconcile", {
    method:"POST",
    headers:{
      "content-type":"application/json",
      "x-fibre-private-token":"secret",
    },
    body:JSON.stringify(body),
  });
}

test("visual recovery intent reaches Presentation reconciliation", async () => {
  let received = null;
  const api = createVisualPublicationWriteApi({
    privateToken:"secret",
    reconciler:{
      async reconcileAvailableEmbodiment(input) {
        received = input;
        return { complete:false, stage:"official_photo_pending", detail:{} };
      },
    },
  });
  const activityContext = { threadId:BODY.threadId, causationId:BODY.embodiment.embodimentId };

  await api.fetch(request({
    ...BODY,
    activityContext,
    regenerationKey:"recover-canonical-photo",
  }));

  assert.equal(received.regenerationKey, "recover-canonical-photo");
  assert.deepEqual(received.activityContext, activityContext);
});

test("visual publication preserves a terminal Presentation failure", async () => {
  const api = createVisualPublicationWriteApi({
    privateToken:"secret",
    reconciler:{
      async reconcileAvailableEmbodiment() {
        const error = new Error("official photo generation ended terminally");
        error.code = "PRESENTATION_ASSET_WORKFLOW_TERMINAL";
        error.retryable = false;
        throw error;
      },
    },
  });

  const body = await (await api.fetch(request())).json();

  assert.equal(body.code, "PRESENTATION_ASSET_WORKFLOW_TERMINAL");
  assert.equal(body.retryable, false);
  assert.match(body.detail, /ended terminally/);
});

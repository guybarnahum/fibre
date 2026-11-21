import assert from "node:assert/strict";
import test from "node:test";

import { createCloudflareEmbeddingAdapter } from "./cloudflare.mjs";
import { selectMeaningIntegration } from "../../../infra/deployments/integration-selection.mjs";

test("World's meaning port embeds through its binding, and a failure reaches the caller for its fallback", async () => {
  const sent = [];
  const adapter = selectMeaningIntegration({ kind:"ai.embedding", provider:"cloudflare", config:{ model:"@cf/baai/bge-m3", binding:"AI" } },
    { environment:{ AI:{ run:async (model, body) => { sent.push({ model, body }); return { shape:[2, 3], data:[[1, 0, 0], [0, 1, 0]] }; } } } });
  const { vectors } = await adapter.embed(["one subject", "another"]);
  assert.deepEqual(vectors, [[1, 0, 0], [0, 1, 0]]);
  assert.deepEqual(sent[0], { model:"@cf/baai/bge-m3", body:{ text:["one subject", "another"] } });
  assert.equal(selectMeaningIntegration(undefined), null, "a World without a meaning port did not fall back to words");
  const broken = createCloudflareEmbeddingAdapter({ modelId:"@cf/m", binding:{ run:async () => ({ data:[] }) } });
  await assert.rejects(broken.embed(["x"]), /no usable vectors/u);
});

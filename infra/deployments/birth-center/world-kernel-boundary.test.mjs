import assert from "node:assert/strict";
import test from "node:test";

import { createWorldKernelBirthPublisher } from "./world-kernel-boundary.mjs";

test("Birth-to-World publication preserves causal Activity context outside the birth bundle", async () => {
  let observed = null;
  const publisher = createWorldKernelBirthPublisher({
    baseUrl: "https://world.internal",
    privateToken: "private-test-token",
    async fetchImpl(url, options) {
      observed = { url:String(url), options };
      return Response.json({ idempotent:false }, { status:201 });
    },
  });
  const bundle = { manifest:{ threadId:"thr_test" } };

  await publisher.publishBirth(bundle, {
    activityContext: {
      requestId:"req_birth_001",
      parentOperationId:"op_world_submit_001",
    },
  });

  assert.equal(observed.options.headers["x-fibre-activity-request-id"], "req_birth_001");
  assert.equal(observed.options.headers["x-fibre-activity-parent-operation-id"], "op_world_submit_001");
  assert.deepEqual(JSON.parse(observed.options.body), bundle);
});

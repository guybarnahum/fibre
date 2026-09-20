import assert from "node:assert/strict";
import test from "node:test";

import { createCanonicalVisualRootBoundary } from "./service-boundaries.mjs";

test("canonical visual generation preserves terminal downstream classification", async () => {
  const boundary = createCanonicalVisualRootBoundary({
    baseUrl:"https://asset.example",
    privateToken:"secret",
    async fetchImpl() {
      return new Response(JSON.stringify({
        ok:false,
        error:"asset_generation_failed",
        code:"ASSET_GENERATION_TERMINAL",
        detail:"provider rejected generation",
        retryable:false,
      }), { status:409, headers:{ "content-type":"application/json" } });
    },
  });

  await assert.rejects(
    () => boundary.reconcile({ job:{ jobId:"job_terminal" } }),
    (error) => (
      error.code === "ASSET_GENERATION_TERMINAL"
      && error.retryable === false
      && /provider rejected generation/.test(error.message)
    ),
  );
});

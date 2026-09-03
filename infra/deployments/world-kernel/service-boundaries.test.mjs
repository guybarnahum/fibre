import assert from "node:assert/strict";
import test from "node:test";

import {
  createCanonicalVisualRootBoundary,
  createThreadPresentationPublisher,
} from "./service-boundaries.mjs";

test("canonical-root boundary preserves explicit terminal downstream classification", async () => {
  const boundary = createCanonicalVisualRootBoundary({
    baseUrl: "https://asset.example",
    privateToken: "secret",
    async fetchImpl() {
      return new Response(JSON.stringify({
        ok: false,
        error: "asset_generation_control_failed",
        code: "ASSET_GENERATION_WORKFLOW_TERMINAL",
        detail: "provider rejected request",
        retryable: false,
      }), {
        status: 409,
        headers: { "content-type": "application/json" },
      });
    },
  });

  await assert.rejects(
    () => boundary.reconcile({ job: { jobId: "job_terminal" } }),
    (error) => {
      assert.equal(error.code, "ASSET_GENERATION_WORKFLOW_TERMINAL");
      assert.equal(error.httpStatus, 409);
      assert.equal(error.retryable, false);
      assert.match(error.message, /provider rejected request/);
      return true;
    },
  );
});

test("Genesis Presentation boundary keeps transient downstream failures retryable", async () => {
  const publisher = createThreadPresentationPublisher({
    baseUrl: "https://presentation.example",
    privateToken: "secret",
    async fetchImpl() {
      return new Response(JSON.stringify({
        error: "temporarily_unavailable",
      }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    },
  });

  await assert.rejects(
    () => publisher.publishGenesisPresentation({
      genesisId: "gen_test",
      publicationDigest: "sha256:test",
      bundle: {},
    }),
    (error) => {
      assert.equal(error.code, "THREAD_PRESENTATION_PUBLICATION_FAILED");
      assert.equal(error.httpStatus, 503);
      assert.equal(error.retryable, true);
      return true;
    },
  );
});

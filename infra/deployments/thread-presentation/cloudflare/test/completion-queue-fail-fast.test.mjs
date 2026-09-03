import assert from "node:assert/strict";
import test from "node:test";

import { completionQueueFailureDisposition } from "../completion-queue-policy.mjs";

test("completion queue remains retryable before the configured retry limit", () => {
  assert.deepEqual(completionQueueFailureDisposition({ attempts: 1 }), {
    terminal: false,
    status: "retrying",
    code: "PRESENTATION_ASSET_COMPLETION_RETRY",
    retryable: true,
  });
  assert.deepEqual(completionQueueFailureDisposition({ attempts: 9 }), {
    terminal: false,
    status: "retrying",
    code: "PRESENTATION_ASSET_COMPLETION_RETRY",
    retryable: true,
  });
});

test("completion queue becomes terminal exactly when Cloudflare exhausts max_retries", () => {
  assert.deepEqual(completionQueueFailureDisposition({ attempts: 10 }), {
    terminal: true,
    status: "failed",
    code: "PRESENTATION_ASSET_COMPLETION_RETRIES_EXHAUSTED",
    retryable: false,
  });
  assert.deepEqual(completionQueueFailureDisposition({ attempts: 11 }), {
    terminal: true,
    status: "failed",
    code: "PRESENTATION_ASSET_COMPLETION_RETRIES_EXHAUSTED",
    retryable: false,
  });
});

import test from "node:test";
import assert from "node:assert/strict";

import { InfraImmutableObjectConflictError } from "#packages/infra/src/infra-driver.mjs";
import {
  AssetGenerationError,
  assetGenerationRetryDecision,
  parseRetryAfterMs,
  toAssetGenerationError,
} from "../src/asset-generation-error.mjs";

test("asset generation error preserves provider-neutral failure evidence", () => {
  const error = new AssetGenerationError("rate limited", {
    phase: "provider_generation",
    category: "rate_limited",
    provider: "openai",
    model: "fixture-model",
    httpStatus: 429,
    providerRequestId: "req_fixture",
    retryAfterMs: 12_000,
  });

  assert.equal(error.retryable, true);
  assert.equal(error.phase, "provider_generation");
  assert.equal(error.category, "rate_limited");
  assert.equal(error.provider, "openai");
  assert.equal(error.model, "fixture-model");
  assert.equal(error.httpStatus, 429);
  assert.equal(error.providerRequestId, "req_fixture");
  assert.equal(error.retryAfterMs, 12_000);
  assert.equal(error.safeDetail, "rate limited");
});

test("retry policy retries bounded provider failures but never terminal categories", () => {
  const transient = new AssetGenerationError("unavailable", {
    phase: "provider_generation",
    category: "provider_unavailable",
  });
  assert.deepEqual(
    { ...assetGenerationRetryDecision(transient, { attempt: 1 }) },
    {
      retry: true,
      reason: "retryable",
      attempt: 1,
      maxAttempts: 4,
      delayMs: 5_000,
      category: "provider_unavailable",
      phase: "provider_generation",
      categoryRetryable: true,
      providerOutputDurable: false,
    },
  );
  assert.equal(assetGenerationRetryDecision(transient, { attempt: 4 }).retry, false);
  assert.equal(assetGenerationRetryDecision(transient, { attempt: 4 }).reason, "attempt_limit_reached");

  const terminal = new AssetGenerationError("bad request", {
    phase: "provider_generation",
    category: "invalid_request",
  });
  assert.equal(assetGenerationRetryDecision(terminal).retry, false);
  assert.equal(assetGenerationRetryDecision(terminal).reason, "terminal_category");
});

test("post-provider transient failures are classified but held until provider output is durable", () => {
  const signing = new AssetGenerationError("signer unavailable", {
    phase: "credential_signing",
    category: "provider_unavailable",
  });
  const current = assetGenerationRetryDecision(signing, { attempt: 1 });
  assert.equal(signing.retryable, true, "the failure category itself is transient");
  assert.equal(current.retry, false, "the current whole-job step must not pay for another provider call");
  assert.equal(current.reason, "provider_output_not_staged");

  const resumable = assetGenerationRetryDecision(signing, {
    attempt: 1,
    providerOutputDurable: true,
  });
  assert.equal(resumable.retry, true, "Slice B can enable safe resume once raw provider output is staged");
});

test("reference loading and completion publication can retry without duplicating provider generation", () => {
  const referenceRead = new AssetGenerationError("object store unavailable", {
    phase: "reference_loading",
    category: "storage_transient",
  });
  const completion = new AssetGenerationError("queue unavailable", {
    phase: "completion_publication",
    category: "storage_transient",
  });
  assert.equal(assetGenerationRetryDecision(referenceRead).retry, true);
  assert.equal(assetGenerationRetryDecision(completion).retry, true);
});

test("immutable conflicts classify terminal and retry-after parsing accepts seconds or dates", () => {
  const classified = toAssetGenerationError(
    new InfraImmutableObjectConflictError("occupied"),
    { phase: "storage_finalization" },
  );
  assert.equal(classified.category, "immutable_conflict");
  assert.equal(classified.retryable, false);

  assert.equal(parseRetryAfterMs("1.5"), 1500);
  assert.equal(parseRetryAfterMs("Wed, 26 Aug 2026 21:00:10 GMT", {
    nowMs: Date.parse("Wed, 26 Aug 2026 21:00:00 GMT"),
  }), 10_000);
  assert.equal(parseRetryAfterMs("not-a-delay"), null);
});

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
  assert.equal(error.providerOperationDurable, false);
  assert.equal(error.providerOutputDurable, false);
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
      providerOperationDurable: false,
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

test("post-provider transient failures become retryable automatically once staged output is durable", () => {
  const unstaged = new AssetGenerationError("signer unavailable", {
    phase: "credential_signing",
    category: "provider_unavailable",
  });
  const current = assetGenerationRetryDecision(unstaged, { attempt: 1 });
  assert.equal(unstaged.retryable, true, "the failure category itself is transient");
  assert.equal(current.retry, false, "without a stage the workflow must not pay for another provider call");
  assert.equal(current.reason, "provider_output_not_staged");

  const staged = toAssetGenerationError(unstaged, { providerOutputDurable: true });
  assert.equal(staged.providerOutputDurable, true);
  const resumable = assetGenerationRetryDecision(staged, { attempt: 1 });
  assert.equal(resumable.retry, true, "durable raw provider output makes signer retry safe");
});

test("accepted provider-operation staging is terminal if the operation identity never became durable", () => {
  const staging = new AssetGenerationError("object store unavailable", {
    phase: "provider_operation_staging",
    category: "storage_transient",
    provider: "bfl",
    model: "flux-2-pro",
    providerRequestId: "bfl_task_1",
    providerOperationDurable: false,
  });
  const decision = assetGenerationRetryDecision(staging);
  assert.equal(decision.retry, false);
  assert.equal(decision.reason, "provider_operation_not_staged");
});

test("a durable accepted provider operation can retry provider polling without resubmission", () => {
  const polling = new AssetGenerationError("polling budget exhausted", {
    phase: "provider_generation",
    category: "provider_timeout",
    provider: "bfl",
    model: "flux-2-pro",
    providerRequestId: "bfl_task_1",
    providerOperationDurable: true,
  });
  const decision = assetGenerationRetryDecision(polling);
  assert.equal(decision.retry, true);
  assert.equal(decision.providerOperationDurable, true);
});

test("provider-output staging itself remains terminal if the raw output never became durable", () => {
  const staging = new AssetGenerationError("object store unavailable", {
    phase: "provider_output_staging",
    category: "storage_transient",
    providerOutputDurable: false,
  });
  const decision = assetGenerationRetryDecision(staging);
  assert.equal(decision.retry, false);
  assert.equal(decision.reason, "provider_output_not_staged");
});

test("reference loading and completion publication can retry without duplicating provider generation", () => {
  const referenceRead = new AssetGenerationError("object store unavailable", {
    phase: "reference_loading",
    category: "storage_transient",
  });
  const completion = new AssetGenerationError("queue unavailable", {
    phase: "completion_publication",
    category: "storage_transient",
    providerOutputDurable: true,
  });
  assert.equal(assetGenerationRetryDecision(referenceRead).retry, true);
  assert.equal(assetGenerationRetryDecision(completion).retry, true);
});

test("immutable conflicts classify terminal and retry-after parsing accepts seconds or dates", () => {
  const classified = toAssetGenerationError(
    new InfraImmutableObjectConflictError("occupied"),
    { phase: "storage_finalization", providerOutputDurable: true },
  );
  assert.equal(classified.category, "immutable_conflict");
  assert.equal(classified.retryable, false);
  assert.equal(classified.providerOutputDurable, true);

  assert.equal(parseRetryAfterMs("1.5"), 1500);
  assert.equal(parseRetryAfterMs("Wed, 26 Aug 2026 21:00:10 GMT", {
    nowMs: Date.parse("Wed, 26 Aug 2026 21:00:00 GMT"),
  }), 10_000);
  assert.equal(parseRetryAfterMs("not-a-delay"), null);
});

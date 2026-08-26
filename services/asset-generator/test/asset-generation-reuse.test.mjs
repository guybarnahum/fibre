import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSET_GENERATION_REUSE_VERSION,
  createAssetGenerationReuse,
  normalizeAssetGenerationReuse,
} from "../src/asset-generation-reuse.mjs";

const digest = `sha256:${"a".repeat(64)}`;

test("asset generation reuse records exact-job cache scope explicitly", () => {
  assert.deepEqual({ ...createAssetGenerationReuse({ mode: "none", jobDigest: digest }) }, {
    reuseVersion: ASSET_GENERATION_REUSE_VERSION,
    cacheScope: "exact_job_digest",
    mode: "none",
    jobDigest: digest,
    generationAttemptId: null,
    providerGenerationPerformed: true,
  });

  assert.deepEqual({ ...createAssetGenerationReuse({
    mode: "completed_asset",
    jobDigest: digest,
    generationAttemptId: "generationattempt_fixture_1",
  }) }, {
    reuseVersion: ASSET_GENERATION_REUSE_VERSION,
    cacheScope: "exact_job_digest",
    mode: "completed_asset",
    jobDigest: digest,
    generationAttemptId: "generationattempt_fixture_1",
    providerGenerationPerformed: false,
  });
});

test("staged provider-output reuse must name the durable generation attempt", () => {
  assert.throws(
    () => createAssetGenerationReuse({ mode: "staged_provider_output", jobDigest: digest }),
    /generationAttemptId/,
  );
});

test("reuse normalization rejects fuzzy cache scopes and contradictory provider-call claims", () => {
  assert.throws(() => normalizeAssetGenerationReuse({
    reuseVersion: ASSET_GENERATION_REUSE_VERSION,
    cacheScope: "semantic_similarity",
    mode: "completed_asset",
    jobDigest: digest,
    generationAttemptId: null,
    providerGenerationPerformed: false,
  }), /exact_job_digest/);

  assert.throws(() => normalizeAssetGenerationReuse({
    reuseVersion: ASSET_GENERATION_REUSE_VERSION,
    cacheScope: "exact_job_digest",
    mode: "completed_asset",
    jobDigest: digest,
    generationAttemptId: null,
    providerGenerationPerformed: true,
  }), /providerGenerationPerformed/);
});

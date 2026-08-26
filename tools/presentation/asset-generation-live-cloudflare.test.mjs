import test from "node:test";
import assert from "node:assert/strict";

import {
  describeWorkflowFailure,
  shortFibreRef,
} from "./asset-generation-live-cloudflare.mjs";

const jobId = "assetjob_79eb45dd0459";
const legacyLongJobId = "assetjob_79eb45dd0459e1c03ff92e2787895e4854ff67708dd6418b712d80e4edcf6781";

test("Cloudflare live smoke leaves durable 12-hex refs unchanged and shortens legacy long refs", () => {
  assert.equal(shortFibreRef(jobId), jobId);
  assert.equal(shortFibreRef(legacyLongJobId), "assetjob_79eb45dd0459…");
  assert.equal(shortFibreRef("media_memory_sandals"), "media_memory_sandals");
});

test("Cloudflare live smoke unwraps structured terminal generation diagnostics from Workflow errors", () => {
  const observation = {
    failureVersion: "asset-generation-failure-observation-v0.1",
    phase: "credentialed_asset_generation",
    provider: "openai",
    model: "gpt-image-2-2026-04-21",
    retryable: false,
    detail: "upstream request failed",
  };
  const message = describeWorkflowFailure({
    jobId,
    workflow: {
      status: "errored",
      input: { providerProfile: "openai-gpt-image-2-medium-v1" },
      error: {
        name: "Error",
        message: `AssetGenerationAttemptFailed: ${JSON.stringify(observation)}`,
      },
    },
  });

  assert.match(message, /assetjob_79eb45dd0459 workflow ended as errored/);
  assert.match(message, /phase: credentialed_asset_generation/);
  assert.match(message, /provider: openai\/gpt-image-2-2026-04-21/);
  assert.match(message, /retryable: no/);
  assert.match(message, /error: Error: upstream request failed/);
});

test("Cloudflare live smoke falls back to safe Workflow error and provider profile", () => {
  const message = describeWorkflowFailure({
    jobId,
    workflow: {
      status: "errored",
      input: { providerProfile: "provider-profile-fixture" },
      error: { name: "Error", message: "plain workflow failure" },
    },
  });

  assert.match(message, /phase: workflow/);
  assert.match(message, /provider: provider-profile-fixture/);
  assert.match(message, /retryable: unknown/);
  assert.match(message, /error: Error: plain workflow failure/);
});

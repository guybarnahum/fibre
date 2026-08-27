import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { AssetGenerationError } from "../src/asset-generation-error.mjs";
import {
  BFL_FLUX_IMAGE_PROVIDER_PROFILE,
  OPENAI_IMAGE_PROVIDER_PROFILE,
  createCloudflareAssetImageProvider,
} from "../../../deployments/cloudflare/asset-generator/image-provider-selection.mjs";

function job(providerProfile) {
  return { providerProfile };
}

test("Cloudflare deployment maps logical image provider profiles without changing the portable provider contract", () => {
  const openai = createCloudflareAssetImageProvider({
    env: { OPENAI_API_KEY: "openai-fixture" },
    job: job(OPENAI_IMAGE_PROVIDER_PROFILE),
  });
  const bfl = createCloudflareAssetImageProvider({
    env: { BFL_API_KEY: "bfl-fixture" },
    job: job(BFL_FLUX_IMAGE_PROVIDER_PROFILE),
  });

  assert.equal(openai.providerId, "openai-image-v1");
  assert.deepEqual(openai.capabilities, ["image"]);
  assert.equal(bfl.providerId, "bfl-flux-image-v1");
  assert.deepEqual(bfl.capabilities, ["image"]);
  assert.equal(typeof bfl.startOperation, "function");
  assert.equal(typeof bfl.resumeOperation, "function");
});

test("Cloudflare deployment fails closed on an unknown logical image provider profile", () => {
  assert.throws(
    () => createCloudflareAssetImageProvider({ env: {}, job: job("unknown-image-provider-v1") }),
    (error) => error instanceof AssetGenerationError
      && error.phase === "validation"
      && error.category === "unsupported_capability"
      && error.retryable === false,
  );
});

test("Cloudflare deployment requires only the secret for the selected image provider", () => {
  assert.throws(
    () => createCloudflareAssetImageProvider({ env: {}, job: job(OPENAI_IMAGE_PROVIDER_PROFILE) }),
    /OPENAI_API_KEY/,
  );
  assert.throws(
    () => createCloudflareAssetImageProvider({ env: {}, job: job(BFL_FLUX_IMAGE_PROVIDER_PROFILE) }),
    /BFL_API_KEY/,
  );
});

test("local environment example names BFL_API_KEY without adding provider/model selection secrets", async () => {
  const envExample = await readFile(new URL("../../../.env.example", import.meta.url), "utf8");
  assert.match(envExample, /^BFL_API_KEY=<bfl_\.\.\.-your-bfl-api-key>$/m);
  assert.doesNotMatch(envExample, /^BFL_MODEL=/m);
  assert.doesNotMatch(envExample, /^ASSET_IMAGE_PROVIDER_PROFILE=/m);
});

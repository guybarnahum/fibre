import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { AssetGenerationError } from "#services/asset-generator/src/asset-generation-error.mjs";
import {
  BFL_FLUX_IMAGE_PROVIDER_PROFILE,
  OPENAI_IMAGE_PROVIDER_PROFILE,
  selectAssetImageProvider,
} from "../image-provider-selection.mjs";

test("deployment composition maps logical image profiles without changing the portable provider contract", () => {
  const openai = selectAssetImageProvider({
    profile: OPENAI_IMAGE_PROVIDER_PROFILE,
    secrets: { openAiApiKey: "openai-fixture" },
  });
  const bfl = selectAssetImageProvider({
    profile: BFL_FLUX_IMAGE_PROVIDER_PROFILE,
    secrets: { bflApiKey: "bfl-fixture" },
  });

  assert.equal(openai.providerId, "openai-image-v1");
  assert.deepEqual(openai.capabilities, ["image"]);
  assert.equal(bfl.providerId, "bfl-flux-image-v1");
  assert.deepEqual(bfl.capabilities, ["image"]);
  assert.equal(typeof bfl.startOperation, "function");
  assert.equal(typeof bfl.resumeOperation, "function");
});

test("deployment composition fails closed on an unknown logical image provider profile", () => {
  assert.throws(
    () => selectAssetImageProvider({ profile: "unknown-image-provider-v1", secrets: {} }),
    (error) => error instanceof AssetGenerationError
      && error.phase === "validation"
      && error.category === "unsupported_capability"
      && error.retryable === false,
  );
});

test("deployment composition requires only the secret for the selected image provider", () => {
  assert.throws(
    () => selectAssetImageProvider({ profile: OPENAI_IMAGE_PROVIDER_PROFILE, secrets: {} }),
    /OpenAI image API key/,
  );
  assert.throws(
    () => selectAssetImageProvider({ profile: BFL_FLUX_IMAGE_PROVIDER_PROFILE, secrets: {} }),
    /BFL image API key/,
  );
});

test("local environment example names BFL_API_KEY without adding provider/model selection secrets", async () => {
  const envExample = await readFile(new URL("../../../../.env.example", import.meta.url), "utf8");
  assert.match(envExample, /^BFL_API_KEY=<bfl_\.\.\.-your-bfl-api-key>$/m);
  assert.doesNotMatch(envExample, /^BFL_MODEL=/m);
  assert.doesNotMatch(envExample, /^ASSET_IMAGE_PROVIDER_PROFILE=/m);
});

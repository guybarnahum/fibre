import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runtimeUrl = new URL("../src/cloudflare/asset-generation-runtime.mjs", import.meta.url);
const workerUrl = new URL("../src/cloudflare/worker.mjs", import.meta.url);
const assetConfigUrl = new URL("../wrangler.local.jsonc", import.meta.url);
const presentationWorkerUrl = new URL("../../presentation-cloudflare/src/worker.mjs", import.meta.url);
const presentationConfigUrl = new URL("../../presentation-cloudflare/wrangler.local.jsonc", import.meta.url);

async function text(url) {
  return readFile(url, "utf8");
}

async function json(url) {
  return JSON.parse(await text(url));
}

test("Cloudflare asset execution runtime is generation-only and has no presentation authority imports", async () => {
  const runtime = await text(runtimeUrl);
  const worker = await text(workerUrl);

  assert.match(runtime, /executeCredentialedAssetGenerationJob/);
  assert.match(runtime, /ASSET_OBJECTS/);
  assert.doesNotMatch(runtime, /world-kernel|thread-presentation|presentationServer|media\.ready/);
  assert.doesNotMatch(worker, /world-kernel|thread-presentation|presentationServer|media\.ready/);
  assert.match(worker, /class AssetGenerationWorkflow extends WorkflowEntrypoint/);
  assert.match(worker, /AssetGenerationAttemptFailed/);
});

test("presentation binds to the standalone asset Workflow and no longer owns provider execution", async () => {
  const assetConfig = await json(assetConfigUrl);
  const presentationConfig = await json(presentationConfigUrl);
  const presentationWorker = await text(presentationWorkerUrl);

  const assetWorkflow = assetConfig.workflows.find((binding) => binding.binding === "ASSET_GENERATION");
  const presentationWorkflow = presentationConfig.workflows.find((binding) => binding.binding === "ASSET_GENERATION");

  assert.equal(assetConfig.name, "fibre-asset-generator-local");
  assert.equal(assetWorkflow.class_name, "AssetGenerationWorkflow");
  assert.equal(presentationWorkflow.class_name, "AssetGenerationWorkflow");
  assert.equal(presentationWorkflow.script_name, assetConfig.name);
  assert.equal(presentationWorkflow.name, assetWorkflow.name);
  assert.deepEqual(assetConfig.secrets.required, ["OPENAI_API_KEY"]);
  assert.equal(presentationConfig.secrets, undefined);

  assert.doesNotMatch(presentationWorker, /WorkflowEntrypoint|NonRetryableError/);
  assert.doesNotMatch(presentationWorker, /createOpenAIImageProvider|executeCredentialedAssetGenerationJob/);
  assert.match(presentationWorker, /createAssetGenerationService/);
  assert.match(presentationWorker, /createThreadPresentationAssetPublisher/);
});

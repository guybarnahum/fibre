import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runtimeUrl = new URL("../src/cloudflare/asset-generation-runtime.mjs", import.meta.url);
const workerUrl = new URL("../src/cloudflare/worker.mjs", import.meta.url);
const assetConfigUrl = new URL("../wrangler.local.jsonc", import.meta.url);
const presentationWorkerUrl = new URL("../../presentation-cloudflare/src/worker.mjs", import.meta.url);
const presentationConfigUrl = new URL("../../presentation-cloudflare/wrangler.local.jsonc", import.meta.url);
const p3ProofUrl = new URL("../../../tools/presentation/prove-p3-generated-media-local.mjs", import.meta.url);

async function text(url) {
  return readFile(url, "utf8");
}

async function json(url) {
  return JSON.parse(await text(url));
}

test("Cloudflare asset execution runtime is generation-only and completion transport stays behind InfraDriver", async () => {
  const runtime = await text(runtimeUrl);
  const worker = await text(workerUrl);

  assert.match(runtime, /executeCredentialedAssetGenerationJob/);
  assert.match(runtime, /ASSET_OBJECTS/);
  assert.match(runtime, /withCloudflareQueueBindings/);
  assert.match(runtime, /publishAssetGenerationCompletion/);
  assert.doesNotMatch(runtime, /world-kernel|thread-presentation|presentationServer|media\.ready/);
  assert.doesNotMatch(worker, /world-kernel|thread-presentation|presentationServer|media\.ready/);
  assert.match(worker, /class AssetGenerationWorkflow extends WorkflowEntrypoint/);
  assert.match(worker, /AssetGenerationAttemptFailed/);
  assert.match(worker, /createAssetGenerationCompletion/);
  assert.match(worker, /publishCompletion/);
  assert.match(worker, /signal asset generation completion/);
  assert.doesNotMatch(worker, /ASSET_COMPLETIONS|\.send\(/);
});

test("presentation owns the standalone Workflow consumer and queue completion publication boundary", async () => {
  const assetConfig = await json(assetConfigUrl);
  const presentationConfig = await json(presentationConfigUrl);
  const presentationWorker = await text(presentationWorkerUrl);
  const p3Proof = await text(p3ProofUrl);

  const assetWorkflow = assetConfig.workflows.find((binding) => binding.binding === "ASSET_GENERATION");
  const presentationWorkflow = presentationConfig.workflows.find((binding) => binding.binding === "ASSET_GENERATION");
  const producer = assetConfig.queues.producers.find((binding) => binding.binding === "ASSET_COMPLETIONS");
  const consumer = presentationConfig.queues.consumers.find((binding) => binding.queue === producer.queue);

  assert.equal(assetConfig.name, "fibre-asset-generator-local");
  assert.equal(assetWorkflow.class_name, "AssetGenerationWorkflow");
  assert.equal(presentationWorkflow.class_name, "AssetGenerationWorkflow");
  assert.equal(presentationWorkflow.script_name, assetConfig.name);
  assert.equal(presentationWorkflow.name, assetWorkflow.name);
  assert.deepEqual(assetConfig.secrets.required, ["OPENAI_API_KEY"]);
  assert.equal(presentationConfig.secrets, undefined);
  assert.equal(producer.queue, "fibre-asset-completions-local");
  assert.equal(consumer.max_retries, 10);
  assert.equal(consumer.dead_letter_queue, "fibre-asset-completions-local-dlq");

  assert.doesNotMatch(presentationWorker, /WorkflowEntrypoint|NonRetryableError/);
  assert.doesNotMatch(presentationWorker, /createOpenAIImageProvider|executeCredentialedAssetGenerationJob/);
  assert.match(presentationWorker, /createPresentationAssetCompletionService/);
  assert.match(presentationWorker, /createThreadPresentationAssetPublisher/);
  assert.match(presentationWorker, /async queue\(batch, env\)/);
  assert.match(presentationWorker, /message\.ack\(\)/);
  assert.match(presentationWorker, /message\.retry/);
  assert.doesNotMatch(presentationWorker, /publish-market/);
  assert.doesNotMatch(p3Proof, /publish-market|manual_fixture_handoff/);
  assert.match(p3Proof, /queue_completion_handoff/);
});

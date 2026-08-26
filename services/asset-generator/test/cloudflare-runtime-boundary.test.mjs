import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const runtimeUrl = new URL("../src/asset-generation-runtime.mjs", import.meta.url);
const oldCloudflareDirUrl = new URL("../src/cloudflare/", import.meta.url);
const workerUrl = new URL("../../../deployments/cloudflare/asset-generator/worker.mjs", import.meta.url);
const assetConfigUrl = new URL("../../../deployments/cloudflare/asset-generator/wrangler.local.jsonc", import.meta.url);
const deploymentManifestUrl = new URL("../../../deployments/environments/local.json", import.meta.url);
const presentationWorkerUrl = new URL("../../../deployments/cloudflare/thread-presentation/worker.mjs", import.meta.url);
const presentationConfigUrl = new URL("../../../deployments/cloudflare/thread-presentation/wrangler.local.jsonc", import.meta.url);
const oldPresentationCloudflareUrl = new URL("../../presentation-cloudflare/", import.meta.url);
const p3ProofUrl = new URL("../../../tools/presentation/prove-p3-generated-media-local.mjs", import.meta.url);

async function text(url) {
  return readFile(url, "utf8");
}

async function json(url) {
  return JSON.parse(await text(url));
}

test("Asset Generator runtime is infrastructure-independent and Cloudflare exists only in deployment composition", async () => {
  const runtime = await text(runtimeUrl);
  const worker = await text(workerUrl);

  await assert.rejects(() => stat(oldCloudflareDirUrl), (error) => error?.code === "ENOENT");

  assert.match(runtime, /createAssetGenerationRuntime/);
  assert.match(runtime, /requireInfraCapabilities/);
  assert.match(runtime, /publishAssetGenerationCompletion/);
  assert.match(runtime, /AssetGenerationAttemptFailed/);
  assert.doesNotMatch(runtime, /cloudflare|ASSET_OBJECTS|ASSET_COMPLETIONS|OPENAI_API_KEY|C2PA_SIGNER_URL|WorkflowEntrypoint|NonRetryableError/);
  assert.doesNotMatch(runtime, /world-kernel|thread-presentation|presentationServer|media\.ready/);

  assert.match(worker, /createCloudflareInfraDriver/);
  assert.match(worker, /withCloudflareQueueBindings/);
  assert.match(worker, /createAssetGenerationRuntime/);
  assert.match(worker, /class AssetGenerationWorkflow extends WorkflowEntrypoint/);
  assert.match(worker, /NonRetryableError/);
  assert.match(worker, /ASSET_OBJECTS/);
  assert.match(worker, /ASSET_COMPLETIONS/);
  assert.match(worker, /createOpenAIImageProvider/);
  assert.match(worker, /createHttpContentCredentialSigner/);
  assert.doesNotMatch(worker, /world-kernel|thread-presentation|presentationServer|media\.ready/);
});

test("deployment manifest selects Cloudflare while presentation owns completion publication", async () => {
  const manifest = await json(deploymentManifestUrl);
  const assetConfig = await json(assetConfigUrl);
  const presentationConfig = await json(presentationConfigUrl);
  const presentationWorker = await text(presentationWorkerUrl);
  const p3Proof = await text(p3ProofUrl);

  await assert.rejects(() => stat(oldPresentationCloudflareUrl), (error) => error?.code === "ENOENT");

  const assetDeployment = manifest.services["asset-generator"];
  const provider = manifest.providers[assetDeployment.infra];
  assert.equal(assetDeployment.runtime, "cloudflare-local");
  assert.equal(provider.platform, "cloudflare");
  assert.equal(provider.infraDriver, "cloudflare-v1");
  assert.deepEqual(assetDeployment.requires, ["objects", "queues", "workflows"]);

  const presentationDeployment = manifest.services["thread-presentation"];
  assert.equal(presentationDeployment.runtime, "cloudflare-local");
  assert.equal(presentationDeployment.infra, "cloudflare-local");

  const assetWorkflow = assetConfig.workflows.find((binding) => binding.binding === "ASSET_GENERATION");
  const presentationWorkflow = presentationConfig.workflows.find((binding) => binding.binding === "ASSET_GENERATION");
  const producer = assetConfig.queues.producers.find((binding) => binding.binding === "ASSET_COMPLETIONS");
  const consumer = presentationConfig.queues.consumers.find((binding) => binding.queue === producer.queue);

  assert.equal(assetConfig.name, "fibre-asset-generator-local");
  assert.equal(assetConfig.main, "./worker.mjs");
  assert.equal(presentationConfig.name, "fibre-presentation-local");
  assert.equal(presentationConfig.main, "./worker.mjs");
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

import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const runtimeUrl = new URL("../src/asset-generation-runtime.mjs", import.meta.url);
const errorUrl = new URL("../src/asset-generation-error.mjs", import.meta.url);
const attemptUrl = new URL("../src/asset-generation-attempt.mjs", import.meta.url);
const oldCloudflareDirUrl = new URL("../src/cloudflare/", import.meta.url);
const workerUrl = new URL("../../../deployments/cloudflare/asset-generator/worker.mjs", import.meta.url);
const providerSelectionUrl = new URL("../../../deployments/cloudflare/asset-generator/image-provider-selection.mjs", import.meta.url);
const assetConfigUrl = new URL("../../../deployments/cloudflare/asset-generator/wrangler.local.jsonc", import.meta.url);
const deploymentManifestUrl = new URL("../../../deployments/environments/local.json", import.meta.url);
const presentationWorkerUrl = new URL("../../../deployments/cloudflare/thread-presentation/worker.mjs", import.meta.url);
const presentationConfigUrl = new URL("../../../deployments/cloudflare/thread-presentation/wrangler.local.jsonc", import.meta.url);
const retiredPresentationCloudflareFiles = Object.freeze([
  new URL("../../presentation-cloudflare/src/worker.mjs", import.meta.url),
  new URL("../../presentation-cloudflare/src/presentation-read-api.mjs", import.meta.url),
  new URL("../../presentation-cloudflare/wrangler.local.jsonc", import.meta.url),
  new URL("../../presentation-cloudflare/README.md", import.meta.url),
]);
const p3ProofUrl = new URL("../../../tools/presentation/prove-p3-generated-media-local.mjs", import.meta.url);

async function text(url) {
  return readFile(url, "utf8");
}

async function json(url) {
  return JSON.parse(await text(url));
}

test("Asset Generator runtime stages provider attempts portably and Cloudflare only translates retry policy", async () => {
  const runtime = await text(runtimeUrl);
  const errors = await text(errorUrl);
  const attempts = await text(attemptUrl);
  const worker = await text(workerUrl);
  const providerSelection = await text(providerSelectionUrl);

  await assert.rejects(() => stat(oldCloudflareDirUrl), (error) => error?.code === "ENOENT");

  assert.match(runtime, /createAssetGenerationRuntime/);
  assert.match(runtime, /requireInfraCapabilities/);
  assert.match(runtime, /publishAssetGenerationCompletion/);
  assert.match(runtime, /attemptNumber/);
  assert.match(runtime, /providerOutputResumed/);
  assert.doesNotMatch(runtime, /cloudflare|ASSET_OBJECTS|ASSET_COMPLETIONS|OPENAI_API_KEY|BFL_API_KEY|C2PA_SIGNER_URL|WorkflowEntrypoint|NonRetryableError/);
  assert.doesNotMatch(runtime, /world-kernel|thread-presentation|presentationServer|media\.ready/);

  assert.match(attempts, /generation-attempt-v0\.1/);
  assert.match(attempts, /assetGenerationJobDigest/);
  assert.match(attempts, /generationAttemptObjectRef/);
  assert.match(attempts, /stagedProviderOutputObjectRef/);
  assert.doesNotMatch(attempts, /cloudflare|R2|WorkflowEntrypoint/);

  assert.match(errors, /assetGenerationRetryDecision/);
  assert.match(errors, /provider_output_staging/);
  assert.match(errors, /provider_output_not_staged/,
    "portable policy must still block replay if raw provider output never became durable");
  assert.match(errors, /providerOutputDurable/,
    "portable retry policy must carry whether post-provider resume is safe");
  assert.match(errors, /rate_limited/);
  assert.match(errors, /quota_exhausted/);
  assert.match(errors, /immutable_conflict/);
  assert.doesNotMatch(errors, /cloudflare|WorkflowEntrypoint|NonRetryableError/);

  assert.match(worker, /createCloudflareInfraDriver/);
  assert.match(worker, /withCloudflareQueueBindings/);
  assert.match(worker, /createAssetGenerationRuntime/);
  assert.match(worker, /createCloudflareAssetImageProvider/);
  assert.match(worker, /class AssetGenerationWorkflow extends WorkflowEntrypoint/);
  assert.match(worker, /NonRetryableError/);
  assert.match(worker, /assetGenerationRetryDecision/);
  assert.match(worker, /attemptNumber: ctx\.attempt/,
    "Cloudflare Workflow retries must be passed into the portable GenerationAttempt seam");
  assert.match(worker, /providerOutputDurable: error\?\.providerOutputDurable === true/,
    "diagnostics must distinguish safe staged retries from pre-stage failures");
  assert.match(worker, /ASSET_OBJECTS/);
  assert.match(worker, /ASSET_COMPLETIONS/);
  assert.match(worker, /createHttpContentCredentialSigner/);
  assert.match(worker, /asset-generation-failure-observation-v0\.1/,
    "Cloudflare deployment must expose a safe operational failure observation for diagnostics");
  assert.match(worker, /category: error\?\.category/);
  assert.match(worker, /retryDecision: decision\.reason/);
  assert.match(worker, /providerRequestId/);
  assert.match(worker, /retryAfterMs/);
  assert.match(worker, /JSON\.stringify\(observation\)/);
  assert.match(worker, /export default\s*\{/,
    "Cloudflare Workflow host must remain an ES Module Worker for Wrangler");
  assert.match(worker, /new Response\("Not Found", \{ status: 404 \}\)/,
    "default module entrypoint must not expose a parallel asset-generation HTTP API");
  assert.doesNotMatch(worker, /world-kernel|thread-presentation|presentationServer|media\.ready/);

  assert.match(providerSelection, /openai-gpt-image-2-medium-v1/);
  assert.match(providerSelection, /bfl-flux-2-pro-v1/);
  assert.match(providerSelection, /createOpenAIImageProvider/);
  assert.match(providerSelection, /createBflFluxImageProvider/);
  assert.doesNotMatch(providerSelection, /world-kernel|thread-presentation|presentationServer|media\.ready/);
});

test("deployment manifest selects Cloudflare while presentation owns completion publication", async () => {
  const manifest = await json(deploymentManifestUrl);
  const assetConfig = await json(assetConfigUrl);
  const presentationConfig = await json(presentationConfigUrl);
  const presentationWorker = await text(presentationWorkerUrl);
  const p3Proof = await text(p3ProofUrl);

  for (const retiredFile of retiredPresentationCloudflareFiles) {
    await assert.rejects(() => stat(retiredFile), (error) => error?.code === "ENOENT");
  }

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
  assert.deepEqual(assetConfig.secrets.required, ["OPENAI_API_KEY", "BFL_API_KEY"]);
  assert.equal(presentationConfig.secrets, undefined);
  assert.equal(producer.queue, "fibre-asset-completions-local");
  assert.equal(consumer.max_retries, 10);
  assert.equal(consumer.dead_letter_queue, "fibre-asset-completions-local-dlq");

  assert.doesNotMatch(presentationWorker, /WorkflowEntrypoint|NonRetryableError/);
  assert.doesNotMatch(presentationWorker, /createOpenAIImageProvider|createBflFluxImageProvider|executeCredentialedAssetGenerationJob/);
  assert.match(presentationWorker, /createPresentationAssetCompletionService/);
  assert.match(presentationWorker, /createThreadPresentationAssetPublisher/);
  assert.match(presentationWorker, /async queue\(batch, env\)/);
  assert.match(presentationWorker, /message\.ack\(\)/);
  assert.match(presentationWorker, /message\.retry/);
  assert.doesNotMatch(presentationWorker, /publish-market/);
  assert.doesNotMatch(p3Proof, /publish-market|manual_fixture_handoff/);
  assert.match(p3Proof, /queue_completion_handoff/);
});

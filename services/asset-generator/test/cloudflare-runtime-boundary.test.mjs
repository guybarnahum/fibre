import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

import {
  parseDeploymentManifest,
  resolveServiceDeployment,
} from "../../../infra/deployments/manifest.mjs";

const runtimeUrl = new URL("../src/asset-generation-runtime.mjs", import.meta.url);
const errorUrl = new URL("../src/asset-generation-error.mjs", import.meta.url);
const attemptUrl = new URL("../src/asset-generation-attempt.mjs", import.meta.url);
const providerOperationUrl = new URL("../src/resumable-provider-operation.mjs", import.meta.url);
const oldCloudflareDirUrl = new URL("../src/cloudflare/", import.meta.url);
const workerUrl = new URL("../../../infra/deployments/asset-generator/cloudflare/worker.mjs", import.meta.url);
const integrationSelectionUrl = new URL("../../../infra/deployments/integration-selection.mjs", import.meta.url);
const assetConfigUrl = new URL("../../../infra/deployments/asset-generator/cloudflare/wrangler.local.jsonc", import.meta.url);
const assetRemoteConfigUrl = new URL("../../../infra/deployments/asset-generator/cloudflare/wrangler.jsonc", import.meta.url);
const deploymentManifestUrl = new URL("../../../infra/deployments/environments/local.yaml", import.meta.url);
const remoteDeploymentManifestUrl = new URL("../../../infra/deployments/environments/cloudflare.yaml", import.meta.url);
const presentationWorkerUrl = new URL("../../../infra/deployments/thread-presentation/cloudflare/worker.mjs", import.meta.url);
const presentationConfigUrl = new URL("../../../infra/deployments/thread-presentation/cloudflare/wrangler.local.jsonc", import.meta.url);
const presentationRemoteConfigUrl = new URL("../../../infra/deployments/thread-presentation/cloudflare/wrangler.jsonc", import.meta.url);
const retiredPresentationCloudflareFiles = Object.freeze([
  new URL("../../presentation-cloudflare/src/worker.mjs", import.meta.url),
  new URL("../../presentation-cloudflare/src/presentation-read-api.mjs", import.meta.url),
  new URL("../../presentation-cloudflare/wrangler.local.jsonc", import.meta.url),
  new URL("../../presentation-cloudflare/README.md", import.meta.url),
]);
const p3ProofUrl = new URL("../../../tools/presentation/prove-p3-generated-media-local.mjs", import.meta.url);

async function text(url) { return readFile(url, "utf8"); }
async function json(url) { return JSON.parse(await text(url)); }
async function deployment(url) { return parseDeploymentManifest(await text(url)); }

test("Asset Generator runtime stages provider attempts portably and Cloudflare only translates retry policy", async () => {
  const runtime = await text(runtimeUrl);
  const errors = await text(errorUrl);
  const attempts = await text(attemptUrl);
  const providerOperations = await text(providerOperationUrl);
  const worker = await text(workerUrl);
  const integrationSelection = await text(integrationSelectionUrl);

  await assert.rejects(() => stat(oldCloudflareDirUrl), (error) => error?.code === "ENOENT");
  assert.match(runtime, /createAssetGenerationRuntime/);
  assert.match(runtime, /requireInfraCapabilities/);
  assert.match(runtime, /prepareResumableProviderExecution/);
  assert.match(runtime, /publishAssetGenerationCompletion/);
  assert.match(runtime, /attemptNumber/);
  assert.match(runtime, /providerOperationResumed/);
  assert.match(runtime, /providerOutputResumed/);
  assert.doesNotMatch(runtime, /cloudflare|ASSET_OBJECTS|ASSET_COMPLETIONS|OPENAI_API_KEY|BFL_API_KEY|C2PA_SIGNER_URL|WorkflowEntrypoint|NonRetryableError/);
  assert.doesNotMatch(runtime, /world-kernel|thread-presentation|presentationServer|media\.ready/);

  assert.match(providerOperations, /provider_operation_checkpoint/);
  assert.match(providerOperations, /startOperation/);
  assert.match(providerOperations, /resumeOperation/);
  assert.match(providerOperations, /providerOperationObjectRef/);
  assert.doesNotMatch(providerOperations, /cloudflare|R2|WorkflowEntrypoint|OPENAI_API_KEY|BFL_API_KEY/);

  assert.match(attempts, /generation-attempt-v0\.1/);
  assert.match(attempts, /assetGenerationJobDigest/);
  assert.match(attempts, /generationAttemptObjectRef/);
  assert.match(attempts, /stagedProviderOutputObjectRef/);
  assert.doesNotMatch(attempts, /cloudflare|R2|WorkflowEntrypoint/);

  assert.match(errors, /assetGenerationRetryDecision/);
  assert.match(errors, /provider_operation_staging/);
  assert.match(errors, /provider_operation_not_staged/);
  assert.match(errors, /providerOperationDurable/);
  assert.match(errors, /provider_output_staging/);
  assert.match(errors, /provider_output_not_staged/);
  assert.match(errors, /providerOutputDurable/);
  assert.match(errors, /rate_limited/);
  assert.match(errors, /quota_exhausted/);
  assert.match(errors, /immutable_conflict/);
  assert.doesNotMatch(errors, /cloudflare|WorkflowEntrypoint|NonRetryableError/);

  assert.match(worker, /createCloudflareInfraDriver/);
  assert.match(worker, /withCloudflareQueueBindings/);
  assert.match(worker, /createAssetGenerationRuntime/);
  assert.match(worker, /selectImageIntegration/);
  assert.match(worker, /selectContentCredentialIntegration/);
  assert.match(worker, /class AssetGenerationWorkflow extends WorkflowEntrypoint/);
  assert.match(worker, /NonRetryableError/);
  assert.match(worker, /assetGenerationRetryDecision/);
  assert.match(worker, /attemptNumber: ctx\.attempt/);
  assert.match(worker, /providerOperationDurable: error\?\.providerOperationDurable === true/);
  assert.match(worker, /providerOutputDurable: error\?\.providerOutputDurable === true/);
  assert.match(worker, /ASSET_OBJECTS/);
  assert.match(worker, /ASSET_COMPLETIONS/);
  assert.match(worker, /asset-generation-failure-observation-v0\.2/);
  assert.match(worker, /category: error\?\.category/);
  assert.match(worker, /retryDecision: decision\.reason/);
  assert.match(worker, /providerRequestId/);
  assert.match(worker, /retryAfterMs/);
  assert.match(worker, /JSON\.stringify\(observation\)/);
  assert.match(worker, /export default\s*\{/);
  assert.match(worker, /createService\(\{/);
  assert.match(worker, /HTTP_SERVICE\.fetch\(request\)/);
  assert.doesNotMatch(worker, /["'`]\/generate(?:["'`/?]|$)|["'`]\/asset-generation(?:["'`/?]|$)/);
  assert.doesNotMatch(worker, /world-kernel|thread-presentation|presentationServer|media\.ready/);
  assert.doesNotMatch(worker, /#integrations\/ai\/image|#integrations\/content-credentials/);

  assert.match(integrationSelection, /createOpenAIImageProvider/);
  assert.match(integrationSelection, /createBflFluxImageProvider/);
  assert.match(integrationSelection, /createHttpContentCredentialSigner/);
  assert.doesNotMatch(integrationSelection, /world-kernel|thread-presentation|presentationServer|media\.ready/);
});

test("local deployment manifest selects Cloudflare while presentation owns completion publication", async () => {
  const manifest = await deployment(deploymentManifestUrl);
  const assetConfig = await json(assetConfigUrl);
  const presentationConfig = await json(presentationConfigUrl);
  const presentationWorker = await text(presentationWorkerUrl);
  const p3Proof = await text(p3ProofUrl);

  for (const retiredFile of retiredPresentationCloudflareFiles) {
    await assert.rejects(() => stat(retiredFile), (error) => error?.code === "ENOENT");
  }

  const assetDeployment = resolveServiceDeployment(manifest, "asset-generator");
  assert.equal(assetDeployment.runtime.runtimeId, "cloudflare-local");
  assert.equal(assetDeployment.runtime.provider, "cloudflare");
  assert.equal(assetDeployment.infra.infraId, "cloudflare-local");
  assert.equal(assetDeployment.infra.provider, "cloudflare");
  assert.equal(assetDeployment.infra.driver, "cloudflare-v1");
  assert.ok(assetDeployment.infra.capabilities.includes("objects"));
  assert.ok(assetDeployment.infra.capabilities.includes("queues"));
  assert.ok(assetDeployment.infra.capabilities.includes("workflows"));
  assert.equal(assetDeployment.integrations["openai-gpt-image-2-medium-v1"].provider, "openai");
  assert.equal(assetDeployment.integrations["bfl-flux-2-pro-v1"].provider, "bfl");

  const presentationDeployment = resolveServiceDeployment(manifest, "thread-presentation");
  assert.equal(presentationDeployment.runtime.runtimeId, "cloudflare-local");
  assert.equal(presentationDeployment.infra.infraId, "cloudflare-local");

  const assetWorkflow = assetConfig.workflows.find((binding) => binding.binding === "ASSET_GENERATION");
  const presentationWorkflow = presentationConfig.workflows.find((binding) => binding.binding === "ASSET_GENERATION");
  const producer = assetConfig.queues.producers.find((binding) => binding.binding === "ASSET_COMPLETIONS");
  const consumer = presentationConfig.queues.consumers.find((binding) => binding.queue === producer.queue);

  assert.equal(assetConfig.name, "fibre-asset-generator-local");
  assert.equal(assetConfig.main, "./worker.mjs");
  assert.equal(presentationConfig.name, "fibre-presentation-local");
  assert.equal(presentationConfig.main, "./worker.mjs");
  assert.equal(assetConfig.vars.FIBRE_DEPLOYMENT_ENV, "local");
  assert.equal(presentationConfig.vars.FIBRE_DEPLOYMENT_ENV, "local");
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
  assert.match(presentationWorker, /selectContentCredentialIntegration/);
  assert.match(presentationWorker, /async queue\(batch, env\)/);
  assert.match(presentationWorker, /message\.ack\(\)/);
  assert.match(presentationWorker, /message\.retry/);
  assert.doesNotMatch(presentationWorker, /publish-market/);
  assert.doesNotMatch(p3Proof, /publish-market|manual_fixture_handoff/);
  assert.match(p3Proof, /queue_completion_handoff/);
});

test("remote Cloudflare composition shares generated assets and completion topology without moving publication authority", async () => {
  const manifest = await deployment(remoteDeploymentManifestUrl);
  const assetConfig = await json(assetRemoteConfigUrl);
  const presentationConfig = await json(presentationRemoteConfigUrl);

  const assetDeployment = resolveServiceDeployment(manifest, "asset-generator");
  const presentationDeployment = resolveServiceDeployment(manifest, "thread-presentation");
  assert.equal(manifest.environment, "cloudflare");
  assert.equal(assetDeployment.runtime.runtimeId, "cloudflare");
  assert.equal(assetDeployment.infra.infraId, "cloudflare");
  assert.equal(assetDeployment.infra.provider, "cloudflare");
  assert.equal(assetDeployment.infra.driver, "cloudflare-v1");
  assert.ok(assetDeployment.infra.capabilities.includes("objects"));
  assert.ok(assetDeployment.infra.capabilities.includes("queues"));
  assert.ok(assetDeployment.infra.capabilities.includes("workflows"));
  assert.equal(presentationDeployment.runtime.runtimeId, "cloudflare");
  assert.equal(presentationDeployment.infra.infraId, "cloudflare");
  assert.ok(presentationDeployment.infra.capabilities.includes("streams"));
  assert.ok(presentationDeployment.infra.capabilities.includes("realtime"));
  assert.equal(assetDeployment.integrations.contentCredentials.provider, "c2pa-http");
  assert.equal(presentationDeployment.integrations.contentCredentials.provider, "c2pa-http");

  const assetBucket = assetConfig.r2_buckets.find((binding) => binding.binding === "ASSET_OBJECTS");
  const presentationBucket = presentationConfig.r2_buckets.find((binding) => binding.binding === "PRESENTATION_OBJECTS");
  const catalog = presentationConfig.d1_databases.find((binding) => binding.binding === "PRESENTATION_CATALOG");
  const presentationChannel = presentationConfig.durable_objects.bindings.find((binding) => binding.name === "PRESENTATION_CHANNELS");
  const assetWorkflow = assetConfig.workflows.find((binding) => binding.binding === "ASSET_GENERATION");
  const presentationWorkflow = presentationConfig.workflows.find((binding) => binding.binding === "ASSET_GENERATION");
  const producer = assetConfig.queues.producers.find((binding) => binding.binding === "ASSET_COMPLETIONS");
  const consumer = presentationConfig.queues.consumers.find((binding) => binding.queue === producer.queue);

  assert.equal(assetConfig.name, "fibre-asset-generator");
  assert.equal(presentationConfig.name, "fibre-thread-presentation");
  assert.equal(presentationConfig.main, "./worker.mjs");
  assert.equal(assetConfig.vars.FIBRE_DEPLOYMENT_ENV, "cloudflare");
  assert.equal(presentationConfig.vars.FIBRE_DEPLOYMENT_ENV, "cloudflare");
  assert.equal(assetBucket.bucket_name, "fibre-presentation-assets");
  assert.equal(presentationBucket.bucket_name, assetBucket.bucket_name);
  assert.ok(catalog);
  assert.equal(catalog.database_id, undefined);
  assert.equal(presentationChannel.class_name, "FibrePresentationChannelDurableObject");
  assert.equal(presentationConfig.exports.FibrePresentationChannelDurableObject.storage, "sqlite");
  assert.equal(assetWorkflow.name, "fibre-asset-generation");
  assert.equal(presentationWorkflow.name, assetWorkflow.name);
  assert.equal(presentationWorkflow.class_name, assetWorkflow.class_name);
  assert.equal(presentationWorkflow.script_name, assetConfig.name);
  assert.equal(producer.queue, "fibre-asset-completions");
  assert.equal(consumer.queue, producer.queue);
  assert.equal(consumer.max_retries, 10);
  assert.equal(consumer.dead_letter_queue, "fibre-asset-completions-dlq");
  assert.equal(presentationConfig.queues.producers, undefined);
  assert.equal(assetConfig.queues.consumers, undefined);
  assert.deepEqual(presentationConfig.secrets.required, ["C2PA_SIGNER_URL", "C2PA_SIGNER_TOKEN", "FIBRE_PRIVATE_TOKEN"]);
  assert.equal(presentationConfig.vars.C2PA_SIGNER_ID, "fibre-c2pa-production-v1");
  assert.equal(presentationConfig.vars.C2PA_TRUST_POLICY, "c2pa_trust_list");
  assert.equal(assetConfig.vars.C2PA_SIGNER_ID, presentationConfig.vars.C2PA_SIGNER_ID);
  assert.equal(assetConfig.vars.C2PA_TRUST_POLICY, presentationConfig.vars.C2PA_TRUST_POLICY);
  assert.equal(presentationConfig.vars?.P3_FIXTURE_MODE, undefined);
});

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

function assertSourceMatches(source, pattern, label) {
  assert.equal(pattern.test(source), true, `${label}: missing pattern ${pattern}`);
}

function assertSourceDoesNotMatch(source, pattern, label) {
  assert.equal(pattern.test(source), false, `${label}: forbidden pattern ${pattern}`);
}

test("Asset Generator runtime stages provider attempts portably and Cloudflare only translates retry policy", async () => {
  const runtime = await text(runtimeUrl);
  const errors = await text(errorUrl);
  const attempts = await text(attemptUrl);
  const providerOperations = await text(providerOperationUrl);
  const worker = await text(workerUrl);
  const integrationSelection = await text(integrationSelectionUrl);

  await assert.rejects(() => stat(oldCloudflareDirUrl), (error) => error?.code === "ENOENT");
  for (const pattern of [
    /createAssetGenerationRuntime/,
    /requireInfraCapabilities/,
    /prepareResumableProviderExecution/,
    /publishAssetGenerationCompletion/,
    /attemptNumber/,
    /providerOperationResumed/,
    /providerOutputResumed/,
  ]) assertSourceMatches(runtime, pattern, "asset generation runtime");
  assertSourceDoesNotMatch(runtime, /cloudflare|ASSET_OBJECTS|ASSET_COMPLETIONS|OPENAI_API_KEY|BFL_API_KEY|C2PA_SIGNER_URL|WorkflowEntrypoint|NonRetryableError/, "asset generation runtime");
  assertSourceDoesNotMatch(runtime, /world-kernel|thread-presentation|presentationServer|media\.ready/, "asset generation runtime");

  for (const pattern of [
    /provider_operation_checkpoint/,
    /startOperation/,
    /resumeOperation/,
    /providerOperationObjectRef/,
  ]) assertSourceMatches(providerOperations, pattern, "resumable provider operation");
  assertSourceDoesNotMatch(providerOperations, /cloudflare|R2|WorkflowEntrypoint|OPENAI_API_KEY|BFL_API_KEY/, "resumable provider operation");

  for (const pattern of [
    /generation-attempt-v0\.1/,
    /assetGenerationJobDigest/,
    /generationAttemptObjectRef/,
    /stagedProviderOutputObjectRef/,
  ]) assertSourceMatches(attempts, pattern, "asset generation attempt");
  assertSourceDoesNotMatch(attempts, /cloudflare|R2|WorkflowEntrypoint/, "asset generation attempt");

  for (const pattern of [
    /assetGenerationRetryDecision/,
    /provider_operation_staging/,
    /provider_operation_not_staged/,
    /providerOperationDurable/,
    /provider_output_staging/,
    /provider_output_not_staged/,
    /providerOutputDurable/,
    /rate_limited/,
    /quota_exhausted/,
    /immutable_conflict/,
  ]) assertSourceMatches(errors, pattern, "asset generation errors");
  assertSourceDoesNotMatch(errors, /cloudflare|WorkflowEntrypoint|NonRetryableError/, "asset generation errors");

  for (const pattern of [
    /createCloudflareInfraDriver/,
    /withCloudflareQueueBindings/,
    /createAssetGenerationRuntime/,
    /createAssetGenerationControlService/,
    /createAssetGenerationControlApi/,
    /selectImageIntegration/,
    /selectContentCredentialIntegration/,
    /contentCredentials\s*\?\?\s*null/,
    /class AssetGenerationWorkflow extends WorkflowEntrypoint/,
    /NonRetryableError/,
    /assetGenerationRetryDecision/,
    /attemptNumber: ctx\.attempt/,
    /providerOperationDurable: error\?\.providerOperationDurable === true/,
    /providerOutputDurable: error\?\.providerOutputDurable === true/,
    /ASSET_OBJECTS/,
    /ASSET_COMPLETIONS/,
    /ASSET_GENERATION/,
    /FIBRE_PRIVATE_TOKEN/,
    /asset-generation-failure-observation-v0\.2/,
    /category: error\?\.category/,
    /retryDecision: decision\.reason/,
    /providerRequestId/,
    /retryAfterMs/,
    /JSON\.stringify\(observation\)/,
    /export default\s*\{/,
    /createService\(\{/,
    /HTTP_SERVICE\.fetch\(request\)/,
  ]) assertSourceMatches(worker, pattern, "asset-generator Cloudflare worker");
  assertSourceDoesNotMatch(worker, /["'`]\/generate(?:["'`/?]|$)|["'`]\/asset-generation(?:["'`/?]|$)/, "asset-generator Cloudflare worker");
  assertSourceDoesNotMatch(worker, /world-kernel|thread-presentation|presentationServer|media\.ready/, "asset-generator Cloudflare worker");
  assertSourceDoesNotMatch(worker, /#integrations\/ai\/image|#integrations\/content-credentials/, "asset-generator Cloudflare worker");

  for (const pattern of [
    /createOpenAIImageProvider/,
    /createBflFluxImageProvider/,
    /createHttpContentCredentialSigner/,
  ]) assertSourceMatches(integrationSelection, pattern, "deployment integration selection");
  assertSourceDoesNotMatch(integrationSelection, /world-kernel|thread-presentation|presentationServer|media\.ready/, "deployment integration selection");
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
  assert.deepEqual(assetConfig.secrets.required, ["OPENAI_API_KEY", "BFL_API_KEY", "FIBRE_PRIVATE_TOKEN"]);
  assert.equal(presentationConfig.secrets, undefined);
  assert.equal(producer.queue, "fibre-asset-completions-local");
  assert.equal(consumer.max_retries, 10);
  assert.equal(consumer.dead_letter_queue, "fibre-asset-completions-local-dlq");

  assertSourceDoesNotMatch(presentationWorker, /WorkflowEntrypoint|NonRetryableError/, "thread-presentation Cloudflare worker");
  assertSourceDoesNotMatch(presentationWorker, /createOpenAIImageProvider|createBflFluxImageProvider|executeCredentialedAssetGenerationJob/, "thread-presentation Cloudflare worker");
  for (const pattern of [
    /createPresentationAssetCompletionService/,
    /createThreadPresentationAssetPublisher/,
    /selectContentCredentialIntegration/,
    /async queue\(batch, env\)/,
    /message\.ack\(\)/,
    /message\.retry/,
  ]) assertSourceMatches(presentationWorker, pattern, "thread-presentation Cloudflare worker");
  assertSourceDoesNotMatch(presentationWorker, /publish-market/, "thread-presentation Cloudflare worker");
  assertSourceDoesNotMatch(p3Proof, /publish-market|manual_fixture_handoff/, "P3 generated media proof");
  assertSourceMatches(p3Proof, /queue_completion_handoff/, "P3 generated media proof");
});

test("remote Cloudflare composition shares generated assets and completion topology without requiring C2PA", async () => {
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
  assert.equal(assetDeployment.integrations.contentCredentials, undefined);
  assert.equal(presentationDeployment.integrations.contentCredentials, undefined);

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
  assert.equal(presentationConfig.main, "./encounter-worker.mjs", "remote Presentation should enter through the A5 encounter wrapper");
  assert.equal(assetConfig.vars.FIBRE_DEPLOYMENT_ENV, "cloudflare");
  assert.equal(presentationConfig.vars.FIBRE_DEPLOYMENT_ENV, "cloudflare");
  assert.equal(assetBucket.bucket_name, "fibre-presentation-assets");
  assert.equal(presentationBucket.bucket_name, assetBucket.bucket_name);
  assert.ok(catalog);
  assert.equal(catalog.database_name, "fibre-presentation-catalog");
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
  assert.deepEqual(assetConfig.secrets.required, ["OPENAI_API_KEY", "BFL_API_KEY", "FIBRE_PRIVATE_TOKEN"]);
  assert.deepEqual(presentationConfig.secrets.required, ["FIBRE_PRIVATE_TOKEN"]);
  assert.equal(presentationConfig.vars.C2PA_SIGNER_ID, undefined);
  assert.equal(presentationConfig.vars.C2PA_TRUST_POLICY, undefined);
  assert.equal(assetConfig.vars.C2PA_SIGNER_ID, undefined);
  assert.equal(assetConfig.vars.C2PA_TRUST_POLICY, undefined);
  assert.equal(presentationConfig.vars?.P3_FIXTURE_MODE, undefined);
});

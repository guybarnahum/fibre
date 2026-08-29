import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";

const integrationsRoot = new URL("../../integrations/", import.meta.url);
const integrationImplementations = Object.freeze([
  new URL("ai/reasoning/openai.mjs", integrationsRoot),
  new URL("ai/reasoning/google.mjs", integrationsRoot),
  new URL("ai/image/openai.mjs", integrationsRoot),
  new URL("ai/image/bfl.mjs", integrationsRoot),
  new URL("content-credentials/c2pa-http-signer.mjs", integrationsRoot),
]);
const retiredServiceIntegrationPaths = Object.freeze([
  new URL("../../services/world-kernel/src/model-runtime/openai.mjs", import.meta.url),
  new URL("../../services/world-kernel/src/model-runtime/google.mjs", import.meta.url),
  new URL("../../services/world-kernel/src/model-runtime/retry-policy.mjs", import.meta.url),
  new URL("../../services/asset-generator/src/providers/openai-image-provider.mjs", import.meta.url),
  new URL("../../services/asset-generator/src/providers/bfl-flux-image-provider.mjs", import.meta.url),
  new URL("../../services/asset-generator/src/http-content-credential-signer.mjs", import.meta.url),
]);
const worldKernelModelRuntimeUrl = new URL("../../services/world-kernel/src/model-runtime/model-runtime.mjs", import.meta.url);
const assetGeneratorIndexUrl = new URL("../../services/asset-generator/src/index.mjs", import.meta.url);
const providerSelectionUrl = new URL("../../infra/deployments/asset-generator/image-provider-selection.mjs", import.meta.url);
const assetWorkerUrl = new URL("../../infra/deployments/asset-generator/cloudflare/worker.mjs", import.meta.url);
const c2paServiceUrl = new URL("../../services/c2pa-local/server.mjs", import.meta.url);
const infraProviderRoots = Object.freeze([new URL("../../infra/providers/", import.meta.url)]);
const infraCoreFiles = Object.freeze([
  new URL("../../infra/infra-driver.mjs", import.meta.url),
  new URL("../../infra/internal.mjs", import.meta.url),
  new URL("../../infra/service.mjs", import.meta.url),
]);

async function text(url) {
  return readFile(url, "utf8");
}

function assertSourceMatches(source, pattern, message) {
  assert.ok(pattern.test(source), message);
}

function assertSourceOmits(source, pattern, message) {
  assert.ok(!pattern.test(source), message);
}

async function sourceFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) result.push(...await sourceFiles(url));
    else if (/\.(?:mjs|js|ts)$/.test(entry.name)) result.push(url);
  }
  return result;
}

const thirdPartyPattern = /OPENAI_API_KEY|GEMINI_API_KEY|BFL_API_KEY|C2PA_SIGNER_URL|api\.openai\.com|generativelanguage\.googleapis\.com|api\.bfl\.ai|createOpenAIModelAdapter|createGoogleModelAdapter|createOpenAIImageProvider|createBflFluxImageProvider|createHttpContentCredentialSigner/;

test("third-party integrations have one shared home outside services and Infra providers", async () => {
  const [openaiModel, googleModel, openaiImage, bflImage, c2paSigner] = await Promise.all(integrationImplementations.map(text));

  assertSourceMatches(openaiModel, /api\.openai\.com/, "OpenAI model integration must call the OpenAI API");
  assertSourceMatches(openaiModel, /OPENAI_API_KEY/, "OpenAI model integration must own OPENAI_API_KEY handling");
  assertSourceMatches(googleModel, /generativelanguage\.googleapis\.com/, "Google model integration must call the Google Generative Language API");
  assertSourceMatches(googleModel, /GEMINI_API_KEY/, "Google model integration must own GEMINI_API_KEY handling");
  assertSourceMatches(openaiImage, /api\.openai\.com/, "OpenAI image integration must call the OpenAI API");
  assertSourceMatches(bflImage, /api\.bfl\.ai/, "BFL image integration must call the BFL API");
  assertSourceMatches(c2paSigner, /\/embed/, "C2PA HTTP signer integration must expose the signer /embed call");
  assertSourceMatches(c2paSigner, /\/verify/, "C2PA HTTP signer integration must expose the signer /verify call");
  assertSourceMatches(c2paSigner, /createHttpContentCredentialSigner/, "C2PA HTTP signer integration must export createHttpContentCredentialSigner");

  for (const url of retiredServiceIntegrationPaths) {
    await assert.rejects(() => stat(url), (error) => error?.code === "ENOENT", `retired service-local integration must stay removed: ${url.pathname}`);
  }

  const worldKernelModelRuntime = await text(worldKernelModelRuntimeUrl);
  assertSourceMatches(worldKernelModelRuntime, /#integrations\/ai\/reasoning\/openai\.mjs/, "world-kernel model runtime must use the shared OpenAI integration");
  assertSourceMatches(worldKernelModelRuntime, /#integrations\/ai\/reasoning\/google\.mjs/, "world-kernel model runtime must use the shared Google integration");

  const assetGeneratorIndex = await text(assetGeneratorIndexUrl);
  assertSourceOmits(assetGeneratorIndex, /createOpenAIImageProvider|createBflFluxImageProvider|createHttpContentCredentialSigner/, "asset-generator service index must not construct third-party integration adapters");
  assertSourceOmits(assetGeneratorIndex, /integrations\//, "asset-generator service index must remain integration-agnostic");

  const providerSelection = await text(providerSelectionUrl);
  assertSourceMatches(providerSelection, /#integrations\/ai\/image\/openai\.mjs/, "image-provider selector must use the shared OpenAI image integration");
  assertSourceMatches(providerSelection, /#integrations\/ai\/image\/bfl\.mjs/, "image-provider selector must use the shared BFL image integration");
  assertSourceOmits(providerSelection, /services\/asset-generator\/src\/index\.mjs/, "image-provider selector must not depend on the asset-generator service index");

  const assetWorker = await text(assetWorkerUrl);
  assertSourceMatches(assetWorker, /#integrations\/content-credentials\/c2pa-http-signer\.mjs/, "Asset Generator deployment must use the shared C2PA HTTP signer integration directly");
  assertSourceMatches(assetWorker, /createHttpContentCredentialSigner/, "Asset Generator deployment must construct the shared C2PA HTTP signer integration");
  assertSourceMatches(assetWorker, /createAssetGenerationRuntime\(\{ infra, provider, credentialSigner \}\)/, "Asset Generator Worker must inject infra, image provider, and credential signer into the portable runtime");

  const c2paService = await text(c2paServiceUrl);
  assertSourceMatches(c2paService, /\/embed/, "local C2PA service must expose /embed");
  assertSourceMatches(c2paService, /\/verify/, "local C2PA service must expose /verify");

  for (const url of infraCoreFiles) {
    assertSourceOmits(await text(url), thirdPartyPattern, `third-party integration leaked into infrastructure core ${url.pathname}`);
  }
  for (const root of infraProviderRoots) {
    for (const url of await sourceFiles(root)) {
      assertSourceOmits(await text(url), thirdPartyPattern, `third-party integration leaked into infrastructure provider ${url.pathname}`);
      assertSourceOmits(await text(url), /#services\/|\.\.\/\.\.\/\.\.\/services\//, `infrastructure provider imported service topology in ${url.pathname}`);
    }
  }

  for (const url of integrationImplementations) {
    const source = await text(url);
    assertSourceOmits(source, /packages\/infra|infra\/deployments\/|createCloudflareInfraDriver|WorkflowEntrypoint/, `integration implementation selected infrastructure/deployment behavior in ${url.pathname}`);
  }
});

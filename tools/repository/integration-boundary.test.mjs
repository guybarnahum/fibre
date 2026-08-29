import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";

const integrationsRoot = new URL("../../integrations/", import.meta.url);
const integrationImplementations = Object.freeze([
  new URL("models/openai.mjs", integrationsRoot),
  new URL("models/google.mjs", integrationsRoot),
  new URL("media/openai-image-provider.mjs", integrationsRoot),
  new URL("media/bfl-flux-image-provider.mjs", integrationsRoot),
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
const worldKernelModelRuntimeUrl = new URL(
  "../../services/world-kernel/src/model-runtime/model-runtime.mjs",
  import.meta.url,
);
const assetGeneratorIndexUrl = new URL(
  "../../services/asset-generator/src/index.mjs",
  import.meta.url,
);
const providerSelectionUrl = new URL(
  "../../deployments/cloudflare/asset-generator/image-provider-selection.mjs",
  import.meta.url,
);
const signerSelectionUrl = new URL(
  "../../deployments/cloudflare/content-credentials/signer-selection.mjs",
  import.meta.url,
);
const assetWorkerUrl = new URL(
  "../../deployments/cloudflare/asset-generator/worker.mjs",
  import.meta.url,
);
const c2paServiceUrl = new URL(
  "../../services/c2pa-local/server.mjs",
  import.meta.url,
);
const infraRoots = Object.freeze([
  new URL("../../infra/", import.meta.url),
  new URL("../../packages/infra/src/", import.meta.url),
]);

async function text(url) {
  return readFile(url, "utf8");
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

test("third-party integrations have one shared home outside services and InfraDriver", async () => {
  const [openaiModel, googleModel, openaiImage, bflImage, c2paSigner] = await Promise.all(
    integrationImplementations.map(text),
  );

  assert.match(openaiModel, /api\.openai\.com/);
  assert.match(openaiModel, /OPENAI_API_KEY/);
  assert.match(googleModel, /generativelanguage\.googleapis\.com/);
  assert.match(googleModel, /GEMINI_API_KEY/);
  assert.match(openaiImage, /api\.openai\.com/);
  assert.match(bflImage, /api\.bfl\.ai/);
  assert.match(c2paSigner, /\/embed/);
  assert.match(c2paSigner, /\/verify/);
  assert.match(c2paSigner, /createHttpContentCredentialSigner/);

  for (const url of retiredServiceIntegrationPaths) {
    await assert.rejects(() => stat(url), (error) => error?.code === "ENOENT");
  }

  const worldKernelModelRuntime = await text(worldKernelModelRuntimeUrl);
  assert.match(worldKernelModelRuntime, /integrations\/models\/openai\.mjs/);
  assert.match(worldKernelModelRuntime, /integrations\/models\/google\.mjs/);

  const assetGeneratorIndex = await text(assetGeneratorIndexUrl);
  assert.doesNotMatch(assetGeneratorIndex, /createOpenAIImageProvider|createBflFluxImageProvider|createHttpContentCredentialSigner/);
  assert.doesNotMatch(assetGeneratorIndex, /integrations\//);

  const providerSelection = await text(providerSelectionUrl);
  assert.match(providerSelection, /integrations\/media\/openai-image-provider\.mjs/);
  assert.match(providerSelection, /integrations\/media\/bfl-flux-image-provider\.mjs/);
  assert.doesNotMatch(providerSelection, /services\/asset-generator\/src\/index\.mjs/);

  const signerSelection = await text(signerSelectionUrl);
  assert.match(signerSelection, /integrations\/content-credentials\/c2pa-http-signer\.mjs/);
  assert.match(signerSelection, /createHttpContentCredentialSigner/);
  assert.doesNotMatch(signerSelection, /services\/asset-generator\/src\/index\.mjs/);

  const assetWorker = await text(assetWorkerUrl);
  assert.match(assetWorker, /content-credentials\/signer-selection\.mjs/);
  assert.match(assetWorker, /createCloudflareContentCredentialSigner/);
  assert.doesNotMatch(assetWorker, /integrations\/content-credentials\/c2pa-http-signer\.mjs/);
  assert.match(assetWorker, /createAssetGenerationRuntime\(\{ infra, provider, credentialSigner \}\)/);

  const c2paService = await text(c2paServiceUrl);
  assert.match(c2paService, /\/embed/);
  assert.match(c2paService, /\/verify/);

  for (const root of infraRoots) {
    for (const url of await sourceFiles(root)) {
      const source = await text(url);
      assert.doesNotMatch(
        source,
        /OPENAI_API_KEY|GEMINI_API_KEY|BFL_API_KEY|C2PA_SIGNER_URL|api\.openai\.com|generativelanguage\.googleapis\.com|api\.bfl\.ai|createOpenAIModelAdapter|createGoogleModelAdapter|createOpenAIImageProvider|createBflFluxImageProvider|createHttpContentCredentialSigner/,
        `third-party integration leaked into infrastructure source ${url.pathname}`,
      );
    }
  }

  for (const url of integrationImplementations) {
    const source = await text(url);
    assert.doesNotMatch(
      source,
      /packages\/infra|deployments\/|createCloudflareInfraDriver|WorkflowEntrypoint/,
      `integration implementation selected infrastructure/deployment behavior in ${url.pathname}`,
    );
  }
});

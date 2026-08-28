import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const integrationsRoot = new URL("../../integrations/", import.meta.url);
const integrationImplementations = Object.freeze([
  new URL("models/openai.mjs", integrationsRoot),
  new URL("models/google.mjs", integrationsRoot),
  new URL("media/openai-image-provider.mjs", integrationsRoot),
  new URL("media/bfl-flux-image-provider.mjs", integrationsRoot),
]);
const serviceCompatibilitySeams = Object.freeze([
  new URL("../../services/world-kernel/src/model-runtime/openai.mjs", import.meta.url),
  new URL("../../services/world-kernel/src/model-runtime/google.mjs", import.meta.url),
  new URL("../../services/asset-generator/src/providers/openai-image-provider.mjs", import.meta.url),
  new URL("../../services/asset-generator/src/providers/bfl-flux-image-provider.mjs", import.meta.url),
]);
const providerSelectionUrl = new URL(
  "../../deployments/cloudflare/asset-generator/image-provider-selection.mjs",
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

test("third-party AI and media integrations have one shared home outside services and InfraDriver", async () => {
  const [openaiModel, googleModel, openaiImage, bflImage] = await Promise.all(
    integrationImplementations.map(text),
  );

  assert.match(openaiModel, /api\.openai\.com/);
  assert.match(openaiModel, /OPENAI_API_KEY/);
  assert.match(googleModel, /generativelanguage\.googleapis\.com/);
  assert.match(googleModel, /GEMINI_API_KEY/);
  assert.match(openaiImage, /api\.openai\.com/);
  assert.match(bflImage, /api\.bfl\.ai/);

  for (const url of serviceCompatibilitySeams) {
    const source = await text(url);
    assert.match(source, /integrations\/(?:models|media)\//);
    assert.doesNotMatch(source, /https:\/\/api\.|generativelanguage\.googleapis\.com|OPENAI_API_KEY|GEMINI_API_KEY|BFL_API_KEY/);
  }

  const providerSelection = await text(providerSelectionUrl);
  assert.match(providerSelection, /integrations\/media\/openai-image-provider\.mjs/);
  assert.match(providerSelection, /integrations\/media\/bfl-flux-image-provider\.mjs/);
  assert.doesNotMatch(providerSelection, /services\/asset-generator\/src\/index\.mjs/);

  for (const root of infraRoots) {
    for (const url of await sourceFiles(root)) {
      const source = await text(url);
      assert.doesNotMatch(
        source,
        /OPENAI_API_KEY|GEMINI_API_KEY|BFL_API_KEY|api\.openai\.com|generativelanguage\.googleapis\.com|api\.bfl\.ai|createOpenAIModelAdapter|createGoogleModelAdapter|createOpenAIImageProvider|createBflFluxImageProvider/,
        `third-party AI/media integration leaked into infrastructure source ${url.pathname}`,
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

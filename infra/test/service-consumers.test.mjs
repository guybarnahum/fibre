import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  parseDeploymentManifest,
  resolveServiceDeployment,
} from "../deployments/manifest.mjs";

const ROOT = new URL("../../", import.meta.url);
const HOSTS = Object.freeze({
  assetGenerator: new URL("infra/deployments/asset-generator/cloudflare/worker.mjs", ROOT),
  threadPresentation: new URL("infra/deployments/thread-presentation/cloudflare/worker.mjs", ROOT),
  contentCredentialSigner: new URL("infra/deployments/content-credential-signer/local/server.mjs", ROOT),
  birthCenter: new URL("infra/deployments/birth-center/local/server.mjs", ROOT),
  worldKernel: new URL("infra/deployments/world-kernel/local/server.mjs", ROOT),
});
const CONTENT_CREDENTIAL_SERVICE = new URL("services/content-credential-signer/src/index.mjs", ROOT);
const LOCAL_DEPLOYMENT_MANIFEST = new URL("infra/deployments/environments/local.yaml", ROOT);

async function text(url) {
  return readFile(url, "utf8");
}

function sourceIncludes(source, needle, message) {
  assert.equal(source.includes(needle), true, message);
}

function sourceExcludes(source, needle, message) {
  assert.equal(source.includes(needle), false, message);
}

function sourceMatches(source, pattern, message) {
  assert.equal(pattern.test(source), true, message);
}

function sourceDoesNotMatch(source, pattern, message) {
  assert.equal(pattern.test(source), false, message);
}

test("service HTTP semantics use the root Infra service seam while deployment hosts own provider selection", async () => {
  const credentialService = await text(CONTENT_CREDENTIAL_SERVICE);
  sourceIncludes(credentialService, "#infra/service", "content credential service must use the root Infra service seam");

  const entries = await Promise.all(Object.entries(HOSTS).map(async ([name, url]) => [name, await text(url)]));
  for (const [name, source] of entries) {
    sourceExcludes(source, "infra/service-runtime", `${name} must not use the removed service-runtime directory`);
    sourceExcludes(source, "packages/infra", `${name} must not use package-style Infra`);
    sourceExcludes(source, "infra/src", `${name} must not use an Infra src directory`);
  }
});

test("local executable service hosts use the local provider adapter", async () => {
  for (const [name, url] of Object.entries({
    contentCredentialSigner: HOSTS.contentCredentialSigner,
    birthCenter: HOSTS.birthCenter,
    worldKernel: HOSTS.worldKernel,
  })) {
    const source = await text(url);
    sourceIncludes(source, "#infra/providers/local/service", `${name} must use the local service provider`);
  }
});

test("Cloudflare service hosts use Cloudflare providers and keep paid generation private", async () => {
  const assetWorker = await text(HOSTS.assetGenerator);
  const presentationWorker = await text(HOSTS.threadPresentation);

  sourceIncludes(assetWorker, "#infra/providers/cloudflare", "asset-generator Cloudflare host must use the Cloudflare provider");
  sourceIncludes(presentationWorker, "#infra/providers/cloudflare", "thread-presentation Cloudflare host must use the Cloudflare provider");
  sourceDoesNotMatch(assetWorker, /pathname\s*===\s*"\/generate"/, "asset-generator must not expose a public /generate route");
  sourceDoesNotMatch(assetWorker, /path:\s*"\/generate"/, "asset-generator service routes must not include /generate");
  sourceMatches(assetWorker, /serviceName:\s*"asset-generator"/, "asset-generator host must expose the asset-generator service identity");
  sourceMatches(presentationWorker, /serviceName:\s*"thread-presentation"/, "thread-presentation host must expose the thread-presentation service identity");
});

test("content credential signer keeps embed and verify semantics behind optional local service auth", async () => {
  const service = await text(CONTENT_CREDENTIAL_SERVICE);
  const host = await text(HOSTS.contentCredentialSigner);
  const manifest = parseDeploymentManifest(await text(LOCAL_DEPLOYMENT_MANIFEST));
  const signerDeployment = resolveServiceDeployment(manifest, "content-credential-signer");

  sourceMatches(service, /serviceToken === null \? null : bearerAuth\(serviceToken\)/, "content credential service must make bearer auth conditional on the injected service token");
  sourceMatches(service, /path:\s*"\/embed"/, "content credential service must expose /embed");
  sourceMatches(service, /path:\s*"\/verify"/, "content credential service must expose /verify");
  sourceIncludes(host, 'optionalEnvironmentValue(selected.environment, "serviceToken", environment)', "local signer host must resolve service auth through the selected deployment integration");
  assert.equal(
    signerDeployment.integrations.signer.environment.serviceToken,
    "FIBRE_C2PA_SERVICE_TOKEN",
    "local deployment must map signer service auth to FIBRE_C2PA_SERVICE_TOKEN",
  );
  sourceMatches(host, /content-credentials\.signer/, "local signer host must require the content-credentials.signer integration kind");
  sourceMatches(host, /c2pa-node/, "local signer host must require the c2pa-node provider");
});

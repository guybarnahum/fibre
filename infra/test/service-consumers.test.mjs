import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../../", import.meta.url);
const HOSTS = Object.freeze({
  assetGenerator: new URL("infra/deployments/asset-generator/cloudflare/worker.mjs", ROOT),
  threadPresentation: new URL("infra/deployments/thread-presentation/cloudflare/worker.mjs", ROOT),
  contentCredentialSigner: new URL("infra/deployments/content-credential-signer/local/server.mjs", ROOT),
  birthCenter: new URL("infra/deployments/birth-center/local/server.mjs", ROOT),
  worldKernel: new URL("infra/deployments/world-kernel/local/server.mjs", ROOT),
});
const CONTENT_CREDENTIAL_SERVICE = new URL("services/content-credential-signer/src/index.mjs", ROOT);

async function text(url) {
  return readFile(url, "utf8");
}

test("service HTTP semantics use the root Infra service seam while deployment hosts own provider selection", async () => {
  const credentialService = await text(CONTENT_CREDENTIAL_SERVICE);
  assert.equal(credentialService.includes("#infra/service"), true);

  const entries = await Promise.all(Object.entries(HOSTS).map(async ([name, url]) => [name, await text(url)]));
  for (const [name, source] of entries) {
    assert.equal(source.includes("infra/service-runtime"), false, `${name} must not use the removed service-runtime directory`);
    assert.equal(source.includes("packages/infra"), false, `${name} must not use package-style Infra`);
    assert.equal(source.includes("infra/src"), false, `${name} must not use an Infra src directory`);
  }
});

test("local executable service hosts use the local provider adapter", async () => {
  for (const [name, url] of Object.entries({
    contentCredentialSigner: HOSTS.contentCredentialSigner,
    birthCenter: HOSTS.birthCenter,
    worldKernel: HOSTS.worldKernel,
  })) {
    const source = await text(url);
    assert.equal(source.includes("#infra/providers/local/service"), true, `${name} must use the local service provider`);
  }
});

test("Cloudflare service hosts use Cloudflare providers and keep paid generation private", async () => {
  const assetWorker = await text(HOSTS.assetGenerator);
  const presentationWorker = await text(HOSTS.threadPresentation);

  assert.equal(assetWorker.includes("#infra/providers/cloudflare"), true);
  assert.equal(presentationWorker.includes("#infra/providers/cloudflare"), true);
  assert.doesNotMatch(assetWorker, /pathname\s*===\s*"\/generate"/);
  assert.doesNotMatch(assetWorker, /path:\s*"\/generate"/);
  assert.match(assetWorker, /serviceName:\s*"asset-generator"/);
  assert.match(presentationWorker, /serviceName:\s*"thread-presentation"/);
});

test("content credential signer keeps embed and verify semantics behind optional local service auth", async () => {
  const service = await text(CONTENT_CREDENTIAL_SERVICE);
  const host = await text(HOSTS.contentCredentialSigner);
  assert.match(service, /serviceToken === null \? null : bearerAuth\(serviceToken\)/);
  assert.match(service, /path:\s*"\/embed"/);
  assert.match(service, /path:\s*"\/verify"/);
  assert.match(host, /FIBRE_C2PA_SERVICE_TOKEN/);
  assert.match(host, /content-credentials\.signer/);
  assert.match(host, /c2pa-node/);
});
